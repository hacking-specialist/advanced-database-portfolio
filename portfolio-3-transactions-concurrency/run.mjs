import { startPostgres } from '../tools/native-postgres.mjs';
import { assert, read, save, loadLibrary, until } from '../tools/lib.mjs';
const base = 'portfolio-3-transactions-concurrency';
const server = await startPostgres();
const clients = await Promise.all(['session-a', 'session-b', 'observer'].map(x => server.connect(x)));
const [a,b,o] = clients;
const events = [];
async function q(client, session, sql, params = []) {
  const result = await client.query(sql, params);
  events.push({ at: new Date().toISOString(), session, sql, params, rows: result.rows ?? [], command: result.command });
  return result;
}
try {
  await loadLibrary(a);
  await a.query(await read('portfolio-1-database-design/sql/05_validation.sql'));
  const version = (await a.query('SELECT version()')).rows[0].version;
  const queries = await a.query(await read('portfolio-1-database-design/sql/04_example_queries.sql'));
  await save('portfolio-1-database-design/evidence/native-validation.json', {
    executed_at: new Date().toISOString(), version, validation: '05_validation.sql passed without exception',
    queries: queries.map(r => r.rows) });

  await q(a,'A','BEGIN');
  await q(a,'A',"SELECT library.issue_loan(1, 2, 1, DATE '2026-11-13', 14)");
  await q(a,'A','COMMIT');
  assert.equal((await q(o,'observer',"SELECT status FROM library.book_copies WHERE copy_id=2")).rows[0].status,'on_loan');
  await q(a,'A','BEGIN');
  await q(a,'A',"SELECT library.issue_loan(1, 4, 1, DATE '2026-11-13', 14)");
  await q(a,'A','ROLLBACK');
  assert.equal((await q(o,'observer',"SELECT status FROM library.book_copies WHERE copy_id=4")).rows[0].status,'available');

  await q(a,'A','BEGIN');
  await q(a,'A',"SELECT library.issue_loan(1, 6, 1, DATE '2026-11-13', 14)");
  await q(b,'B','BEGIN');
  const bPid = (await b.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
  events.push({session:'B',sql:"SELECT library.issue_loan(2, 6, 2, DATE '2026-11-13', 14)",state:'submitted while A holds copy lock'});
  const pending = b.query("SELECT library.issue_loan(2, 6, 2, DATE '2026-11-13', 14)").then(result => ({result}), error => ({error}));
  const lock = await until(async () => {
    const row = (await o.query('SELECT pid, wait_event_type, wait_event, pg_blocking_pids(pid) AS blockers FROM pg_stat_activity WHERE pid=$1',[bPid])).rows[0];
    return row?.wait_event_type === 'Lock' ? row : false;
  }, 'B blocked by A');
  events.push({session:'observer',observation:'actual blocking confirmed',...lock});
  await q(a,'A','COMMIT');
  const blocked = await pending;
  assert.equal(blocked.error?.message,'Copy is not available');
  events.push({session:'B',sqlstate:blocked.error.code,error:blocked.error.message});
  await q(b,'B','ROLLBACK');
  assert.equal((await q(o,'observer',"SELECT count(*)::integer AS n FROM library.loans WHERE copy_id=6 AND loan_status='active'")).rows[0].n,1);

  const isolation = [];
  for (const [level,next] of [['READ COMMITTED',21000],['REPEATABLE READ',22000]]) {
    await q(a,'A',`BEGIN ISOLATION LEVEL ${level}`);
    const first = (await q(a,'A','SELECT replacement_cost FROM library.books WHERE book_id=5')).rows[0].replacement_cost;
    await q(b,'B','UPDATE library.books SET replacement_cost=$1 WHERE book_id=5',[next]);
    const second = (await q(a,'A','SELECT replacement_cost FROM library.books WHERE book_id=5')).rows[0].replacement_cost;
    await q(a,'A','COMMIT');
    if(level === 'READ COMMITTED') assert.notEqual(first,second); else assert.equal(first,second);
    isolation.push({level,first,second});
  }

  // Deliberately unsafe client-side read/modify/write: B overwrites A's increment.
  await q(a,'A','BEGIN'); await q(b,'B','BEGIN');
  const av = Number((await q(a,'A','SELECT replacement_cost FROM library.books WHERE book_id=5')).rows[0].replacement_cost);
  const bv = Number((await q(b,'B','SELECT replacement_cost FROM library.books WHERE book_id=5')).rows[0].replacement_cost);
  await q(a,'A','UPDATE library.books SET replacement_cost=$1 WHERE book_id=5',[av+100]); await q(a,'A','COMMIT');
  await q(b,'B','UPDATE library.books SET replacement_cost=$1 WHERE book_id=5',[bv+200]); await q(b,'B','COMMIT');
  const lost = Number((await q(o,'observer','SELECT replacement_cost FROM library.books WHERE book_id=5')).rows[0].replacement_cost);
  assert.equal(lost,22200);
  await q(o,'observer','UPDATE library.books SET replacement_cost=22000 WHERE book_id=5');
  await q(a,'A','BEGIN'); await q(b,'B','BEGIN');
  await q(a,'A','UPDATE library.books SET replacement_cost=replacement_cost+100 WHERE book_id=5');
  const atomicPending = b.query('UPDATE library.books SET replacement_cost=replacement_cost+200 WHERE book_id=5').then(result=>({result}),error=>({error}));
  await until(async () => (await o.query('SELECT cardinality(pg_blocking_pids($1)) AS n',[bPid])).rows[0].n > 0, 'atomic update blocking');
  events.push({session:'observer',observation:'B atomic increment waits for A row lock'});
  await q(a,'A','COMMIT');
  const atomic = await atomicPending; if(atomic.error) throw atomic.error;
  events.push({session:'B',sql:'UPDATE library.books SET replacement_cost=replacement_cost+200 WHERE book_id=5',state:'completed after A commit'});
  await q(b,'B','COMMIT');
  const protectedValue = Number((await q(o,'observer','SELECT replacement_cost FROM library.books WHERE book_id=5')).rows[0].replacement_cost);
  assert.equal(protectedValue,22300);
  assert.equal((await q(o,'observer','SELECT * FROM library.workflow_inconsistencies')).rows.length,0);
  await save(`${base}/evidence/results.json`, { executed_at:new Date().toISOString(),version,
    checks:{commit:true,rollback:true,actual_lock_observed:true,one_active_loan:true,isolation,lost_update:lost,atomic_update:protectedValue,workflow_inconsistencies:0},events });
  await save(`${base}/evidence/transcript.txt`, events.map(e=>JSON.stringify(e)).join('\n')+'\nPASS: all native multi-session checks\n');
  console.log('PASS: commit, rollback, real lock contention, isolation, lost update, atomic update');
} finally {
  await Promise.allSettled(clients.map(c=>c.query('ROLLBACK')));
  await Promise.allSettled(clients.map(c=>c.end()));
  await server.stop();
}

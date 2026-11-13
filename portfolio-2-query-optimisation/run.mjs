import os from 'node:os';
import { startPostgres } from '../tools/native-postgres.mjs';
import { assert, read, save, loadLibrary } from '../tools/lib.mjs';
const base = 'portfolio-2-query-optimisation';
const pg = await startPostgres();
const c = await pg.connect('portfolio2');
try {
  await loadLibrary(c);
  await c.query(await read(`${base}/sql/01_dataset.sql`));
  const statements = (await read(`${base}/sql/02_queries.sql`)).replace(/^--.*$/gm,'').split(';').map(s => s.trim()).filter(Boolean);
  const labels = ['borrower_history', 'active_due_range', 'status_aggregation', 'year_extract', 'year_range'];
  const data = { executed_at: new Date().toISOString(), runtime: 'native PostgreSQL server',
    version: (await c.query('SELECT version()')).rows[0].version,
    platform: `${os.platform()} ${os.arch()}`, cpu: os.cpus()[0].model, logical_cpus: os.cpus().length,
    rows: 200000, repetitions: 7, warmups: 1, note: 'Warm-cache sequential phases; EXPLAIN ANALYZE overhead included. No cold-cache or production claims.',
    settings: (await c.query("SELECT name, setting, unit FROM pg_settings WHERE name IN ('shared_buffers','work_mem','random_page_cost','max_parallel_workers_per_gather','jit','fsync') ORDER BY name")).rows,
    phases: {} };
  for (const phase of ['before', 'after']) {
    if (phase === 'after') await c.query(await read(`${base}/sql/03_indexes.sql`));
    data.phases[phase] = {};
    for (let i = 0; i < statements.length; i++) {
      const sql = statements[i];
      const rows = (await c.query(sql)).rows;
      await c.query(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql}`);
      const plans = [];
      for (let r = 0; r < 7; r++) plans.push((await c.query(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql}`)).rows[0]['QUERY PLAN'][0]);
      const times = plans.map(p => p['Execution Time']).sort((a,b) => a-b);
      data.phases[phase][labels[i]] = { result_rows: rows.length, median_ms: times[3], min_ms: times[0], max_ms: times[6], timings_ms: plans.map(p => p['Execution Time']) };
      await save(`${base}/plans/${phase}-${labels[i]}.json`, plans);
      await save(`${base}/results/${phase}-${labels[i]}.json`, rows);
    }
    data.phases[phase].storage = (await c.query("SELECT pg_relation_size('optimisation.loans') AS table_bytes, pg_indexes_size('optimisation.loans') AS index_bytes")).rows[0];
  }
  for (const label of labels) assert.deepEqual(JSON.parse(await read(`${base}/results/before-${label}.json`)), JSON.parse(await read(`${base}/results/after-${label}.json`)));
  assert.deepEqual(JSON.parse(await read(`${base}/results/after-year_extract.json`)), JSON.parse(await read(`${base}/results/after-year_range.json`)));
  await save(`${base}/results/benchmark.json`, data);
  const lines = ['query,before_median_ms,after_median_ms,speedup'];
  for (const label of labels) {
    const a = data.phases.before[label].median_ms, b = data.phases.after[label].median_ms;
    lines.push(`${label},${a},${b},${(a/b).toFixed(2)}`);
  }
  await save(`${base}/results/summary.csv`, lines.join('\n') + '\n');
  console.log(lines.join('\n'));
  console.log('PASS: result equivalence and native-server optimisation experiments');
} finally { await c.end(); await pg.stop(); }

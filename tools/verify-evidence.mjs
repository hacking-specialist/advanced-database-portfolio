import { assert, read } from './lib.mjs';
const json = async p => JSON.parse(await read(p));
const b = await json('portfolio-2-query-optimisation/results/benchmark.json');
assert.equal(b.rows,200000);
for(const key of ['borrower_history','active_due_range','status_aggregation','year_extract','year_range']) {
  for(const phase of ['before','after']) {
    assert.equal(b.phases[phase][key].timings_ms.length,7);
    assert.equal((await json(`portfolio-2-query-optimisation/plans/${phase}-${key}.json`)).length,7);
  }
  assert.deepEqual(await json(`portfolio-2-query-optimisation/results/before-${key}.json`),await json(`portfolio-2-query-optimisation/results/after-${key}.json`));
}
assert.deepEqual(await json('portfolio-2-query-optimisation/results/after-year_extract.json'),await json('portfolio-2-query-optimisation/results/after-year_range.json'));
const tx = await json('portfolio-3-transactions-concurrency/evidence/results.json');
assert.equal(tx.checks.actual_lock_observed,true); assert.equal(tx.checks.workflow_inconsistencies,0);
assert.equal(tx.checks.lost_update,22200); assert.equal(tx.checks.atomic_update,22300);
assert.equal(tx.checks.isolation[0].first,'20000.00'); assert.equal(tx.checks.isolation[0].second,'21000.00');
assert.equal(tx.checks.isolation[1].first,tx.checks.isolation[1].second);
const mongo = await json('portfolio-4-nosql/evidence/results.json'); assert.equal(mongo.count,5);
const repl = await json('portfolio-5-distributed-cloud/evidence/replication-results.json');
assert.notEqual(repl.original_primary,repl.new_primary);
assert.deepEqual(repl.checks,{three_members_replicated:true,new_primary_elected:true,majority_write_after_failure:true});
const native = await json('portfolio-1-database-design/evidence/native-validation.json');
assert.equal(native.queries[0].length,7); assert.equal(native.queries[5].length,0);
console.log('PASS: saved query results, 70 plans, native validation, concurrency and replication');

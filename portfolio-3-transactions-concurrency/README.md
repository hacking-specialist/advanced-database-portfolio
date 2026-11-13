# Portfolio 3: Transactions and Concurrency

## Run and evidence

Run `npm run portfolio:3` from the root. This starts a native PostgreSQL 18.6 server with separate connections A, B and an observer. It loads the original schema/seed, executes assertions, saves [results.json](evidence/results.json) and [transcript.txt](evidence/transcript.txt), then stops the server. The transcript contains the actual SQL, parameter values, observations and results. It also produces native-server validation evidence for Portfolio 1.

## Experiments and observed outcomes

| Experiment | Operation | Observed result |
|---|---|---|
| Commit | Issue copy 2 in A; COMMIT; read from observer | Copy becomes on_loan |
| Rollback | Issue copy 4 in A; ROLLBACK | Copy remains available; issue is undone |
| Competing borrowers | A issues copy 6 but holds transaction; B tries same copy | Observer sees B waiting on a Lock; after A commits, B receives `Copy is not available` |
| Read Committed | A reads cost; B updates and commits; A reads again | 20000.00 then 21000.00: nonrepeatable read |
| Repeatable Read | Repeat with A using a transaction snapshot | 21000.00 both times, although B commits 22000.00 |
| Lost update | Both read 22000; A writes stale value +100; B writes stale value +200 | 22200.00, so A's increment is lost |
| Atomic update | A adds 100; B adds 200 in SQL after waiting for A | 22300.00; both increments preserved |

The test explicitly queries `pg_stat_activity` and `pg_blocking_pids`; it does not infer blocking merely from a delay. It asserts exactly one active loan for the contested copy and zero detected workflow inconsistencies. Each pending query has rejection handling and clients are closed during cleanup.

## Why this works

`issue_loan` locks the physical copy with `SELECT ... FOR UPDATE` and checks availability under that lock. A second issue waits. Under the default Read Committed level, after the first issue commits, the waiting statement sees the updated copy status and refuses the issue. The unique partial index on active loans is an additional independent integrity guarantee.

`record_return` inserts the return, changes both states and assesses any overdue fine within the caller's transaction. An error causes that statement to roll back, so a half-completed return is not committed. The validation script exercises rejected damage notes and rollback of test changes. Applications must explicitly roll back a transaction after an error before continuing.

Read Committed gives each statement a new snapshot; Repeatable Read holds a transaction snapshot. PostgreSQL does not expose dirty reads, even if Read Uncommitted is requested. The demonstrated problem is a nonrepeatable read, not a fabricated dirty-read example. Serializable transactions can also reject conflicting work and require a whole-transaction retry; that retry scenario was discussed, not implemented here.

The unsafe lost-update example writes an old client-computed absolute value. An atomic `SET replacement_cost=replacement_cost+...` lets PostgreSQL apply each increment to the row version available after its lock wait. More complex business rules may require explicit locking, optimistic version checks or Serializable with retry rather than simple increments.

## Manual two-session reproduction

Use a fresh seeded database and two Query Tool tabs. In A, run:

```sql
BEGIN;
SELECT library.issue_loan(1, 6, 1, DATE '2026-11-13', 14);
-- Leave this transaction open.
```

In B, run:

```sql
BEGIN;
SELECT library.issue_loan(2, 6, 2, DATE '2026-11-13', 14);
-- Waits until A ends its transaction.
```

In an observer connection, inspect:

```sql
SELECT pid, application_name, wait_event_type, wait_event,
       pg_blocking_pids(pid) AS blockers
FROM pg_stat_activity WHERE datname = current_database();
```

Commit A. B should fail with the unavailable-copy message; run `ROLLBACK` in B. Run the complete automated transcript for the other experiments. Do not reuse the modified seed when expecting original Portfolio 1 row counts.

## Limitations

This is controlled interleaving on one host, not a load test, deadlock stress test or measurement of production throughput. Direct owner writes can bypass circulation functions; this known Portfolio 1 limitation remains. Identity sequence gaps after failed/rolled-back inserts are expected and do not mean a partial loan committed.

References: [transaction isolation](https://www.postgresql.org/docs/18/transaction-iso.html), [explicit locking](https://www.postgresql.org/docs/18/explicit-locking.html).

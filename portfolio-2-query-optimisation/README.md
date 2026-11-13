# Portfolio 2: Query Processing and Optimisation

## Objective and reproduction

Investigate borrower-history retrieval, active due-date searches, whole-table aggregation and date-filter rewriting. Run `npm run portfolio:2` from the repository root on Windows x64. The runner starts a fresh native PostgreSQL 18.6 instance, executes the SQL, saves evidence and stops the server. It never uses an existing database.

Alternatively, execute `sql/01_dataset.sql`, the queries in `sql/02_queries.sql`, and then `sql/03_indexes.sql` against a fresh PostgreSQL database. Prefix each query with `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` before and after the indexes. Do not run dataset creation against an existing `optimisation` schema.

## Dataset and method

The separate `optimisation.loans` analytical table contains 200,000 deterministic loan-shaped rows, 5,000 borrower identifiers, a 1,000-day date distribution and 5% active rows. It retains the loan attributes from the library model. It is a synthetic analytical workload, not a claim that 200,000 operational issues were validated through the circulation API. Operational data in `library` remains separate. The primary-key index exists in both phases.

Each query runs once to obtain its result, then one explicit plan warm-up, then seven measured `EXPLAIN ANALYZE` runs per phase. Thus measurements reflect repeated, largely warm-cache access. Reported medians include PostgreSQL instrumentation overhead, not client rendering/network time. Plans preserve buffer and worker details; settings, hardware and all timings are in [benchmark.json](results/benchmark.json). Result equality before/after is asserted, including equality of the two year-filter formulations.

## Observed results

| Query | Baseline median ms | Indexed median ms | Ratio |
|---|---:|---:|---:|
| Borrower history (40 results) | 107.235 | 0.171 | 627.11x |
| Active due-date range (400 results) | 85.061 | 0.914 | 93.06x |
| Status aggregation | 166.072 | 140.433 | 1.18x |
| EXTRACT year filter | 150.081 | 118.700 | 1.26x |
| Half-open year range | 112.610 | 36.333 | 3.10x |

These numbers describe this run on the recorded Windows machine. Other experiments/applications were active on the same host; there was no CPU isolation or cold-cache control. Large ratios for tiny indexed lookups should not be generalised to production. Reruns can change both timings and chosen plans; regenerate this table if replacing the saved evidence.

## Plan interpretation and trade-offs

**Borrower history:** the baseline used a parallel sequential scan followed by sorting/Gather Merge. After adding `(borrower_id, borrow_date DESC, loan_id)`, the observed plan used a bitmap index scan and bitmap heap scan, then a sort. The index sharply reduced rows accessed, but it did not eliminate the sort in the observed plan. Do not claim an index-only scan or automatic ordering merely because the index columns match the query.

**Active due-date search:** a partial index on `(due_date, loan_id) WHERE loan_status='active'` restricts the index to the small relevant subset. The resulting bitmap scan replaced a sequential scan. A query without a predicate implying `loan_status='active'` cannot generally use this index.

**Status aggregation:** both phases still used parallel sequential scanning and aggregation. The 1.18x timing ratio does not establish an indexing benefit; normal cache/scheduling variation is a plausible explanation. Reading most rows often makes a sequential scan sensible.

**Date rewrite:** `EXTRACT(YEAR FROM borrow_date)=2024` remained a sequential-scan plan. Expressing the equivalent half-open interval allowed a bitmap scan through `loans_borrow_date`. After indexes, the range formulation took 36.333 ms versus 118.700 ms for EXTRACT, approximately 3.27x faster within that phase. This avoids adding a specialised expression index for this particular query.

Additional indexes consume storage and add work to writes. Exact before/after index bytes are in `benchmark.json`; write throughput was not measured, so no numerical write-cost claim is made. The benchmark is read-focused and the data distribution is intentionally simple. A future experiment should vary selectivity, skew, row count and concurrent load.

## Evidence

- [SQL dataset](sql/01_dataset.sql), [queries](sql/02_queries.sql), [indexes](sql/03_indexes.sql).
- [Summary CSV](results/summary.csv), [benchmark metadata](results/benchmark.json).
- `plans/`: seven actual JSON execution plans for each query in each phase.
- `results/`: complete query results before and after, not screenshots of invented values.
- [Runner](run.mjs): reproducible execution and result-equivalence assertions.

References: [PostgreSQL EXPLAIN](https://www.postgresql.org/docs/18/using-explain.html), [partial indexes](https://www.postgresql.org/docs/18/indexes-partial.html).

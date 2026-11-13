# Advanced Database Systems Portfolio

**Case study:** Library Management System  
**Organisation:** MIVA Library Service - hypothetical academic case study  
**Repository:** [hacking-specialist/advanced-database-portfolio](https://github.com/hacking-specialist/advanced-database-portfolio)  

 All records are synthetic. Code, actual outputs, plans and analysis are included.

## Assessment guide

| Component | Implemented evidence | Read |
|---|---|---|
| 1 - Design (7) | ERD, schema, keys, constraints, normalisation, seed and native/embedded validation | [Portfolio 1](portfolio-1-database-design/README.md) |
| 2 - Optimisation (7) | 200,000 analytical rows, five query variants, 70 execution plans and repeated timings | [Portfolio 2](portfolio-2-query-optimisation/README.md) |
| 3 - Transactions (7) | Commit, rollback, actual lock waits, isolation comparison, lost update and control | [Portfolio 3](portfolio-3-transactions-concurrency/README.md) |
| 4 - NoSQL (7) | MongoDB documents, validator, CRUD, aggregation and results | [Portfolio 4](portfolio-4-nosql/README.md) |
| 5 - Distributed/cloud (6) | Three MongoDB processes, replication, primary outage, election and majority write after failover | [Portfolio 5](portfolio-5-distributed-cloud/README.md) |
| Final documentation (6) | Summary, evidence index, reflection analysis, references and AI-use record | [Evidence index](documentation/evidence-index.md) |

Start with the [three-page PDF](output/pdf/portfolio-summary.pdf), [editable summary](documentation/final-summary.md), [reflection](documentation/reflection.md) and [AI-use declaration](documentation/ai-use-declaration.md).

## Reproduce all experiments

Automated native runners target **Windows x64**, Node.js **22.12+** (tested: 24.21.0). No globally installed database or Docker is required. From PowerShell in the repository root:

```powershell
npm.cmd ci --ignore-scripts --no-audit --no-fund
npm.cmd run setup:mongo
npm.cmd test
```

Versions are pinned in `package-lock.json`. Installation downloads native PostgreSQL; the MongoDB setup downloads the official 8.0.17 archive (about 756 MB on Windows) and verifies its published checksum. Disabled install scripts are intentional; the Windows binaries do not need Unix symlink setup.

Each native runner creates a fresh database in a unique `.runs/` directory, binds only to loopback, saves results and stops its processes. PostgreSQL uses a random per-run password. MongoDB test processes have no authentication and **must never be exposed to a network**. No existing database or cloud resource is changed.

Restricted environments may require permission for native processes and local connections. Test data is retained for diagnosis; repeated runs consume disk space. `.runs/`, `.cache/`, `node_modules/` and credentials are ignored by Git.

```powershell
npm.cmd run test:embedded   # Original SQL checks in PGlite
npm.cmd run portfolio:2     # Native PostgreSQL benchmark
npm.cmd run portfolio:3     # Native P1 validation and concurrency
npm.cmd run portfolio:4     # Native MongoDB catalogue
npm.cmd run portfolio:5     # Replica set and failover
npm.cmd run verify         # Verify saved evidence without starting databases
```

Reruns overwrite evidence files. Timings and ports can change: update the written analysis and regenerate the PDF if replacing the included evidence.

## Manual PostgreSQL setup

Create an empty database and execute these scripts in order. In pgAdmin, select the database and run each file separately.

```powershell
createdb -U postgres library_portfolio
psql -X -U postgres -d library_portfolio -v ON_ERROR_STOP=1 -f portfolio-1-database-design/sql/01_schema.sql
psql -X -U postgres -d library_portfolio -v ON_ERROR_STOP=1 -f portfolio-1-database-design/sql/02_operations.sql
psql -X -U postgres -d library_portfolio -v ON_ERROR_STOP=1 -f portfolio-1-database-design/sql/03_seed_data.sql
psql -X -U postgres -d library_portfolio -v ON_ERROR_STOP=1 -f portfolio-1-database-design/sql/04_example_queries.sql
psql -X -U postgres -d library_portfolio -v ON_ERROR_STOP=1 -f portfolio-1-database-design/sql/05_validation.sql
```

Schema and seed files initialise once without dropping existing work. Use a fresh database for repetition. Use the circulation functions for issues, returns and extensions; direct owner writes can bypass cross-table rules. Sequence gaps after rollback are normal.

## Findings and practical limits

Selective searches switched from sequential scans to bitmap index scans. Whole-table aggregation retained a sequential scan, so its small timing change is not attributed to indexing. Concurrency tests observed a real lock wait and one active loan; Repeatable Read preserved a snapshot and atomic updates prevented a lost increment. MongoDB rejected invalid/duplicate documents and accepted a majority write after a replica-set primary outage.

All replica members ran on one host. Cloud deployment, geographic resilience and sharding are discussed, not claimed as implemented. Production roles, payment auditing, backup/restore testing and cross-database synchronisation are outside this prototype. Benchmark timings and one failover do not establish production performance or an availability SLA.

## Submission and continued maintenance

The course requires a **private repository**. This repository was observed as public. Change it to private under GitHub Settings and grant assessor access. Browser approval timed out, so the assistant did not change that setting.

Experiments were executed on 13 November 2026. Completing these components now does not demonstrate three months of maintenance. Continue genuine weekly changes and reruns using the [activity log](documentation/activity-log.md) and [development plan](documentation/development-plan.md); never backdate commits. Personalise the individual reflection and private cover details before submission.

## Layout

```text
portfolio-1-database-design/       ERD, SQL, validation
portfolio-2-query-optimisation/    SQL, plans, results, runner
portfolio-3-transactions-concurrency/  Transcripts, results, runner
portfolio-4-nosql/                Model, documents, validator, results
portfolio-5-distributed-cloud/    Replica-set configuration and evidence
documentation/                   Summary, reflection, evidence, references
output/pdf/                      Three-page summary
tools/                           Runtime helpers, tests, report generator
```

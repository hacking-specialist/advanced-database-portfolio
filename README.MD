# Advanced Database Systems Portfolio

**Case study:** Library Management System. **Organisation:** MIVA Library Service, an academic case study; not an assertion about MIVA's actual systems or policies.

This repository starts Portfolio 1 using the student's supplied ER diagram. PostgreSQL is the relational platform; MongoDB is planned for Portfolio 4. The diagram's seven tables and attributes are preserved. All sample people, titles and contact addresses are synthetic.

## Current work

- [Portfolio 1 documentation](portfolio-1-database-design/README.md)
- [Original student ER diagram](portfolio-1-database-design/diagrams/erd.png)
- [Schema](portfolio-1-database-design/sql/01_schema.sql)
- [Borrowing, return and extension functions](portfolio-1-database-design/sql/02_operations.sql)
- [Synthetic data](portfolio-1-database-design/sql/03_seed_data.sql)
- [Example queries](portfolio-1-database-design/sql/04_example_queries.sql)
- [Validation script](portfolio-1-database-design/sql/05_validation.sql)
- [12-week plan](documentation/development-plan.md)

## Run on PostgreSQL

Install a supported PostgreSQL server and its command-line tools. These scripts target PostgreSQL 18. If `psql` is not on PATH, use its full installation path. From this repository in PowerShell, create a **new, empty** database, then run in order:

```powershell
createdb -U postgres library_portfolio
psql -X -U postgres -d library_portfolio -v ON_ERROR_STOP=1 -f portfolio-1-database-design/sql/01_schema.sql
psql -X -U postgres -d library_portfolio -v ON_ERROR_STOP=1 -f portfolio-1-database-design/sql/02_operations.sql
psql -X -U postgres -d library_portfolio -v ON_ERROR_STOP=1 -f portfolio-1-database-design/sql/03_seed_data.sql
psql -X -U postgres -d library_portfolio -v ON_ERROR_STOP=1 -f portfolio-1-database-design/sql/04_example_queries.sql 2>&1 | Tee-Object portfolio-1-database-design/evidence/query-output.txt
psql -X -U postgres -d library_portfolio -v ON_ERROR_STOP=1 -f portfolio-1-database-design/sql/05_validation.sql 2>&1 | Tee-Object portfolio-1-database-design/evidence/validation-output.txt
```

Enter credentials at the prompt; do not save passwords in scripts. In pgAdmin, create the database first, select it, and execute each file separately in Query Tool in the same order. Stop and resolve errors before proceeding.

Schema and seed scripts intentionally fail if rerun on an already initialised database. They do not delete existing work. Use a new database name for a fresh run. Tests expect the original seed dataset and roll back their changes; identity sequences can still advance.

## Evidence and progressive work

On 13 November 2026, all five SQL files passed execution in PGlite 0.5.16 (embedded PostgreSQL 18.6). Actual query results and final table-count checks are saved in [embedded-validation.txt](portfolio-1-database-design/evidence/embedded-validation.txt). No standalone PostgreSQL server was installed or tested during this step.

To reproduce this optional embedded validation with Node.js installed:

```powershell
npm.cmd ci --ignore-scripts --no-audit --no-fund
npm.cmd test
```

The test uses an in-memory database and overwrites only its embedded-validation output file. PostgreSQL server installation and screenshots are still needed for the main practical exercise.

Retain text output as well as selected screenshots. Record the date, database version, command, result and your explanation. Embedded-runtime validation, if present, is not a substitute for PostgreSQL server, concurrency or performance evidence. No GitHub repository has been created or published by this work.

Commit meaningful completed milestones over the actual development period. Do not backdate commits. Keep the GitHub repository private and arrange assessor access using course instructions. Read and personalise the [AI-use declaration](documentation/ai-use-declaration.md).


# Activity log

| Date | Activity | Evidence | Status |
|---|---|---|---|
| 2026-11-13 | Translated student-supplied ERD into PostgreSQL scripts; added synthetic data, validation and documentation with AI assistance | portfolio-1-database-design/ | Initial implementation; see evidence for validation scope |
| 2026-11-13 | Executed all five SQL files with PGlite 0.5.16 / PostgreSQL 18.6; checked query outputs and post-rollback table counts | portfolio-1-database-design/evidence/embedded-validation.txt | Passed embedded validation; standalone server and concurrency tests remain |

Add your own execution, corrections and explanations as you complete them. Record actual dates, not projected completion dates.

| Date | Further activity | Evidence | Status |
|---|---|---|---|
| 2026-11-13 | Ran native PostgreSQL validation and five before/after analytical queries with seven measured trials per phase | P1 native-validation.json; P2 plans/results | Passed; query-file comment splitting was corrected before the successful run |
| 2026-11-13 | Ran three-connection commit, rollback, lock, isolation and lost-update experiments | P3 evidence/results.json and transcript.txt | Passed on native PostgreSQL 18.6 |
| 2026-11-13 | Implemented and executed MongoDB document model, CRUD, validation and aggregation | P4 evidence/results.json | Passed on native MongoDB 8.0.17 |
| 2026-11-13 | Ran three-member replication and controlled primary outage | P5 evidence/replication-results.json | New primary and post-failure majority write verified |
| 2026-11-13 | Completed technical READMEs, summary, reflection analysis and evidence map with AI assistance | documentation/ and output/pdf/ | Personal details and individual reflection remain student-owned |

This is a record of an implementation session, not evidence that three months have elapsed. Continue adding real maintenance work.

# Evidence index and marking map

Repository: https://github.com/hacking-specialist/advanced-database-portfolio

All implementation runs below were performed on 13 November 2026. UTC timestamps inside machine outputs are retained; the local working timezone is Africa/Lagos. Personal cover details are intentionally omitted.

| Criterion | Evidence to inspect | What it establishes |
|---|---|---|
| Technical correctness (8) | [P1 native validation](../portfolio-1-database-design/evidence/native-validation.json), [validation SQL](../portfolio-1-database-design/sql/05_validation.sql), [evidence verifier](../tools/verify-evidence.mjs) | Executed constraints and workflows; expected failures; stored result assertions |
| Database design quality (6) | [ERD](../portfolio-1-database-design/diagrams/erd.png), [design explanation](../portfolio-1-database-design/README.md), [schema](../portfolio-1-database-design/sql/01_schema.sql) | Seven related entities, keys, constraints, normalisation and limitations |
| Practical implementation (8) | [SQL functions](../portfolio-1-database-design/sql/02_operations.sql), [P3 runner](../portfolio-3-transactions-concurrency/run.mjs), [MongoDB model](../portfolio-4-nosql/catalogue.mjs), [replica runner](../portfolio-5-distributed-cloud/run.mjs) | Executable relational, document and distributed experiments |
| Query/performance analysis (5) | [benchmark](../portfolio-2-query-optimisation/results/benchmark.json), [CSV](../portfolio-2-query-optimisation/results/summary.csv), [analysis](../portfolio-2-query-optimisation/README.md) | Seven trials per phase/query, measured plans, equal outputs and cautious interpretation |
| Advanced concepts (5) | [transaction transcript](../portfolio-3-transactions-concurrency/evidence/transcript.txt), [MongoDB results](../portfolio-4-nosql/evidence/results.json), [replica results](../portfolio-5-distributed-cloud/evidence/replication-results.json) | Actual lock waits, isolation, lost updates, validation, replication and election |
| Documentation/GitHub (5) | [root README](../README.md), [summary PDF](../output/pdf/portfolio-summary.pdf), [activity log](activity-log.md), [references](references.md) | Reproduction, navigation and traceability; continued real commits still matter |
| Reflection/understanding (3) | [technical reflection and personal prompts](reflection.md), [AI-use record](ai-use-declaration.md) | Supported technical analysis; individual understanding must be demonstrated by the student |

## Output evidence versus screenshots

JSON plans and result files, CSV measurements and SQL/event transcripts are actual execution outputs. They satisfy the output-evidence route of the brief. The PDF contains a visual summary and the student's original ERD, not fabricated screenshots of pgAdmin or MongoDB Compass. If screenshots are specifically required by the lecturer, the student should capture their own reproduced runs with captions and dates.

## Remaining student-owned requirements

- Add private name/ID/course details and personalise the individual reflection.
- Set the GitHub repository to private and grant assessor access; its observed visibility was public and browser approval timed out.
- Continue three months of real development/maintenance, recording actual work and commits. This delivery cannot manufacture elapsed time or a personal learning history.
- Review the assumed circulation/fine rules and AI-use declaration against course policy.

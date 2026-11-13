# Advanced Database Systems Portfolio: Library Management System

**Organisation:** MIVA Library Service - hypothetical academic case study.  
**Student name, ID and course code:** intentionally omitted for private completion.  
**Repository:** https://github.com/hacking-specialist/advanced-database-portfolio  
**Implementation evidence date:** 13 November 2026.  
**Formatted version:** [three-page PDF](../output/pdf/portfolio-summary.pdf).

## 1. Purpose, design and implementation

The system manages books, physical copies, borrowers, staff, loans, returns and fines. It is a practical database portfolio rather than a production library application. Synthetic records avoid using real borrower information. The student's ER diagram supplies the seven-table model; the implementation preserves its attributes and relationships.

PostgreSQL 18.6 implements generated primary keys, mandatory foreign keys, case-insensitive unique emails, checked dates and monetary amounts. A unique loan reference in returns allows at most one return per loan. A partial unique index permits historical loans for a physical copy while allowing only one active loan. Books and copies are separate because a title can have multiple physical items and separate lending histories.

The normalisation explanation identifies dependencies through 3NF under the documented assumptions. Single author and genre values are retained from the ERD. Copy/loan state redundancy is explicit: functions maintain the operational relationship, while a diagnostic view detects inconsistencies. Direct owner writes can bypass workflow rules; production application-role hardening remains future work.

Circulation functions issue, extend and return loans atomically. Assumed rules include verified borrower emails, active staff, a default 14-day loan, at most two extensions and NGN 100 per overdue day assessed at return. These are exercise policies, not verified institutional policies. Native and embedded validation passed, including rejected invalid data, duplicate active loans, return chronology, damage notes, fine calculation and rollback. Seed queries returned seven available copies and no detected workflow inconsistency.

## 2. Query processing, performance and transactions

The optimisation exercise uses a separate deterministic 200,000-row analytical loans table. It measures five query variants before/after indexes, retaining seven plans and timings per phase/query. Returned results are asserted equal. Measurements are warm-cache, include EXPLAIN instrumentation and were made on a shared Windows host; they are not production benchmarks.

| Query | Baseline median ms | Indexed median ms |
|---|---:|---:|
| Borrower history | 107.235 | 0.171 |
| Active due-date range | 85.061 | 0.914 |
| Status aggregation | 166.072 | 140.433 |
| EXTRACT year predicate | 150.081 | 118.700 |
| Half-open year range | 112.610 | 36.333 |

Borrower and active-due searches changed from sequential to bitmap index scans, although sorting remained. Whole-table aggregation kept a sequential scan; its small timing variation is not attributed to indexing. A half-open date predicate enabled an indexed plan, whereas applying EXTRACT to the date column did not. Index storage increased; write overhead was not benchmarked.

Three native PostgreSQL sessions demonstrate commit, rollback, contention and isolation. An observer confirmed a real lock wait when two borrowers attempted the same copy. The first issue committed, the second failed as unavailable, and exactly one active loan remained. Read Committed returned 20,000 then 21,000 after another session's update; Repeatable Read retained 21,000 across both reads. Deliberate stale-value updates lost an increment and produced 22,200; atomic SQL increments preserved both changes and produced 22,300.

## 3. NoSQL, distribution and technical reflection

MongoDB 8.0.17 implements a catalogue with embedded author metadata and genre arrays, plus references to copy IDs. This extends the document model while leaving the relational ERD unchanged. Actual CRUD tests inserted, read, updated and deleted records; validation rejected negative costs and duplicate ISBNs. Aggregation returned three Computing titles with an average replacement cost of NGN 19,000. The five-document catalogue demonstrates implementation, not large-scale performance. No automatic PostgreSQL/MongoDB synchronisation is claimed.

Portfolio 5 runs three actual MongoDB processes as a replica set on one computer. A majority-written marker was observed on all members. After the primary process stopped, a different primary was observed after 1,609 ms from the start of the stop operation, and a subsequent majority write/read succeeded. This is one controlled outage result, not a recovery SLA. Cloud deployment, geographic separation and sharding are discussed, not implemented. Replication cannot protect all members from one shared-host failure and does not replace backups.

The technical reflection emphasises three lessons supported by evidence: relational constraints and transaction logic solve different integrity problems; query plans are needed to explain timings; and replication availability depends on failure boundaries and acknowledgement semantics. Future work includes least-privilege roles, payment auditing, a skewed workload, catalogue synchronisation and backup/restore tests. The student's individual reflection must be personalised using work they actually reviewed or performed.

The repository contains scripts, plans, JSON/CSV outputs and transcripts, with a separate evidence index. The original ERD is included; generated reports are not presented as application screenshots. Personal details are omitted. The repository was observed as public and must be made private for the course. Continued genuine weekly work is still needed to demonstrate three months of maintenance; no backdated history is created.

## References and AI-use record

Primary references include PostgreSQL 18 documentation on constraints, EXPLAIN, partial indexes, isolation and locking, and MongoDB documentation on modelling, validation, elections, and read/write concern. Full links appear in [references.md](references.md).

OpenAI Codex assisted with SQL/JavaScript implementation, synthetic data, experiment execution, analysis and documentation. Actual run outputs are retained. AI assistance does not establish the student's personal understanding or complete their individual reflection; see [AI-use declaration](ai-use-declaration.md).

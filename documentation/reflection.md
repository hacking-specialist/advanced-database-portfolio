# Technical reflection and individual understanding

## Evidence-based technical reflection

The design's most consequential distinction is between a bibliographic title and its physical copies. Lending a title directly would make simultaneous loans of different copies ambiguous. The unique partial index on active copy loans expresses a rule that an ordinary foreign key cannot: historical loans may repeat a copy, while active loans may not.

Retaining the supplied ERD also creates trade-offs. Single author and genre fields simplify the initial relational model but limit multi-author classification. The MongoDB catalogue demonstrates an alternative representation with bounded arrays. Copy and loan states duplicate information that can partly be derived from related records; the circulation functions maintain those states, but owner-level direct writes can bypass the intended workflow. A production successor should restrict the application role, improve auditability and exercise adversarial mutation tests.

The optimisation experiment shows why measurements and plans must be interpreted together. Selective searches used bitmap indexes and improved sharply, but the final sort remained. A matching index definition did not guarantee a particular scan or eliminate sorting. Whole-table aggregation retained its sequential plan, so its small improvement cannot confidently be attributed to indexes. The workload is synthetic, repeated and largely warm-cache; other host activity and limited scale constrain generalisation.

The transaction experiment separates logical correctness from simple successful execution. A program can produce correct results sequentially and still lose updates when two clients write stale absolute values. The recorded 22,200 outcome illustrates this; atomic increments produced 22,300. The observer's recorded blocking state is stronger evidence than assuming a delay implies a lock. Choosing isolation levels requires understanding what must remain stable and handling transaction retries when required.

The document and replication experiments show that flexible schema and availability need explicit controls. MongoDB validation rejected invalid amounts and duplicate ISBNs. Replica-set election allowed writes after a member stopped, yet three processes on one machine do not survive a host failure. Majority acknowledgement is not instantaneous application on every secondary, which is why the experiment separately checked the marker on all members. Backups and deployment separation remain necessary for a real library.

The next improvements should be least-privilege roles, payment audit records, ISBN checksum validation, a larger/skewed benchmark, a PostgreSQL-to-catalogue update mechanism, and backup/restore exercises. These are proposals, not implemented features.

## Student's individual reflection - complete privately

The analysis above was drafted with AI assistance from actual recorded results. It is not a claim about the student's personal experience. Before submission, write a short first-person reflection addressing:

1. Which script did you personally execute or change, and why?
2. Which actual result surprised you, and how did you verify it?
3. Explain the copy-lock experiment and the before/after query plan in your own words.
4. Identify one mistake you made or limitation you discovered during your own work.
5. State what you would improve next and how you would test it.

Link to your own dated commits or evidence. Do not claim to have carried out work that you have only read about.

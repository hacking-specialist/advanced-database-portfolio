# Portfolio 4: NoSQL and Advanced Data Models

## Implementation

Run `npm run portfolio:4` from the repository root after `npm run setup:mongo`. The experiment uses a real MongoDB 8.0.17 `mongod` process with WiredTiger, bound to loopback. The test helper manages its lifetime; this is not an in-memory JavaScript imitation of MongoDB. A fresh database is created for each run and the server stops afterward.

[catalogue.mjs](catalogue.mjs) contains the model, validator, indexes, seed documents and aggregation pipeline. [run.mjs](run.mjs) performs the operations and asserts the observed results. Exported [documents](data/catalogue.json), [validator](data/validator.json), [results](evidence/results.json) and [execution plan](evidence/explain.json) are included.

## Document model

Each document represents the same bibliographic edition as `library.books`, retaining its numeric identifier for traceability. It contains a title, ISBN, publication year, replacement cost in NGN, embedded author objects, an array of genres, extensible metadata and references to physical copy IDs.

Authors and genres are arrays in this document model, unlike the original ERD's single text fields. This is an explicitly documented NoSQL extension, not a silent alteration to the relational schema. Small descriptive values read with a title are embedded. Loans, returns, fines, staff and borrower personal data are not embedded in an unbounded catalogue document. Physical copies are referenced; those references are not MongoDB-enforced foreign keys.

The catalogue is a separate prototype seeded from the same case-study values. There is no live synchronisation pipeline between PostgreSQL and MongoDB. An operational dual-store design would need an outbox/change-data-capture process, retries, idempotency and a defined source of truth.

## Executed operations

1. Create the collection with strict JSON Schema validation and a unique partial ISBN index.
2. Insert five catalogue documents and retrieve three Computing titles sorted by publication year.
3. Insert temporary document 99, atomically add language metadata and a second genre, then delete it.
4. Reject a negative replacement cost with MongoDB error 121 and a duplicate ISBN with error 11000.
5. Unwind genres and group titles and average replacement costs. Computing has three titles and an average of NGN 19,000.
6. Verify five documents remain and save an actual query execution plan.

The collection is small; its plan is implementation evidence, not evidence of meaningful speed improvement. The compound multikey index supports genre/year queries, but the optimiser can still prefer a scan for small collections.

## Suitability and trade-offs

The model suits catalogue discovery because title details can be read together and optional metadata can differ by material type. A journal might later add volume/issue fields, while an electronic resource might add a licence URL. JSON Schema still protects important fields: flexible structure does not require accepting invalid data.

Embedding author display names makes catalogue reads simple but duplicates them across titles; correcting a name may require multiple updates. Separate author documents would be preferable if authors have a rich shared identity. Arrays remain bounded here; a large collection's copies should be queried separately rather than growing a huge document.

Relational loans remain a better fit for the circulation workflow's relationships, constraints and transaction demonstrations. MongoDB single-document updates are atomic, but that does not automatically make multi-document circulation rules safe. Multi-document transactions require suitable deployment and deliberate transaction design. This portfolio demonstrates document CRUD, not a replacement transactional lending implementation.

References: [embedding versus references](https://www.mongodb.com/docs/manual/data-modeling/concepts/embedding-vs-references/), [schema validation](https://www.mongodb.com/docs/manual/core/schema-validation/), [aggregation](https://www.mongodb.com/docs/manual/aggregation/).

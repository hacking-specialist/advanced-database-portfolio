# Portfolio 1: Database Design and Modelling

## Case study and scope

The hypothetical MIVA Library Service needs to catalogue titles and physical copies, register borrowers, record staff, issue and return copies, track extensions, and assess fines. It needs accurate availability and borrowing history. The supplied ER diagram is the source of the model; its structure is retained without adding author, payment or category tables.

## Relationships and relational schema

Notation: PK = primary key; FK = foreign key; UQ = unique. All primary keys are generated bigint identities. Every FK is mandatory and restricts deletion of referenced history.

```text
BOOKS(book_id PK, title, author, isbn UQ, publication_year, genre, replacement_cost)
BOOK_COPIES(copy_id PK, book_id FK -> BOOKS, status)
BORROWERS(borrower_id PK, full_name, school_email UQ case-insensitive, email_verified)
STAFF(staff_id PK, full_name, email UQ case-insensitive, role, employment_status)
LOANS(loan_id PK, borrower_id FK -> BORROWERS, copy_id FK -> BOOK_COPIES,
      staff_id FK -> STAFF, borrow_date, due_date, extension_count, loan_status)
RETURNS(return_id PK, loan_id FK UQ -> LOANS, staff_id FK -> STAFF,
        return_date, condition_rating, damage_notes)
FINES(fine_id PK, loan_id FK -> LOANS, charge_type, amount, payment_status)
```

A book has zero or many copies. A borrower, copy or issuing staff member has zero or many loans. A loan has zero or one return and zero or many fines. A staff member receives zero or many returns. `RETURNS.loan_id NOT NULL UNIQUE` implements the diagram's optional one-to-one relationship from a loan to a return. A partial unique index allows many historical loans for a copy but only one active loan.

## Data dictionary

| Entity | Attributes and SQL types | Meaning |
|---|---|---|
| books | book_id bigint; title text; author text; isbn varchar(13); publication_year smallint; genre text; replacement_cost numeric(12,2) | One bibliographic edition; ISBN may be unknown (NULL); cost is NGN |
| book_copies | copy_id bigint; book_id bigint; status text | One physical copy; copy_id is its identifier |
| borrowers | borrower_id bigint; full_name text; school_email text; email_verified boolean | Borrower identity and verified-contact flag |
| staff | staff_id bigint; full_name text; email text; role text; employment_status text | Staff identity and employment eligibility |
| loans | loan_id bigint; borrower_id bigint; copy_id bigint; staff_id bigint; borrow_date date; due_date date; extension_count smallint; loan_status text | One issue event and its current state |
| returns | return_id bigint; loan_id bigint; staff_id bigint; return_date date; condition_rating text; damage_notes text | One completed return, receiving staff and condition |
| fines | fine_id bigint; loan_id bigint; charge_type text; amount numeric(12,2); payment_status text | One assessed charge; all-or-nothing payment status |

All fields are NOT NULL except `books.isbn` and `returns.damage_notes`. The latter becomes mandatory for damaged returns. Exact allowed status values, defaults, lengths and range checks are in `01_schema.sql`.

## Assumed business rules

These are proposed exercise policies, not claims about an actual library. Change them if the lecturer supplies different requirements.

1. Only borrowers with verified emails may borrow. Staff recording issues or returns must be active.
2. A copy must be available before issue. Issue changes its status to on_loan.
3. The default loan is 14 calendar days; the issue function permits 1–60 days.
4. A loan may receive at most two extensions, each of 1–14 days. This initial policy permits extension of overdue active loans.
5. Due dates follow issue dates. Returns cannot precede issue dates.
6. Good or worn returns make the copy available. Damaged returns require notes and make it damaged.
7. Overdue charges are NGN 100 per calendar day after the final due date, assessed on return, with no cap. Damage/replacement charges are entered separately after assessment.
8. Fine amounts must be positive; replacement cost can be zero. A fine is unpaid, paid or waived. Partial payments are outside the supplied model.
9. Historical dates are accepted for reproducible examples. The model does not automatically reject future issue/return dates.

## Enforcement and transaction design

Primary keys, FKs, unique indexes and CHECK constraints enforce row-level rules and referential integrity. `issue_loan`, `record_return` and `extend_loan` enforce workflow rules. They are atomic within the calling transaction and use row locks. The partial unique index independently prevents simultaneous active loans for one copy.

**Use the functions for operational issues, returns and renewals.** Direct table writes by the database owner can bypass cross-table workflow rules and cause conflicting copy/loan/return states. This starter does not claim to prevent owner bypass. `workflow_inconsistencies` detects the two main status mismatches. Restricted application roles and a hardened database API are future work; these functions are SECURITY INVOKER, not privileged functions.

Lost/retired states are represented but automated loss, replacement and retirement workflows are outside this first implementation. Payment status records a simple outcome, not a payment audit trail. No genuine email verification service is implemented.

Example usage (each SELECT is atomic; wrap related operations in BEGIN/COMMIT when needed):

```sql
SELECT library.issue_loan(1, 2, 1, DATE '2026-11-13', 14);
-- Save the returned loan ID and use it below, replacing 123.
SELECT library.extend_loan(123, 7);
SELECT library.record_return(123, 2, DATE '2026-11-25', 'good');
```

## Normalisation

**1NF:** Each row has a primary key and each attribute holds one value under the chosen interpretation. `author` and `genre` are each a single display value. Do not store an array or comma-separated author list and then claim individual authors are modelled relationally.

**2NF:** All seven tables use single-attribute primary keys. Under the stated dependencies, non-key attributes depend on the whole key. The FK pairs in loans are not composite primary keys: a borrower can borrow a copy repeatedly over time.

**3NF:** The intended functional dependencies are:

```text
book_id -> title, author, isbn, publication_year, genre, replacement_cost
copy_id -> book_id, status
borrower_id -> full_name, school_email, email_verified
staff_id -> full_name, email, role, employment_status
loan_id -> borrower_id, copy_id, staff_id, borrow_date, due_date, extension_count, loan_status
return_id -> loan_id, staff_id, return_date, condition_rating, damage_notes
loan_id -> return_id, staff_id, return_date, condition_rating, damage_notes [within RETURNS only]
fine_id -> loan_id, charge_type, amount, payment_status
```

Book details belong in books rather than repeating on every copy or loan. Borrower and staff details stay in their own tables. Return details are separated from loans and fines permit multiple charges. Under these assumptions no non-key descriptive attribute depends on another non-key descriptive attribute. Known ISBNs uniquely identify editions, but nullable ISBN is not an unconditional candidate key for the whole table.

There is intentional cross-table redundancy: copy status and loan status overlap with information obtainable from active loans and return existence. The workflow functions maintain this redundancy, and the diagnostic view helps detect inconsistencies. Normalisation alone does not enforce workflow consistency. For multiple authors/genres, a later model should introduce author/category entities and junction tables; this implementation preserves the submitted ERD.

## Validation and evidence

Run the five SQL files using the root README. The seed has five books, ten copies, four borrowers, three staff, four loans, two returns and two fines. Expected results before modifying it: seven available copies; two overdue active loans at 2026-11-20; unpaid totals of NGN 300 for Bayo and NGN 2,500 for Chika; zero workflow inconsistencies. These are expected values, not fabricated execution output.

`05_validation.sql` tests FK rejection, email uniqueness, dates, active-loan uniqueness, negative fines, eligibility, issue state, extension limits, return chronology, fine calculation, duplicate returns, damage notes, status consistency and rollback. It passed on both PGlite and native PostgreSQL 18.6. [Native evidence](evidence/native-validation.json) includes all six query results. Multi-session contention and timing experiments are implemented in Portfolios 2 and 3.

## Limitations

ISBN validation checks shape, not checksum or catalogue registration. Email validation checks basic syntax, not ownership or a particular school's domain. Author/genre values are not separately managed entities. Seed data is intentionally small and unsuitable for performance conclusions. No final reflection or server screenshots are supplied on the student's behalf.

## References

- Student-supplied `erd.png`, supplied 13 November 2026.
- [PostgreSQL constraints](https://www.postgresql.org/docs/18/ddl-constraints.html)
- [PostgreSQL partial indexes](https://www.postgresql.org/docs/18/indexes-partial.html)
- [PostgreSQL explicit locking](https://www.postgresql.org/docs/18/explicit-locking.html)
- [PostgreSQL transaction isolation](https://www.postgresql.org/docs/18/transaction-iso.html)

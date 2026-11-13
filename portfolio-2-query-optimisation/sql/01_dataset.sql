-- Fresh database after Portfolio 1. Dedicated schema; operational data untouched.
CREATE SCHEMA optimisation;
CREATE TABLE optimisation.loans AS
SELECT g::bigint AS loan_id,
       ((g * 37) % 5000 + 1)::bigint AS borrower_id,
       g::bigint AS copy_id,
       ((g % 3) + 1)::bigint AS staff_id,
       DATE '2023-01-01' + (g % 1000)::integer AS borrow_date,
       DATE '2023-01-15' + (g % 1000)::integer AS due_date,
       0::smallint AS extension_count,
       CASE WHEN g % 20 = 0 THEN 'active' ELSE 'returned' END::text AS loan_status
FROM generate_series(1, 200000) g;
ALTER TABLE optimisation.loans ADD PRIMARY KEY (loan_id);
ANALYZE optimisation.loans;
-- This is a deterministic analytical workload, not 200,000 validated issue events.

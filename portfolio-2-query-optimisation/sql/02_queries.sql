-- Q1: history for a selected borrower; 40 rows in this dataset.
SELECT loan_id, borrower_id, borrow_date, due_date, loan_status
FROM optimisation.loans WHERE borrower_id = 1234
ORDER BY borrow_date DESC, loan_id;

-- Q2: small due-date range among active loans.
SELECT loan_id, borrower_id, due_date FROM optimisation.loans
WHERE loan_status = 'active' AND due_date >= DATE '2025-01-01' AND due_date < DATE '2025-02-01'
ORDER BY due_date, loan_id;

-- Q3: whole-dataset aggregation; an index is not assumed to help.
SELECT loan_status, count(*) FROM optimisation.loans GROUP BY loan_status ORDER BY loan_status;

-- Q4a/Q4b: equivalent year filter with and without a function on the indexed column.
SELECT count(*) FROM optimisation.loans WHERE EXTRACT(YEAR FROM borrow_date) = 2024;
SELECT count(*) FROM optimisation.loans WHERE borrow_date >= DATE '2024-01-01' AND borrow_date < DATE '2025-01-01';

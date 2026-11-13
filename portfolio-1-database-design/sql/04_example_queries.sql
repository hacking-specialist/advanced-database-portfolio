-- Fixed reporting date makes the examples reproducible.
SELECT * FROM library.available_books ORDER BY book_id, copy_id;

SELECT l.loan_id, br.full_name, b.title, l.due_date,
       DATE '2026-11-20' - l.due_date AS days_overdue
FROM library.loans l JOIN library.borrowers br USING (borrower_id)
JOIN library.book_copies c USING (copy_id) JOIN library.books b USING (book_id)
WHERE l.loan_status = 'active' AND l.due_date < DATE '2026-11-20'
ORDER BY l.due_date, l.loan_id;

SELECT * FROM library.outstanding_fines ORDER BY borrower_id;

SELECT l.loan_id, br.full_name, b.title, issuer.full_name AS issued_by,
       r.return_date, receiver.full_name AS received_by, r.condition_rating
FROM library.loans l JOIN library.borrowers br USING (borrower_id)
JOIN library.book_copies c USING (copy_id) JOIN library.books b USING (book_id)
JOIN library.staff issuer ON issuer.staff_id = l.staff_id
LEFT JOIN library.returns r USING (loan_id)
LEFT JOIN library.staff receiver ON receiver.staff_id = r.staff_id
ORDER BY l.loan_id;

SELECT b.book_id, b.title, count(l.loan_id) AS loan_count
FROM library.books b LEFT JOIN library.book_copies c USING (book_id)
LEFT JOIN library.loans l USING (copy_id)
GROUP BY b.book_id, b.title ORDER BY loan_count DESC, b.book_id;

-- Expected: zero rows.
SELECT * FROM library.workflow_inconsistencies;

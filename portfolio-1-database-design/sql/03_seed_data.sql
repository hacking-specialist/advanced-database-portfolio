-- Synthetic demonstration data. Run once, after schema and operations.
BEGIN;
INSERT INTO library.books(title, author, isbn, publication_year, genre, replacement_cost) VALUES
('Database Foundations', 'Ada Example', '9780000000019', 2022, 'Computing', 18000),
('Distributed Data Practice', 'Bola Example', '9780000000026', 2023, 'Computing', 24000),
('Learning SQL', 'Chidi Example', '9780000000033', 2021, 'Computing', 15000),
('Introduction to Research', 'Dara Example', '9780000000040', 2020, 'Research', 12000),
('Digital Libraries', 'Efe Example', '9780000000057', 2024, 'Library Science', 20000);
INSERT INTO library.borrowers(full_name, school_email, email_verified) VALUES
('Amara Sample', 'amara@student.example.edu', true),
('Bayo Sample', 'bayo@student.example.edu', true),
('Chika Sample', 'chika@student.example.edu', true),
('Dami Sample', 'dami@student.example.edu', false);
INSERT INTO library.staff(full_name, email, role, employment_status) VALUES
('Lara Sample', 'lara@library.example.edu', 'librarian', 'active'),
('Tunde Sample', 'tunde@library.example.edu', 'assistant', 'active'),
('Zara Sample', 'zara@library.example.edu', 'administrator', 'inactive');
INSERT INTO library.book_copies(book_id)
SELECT b.book_id FROM library.books b CROSS JOIN generate_series(1, 2) AS copies(n)
ORDER BY b.book_id, copies.n;
DO $$
DECLARE v_loan bigint;
BEGIN
    PERFORM library.issue_loan(1, 1, 1, DATE '2026-11-01', 14);
    v_loan := library.issue_loan(2, 3, 1, DATE '2026-10-01', 14);
    PERFORM library.record_return(v_loan, 2, DATE '2026-10-18', 'good');
    v_loan := library.issue_loan(3, 5, 2, DATE '2026-10-10', 14);
    PERFORM library.record_return(v_loan, 1, DATE '2026-10-20', 'damaged', 'Cover detached on return');
    INSERT INTO library.fines(loan_id, charge_type, amount) VALUES (v_loan, 'damage', 2500);
    PERFORM library.issue_loan(2, 7, 2, DATE '2026-11-02', 14);
END;
$$;
COMMIT;

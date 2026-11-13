-- Run after seed data. All test data changes roll back; identity gaps are normal.
BEGIN;
DO $$
DECLARE v_loan bigint; v_return bigint; v_count integer;
BEGIN
    IF EXISTS (SELECT 1 FROM library.workflow_inconsistencies) THEN
        RAISE EXCEPTION 'FAIL: seeded workflow consistency';
    END IF;
    SELECT count(*) INTO v_count FROM library.available_books;
    IF v_count <> 7 THEN RAISE EXCEPTION 'FAIL: expected seven available copies'; END IF;
    BEGIN
        INSERT INTO library.book_copies(book_id) VALUES (-1);
        RAISE EXCEPTION 'FAIL: missing book accepted';
    EXCEPTION WHEN foreign_key_violation THEN NULL;
    END;
    BEGIN
        INSERT INTO library.borrowers(full_name, school_email) VALUES ('Duplicate', 'AMARA@student.example.edu');
        RAISE EXCEPTION 'FAIL: duplicate email accepted';
    EXCEPTION WHEN unique_violation THEN NULL;
    END;
    BEGIN
        INSERT INTO library.loans(borrower_id, copy_id, staff_id, borrow_date, due_date)
        VALUES (1, 2, 1, DATE '2026-11-13', DATE '2026-11-12');
        RAISE EXCEPTION 'FAIL: invalid dates accepted';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
    BEGIN
        INSERT INTO library.loans(borrower_id, copy_id, staff_id, borrow_date, due_date)
        VALUES (2, 1, 1, DATE '2026-11-13', DATE '2026-11-27');
        RAISE EXCEPTION 'FAIL: duplicate active loan accepted';
    EXCEPTION WHEN unique_violation THEN NULL;
    END;
    BEGIN
        INSERT INTO library.fines(loan_id, charge_type, amount) VALUES (1, 'damage', -10);
        RAISE EXCEPTION 'FAIL: negative fine accepted';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
    BEGIN
        PERFORM library.issue_loan(4, 2, 1, DATE '2026-11-13', 14);
        RAISE EXCEPTION 'FAIL: unverified borrower accepted';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM <> 'Borrower does not exist or email is unverified' THEN RAISE; END IF;
    END;
    BEGIN
        PERFORM library.issue_loan(1, 2, 3, DATE '2026-11-13', 14);
        RAISE EXCEPTION 'FAIL: inactive staff accepted';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM <> 'Issuing staff member must be active' THEN RAISE; END IF;
    END;
    v_loan := library.issue_loan(1, 2, 1, DATE '2026-11-01', 14);
    IF (SELECT status FROM library.book_copies WHERE copy_id = 2) <> 'on_loan' THEN
        RAISE EXCEPTION 'FAIL: issue did not update copy';
    END IF;
    BEGIN
        PERFORM library.record_return(v_loan, 1, DATE '2026-10-31');
        RAISE EXCEPTION 'FAIL: early return date accepted';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM <> 'Return date cannot precede borrowing date' THEN RAISE; END IF;
    END;
    PERFORM library.extend_loan(v_loan, 7);
    PERFORM library.extend_loan(v_loan, 7);
    BEGIN
        PERFORM library.extend_loan(v_loan, 7);
        RAISE EXCEPTION 'FAIL: third extension accepted';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM <> 'Loan must be active and have fewer than two extensions' THEN RAISE; END IF;
    END;
    v_return := library.record_return(v_loan, 1, DATE '2026-12-02', 'good');
    IF NOT EXISTS (SELECT 1 FROM library.fines WHERE loan_id = v_loan AND amount = 300 AND charge_type = 'overdue') THEN
        RAISE EXCEPTION 'FAIL: overdue fine calculation';
    END IF;
    IF (SELECT status FROM library.book_copies WHERE copy_id = 2) <> 'available' THEN
        RAISE EXCEPTION 'FAIL: return did not release copy';
    END IF;
    BEGIN
        INSERT INTO library.returns(loan_id, staff_id, return_date, condition_rating)
        VALUES (v_loan, 1, DATE '2026-12-02', 'good');
        RAISE EXCEPTION 'FAIL: second return accepted';
    EXCEPTION WHEN unique_violation THEN NULL;
    END;
    v_loan := library.issue_loan(1, 2, 1, DATE '2026-12-03', 14);
    BEGIN
        PERFORM library.record_return(v_loan, 1, DATE '2026-12-04', 'damaged', NULL);
        RAISE EXCEPTION 'FAIL: damaged return without notes accepted';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
    PERFORM library.record_return(v_loan, 1, DATE '2026-12-04', 'damaged', 'Torn pages');
    IF (SELECT status FROM library.book_copies WHERE copy_id = 2) <> 'damaged' THEN
        RAISE EXCEPTION 'FAIL: damaged copy made available';
    END IF;
    IF EXISTS (SELECT 1 FROM library.workflow_inconsistencies) THEN
        RAISE EXCEPTION 'FAIL: final workflow consistency';
    END IF;
    RAISE NOTICE 'PASS: constraints, eligibility, issue, extensions, returns, fines and consistency';
END;
$$;
ROLLBACK;
-- The test's issued loans and returns must not persist.
DO $$ BEGIN
    IF (SELECT count(*) FROM library.loans) <> 4 THEN RAISE EXCEPTION 'FAIL: test rollback'; END IF;
    RAISE NOTICE 'PASS: rollback restored four seeded loans';
END $$;

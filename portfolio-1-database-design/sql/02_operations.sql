-- Supported workflow API. Functions run inside the caller's transaction.
BEGIN;
CREATE FUNCTION library.issue_loan(
    p_borrower_id bigint, p_copy_id bigint, p_staff_id bigint,
    p_borrow_date date DEFAULT CURRENT_DATE, p_loan_days integer DEFAULT 14
) RETURNS bigint LANGUAGE plpgsql SET search_path = pg_catalog, library AS $$
DECLARE v_status text; v_id bigint;
BEGIN
    IF p_borrow_date IS NULL OR p_loan_days IS NULL OR p_loan_days NOT BETWEEN 1 AND 60 THEN
        RAISE EXCEPTION 'Provide an issue date and a loan duration of 1 to 60 days';
    END IF;
    PERFORM 1 FROM library.borrowers WHERE borrower_id = p_borrower_id AND email_verified FOR SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Borrower does not exist or email is unverified'; END IF;
    PERFORM 1 FROM library.staff WHERE staff_id = p_staff_id AND employment_status = 'active' FOR SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Issuing staff member must be active'; END IF;
    SELECT status INTO v_status FROM library.book_copies WHERE copy_id = p_copy_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Copy does not exist'; END IF;
    IF v_status <> 'available' THEN RAISE EXCEPTION 'Copy is not available'; END IF;
    INSERT INTO library.loans(borrower_id, copy_id, staff_id, borrow_date, due_date)
    VALUES (p_borrower_id, p_copy_id, p_staff_id, p_borrow_date, p_borrow_date + p_loan_days)
    RETURNING loan_id INTO v_id;
    UPDATE library.book_copies SET status = 'on_loan' WHERE copy_id = p_copy_id;
    RETURN v_id;
END;
$$;

CREATE FUNCTION library.record_return(
    p_loan_id bigint, p_staff_id bigint, p_return_date date DEFAULT CURRENT_DATE,
    p_condition text DEFAULT 'good', p_damage_notes text DEFAULT NULL
) RETURNS bigint LANGUAGE plpgsql SET search_path = pg_catalog, library AS $$
DECLARE v_loan library.loans%ROWTYPE; v_return_id bigint;
BEGIN
    PERFORM 1 FROM library.staff WHERE staff_id = p_staff_id AND employment_status = 'active' FOR SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Receiving staff member must be active'; END IF;
    SELECT * INTO v_loan FROM library.loans WHERE loan_id = p_loan_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Loan does not exist'; END IF;
    IF v_loan.loan_status <> 'active' THEN RAISE EXCEPTION 'Only an active loan can be returned'; END IF;
    IF p_return_date IS NULL OR p_return_date < v_loan.borrow_date THEN
        RAISE EXCEPTION 'Return date cannot precede borrowing date';
    END IF;
    PERFORM 1 FROM library.book_copies WHERE copy_id = v_loan.copy_id FOR UPDATE;
    INSERT INTO library.returns(loan_id, staff_id, return_date, condition_rating, damage_notes)
    VALUES (p_loan_id, p_staff_id, p_return_date, p_condition, p_damage_notes)
    RETURNING return_id INTO v_return_id;
    UPDATE library.loans SET loan_status = 'returned' WHERE loan_id = p_loan_id;
    UPDATE library.book_copies
        SET status = CASE WHEN p_condition = 'damaged' THEN 'damaged' ELSE 'available' END
        WHERE copy_id = v_loan.copy_id;
    -- Assumed demonstration rate: NGN 100 per overdue calendar day, no cap.
    IF p_return_date > v_loan.due_date THEN
        INSERT INTO library.fines(loan_id, charge_type, amount)
        VALUES (p_loan_id, 'overdue', (p_return_date - v_loan.due_date) * 100.00);
    END IF;
    RETURN v_return_id;
END;
$$;

CREATE FUNCTION library.extend_loan(p_loan_id bigint, p_extra_days integer DEFAULT 7)
RETURNS date LANGUAGE plpgsql SET search_path = pg_catalog, library AS $$
DECLARE v_loan library.loans%ROWTYPE; v_due_date date;
BEGIN
    IF p_extra_days IS NULL OR p_extra_days NOT BETWEEN 1 AND 14 THEN
        RAISE EXCEPTION 'Extension must be between 1 and 14 days';
    END IF;
    SELECT * INTO v_loan FROM library.loans WHERE loan_id = p_loan_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Loan does not exist'; END IF;
    IF v_loan.loan_status <> 'active' OR v_loan.extension_count >= 2 THEN
        RAISE EXCEPTION 'Loan must be active and have fewer than two extensions';
    END IF;
    UPDATE library.loans SET due_date = due_date + p_extra_days, extension_count = extension_count + 1
    WHERE loan_id = p_loan_id RETURNING due_date INTO v_due_date;
    RETURN v_due_date;
END;
$$;

CREATE VIEW library.available_books AS
SELECT b.book_id, b.title, b.author, c.copy_id
FROM library.books b JOIN library.book_copies c USING (book_id)
WHERE c.status = 'available';

CREATE VIEW library.outstanding_fines AS
SELECT br.borrower_id, br.full_name, sum(f.amount) AS outstanding_ngn
FROM library.borrowers br JOIN library.loans l USING (borrower_id)
JOIN library.fines f USING (loan_id)
WHERE f.payment_status = 'unpaid' GROUP BY br.borrower_id, br.full_name;

-- Diagnostic for accidental direct writes bypassing the workflow API.
CREATE VIEW library.workflow_inconsistencies AS
SELECT 'copy_status'::text AS problem, c.copy_id AS entity_id
FROM library.book_copies c
WHERE (c.status = 'on_loan') <> EXISTS (
    SELECT 1 FROM library.loans l WHERE l.copy_id = c.copy_id AND l.loan_status = 'active')
UNION ALL
SELECT 'return_status', l.loan_id FROM library.loans l
WHERE (l.loan_status = 'returned') <> EXISTS (
    SELECT 1 FROM library.returns r WHERE r.loan_id = l.loan_id);
COMMIT;

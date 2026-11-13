CREATE INDEX loans_borrower_date ON optimisation.loans(borrower_id, borrow_date DESC, loan_id);
CREATE INDEX loans_active_due ON optimisation.loans(due_date, loan_id) WHERE loan_status = 'active';
CREATE INDEX loans_borrow_date ON optimisation.loans(borrow_date);
ANALYZE optimisation.loans;

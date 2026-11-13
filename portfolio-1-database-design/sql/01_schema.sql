-- PostgreSQL 18. Run once in an empty database. No existing objects are dropped.
BEGIN;
CREATE SCHEMA library;

CREATE TABLE library.books (
    book_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title text NOT NULL CHECK (btrim(title) <> ''),
    author text NOT NULL CHECK (btrim(author) <> ''),
    isbn varchar(13) UNIQUE CHECK (isbn ~ '^([0-9]{9}[0-9X]|[0-9]{13})$'),
    publication_year smallint NOT NULL CHECK (publication_year BETWEEN 1000 AND 9999),
    genre text NOT NULL CHECK (btrim(genre) <> ''),
    replacement_cost numeric(12,2) NOT NULL CHECK (replacement_cost >= 0)
);

CREATE TABLE library.borrowers (
    borrower_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    full_name text NOT NULL CHECK (btrim(full_name) <> ''),
    school_email text NOT NULL CHECK (school_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
    email_verified boolean NOT NULL DEFAULT false
);
CREATE UNIQUE INDEX borrowers_email_unique ON library.borrowers (lower(school_email));

CREATE TABLE library.staff (
    staff_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    full_name text NOT NULL CHECK (btrim(full_name) <> ''),
    email text NOT NULL CHECK (email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
    role text NOT NULL CHECK (role IN ('librarian', 'assistant', 'administrator')),
    employment_status text NOT NULL DEFAULT 'active'
        CHECK (employment_status IN ('active', 'inactive'))
);
CREATE UNIQUE INDEX staff_email_unique ON library.staff (lower(email));

CREATE TABLE library.book_copies (
    copy_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    book_id bigint NOT NULL REFERENCES library.books(book_id) ON DELETE RESTRICT,
    status text NOT NULL DEFAULT 'available'
        CHECK (status IN ('available', 'on_loan', 'damaged', 'lost', 'retired'))
);

CREATE TABLE library.loans (
    loan_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    borrower_id bigint NOT NULL REFERENCES library.borrowers(borrower_id) ON DELETE RESTRICT,
    copy_id bigint NOT NULL REFERENCES library.book_copies(copy_id) ON DELETE RESTRICT,
    staff_id bigint NOT NULL REFERENCES library.staff(staff_id) ON DELETE RESTRICT,
    borrow_date date NOT NULL DEFAULT CURRENT_DATE,
    due_date date NOT NULL,
    extension_count smallint NOT NULL DEFAULT 0 CHECK (extension_count BETWEEN 0 AND 2),
    loan_status text NOT NULL DEFAULT 'active' CHECK (loan_status IN ('active', 'returned', 'lost')),
    CONSTRAINT loan_dates_valid CHECK (due_date > borrow_date)
);
-- A database-level guarantee, including when concurrent sessions insert loans.
CREATE UNIQUE INDEX one_active_loan_per_copy ON library.loans(copy_id)
    WHERE loan_status = 'active';

CREATE TABLE library.returns (
    return_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    loan_id bigint NOT NULL UNIQUE REFERENCES library.loans(loan_id) ON DELETE RESTRICT,
    staff_id bigint NOT NULL REFERENCES library.staff(staff_id) ON DELETE RESTRICT,
    return_date date NOT NULL DEFAULT CURRENT_DATE,
    condition_rating text NOT NULL CHECK (condition_rating IN ('good', 'worn', 'damaged')),
    damage_notes text,
    CONSTRAINT damaged_return_notes CHECK (
        condition_rating <> 'damaged' OR NULLIF(btrim(damage_notes), '') IS NOT NULL
    )
);

CREATE TABLE library.fines (
    fine_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    loan_id bigint NOT NULL REFERENCES library.loans(loan_id) ON DELETE RESTRICT,
    charge_type text NOT NULL CHECK (charge_type IN ('overdue', 'damage', 'replacement')),
    amount numeric(12,2) NOT NULL CHECK (amount > 0),
    payment_status text NOT NULL DEFAULT 'unpaid'
        CHECK (payment_status IN ('unpaid', 'paid', 'waived'))
);
COMMENT ON COLUMN library.books.author IS 'Single display value retained from supplied ERD; no separate author entity.';
COMMENT ON COLUMN library.books.replacement_cost IS 'NGN, an assumed project-wide currency.';
COMMENT ON COLUMN library.fines.amount IS 'NGN; partial payments are outside this ERD.';
COMMIT;

# Portfolio 1 — Library Management Database Design

**Project:** Advanced Database Portfolio  
**Stage:** Portfolio 1 — logical design (SQL implementation and tests pending)  
**Date:** 8 October 2026

This folder documents a seven-entity relational model for a school library management system. The design includes books, physical copies, borrowers, loans, returns, fines and staff, along with circulation rules and staff authorization.

## Files
- `database-design-report.docx` — full design report
- `erd.mmd` — editable Mermaid entity-relationship diagram

## View the ERD
```mermaid
erDiagram
    BOOKS ||--o{ BOOK_COPIES : has
    BOOK_COPIES ||--o{ LOANS : appears_in
    BORROWERS ||--o{ LOANS : takes
    STAFF ||--o{ LOANS : processes
    STAFF ||--o{ RETURNS : processes
    LOANS ||--o| RETURNS : has
    LOANS ||--o{ FINES : incurs
    BOOKS {
      varchar book_id PK
      varchar title
      varchar author
      varchar isbn UK
      int publication_year
      varchar genre
      decimal replacement_cost
    }
    BOOK_COPIES {
      varchar copy_id PK
      varchar book_id FK
      varchar status
    }
    BORROWERS {
      varchar borrower_id PK
      varchar full_name
      varchar school_email UK
      boolean email_verified
    }
    STAFF {
      varchar staff_id PK
      varchar full_name
      varchar email UK
      varchar role
      varchar employment_status
    }
    LOANS {
      varchar loan_id PK
      varchar borrower_id FK
      varchar copy_id FK
      varchar staff_id FK
      date borrow_date
      date due_date
      int extension_count
      varchar loan_status
    }
    RETURNS {
      varchar return_id PK
      varchar loan_id FK,UK
      varchar staff_id FK
      date return_date
      int condition_rating
      varchar damage_notes
    }
    FINES {
      varchar fine_id PK
      varchar loan_id FK
      varchar charge_type
      decimal amount
      varchar payment_status
    }
```

## Scope
Designed: data dictionary, cardinalities, constraints, circulation and fine policies.  
Not yet implemented or tested: SQL DDL, automatic reminders, role-based enforcement, replacement processing, renewal approval, payment processing.

## Next steps
1. Review and approve the logical design.
2. Implement SQL schema and constraints.
3. Add representative seed data and queries.
4. Test borrowing, returns, overdue restrictions, fines, and permissions.

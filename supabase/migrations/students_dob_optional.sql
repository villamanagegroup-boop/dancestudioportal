-- Make student date_of_birth optional.
-- The CSV/PDF import allows students without a birthdate (filled in later),
-- so the column must be nullable. No-op if it is already nullable.
alter table students alter column date_of_birth drop not null;

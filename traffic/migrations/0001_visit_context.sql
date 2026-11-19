-- Existing databases created before visit context was introduced.
ALTER TABLE visits ADD COLUMN context TEXT CHECK (context IS NULL OR json_valid(context));

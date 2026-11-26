ALTER TABLE products ADD COLUMN deleted_at TEXT CHECK (deleted_at IS NULL OR active = 0);

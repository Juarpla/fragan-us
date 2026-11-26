ALTER TABLE orders ADD COLUMN document_type TEXT CHECK (document_type IN ('DNI', 'CE'));
ALTER TABLE orders ADD COLUMN document_number TEXT;
CREATE INDEX orders_by_document ON orders(document_number) WHERE document_number IS NOT NULL;

ALTER TABLE products ADD COLUMN edit_version INTEGER NOT NULL DEFAULT 0;

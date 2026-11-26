ALTER TABLE orders ADD COLUMN receipt_submitted_at TEXT;
ALTER TABLE orders ADD COLUMN preparation_started_at TEXT;
ALTER TABLE orders ADD COLUMN shipping_receipt_key TEXT;
ALTER TABLE orders ADD COLUMN pickup_password TEXT;

CREATE TRIGGER order_records_receipt
AFTER UPDATE OF status ON orders
WHEN NEW.status = 'PENDING_VERIFICATION' AND OLD.status <> NEW.status AND NEW.receipt_submitted_at IS NULL
BEGIN
  UPDATE orders SET receipt_submitted_at = CURRENT_TIMESTAMP WHERE order_code = NEW.order_code;
END;

CREATE TRIGGER order_records_preparation
AFTER UPDATE OF status ON orders
WHEN NEW.status = 'PACKING' AND OLD.status <> NEW.status AND NEW.preparation_started_at IS NULL
BEGIN
  UPDATE orders SET preparation_started_at = CURRENT_TIMESTAMP WHERE order_code = NEW.order_code;
END;

ALTER TABLE products ADD COLUMN inspiration_name TEXT;
ALTER TABLE products ADD COLUMN inspiration_image_url TEXT;

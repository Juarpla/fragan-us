CREATE TABLE orders_with_shipping_confirmation (
  order_code TEXT PRIMARY KEY,
  checkout_id TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  city TEXT NOT NULL,
  shipping_address TEXT NOT NULL,
  shipping_method TEXT NOT NULL CHECK (shipping_method IN ('TRUJILLO', 'OLVA', 'SHALOM')),
  items_json TEXT NOT NULL CHECK (json_valid(items_json)),
  total_cents INTEGER NOT NULL CHECK (total_cents > 0),
  freight_cents INTEGER CHECK (freight_cents BETWEEN 0 AND 999999),
  payment_method TEXT CHECK (payment_method IN ('YAPE', 'PLIN')),
  receipt_r2_key TEXT,
  is_demo INTEGER NOT NULL DEFAULT 0 CHECK (is_demo IN (0, 1)),
  status TEXT NOT NULL CHECK (status IN ('PENDING_CONFIRMATION', 'AWAITING_PAYMENT', 'PENDING_VERIFICATION', 'PAID', 'SHIPPED', 'CANCELLED')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK ((payment_method IS NULL) = (receipt_r2_key IS NULL)),
  CHECK (status <> 'AWAITING_PAYMENT' OR (shipping_method = 'SHALOM' AND freight_cents IS NOT NULL)),
  CHECK (status NOT IN ('PENDING_VERIFICATION', 'PAID', 'SHIPPED') OR receipt_r2_key IS NOT NULL)
);

INSERT INTO orders_with_shipping_confirmation (
  order_code, checkout_id, customer_name, customer_phone, city, shipping_address, shipping_method,
  items_json, total_cents, payment_method, receipt_r2_key, is_demo, status, created_at
)
SELECT order_code, checkout_id, customer_name, customer_phone, city, shipping_address, shipping_method,
  items_json, total_cents, payment_method, receipt_r2_key, is_demo, status, created_at
FROM orders;

DROP TABLE orders;
ALTER TABLE orders_with_shipping_confirmation RENAME TO orders;
CREATE INDEX orders_by_status ON orders(status, created_at);

-- A confirmed request reserves stock before the shopper receives payment details.
-- Orders from before this migration still deduct stock at payment approval.
CREATE TRIGGER order_transition_commits_inventory
BEFORE UPDATE OF status ON orders
WHEN (OLD.status = 'PENDING_CONFIRMATION' AND NEW.status = 'AWAITING_PAYMENT')
  OR (OLD.status = 'PENDING_VERIFICATION' AND NEW.status = 'PAID' AND OLD.freight_cents IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'INSUFFICIENT_STOCK')
  WHERE EXISTS (
    SELECT 1
    FROM json_each(NEW.items_json) AS item
    LEFT JOIN products ON products.slug = json_extract(item.value, '$.slug')
    WHERE products.slug IS NULL OR products.stock < json_extract(item.value, '$.quantity')
      OR (OLD.status = 'PENDING_CONFIRMATION' AND products.active = 0)
  );

  UPDATE products
  SET stock = stock - (
    SELECT json_extract(item.value, '$.quantity')
    FROM json_each(NEW.items_json) AS item
    WHERE json_extract(item.value, '$.slug') = products.slug
  )
  WHERE slug IN (SELECT json_extract(value, '$.slug') FROM json_each(NEW.items_json));
END;

CREATE TRIGGER order_cancellation_releases_inventory
BEFORE UPDATE OF status ON orders
WHEN OLD.status IN ('AWAITING_PAYMENT', 'PENDING_VERIFICATION')
  AND NEW.status = 'CANCELLED' AND OLD.freight_cents IS NOT NULL
BEGIN
  UPDATE products
  SET stock = stock + (
    SELECT json_extract(item.value, '$.quantity')
    FROM json_each(OLD.items_json) AS item
    WHERE json_extract(item.value, '$.slug') = products.slug
  )
  WHERE slug IN (SELECT json_extract(value, '$.slug') FROM json_each(OLD.items_json));
END;

CREATE TABLE orders_next (
  order_code TEXT PRIMARY KEY,
  checkout_id TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  city TEXT NOT NULL,
  shipping_address TEXT NOT NULL,
  shipping_method TEXT NOT NULL CHECK (shipping_method IN ('TRUJILLO', 'OLVA', 'SHALOM')),
  agency_id INTEGER,
  destination_ubigeo TEXT,
  whatsapp_offers INTEGER NOT NULL DEFAULT 0 CHECK (whatsapp_offers IN (0, 1)),
  items_json TEXT NOT NULL CHECK (json_valid(items_json)),
  total_cents INTEGER NOT NULL CHECK (total_cents > 0),
  freight_cents INTEGER CHECK (freight_cents BETWEEN 0 AND 999999),
  payment_method TEXT CHECK (payment_method IN ('YAPE', 'PLIN')),
  receipt_r2_key TEXT,
  is_demo INTEGER NOT NULL DEFAULT 0 CHECK (is_demo IN (0, 1)),
  status TEXT NOT NULL CHECK (status IN ('PENDING_CONFIRMATION', 'AWAITING_PAYMENT', 'EXPIRED', 'PENDING_VERIFICATION', 'PAID', 'PACKING', 'SHIPPED', 'CANCELLED')),
  stock_reserved INTEGER NOT NULL DEFAULT 0 CHECK (stock_reserved IN (0, 1)),
  reserved_until TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  shipped_at TEXT,
  archive_at TEXT GENERATED ALWAYS AS (
    datetime(shipped_at, CASE strftime('%w', shipped_at, '-5 hours')
      WHEN '0' THEN '+5 days' WHEN '6' THEN '+6 days' ELSE '+7 days' END)
  ) VIRTUAL,
  CHECK (payment_method IS NULL OR receipt_r2_key IS NOT NULL),
  CHECK (status NOT IN ('PENDING_VERIFICATION', 'PAID', 'PACKING', 'SHIPPED') OR receipt_r2_key IS NOT NULL)
);

-- Legacy shipments lack a dispatch timestamp. Give them the same grace period from migration.
INSERT INTO orders_next (order_code, checkout_id, customer_name, customer_phone, city, shipping_address, shipping_method,
  agency_id, destination_ubigeo, whatsapp_offers, items_json, total_cents, freight_cents, payment_method,
  receipt_r2_key, is_demo, status, stock_reserved, reserved_until, created_at, shipped_at)
SELECT order_code, checkout_id, customer_name, customer_phone, city, shipping_address, shipping_method,
  agency_id, destination_ubigeo, whatsapp_offers, items_json, total_cents, freight_cents, payment_method,
  receipt_r2_key, is_demo, status, stock_reserved, reserved_until, created_at, CASE WHEN status = 'SHIPPED' THEN CURRENT_TIMESTAMP END
FROM orders;

DROP TABLE orders;
ALTER TABLE orders_next RENAME TO orders;

CREATE INDEX orders_by_status ON orders(status, created_at);
CREATE INDEX orders_by_reservation ON orders(reserved_until) WHERE status = 'AWAITING_PAYMENT' AND reserved_until IS NOT NULL;

CREATE TRIGGER order_reserves_inventory
AFTER INSERT ON orders
WHEN NEW.status = 'AWAITING_PAYMENT' AND NEW.stock_reserved = 1
BEGIN
  SELECT RAISE(ABORT, 'INSUFFICIENT_STOCK')
  WHERE EXISTS (
    SELECT 1 FROM json_each(NEW.items_json) AS item
    LEFT JOIN products ON products.slug = json_extract(item.value, '$.slug')
    WHERE products.slug IS NULL OR products.active = 0 OR products.stock < json_extract(item.value, '$.quantity')
  );

  UPDATE products
  SET stock = stock - (
    SELECT json_extract(item.value, '$.quantity') FROM json_each(NEW.items_json) AS item
    WHERE json_extract(item.value, '$.slug') = products.slug
  )
  WHERE slug IN (SELECT json_extract(value, '$.slug') FROM json_each(NEW.items_json));
END;

-- Older requests can still be paid. An expired reservation with a late receipt
-- consumes stock at approval, as do legacy orders which never reserved stock.
CREATE TRIGGER order_transition_commits_inventory
BEFORE UPDATE OF status ON orders
WHEN (OLD.status = 'PENDING_CONFIRMATION' AND NEW.status = 'AWAITING_PAYMENT')
  OR (OLD.status = 'PENDING_VERIFICATION' AND NEW.status IN ('PAID', 'PACKING') AND OLD.stock_reserved = 0)
BEGIN
  SELECT RAISE(ABORT, 'INSUFFICIENT_STOCK')
  WHERE EXISTS (
    SELECT 1 FROM json_each(NEW.items_json) AS item
    LEFT JOIN products ON products.slug = json_extract(item.value, '$.slug')
    WHERE products.slug IS NULL OR products.stock < json_extract(item.value, '$.quantity')
      OR (OLD.status = 'PENDING_CONFIRMATION' AND products.active = 0)
  );

  UPDATE products
  SET stock = stock - (
    SELECT json_extract(item.value, '$.quantity') FROM json_each(NEW.items_json) AS item
    WHERE json_extract(item.value, '$.slug') = products.slug
  )
  WHERE slug IN (SELECT json_extract(value, '$.slug') FROM json_each(NEW.items_json));
END;

CREATE TRIGGER order_releases_inventory
BEFORE UPDATE OF status ON orders
WHEN OLD.status IN ('AWAITING_PAYMENT', 'PENDING_VERIFICATION')
  AND NEW.status IN ('EXPIRED', 'CANCELLED') AND OLD.stock_reserved = 1
BEGIN
  UPDATE products
  SET stock = stock + (
    SELECT json_extract(item.value, '$.quantity') FROM json_each(OLD.items_json) AS item
    WHERE json_extract(item.value, '$.slug') = products.slug
  )
  WHERE slug IN (SELECT json_extract(value, '$.slug') FROM json_each(OLD.items_json));
END;

CREATE INDEX orders_by_archive ON orders(archive_at) WHERE status = 'SHIPPED';

CREATE TRIGGER order_records_dispatch
AFTER UPDATE OF status ON orders
WHEN NEW.status = 'SHIPPED' AND OLD.status <> 'SHIPPED' AND NEW.shipped_at IS NULL
BEGIN
  UPDATE orders SET shipped_at = CURRENT_TIMESTAMP WHERE order_code = NEW.order_code;
END;

-- Bootstrap schema. Apply D1 migrations before running the storefront.
CREATE TABLE IF NOT EXISTS products (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  price_cents INTEGER NOT NULL CHECK (price_cents BETWEEN 1 AND 16000),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  image_url TEXT NOT NULL,
  volume INTEGER NOT NULL,
  concentration TEXT NOT NULL,
  audience TEXT NOT NULL,
  family TEXT NOT NULL,
  tone TEXT NOT NULL,
  badge TEXT NOT NULL DEFAULT '',
  collections TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(collections)),
  climate TEXT NOT NULL CHECK (json_valid(climate)),
  occasions TEXT NOT NULL CHECK (json_valid(occasions)),
  notes TEXT NOT NULL CHECK (json_valid(notes)),
  description TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1))
);

CREATE TABLE IF NOT EXISTS orders (
  order_code TEXT PRIMARY KEY,
  checkout_id TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  city TEXT NOT NULL,
  shipping_address TEXT NOT NULL,
  shipping_method TEXT NOT NULL CHECK (shipping_method IN ('TRUJILLO', 'OLVA', 'SHALOM')),
  items_json TEXT NOT NULL CHECK (json_valid(items_json)),
  total_cents INTEGER NOT NULL CHECK (total_cents > 0),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('YAPE', 'PLIN')),
  receipt_r2_key TEXT NOT NULL,
  is_demo INTEGER NOT NULL DEFAULT 0 CHECK (is_demo IN (0, 1)),
  status TEXT NOT NULL DEFAULT 'PENDING_VERIFICATION' CHECK (status IN ('PENDING_VERIFICATION', 'PAID', 'SHIPPED', 'CANCELLED')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS abandoned_carts (
  session_id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL DEFAULT '',
  customer_phone TEXT NOT NULL,
  items_json TEXT NOT NULL CHECK (json_valid(items_json)),
  total_cents INTEGER NOT NULL CHECK (total_cents > 0),
  status TEXT NOT NULL DEFAULT 'ABANDONED' CHECK (status IN ('ABANDONED', 'CONVERTED')),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS orders_by_status ON orders(status, created_at);
CREATE INDEX IF NOT EXISTS carts_by_status ON abandoned_carts(status, updated_at);

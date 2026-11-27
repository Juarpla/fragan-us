CREATE TABLE product_share_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_slug TEXT NOT NULL UNIQUE REFERENCES products(slug)
);

INSERT INTO product_share_links (product_slug)
SELECT slug FROM products ORDER BY slug;

CREATE TRIGGER products_assign_share_link
AFTER INSERT ON products
BEGIN
  INSERT INTO product_share_links (product_slug) VALUES (NEW.slug);
END;

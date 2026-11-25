import { sampleCatalog, type Product } from './catalog';

interface ProductRow extends Omit<Product, 'collections' | 'climate' | 'occasions' | 'notes'> {
  collections: string;
  climate: string;
  occasions: string;
  notes: string;
}

export async function getCatalog(env?: StoreEnv): Promise<Product[]> {
  if (env?.DB) {
    try {
      const { results } = await env.DB.prepare('SELECT * FROM products WHERE active = 1 ORDER BY position, name').all<ProductRow>();
      if (results.length > 0 || (env.DEMO_MODE !== 'true' && env.STOREFRONT_PREVIEW !== 'true')) {
        return results.map(row => ({ ...row, collections: JSON.parse(row.collections), climate: JSON.parse(row.climate), occasions: JSON.parse(row.occasions), notes: JSON.parse(row.notes) }));
      }
    } catch (error) {
      console.error('No se pudo leer el catálogo D1.', error);
    }
  }
  return sampleCatalog;
}

export type CartItem = { slug: string; quantity: number };
export type OrderItem = CartItem & { name: string; brand: string; price_cents: number; image_url: string };

export function parseCart(raw: unknown): CartItem[] {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 20) throw new Error('Revisa los productos de tu bolsa.');
  const found = new Set<string>();
  for (const item of raw) {
    if (!item || typeof item.slug !== 'string' || !/^[a-z0-9-]{1,80}$/.test(item.slug) ||
        !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20 || found.has(item.slug)) {
      throw new Error('Revisa las cantidades de tu bolsa.');
    }
    found.add(item.slug);
  }
  return raw.map(({ slug, quantity }) => ({ slug, quantity }));
}

export async function priceCart(db: D1Database, cart: CartItem[]) {
  const placeholders = cart.map(() => '?').join(', ');
  const { results } = await db.prepare(`SELECT slug, name, brand, price_cents, stock, image_url FROM products WHERE active = 1 AND slug IN (${placeholders})`)
    .bind(...cart.map(item => item.slug)).all<Pick<Product, 'slug' | 'name' | 'brand' | 'price_cents' | 'stock' | 'image_url'>>();
  const products = new Map(results.map(product => [product.slug, product]));
  const items: OrderItem[] = cart.map(({ slug, quantity }) => {
    const product = products.get(slug);
    if (!product || product.stock < quantity) throw new Error(`Stock insuficiente para ${product?.name ?? slug}. Actualiza tu bolsa.`);
    return { slug, quantity, name: product.name, brand: product.brand, price_cents: product.price_cents, image_url: product.image_url };
  });
  return { items, total: items.reduce((sum, item) => sum + item.price_cents * item.quantity, 0) };
}

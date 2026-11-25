import type { Product } from '../lib/catalog';

type CartProduct = Pick<Product, 'slug' | 'name' | 'brand' | 'stock' | 'price_cents' | 'image_url'>;
export type Line = CartProduct & { quantity: number };
const CART_KEY = 'fraganus:cart:v1';
const SESSION_KEY = 'fraganus:cart-session:v1';
const CHECKOUT_KEY = 'fraganus:checkout:v1';
let memoryCart: Line[] = [];
const memoryIds = new Map<string, string>();

export function readCart(): Line[] {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const lines = JSON.parse(raw);
    return Array.isArray(lines) ? lines.filter(line =>
      line && typeof line.slug === 'string' && /^[a-z0-9-]{1,80}$/.test(line.slug) &&
      typeof line.name === 'string' && typeof line.brand === 'string' &&
      typeof line.image_url === 'string' && /^\/[^/]/.test(line.image_url) &&
      Number.isInteger(line.price_cents) && line.price_cents > 0 &&
      Number.isInteger(line.stock) && Number.isInteger(line.quantity) && line.quantity > 0 && line.quantity <= 20
    ) : [];
  } catch {
    return memoryCart;
  }
}

function saveCart(lines: Line[]) {
  memoryCart = lines;
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(lines));
    localStorage.removeItem(CHECKOUT_KEY);
  } catch { /* Use the in-memory cart when storage is unavailable. */ }
  memoryIds.delete(CHECKOUT_KEY);
  window.dispatchEvent(new Event('fraganus:cart'));
}

export function addProduct(product: CartProduct) {
  const lines = readCart();
  const index = lines.findIndex(line => line.slug === product.slug);
  const quantity = index < 0 ? 0 : lines[index].quantity;
  if (quantity >= Math.min(product.stock, 20)) return false;
  if (index < 0 && lines.length >= 20) return false;
  const line = { ...product, quantity: quantity + 1 };
  if (index < 0) lines.push(line);
  else lines[index] = line;
  saveCart(lines);
  return true;
}

export function updateQuantity(slug: string, change: number | 'remove') {
  const lines = readCart();
  const line = lines.find(item => item.slug === slug);
  if (!line) return;
  const quantity = change === 'remove' ? 0 : Math.min(line.stock, 20, line.quantity + change);
  saveCart(lines.flatMap(item => item !== line ? [item] : quantity > 0 ? [{ ...line, quantity }] : []));
}

export const totalCart = (lines: Line[]) => lines.reduce((sum, line) => sum + line.quantity * line.price_cents, 0);
export const compactCart = (lines: Line[]) => lines.map(({ slug, quantity }) => ({ slug, quantity }));

function storageId(key: string) {
  try {
    const value = localStorage.getItem(key);
    if (value) return value;
    const id = crypto.randomUUID();
    localStorage.setItem(key, id);
    return id;
  } catch {
    if (!memoryIds.has(key)) memoryIds.set(key, crypto.randomUUID());
    return memoryIds.get(key)!;
  }
}

export const sessionId = () => storageId(SESSION_KEY);
export const checkoutId = () => storageId(CHECKOUT_KEY);

export function completeCheckout() {
  saveCart([]);
  try { localStorage.removeItem(SESSION_KEY); } catch { /* Storage is optional. */ }
  memoryIds.delete(SESSION_KEY);
}

export function cartChanged(render: () => void) {
  window.addEventListener('fraganus:cart', render);
  window.addEventListener('storage', event => {
    if (event.key === CART_KEY || event.key === null) render();
  });
  window.addEventListener('pageshow', render);
}

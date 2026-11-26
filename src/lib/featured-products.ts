import type { Product } from './catalog';

const limaDate = new Intl.DateTimeFormat('en', {
  timeZone: 'America/Lima', year: 'numeric', month: 'numeric', day: 'numeric',
});
const featuredCount = 4;

function dailyWindow(products: Product[], count: number, dayIndex: number) {
  if (count <= 0) return [];
  if (products.length <= count) return products;

  // Replace as many slots as possible each day, including in small inventories.
  const advancement = Math.min(count, products.length - count);
  const start = (dayIndex * advancement) % products.length;
  return [...products.slice(start), ...products.slice(0, start)].slice(0, count);
}

export function selectFeaturedProducts(products: Product[], now = new Date()) {
  const { year, month, day } = Object.fromEntries(limaDate.formatToParts(now).map(({ type, value }) => [type, Number(value)]));
  const dayIndex = Date.UTC(year, month - 1, day) / 86_400_000;
  const available = dailyWindow(products.filter(product => product.stock > 0), featuredCount, dayIndex);
  const remaining = featuredCount - available.length;
  if (!remaining) return available;

  return [...available, ...dailyWindow(products.filter(product => product.stock <= 0), remaining, dayIndex)];
}

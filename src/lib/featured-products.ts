import type { Product } from './catalog';

const limaDate = new Intl.DateTimeFormat('en', {
  timeZone: 'America/Lima', year: 'numeric', month: 'numeric', day: 'numeric',
});
const featuredCount = 4;

export function selectFeaturedProducts(products: Product[], now = new Date()) {
  const available = products.filter(product => product.stock > 0);
  if (available.length <= featuredCount) return available;

  const { year, month, day } = Object.fromEntries(limaDate.formatToParts(now).map(({ type, value }) => [type, Number(value)]));
  const dayIndex = Date.UTC(year, month - 1, day) / 86_400_000;
  // Replace as many slots as possible each day, including in small inventories.
  const advancement = Math.min(featuredCount, available.length - featuredCount);
  const start = (dayIndex * advancement) % available.length;
  return [...available.slice(start, start + featuredCount), ...available.slice(0, Math.max(0, start + featuredCount - available.length))];
}

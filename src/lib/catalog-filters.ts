import { climateLabel, occasionLabel, type Product } from './catalog';

export const catalogGroups = [
  { label: 'Por clima', id: 'climas', options: climateLabel },
  { label: 'Por ocasión', id: 'ocasiones', options: occasionLabel },
  { label: 'Preferencias', id: 'preferencias', options: { el: 'Para él', ella: 'Para ella', unisex: 'Unisex' } },
];

const audienceKeys = { 'Para él': 'el', 'Para ella': 'ella', Unisex: 'unisex' };
const searchableText = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function catalogSelection(params: URLSearchParams) {
  const requested = params.getAll('f');
  const filters = catalogGroups.flatMap(({ options }) => {
    const match = requested.find(value => Object.hasOwn(options, value));
    return match ? [match] : [];
  });
  const page = Number(params.get('page'));
  return {
    query: (params.get('q') ?? '').trim().slice(0, 80),
    filters,
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
  };
}

export function toggleCatalogFilter(filters: string[], value: string) {
  const group = catalogGroups.find(({ options }) => Object.hasOwn(options, value));
  if (!group) return filters;
  const other = filters.filter(filter => !Object.hasOwn(group.options, filter));
  return filters.includes(value) ? other : [...other, value];
}

export function filterCatalog(products: Product[], filters: string[], query: string) {
  const words = query ? searchableText(query).split(/\s+/) : [];
  return products.filter(product => {
    const tags = [...product.climate, ...product.occasions, audienceKeys[product.audience as keyof typeof audienceKeys]];
    if (!filters.every(filter => tags.includes(filter))) return false;
    if (!words.length) return true;
    const searchable = searchableText([product.name, product.brand, product.family, product.audience, ...Object.values(product.notes)].join(' '));
    return words.every(word => searchable.includes(word));
  });
}

export function catalogParams(filters: string[] = [], query = '', page = 1) {
  const params = new URLSearchParams();
  for (const filter of filters) params.append('f', filter);
  if (query) params.set('q', query);
  if (page > 1) params.set('page', String(page));
  return params.size ? `?${params}` : '';
}

export const catalogHref = (filters: string[] = [], query = '', page = 1) =>
  `/perfumes${catalogParams(filters, query, page)}`;

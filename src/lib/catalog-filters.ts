import { climateLabel, occasionLabel } from './catalog';

export const catalogGroups = [
  { label: 'Por clima', id: 'climas', options: climateLabel },
  { label: 'Por ocasión', id: 'ocasiones', options: occasionLabel },
  { label: 'Preferencias', id: 'preferencias', options: { el: 'Para él', ella: 'Para ella', unisex: 'Unisex', frescos: 'Aromas frescos' } },
];

const available = new Set(catalogGroups.flatMap(group => Object.keys(group.options)));

export function catalogSelection(params: URLSearchParams) {
  const requested = params.get('f') ?? '';
  return {
    query: (params.get('q') ?? '').trim().slice(0, 80),
    filter: available.has(requested) ? requested : '',
  };
}

export function catalogParams(filter: string, query: string) {
  const params = new URLSearchParams();
  if (filter) params.set('f', filter);
  if (query) params.set('q', query);
  return params.size ? `?${params}` : '';
}

export const catalogHref = (filter = '', query = '', anchor = 'catalogo') =>
  `/${catalogParams(filter, query)}#${anchor}`;

import { pathToFileURL } from 'node:url';

const sources = new Map([
  ['lattafa', 'https://www.lattafa-usa.com'],
  ['armaf', 'https://armaf.com'],
  ['rasasi', 'https://rasasionline.com'],
  ['afnan', 'https://afnan.com'],
]);
const fold = text => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
const identity = text => fold(text)
  .replace(/\d+\s*ml\b|\d+(?:\.\d+)?\s*(?:fl\.?\s*)?oz\b|\b(?:eau de parfum|eau de toilette|edp|edt)\b/g, '')
  .replace(/[^a-z0-9]/g, '');
const linesOf = html => html.replace(/<\/?(?:div|li|p|h[1-6]|br)\b[^>]*>/gi, '\n').replace(/<[^>]+>/g, '')
  .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&')
  .split('\n').map(line => line.trim().replace(/\s+/g, ' ')).filter(Boolean);

const families = [
  [/aquatic|marine/i, 'Acuático', 'ice', 'calido', 'diario'],
  [/citrus/i, 'Cítrico', 'peach', 'calido', 'diario'],
  [/gourmand/i, 'Gourmand', 'sand', 'fresco', 'noche'],
  [/floral/i, 'Floral', 'rose'],
  [/woody/i, 'Amaderado', 'sage', 'fresco', 'noche'],
  [/amber|oriental/i, 'Ambarado', 'lilac', 'fresco', 'noche'],
  [/spicy/i, 'Especiado', 'sand', 'fresco', 'noche'],
  [/aromatic/i, 'Aromático', 'sage'],
  [/fruity/i, 'Frutal', 'peach'],
];

const translations = new Map(Object.entries({
  apple: 'manzana', bergamot: 'bergamota', lemon: 'limón', cinnamon: 'canela', grapefruit: 'toronja',
  'watery notes': 'notas acuáticas', plum: 'ciruela', 'orange blossom': 'flor de azahar', cardamom: 'cardamomo',
  ambergris: 'ámbar gris', musk: 'almizcle', patchouli: 'pachulí', driftwood: 'madera flotante',
  ginger: 'jengibre', 'candied fruits': 'frutas confitadas', praline: 'praliné', 'white flowers': 'flores blancas',
  'white florals': 'flores blancas', vanilla: 'vainilla', 'coffee arabica': 'café arábica', 'arabica coffee': 'café arábica',
  'tonka bean': 'haba tonka', 'tonka beans': 'haba tonka', benzoin: 'benjuí', lavender: 'lavanda', pepper: 'pimienta',
  amber: 'ámbar', blackcurrant: 'grosella negra', 'black currant': 'grosella negra', pineapple: 'piña', jasmine: 'jazmín',
  rose: 'rosa', birch: 'abedul', 'black pepper': 'pimienta negra', tobacco: 'tabaco', sandalwood: 'sándalo', cedar: 'cedro',
  clove: 'clavo', nutmeg: 'nuez moscada', saffron: 'azafrán', vetiver: 'vetiver', mint: 'menta', 'pink pepper': 'pimienta rosa',
  raspberry: 'frambuesa', pear: 'pera', peach: 'durazno', orange: 'naranja', honey: 'miel', caramel: 'caramelo',
  leather: 'cuero', coffee: 'café', iris: 'iris', oud: 'oud', 'lily of the valley': 'lirio del valle',
}));
function translatedNotes(raw) {
  const notes = fold(raw ?? '').replace(/\.$/, '').split(/\s*(?:[,;]|\band\b|&)\s*/)
    .map(note => translations.get(note)).filter(Boolean);
  return notes.length ? new Intl.ListFormat('es', { type: 'conjunction' }).format([...new Set(notes)].slice(0, 5)) : '';
}

const concentrationPatterns = [
  [/\bextrait de parfum\b/i, 'Extrait de Parfum'], [/\bpure parf(?:um|ume)\b/i, 'Parfum'],
  [/\b(?:eau de parfum|edp)\b/i, 'EDP'], [/\b(?:eau de toilette|edt)\b/i, 'EDT'],
];
const concentrationsOf = value => concentrationPatterns.filter(([pattern]) => pattern.test(value)).map(([, label]) => label);
const sizesOf = text => [...new Set([...text.matchAll(/\b(\d{1,4})\s*ml\b/gi)].map(match => Number(match[1])))];

export function productFields(product) {
  const lines = linesOf(product.description ?? '');
  const formatted = [product.title, ...(product.tags ?? []), ...(product.variants ?? []).map(v => v.title)].join('\n');
  const specification = [formatted, ...lines].join('\n');
  const sizes = sizesOf(formatted).length ? sizesOf(formatted) : sizesOf(specification);
  const concentrations = concentrationsOf(formatted).length ? concentrationsOf(formatted) : concentrationsOf(specification);
  const gender = lines.find(line => /^(?:gender|for|audience)\s*:/i.test(line)) ?? [product.tags?.join(', '), lines.find(line => /fragrance for (?:women|men)\b/i.test(line))].filter(Boolean).join(' ');
  const audience = /unisex|(?:women|men) and (?:men|women)/i.test(gender) ? 'Unisex'
    : /\bwomen\b|\bfemale\b|pour femme|for her/i.test(gender + ' ' + product.title) ? 'Para ella'
    : /\bmen\b|\bmale\b|pour homme|for him/i.test(gender + ' ' + product.title) ? 'Para él' : '';
  const profile = lines.find(line => /^(?:fragrance family|olfactive family|scent profile|fragrance profile)\s*:/i.test(line))
    ?? specification.match(/\b(?:aromatic aquatic|woody aromatic|amber spicy|amber woody|floral fruity|gourmand)\b/i)?.[0] ?? '';
  const matches = families.filter(([pattern]) => pattern.test(profile));
  const [, , , climate, occasion] = matches.find(([, , , climate]) => climate) ?? [];
  const note = (label, prose) => {
    const index = lines.findIndex(line => label.test(line));
    const inline = lines[index]?.replace(label, '').replace(/^[\s:–—-]+/, '');
    return translatedNotes(inline || (index >= 0 ? lines[index + 1] : null) || specification.match(prose)?.[1]);
  };
  const opening = note(/^(?:top|opening)\s*notes?\b/i, /\bopening with ([^,.]+(?:, [^,.]+)*), the heart reveals/i);
  const heart = note(/^(?:middle|heart)\s*notes?\b/i, /\bthe heart reveals (.+?), resting on a base/i);
  const base = note(/^(?:base|dry\s*down)\s*notes?\b/i, /\bresting on a base of ([^.]+)/i);
  const description = [
    opening && 'Abre con ' + opening + '.',
    heart && 'En el corazón se perciben ' + heart + '.',
    base && 'El fondo reúne ' + base + '.',
  ].filter(Boolean).join(' ');
  return {
    volume: sizes.length === 1 && sizes[0] <= 2000 ? sizes[0] : 0,
    concentration: concentrations.length === 1 ? concentrations[0] : '',
    audience, family: matches.map(([, label]) => label).join(' · ').slice(0, 60),
    tone: matches[0]?.[2] ?? '', description, opening, heart, base, climate, occasion,
  };
}

const timeout = () => AbortSignal.timeout(18000);
async function readJson(url, init) {
  const result = await fetch(url, { redirect: 'error', signal: timeout(), ...init });
  if (!result.ok) throw new Error('HTTP ' + result.status);
  return result.json();
}

export async function findOfficial(candidate) {
  const origin = sources.get(fold(candidate.brand));
  if (!origin) return;
  const search = new URL('/search/suggest.json', origin);
  search.search = new URLSearchParams({ q: candidate.name, 'resources[type]': 'product', 'resources[limit]': '10' });
  const result = await readJson(search);
  const key = identity(candidate.name);
  const handles = new Set(result.resources?.results?.products
    ?.filter(item => identity(item.title) === key && /^[a-z0-9-]{1,140}$/.test(item.handle)).map(item => item.handle));
  const concentration = concentrationsOf(candidate.concentration || candidate.name)[0];
  const size = candidate.volume || sizesOf(candidate.name)[0];
  const matches = await Promise.all([...handles].map(async handle => {
    const source = new URL('/products/' + handle, origin);
    const official = await readJson(source.href + '.js');
    const fields = productFields(official);
    const fits = identity(official.title) === key &&
      (!size || !fields.volume || size === fields.volume) &&
      (!concentration || !fields.concentration || concentration === fields.concentration);
    return fits ? { fields, photo: official.featured_image || official.images?.[0], source } : null;
  }));
  const eligible = matches.filter(Boolean);
  return eligible.length === 1 ? eligible[0] : undefined;
}

async function downloadPhoto(value, source) {
  if (typeof value !== 'string') return;
  const url = new URL(value, source);
  if (url.protocol !== 'https:' || url.username || url.password || (url.origin !== source.origin && url.hostname !== 'cdn.shopify.com')) return;
  url.searchParams.set('width', '1000');
  const response = await fetch(url, { redirect: 'error', signal: timeout() });
  const type = response.headers.get('content-type')?.split(';')[0];
  const max = 8 * 1024 * 1024;
  if (!response.ok || !response.body || !['image/jpeg', 'image/png', 'image/webp'].includes(type) ||
      Number(response.headers.get('content-length')) > max) return;
  const chunks = [];
  let size = 0;
  for await (const chunk of response.body) {
    size += chunk.byteLength;
    if (size > max) return;
    chunks.push(chunk);
  }
  return size ? new Blob(chunks, { type }) : undefined;
}

async function run() {
  const origin = process.env.CATALOG_STORE_URL;
  const token = process.env.CATALOG_ENRICHMENT_TOKEN;
  if (!origin || !token) throw new Error('Configura CATALOG_STORE_URL y CATALOG_ENRICHMENT_TOKEN.');
  const endpoint = new URL('/api/catalog/enrichment', origin);
  const headers = { authorization: 'Bearer ' + token };
  const preview = process.argv.includes('--preview');
  let after = '';
  let failures = 0;

  for (;;) {
    endpoint.searchParams.set('after', after);
    const { products } = await readJson(endpoint, { headers });
    for (const candidate of products) {
      try {
        const match = await findOfficial(candidate);
        if (!match) {
          console.log(candidate.slug + ': sin coincidencia oficial única.');
          continue;
        }
        const form = new FormData();
        form.set('slug', candidate.slug);
        form.set('version', candidate.edit_version);
        for (const [key, value] of Object.entries(match.fields)) {
          const current = key === 'occasion' ? candidate.occasions : key === 'climate' ? candidate.climate
            : candidate.notes[key] ?? candidate[key];
          if (value && (!current || Array.isArray(current) && current.length === 0)) form.set(key, value);
        }
        if (candidate.needsPhoto && match.photo) {
          try {
            const photo = await downloadPhoto(match.photo, match.source);
            if (photo) form.set('photo', photo, 'perfume');
          } catch {
            console.log(candidate.slug + ': foto pendiente.');
          }
        }
        const found = [...form.keys()].slice(2);
        if (!found.length) continue;
        if (preview) console.log(candidate.slug + ': ' + found.join(', ') + ' · ' + match.source);
        else {
          const result = await fetch(endpoint, { method: 'POST', body: form, headers, redirect: 'error', signal: timeout() });
          if (result.status === 409) {
            console.log(candidate.slug + ': ficha editada durante la consulta; se revisará en la próxima ejecución.');
            continue;
          }
          if (!result.ok) throw new Error('HTTP ' + result.status);
          const { changed } = await result.json();
          console.log(candidate.slug + ': ' + changed.join(', ') + ' · ' + match.source);
        }
      } catch (error) {
        failures++;
        console.error(candidate.slug + ': ' + error.message);
      }
    }
    if (products.length < 25) break;
    after = products.at(-1).slug;
  }
  if (failures) process.exitCode = 1;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  run().catch(error => { console.error(error.message); process.exitCode = 1; });
}

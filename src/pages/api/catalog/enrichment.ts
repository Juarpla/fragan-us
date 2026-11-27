import type { APIRoute } from 'astro';
import { parseProduct } from '../../../lib/admin-products';
import { productPhotoPlaceholder, type Product } from '../../../lib/catalog';
import { hasBearerToken, json } from '../../../lib/http';
import { imageFormat, readImageForm } from '../../../lib/images';
import { storeEnv } from '../../../lib/runtime';

type Candidate = Pick<Product, 'slug' | 'name' | 'brand' | 'price_cents' | 'volume' |
  'concentration' | 'audience' | 'family' | 'tone' | 'description' | 'image_url'> & {
  climate: string;
  occasions: string;
  notes: string;
  edit_version: number;
};

const columns = 'slug, name, brand, price_cents, volume, concentration, audience, family, tone, description, image_url, climate, occasions, notes, edit_version';
const missingPhoto = (url: string) => !url || url === productPhotoPlaceholder;

export const GET: APIRoute = async ({ request, url }) => {
  if (!hasBearerToken(request, storeEnv.CATALOG_ENRICHMENT_TOKEN)) return json({ error: 'Acceso restringido.' }, 401);
  const db = storeEnv.DB;
  if (!db) return json({ error: 'Catálogo no disponible.' }, 503);
  const after = url.searchParams.get('after') ?? '';
  if (!/^[a-z0-9-]{0,80}$/.test(after)) return json({ error: 'Cursor no válido.' }, 400);
  const { results } = await db.prepare(`SELECT ${columns} FROM products WHERE deleted_at IS NULL AND slug > ? AND (
    volume < 1 OR concentration = '' OR audience = '' OR family = '' OR tone = '' OR description = '' OR image_url IN ('', ?) OR
    json_array_length(climate) = 0 OR json_array_length(occasions) = 0 OR
    COALESCE(json_extract(notes, '$.opening'), '') = '' OR COALESCE(json_extract(notes, '$.heart'), '') = '' OR
    COALESCE(json_extract(notes, '$.base'), '') = ''
  ) ORDER BY slug LIMIT 25`).bind(after, productPhotoPlaceholder).all<Candidate>();
  return json({ products: results.map(({ price_cents, ...row }) => ({
    ...row, needsPhoto: missingPhoto(row.image_url), notes: JSON.parse(row.notes),
    climate: JSON.parse(row.climate), occasions: JSON.parse(row.occasions),
  })) });
};

export const POST: APIRoute = async ({ request }) => {
  if (!hasBearerToken(request, storeEnv.CATALOG_ENRICHMENT_TOKEN)) return json({ error: 'Acceso restringido.' }, 401);
  const { DB: db, RECEIPTS_BUCKET: bucket } = storeEnv;
  if (!db || !bucket) return json({ error: 'Catálogo no disponible.' }, 503);
  const form = await readImageForm(request).catch(() => null);
  const slug = form?.get('slug');
  const version = form?.get('version');
  if (!form || typeof slug !== 'string' || !/^[a-z0-9-]{1,80}$/.test(slug) ||
    typeof version !== 'string' || !/^\d{1,12}$/.test(version)) return json({ error: 'Ficha no válida.' }, 400);
  const load = () => db.prepare(`SELECT ${columns}, deleted_at FROM products WHERE slug = ?`)
    .bind(slug).first<Candidate & { deleted_at: string | null }>();
  const current = await load();
  if (!current || current.deleted_at || current.edit_version !== Number(version)) return json({ error: 'Ficha modificada.' }, 409);

  // Reuse the form validation, but read required values from the actual record.
  form.set('name', current.name);
  form.set('brand', current.brand);
  form.set('price', (current.price_cents / 100).toFixed(2));
  form.set('stock', '0');
  const proposed = parseProduct(form, slug);
  if (!proposed) return json({ error: 'Datos de la ficha no válidos.' }, 400);

  const fields: Record<string, string | number> = {};
  for (const key of ['volume', 'concentration', 'audience', 'family', 'tone', 'description'] as const) {
    if (!current[key] && proposed[key]) fields[key] = proposed[key];
  }
  if (!JSON.parse(current.climate).length && proposed.climate.length) fields.climate = JSON.stringify(proposed.climate);
  if (!JSON.parse(current.occasions).length && proposed.occasions.length) fields.occasions = JSON.stringify(proposed.occasions);
  const notes = JSON.parse(current.notes) as Product['notes'];
  const updatedNotes = { ...notes };
  for (const key of ['opening', 'heart', 'base'] as const) {
    if (!notes[key] && proposed.notes[key]) updatedNotes[key] = proposed.notes[key];
  }
  if (JSON.stringify(notes) !== JSON.stringify(updatedNotes)) fields.notes = JSON.stringify(updatedNotes);

  const photo = missingPhoto(current.image_url) && form.get('photo');
  let key: string | undefined;
  if (photo instanceof File && photo.size) {
    const extension = await imageFormat(photo);
    if (!extension) return json({ error: 'Foto no válida.' }, 400);
    const filename = `${crypto.randomUUID()}.${extension}`;
    key = `products/${filename}`;
    fields.image_url = `/imagenes/perfumes/${filename}`;
    await bucket.put(key, photo, { httpMetadata: { contentType: photo.type } });
  }

  const changed = Object.keys(fields);
  if (!changed.length) return json({ changed });
  try {
    const result = await db.prepare(`UPDATE products SET ${changed.map(field => `${field} = ?`).join(', ')},
      edit_version = edit_version + 1 WHERE slug = ? AND deleted_at IS NULL AND edit_version = ?`)
      .bind(...Object.values(fields), slug, current.edit_version).run();
    if (result.meta.changes) return json({ changed });
  } catch {
    const saved = await load().catch(() => undefined);
    if (key && saved?.image_url === fields.image_url) return json({ changed });
    if (key && saved !== undefined) await bucket.delete(key).catch(() => undefined);
    return json({ error: 'No se pudo completar la ficha.' }, 503);
  }
  if (key) await bucket.delete(key).catch(() => undefined);
  return json({ error: 'Ficha modificada.' }, 409);
};

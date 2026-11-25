import type { APIRoute } from 'astro';
import { parseProduct } from '../../../lib/admin-products';
import { guardAdmin, isSameOrigin, json } from '../../../lib/http';
import { imageFormat, readImageForm } from '../../../lib/images';
import { expireReservations } from '../../../lib/orders';
import { storeEnv } from '../../../lib/runtime';

export const POST: APIRoute = async ({ request }) => {
  const denied = await guardAdmin(request, storeEnv);
  if (denied) return denied;
  if (!isSameOrigin(request)) return json({ error: 'Solicitud no válida.' }, 403);
  const { DB: db, RECEIPTS_BUCKET: bucket } = storeEnv;
  if (!db || !bucket) return json({ error: 'El catálogo no está disponible.' }, 503);
  const form = await readImageForm(request).catch(() => null);
  if (!form) return json({ error: 'Revisa los datos y adjunta una foto de hasta 8 MB.' }, 400);
  const product = parseProduct(form);
  if (!product) return json({ error: 'Revisa los datos del perfume y el precio máximo de S/ 160.' }, 400);
  const image = form.get('photo');
  const extension = image instanceof File && await imageFormat(image);
  if (!(image instanceof File) || !extension) return json({ error: 'Adjunta una foto JPG, PNG o WebP de hasta 8 MB.' }, 400);

  const key = `${crypto.randomUUID()}.${extension}`;
  const photoPath = `/imagenes/perfumes/${key}`;
  const stored = () => db.prepare('SELECT image_url FROM products WHERE slug = ?').bind(product.slug).first<{ image_url: string }>();
  try {
    if (await stored()) return json({ error: 'Ya existe un perfume con ese nombre y marca.' }, 409);
    await bucket.put(`products/${key}`, image, { httpMetadata: { contentType: image.type } });
  } catch (error) {
    console.error('No se pudo guardar la foto del perfume.', error);
    return json({ error: 'No pudimos guardar la foto del perfume. Intenta de nuevo.' }, 503);
  }
  try {
    await db.prepare(`INSERT INTO products (
      slug, name, brand, price_cents, stock, image_url, volume, concentration, audience, family, tone,
      climate, occasions, notes, description, position, active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, (SELECT COALESCE(MAX(position), 0) + 1 FROM products), ?)`)
      .bind(product.slug, product.name, product.brand, product.priceCents, product.stock, photoPath, product.volume,
        product.concentration, product.audience, product.family, product.tone, JSON.stringify(product.climate),
        JSON.stringify(product.occasions), JSON.stringify(product.notes), product.description, product.active).run();
    return json({ ok: true }, 201);
  } catch (error) {
    const row = await stored().catch(() => undefined);
    if (row?.image_url === photoPath) return json({ ok: true });
    if (row !== undefined) await bucket.delete(`products/${key}`).catch(() => undefined);
    if (row) return json({ error: 'Ya existe un perfume con ese nombre y marca.' }, 409);
    console.error('No se pudo registrar el perfume.', error);
    return json({ error: 'No pudimos registrar el perfume. Intenta de nuevo.' }, 503);
  }
};

export const PATCH: APIRoute = async ({ request }) => {
  const denied = await guardAdmin(request, storeEnv);
  if (denied) return denied;
  if (!isSameOrigin(request)) return json({ error: 'Solicitud no válida.' }, 403);
  const db = storeEnv.DB;
  if (!db) return json({ error: 'El catálogo no está disponible.' }, 503);
  const data = await request.json<Record<string, unknown> | null>().catch(() => null);
  const { slug, stock, active, previousStock, previousActive } = data ?? {};
  if (typeof slug !== 'string' || !/^[a-z0-9-]{1,80}$/.test(slug) ||
      typeof stock !== 'number' || !Number.isInteger(stock) || stock < 0 || stock > 10000 ||
      !Number.isInteger(previousStock) || typeof active !== 'boolean' || typeof previousActive !== 'boolean') {
    return json({ error: 'Revisa el número de unidades.' }, 400);
  }
  try {
    await expireReservations(db);
    const result = await db.prepare('UPDATE products SET stock = ?, active = ? WHERE slug = ? AND stock = ? AND active = ?')
      .bind(stock, Number(active), slug, previousStock, Number(previousActive)).run();
    if (!result.meta.changes) return json({ error: 'El inventario cambió. Actualiza el panel antes de guardar.' }, 409);
    return json({ ok: true });
  } catch (error) {
    console.error('No se pudo actualizar el stock.', error);
    return json({ error: 'No pudimos actualizar el inventario. Intenta de nuevo.' }, 503);
  }
};

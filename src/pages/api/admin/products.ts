import type { APIRoute } from 'astro';
import { climateLabel, occasionLabel, productPhotoPlaceholder } from '../../../lib/catalog';
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
  if (!form) return json({ error: 'Revisa los datos y el límite de 8 MB para la foto.' }, 400);
  const product = parseProduct(form);
  if (!product) return json({ error: 'Revisa los datos del perfume y el precio máximo de S/ 160.' }, 400);
  const image = form.get('photo');
  let key: string | undefined;
  if (image instanceof File && (image.size || image.name)) {
    const extension = await imageFormat(image);
    if (!extension) return json({ error: 'La foto debe ser JPG, PNG o WebP y pesar hasta 8 MB.' }, 400);
    key = `${crypto.randomUUID()}.${extension}`;
  }

  const photoPath = key ? `/imagenes/perfumes/${key}` : productPhotoPlaceholder;
  const stored = () => db.prepare('SELECT image_url, deleted_at FROM products WHERE slug = ?')
    .bind(product.slug).first<{ image_url: string; deleted_at: string | null }>();
  const duplicate = () => json({ error: 'Ya existe un perfume con ese nombre y marca.' }, 409);
  try {
    if ((await stored())?.deleted_at === null) return duplicate();
    if (key && image instanceof File) {
      await bucket.put(`products/${key}`, image, { httpMetadata: { contentType: image.type } });
    }
  } catch (error) {
    console.error('No se pudo preparar la ficha del perfume.', error);
    return json({ error: 'No pudimos preparar la ficha del perfume. Intenta de nuevo.' }, 503);
  }
  try {
    const result = await db.prepare(`INSERT INTO products (
      slug, name, brand, price_cents, stock, image_url, volume, concentration, audience, family, tone,
      climate, occasions, notes, description, position, active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, (SELECT COALESCE(MAX(position), 0) + 1 FROM products), ?)
    ON CONFLICT(slug) DO UPDATE SET
      name = excluded.name, brand = excluded.brand, price_cents = excluded.price_cents, stock = excluded.stock,
      image_url = excluded.image_url, volume = excluded.volume, concentration = excluded.concentration,
      audience = excluded.audience, family = excluded.family, tone = excluded.tone, climate = excluded.climate,
      occasions = excluded.occasions, notes = excluded.notes, description = excluded.description, position = excluded.position,
      badge = excluded.badge, collections = excluded.collections, inspiration_name = NULL, inspiration_image_url = NULL,
      active = excluded.active, deleted_at = NULL, edit_version = products.edit_version + 1
    WHERE products.deleted_at IS NOT NULL`)
      .bind(product.slug, product.name, product.brand, product.priceCents, product.stock, photoPath, product.volume,
        product.concentration, product.audience, product.family, product.tone, JSON.stringify(product.climate),
        JSON.stringify(product.occasions), JSON.stringify(product.notes), product.description, product.active).run();
    if (result.meta.changes) return json({ ok: true }, 201);
    if (key) await bucket.delete(`products/${key}`).catch(() => undefined);
    return duplicate();
  } catch (error) {
    const row = await stored().catch(() => undefined);
    if (key && row?.image_url === photoPath) return json({ ok: true });
    if (key && row !== undefined) await bucket.delete(`products/${key}`).catch(() => undefined);
    if (row?.deleted_at === null) return duplicate();
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
  const { slug, stock, active, priceCents, previousStock, previousActive, previousPriceCents, version } = data ?? {};
  if (typeof slug !== 'string' || !/^[a-z0-9-]{1,80}$/.test(slug) ||
      typeof stock !== 'number' || !Number.isInteger(stock) || stock < 0 || stock > 10000 ||
      !Number.isInteger(previousStock) || typeof active !== 'boolean' || typeof previousActive !== 'boolean' ||
      (version !== undefined && (typeof version !== 'number' || !Number.isSafeInteger(version) || version < 0))) {
    return json({ error: 'Revisa el número de unidades.' }, 400);
  }
  const updatesPrice = priceCents !== undefined;
  if (updatesPrice && (typeof priceCents !== 'number' || !Number.isInteger(priceCents) ||
      priceCents < 1 || priceCents > 16000 || !Number.isInteger(previousPriceCents))) {
    return json({ error: 'Revisa el precio. El máximo es S/ 160.' }, 400);
  }
  try {
    await expireReservations(db);
    const result = await db.prepare(`UPDATE products SET stock = ?, active = ?, price_cents = COALESCE(?, price_cents), edit_version = edit_version + 1
      WHERE slug = ? AND deleted_at IS NULL AND stock = ? AND active = ? AND (? IS NULL OR price_cents = ?)
        AND (? IS NULL OR edit_version = ?)`)
      .bind(stock, Number(active), priceCents ?? null, slug, previousStock, Number(previousActive),
        previousPriceCents ?? null, previousPriceCents ?? null, version ?? null, version ?? null).run();
    if (!result.meta.changes) return json({ error: 'El inventario cambió. Actualiza el panel antes de guardar.' }, 409);
    return json({ ok: true });
  } catch (error) {
    console.error('No se pudo actualizar el stock.', error);
    return json({ error: 'No pudimos actualizar el inventario. Intenta de nuevo.' }, 503);
  }
};

export const PUT: APIRoute = async ({ request }) => {
  const denied = await guardAdmin(request, storeEnv);
  if (denied) return denied;
  if (!isSameOrigin(request)) return json({ error: 'Solicitud no válida.' }, 403);
  const { DB: db, RECEIPTS_BUCKET: bucket } = storeEnv;
  if (!db || !bucket) return json({ error: 'El catálogo no está disponible.' }, 503);
  const form = await readImageForm(request).catch(() => null);
  const slug = form?.get('slug');
  const version = form?.get('version');
  const previousStock = form?.get('previousStock');
  if (!form || typeof slug !== 'string' || !/^[a-z0-9-]{1,80}$/.test(slug) ||
      typeof version !== 'string' || !/^\d{1,12}$/.test(version) ||
      typeof previousStock !== 'string' || !/^\d{1,5}$/.test(previousStock)) {
    return json({ error: 'Revisa los datos del perfume.' }, 400);
  }
  const product = parseProduct(form, slug);
  if (!product) return json({ error: 'Revisa los datos del perfume y el precio máximo de S/ 160.' }, 400);

  const file = form.get('photo');
  let photo: { key: string; url: string; file: File } | undefined;
  if (file instanceof File && (file.size || file.name)) {
    const extension = await imageFormat(file);
    if (!extension) return json({ error: 'La foto debe ser JPG, PNG o WebP y pesar hasta 8 MB.' }, 400);
    const filename = `${crypto.randomUUID()}.${extension}`;
    photo = { key: `products/${filename}`, url: `/imagenes/perfumes/${filename}`, file };
  }
  const current = () => db.prepare('SELECT image_url, climate, occasions, deleted_at FROM products WHERE slug = ?')
    .bind(slug).first<{ image_url: string; climate: string; occasions: string; deleted_at: string | null }>();
  let attemptedUpdate = false;
  try {
    await expireReservations(db);
    const original = await current();
    if (!original || original.deleted_at) return json({ error: 'El perfume ya no está disponible en el panel.' }, 404);
    if (photo) await bucket.put(photo.key, photo.file, { httpMetadata: { contentType: photo.file.type } });
    const keepLegacy = (originalValues: string, values: string[], supported: string[]) =>
      JSON.stringify([...values, ...(JSON.parse(originalValues) as string[]).filter(value => !supported.includes(value))]);
    attemptedUpdate = true;
    const result = await db.prepare(`UPDATE products SET name = ?, brand = ?, price_cents = ?, stock = ?, image_url = COALESCE(?, image_url),
      volume = ?, concentration = ?, audience = ?, family = ?, tone = ?, climate = ?, occasions = ?, notes = ?, description = ?,
      active = ?, edit_version = edit_version + 1 WHERE slug = ? AND deleted_at IS NULL AND edit_version = ? AND stock = ?`)
      .bind(product.name, product.brand, product.priceCents, product.stock, photo?.url ?? null, product.volume,
        product.concentration, product.audience, product.family, product.tone,
        keepLegacy(original.climate, product.climate, Object.keys(climateLabel)),
        keepLegacy(original.occasions, product.occasions, Object.keys(occasionLabel)),
        JSON.stringify(product.notes), product.description, product.active, slug, Number(version), Number(previousStock)).run();
    if (!result.meta.changes) {
      if (photo) await bucket.delete(photo.key).catch(() => undefined);
      return json({ error: 'El perfume o su stock cambió. Abre de nuevo el editor antes de guardar.' }, 409);
    }
    return json({ ok: true });
  } catch (error) {
    if (photo) {
      if (!attemptedUpdate) await bucket.delete(photo.key).catch(() => undefined);
      else {
        const row = await current().catch(() => undefined);
        if (row?.image_url === photo.url) return json({ ok: true });
        if (row !== undefined) await bucket.delete(photo.key).catch(() => undefined);
      }
    }
    console.error('No se pudo editar el perfume.', error);
    return json({ error: 'No pudimos guardar el perfume. Intenta de nuevo.' }, 503);
  }
};

export const DELETE: APIRoute = async ({ request }) => {
  const denied = await guardAdmin(request, storeEnv);
  if (denied) return denied;
  if (!isSameOrigin(request)) return json({ error: 'Solicitud no válida.' }, 403);
  const db = storeEnv.DB;
  if (!db) return json({ error: 'El catálogo no está disponible.' }, 503);
  const data = await request.json<Record<string, unknown> | null>().catch(() => null);
  const { slug, version } = data ?? {};
  if (typeof slug !== 'string' || !/^[a-z0-9-]{1,80}$/.test(slug) ||
      typeof version !== 'number' || !Number.isSafeInteger(version) || version < 0) {
    return json({ error: 'Revisa los datos del perfume.' }, 400);
  }

  try {
    await expireReservations(db);
    // Check pending orders in the same write so a new reservation cannot slip between the checks.
    const result = await db.prepare(`UPDATE products SET active = 0, deleted_at = CURRENT_TIMESTAMP, edit_version = edit_version + 1
      WHERE slug = ? AND deleted_at IS NULL AND edit_version = ?
        AND NOT EXISTS (
          SELECT 1 FROM orders, json_each(orders.items_json) AS item
          WHERE orders.status IN ('PENDING_CONFIRMATION', 'AWAITING_PAYMENT', 'PENDING_VERIFICATION')
            AND json_extract(item.value, '$.slug') = products.slug
        )`).bind(slug, version).run();
    if (result.meta.changes) return json({ ok: true });
    const row = await db.prepare('SELECT deleted_at, edit_version FROM products WHERE slug = ?')
      .bind(slug).first<{ deleted_at: string | null; edit_version: number }>();
    if (!row) return json({ error: 'No se encontró el perfume.' }, 404);
    if (row.deleted_at) return json({ ok: true });
    if (row.edit_version !== version) return json({ error: 'El perfume cambió. Actualiza el inventario e inténtalo de nuevo.' }, 409);
    return json({ error: 'Este perfume está en un pedido pendiente. Podrás eliminarlo cuando el pedido se confirme, venza o se cancele.' }, 409);
  } catch (error) {
    console.error('No se pudo eliminar el perfume.', error);
    return json({ error: 'No pudimos eliminar el perfume. Intenta de nuevo.' }, 503);
  }
};

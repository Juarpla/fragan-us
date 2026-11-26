import type { APIRoute } from 'astro';
import { guardAdmin, isSameOrigin, json } from '../../../lib/http';
import { imageFormat, readImageForm } from '../../../lib/images';
import { storeEnv } from '../../../lib/runtime';

type Inspiration = { inspiration_name: string | null; inspiration_image_url: string | null; deleted_at: string | null };

export const POST: APIRoute = async ({ request }) => {
  const denied = await guardAdmin(request, storeEnv);
  if (denied) return denied;
  if (!isSameOrigin(request)) return json({ error: 'Solicitud no válida.' }, 403);
  const { DB: db, RECEIPTS_BUCKET: bucket } = storeEnv;
  if (!db || !bucket) return json({ error: 'El catálogo no está disponible.' }, 503);
  const form = await readImageForm(request).catch(() => null);
  const slug = form?.get('slug');
  const version = form?.get('version');
  const name = String(form?.get('name') ?? '').trim();
  const photo = form?.get('photo');
  if (typeof slug !== 'string' || !/^[a-z0-9-]{1,80}$/.test(slug) || name.length > 100 ||
      (version != null && (typeof version !== 'string' || !/^\d{1,12}$/.test(version))) ||
      (photo instanceof File && photo.size && !name)) {
    return json({ error: 'Revisa el nombre de la fragancia de referencia.' }, 400);
  }

  const getProduct = () => db.prepare('SELECT inspiration_name, inspiration_image_url, deleted_at FROM products WHERE slug = ?')
    .bind(slug).first<Inspiration>();
  let uploadedKey: string | null = null;
  let photoPath: string | null = null;
  try {
    const product = await getProduct();
    if (!product || product.deleted_at) return json({ error: 'Perfume no encontrado.' }, 404);
    if (form?.get('previousName') !== (product.inspiration_name ?? '') ||
        form?.get('previousImage') !== (product.inspiration_image_url ?? '')) {
      return json({ error: 'La inspiración cambió. Actualiza el panel.' }, 409);
    }
    if (photo instanceof File && photo.size) {
      const extension = await imageFormat(photo);
      if (!extension) return json({ error: 'Adjunta una imagen JPG, PNG o WebP de hasta 8 MB.' }, 400);
      const file = `${crypto.randomUUID()}.${extension}`;
      uploadedKey = `products/${file}`;
      photoPath = `/imagenes/perfumes/${file}`;
      await bucket.put(uploadedKey, photo, { httpMetadata: { contentType: photo.type } });
    }
    const image = name && !form?.has('removePhoto') ? photoPath ?? product.inspiration_image_url : photoPath;
    const update = await db.prepare(`UPDATE products SET inspiration_name = ?, inspiration_image_url = ?, edit_version = edit_version + 1
      WHERE slug = ? AND deleted_at IS NULL AND inspiration_name IS ? AND inspiration_image_url IS ?
        AND (? IS NULL OR edit_version = ?)`)
      .bind(name || null, image, slug, product.inspiration_name, product.inspiration_image_url,
        version == null ? null : Number(version), version == null ? null : Number(version)).run();
    if (!update.meta.changes) {
      if (uploadedKey) await bucket.delete(uploadedKey).catch(() => undefined);
      return json({ error: 'La inspiración cambió. Actualiza el panel.' }, 409);
    }
    const previousPhoto = product.inspiration_image_url;
    if (previousPhoto?.startsWith('/imagenes/perfumes/') && image !== previousPhoto) {
      await bucket.delete(`products/${previousPhoto.split('/').at(-1)}`).catch(() => undefined);
    }
    return json({ ok: true });
  } catch (error) {
    const saved = await getProduct().catch(() => undefined);
    if (uploadedKey && saved?.inspiration_image_url === photoPath && saved?.inspiration_name === name) return json({ ok: true });
    if (uploadedKey && saved !== undefined && saved?.inspiration_image_url !== photoPath) await bucket.delete(uploadedKey).catch(() => undefined);
    console.error('No se pudo guardar la inspiración.', error);
    return json({ error: 'No pudimos guardar la inspiración. Intenta nuevamente.' }, 503);
  }
};

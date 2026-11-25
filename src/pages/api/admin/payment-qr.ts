import type { APIRoute } from 'astro';
import { guardAdmin, isSameOrigin, json } from '../../../lib/http';
import { imageFormat, readImageForm } from '../../../lib/images';
import { storeEnv } from '../../../lib/runtime';

export const POST: APIRoute = async ({ request }) => {
  const denied = await guardAdmin(request, storeEnv);
  if (denied) return denied;
  if (!isSameOrigin(request)) return json({ error: 'Solicitud no válida.' }, 403);
  const bucket = storeEnv.RECEIPTS_BUCKET;
  if (!bucket) return json({ error: 'No pudimos acceder al almacén de imágenes.' }, 503);
  const form = await readImageForm(request).catch(() => null);
  const image = form?.get('photo');
  if (!(image instanceof File) || !await imageFormat(image)) {
    return json({ error: 'Sube la imagen oficial del QR en JPG, PNG o WebP, de hasta 8 MB.' }, 400);
  }
  try {
    await bucket.put('settings/payment-qr', image, { httpMetadata: { contentType: image.type } });
    return json({ ok: true });
  } catch (error) {
    console.error('No se pudo guardar el QR de pago.', error);
    return json({ error: 'No pudimos guardar el QR. Intenta de nuevo.' }, 503);
  }
};

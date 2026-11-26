import type { APIRoute } from 'astro';
import { guardAdmin, isSameOrigin, json, validCode } from '../../../lib/http';
import { imageFormat, readImageForm } from '../../../lib/images';
import type { OrderRow } from '../../../lib/orders';
import { storeEnv } from '../../../lib/runtime';

const allowed = ['PAID', 'PACKING', 'SHIPPED'];
type Dispatch = Pick<OrderRow, 'status' | 'shipping_receipt_key' | 'pickup_password'>;

export const POST: APIRoute = async ({ request }) => {
  const denied = await guardAdmin(request, storeEnv);
  if (denied) return denied;
  if (!isSameOrigin(request)) return json({ error: 'Solicitud no válida.' }, 403);
  const { DB: db, RECEIPTS_BUCKET: bucket } = storeEnv;
  if (!db || !bucket) return json({ error: 'El registro de envíos no está disponible.' }, 503);
  const form = await readImageForm(request).catch(() => null);
  const code = form?.get('code');
  const entry = form?.get('password');
  const password = typeof entry === 'string' ? entry.trim() : '';
  if (!validCode(code) || !password || password.length > 80 || /[\p{Cc}\p{Cf}]/u.test(password)) {
    return json({ error: 'Ingresa la clave de recojo tal como aparece en el comprobante.' }, 400);
  }
  const getOrder = () => db.prepare('SELECT status, shipping_receipt_key, pickup_password FROM orders WHERE order_code = ?')
    .bind(code).first<Dispatch>();
  let uploadedKey: string | null = null;
  try {
    const order = await getOrder();
    if (!order) return json({ error: 'Pedido no encontrado.' }, 404);
    if (!allowed.includes(order.status)) return json({ error: 'Verifica el pago antes de registrar el envío.' }, 409);
    // Both values are optimistic tokens. A second open tab cannot overwrite a saved shipment.
    if (form?.get('previousReceipt') !== (order.shipping_receipt_key ?? '') ||
        form?.get('previousPassword') !== (order.pickup_password ?? '')) {
      return json({ error: 'Los datos de envío cambiaron. Actualiza el panel.' }, 409);
    }
    const file = form?.get('receipt');
    if (file instanceof File && file.size) {
      const isPdf = file.type === 'application/pdf' && file.size <= 8 * 1024 * 1024 &&
        await file.slice(0, 5).text() === '%PDF-';
      const extension = isPdf ? 'pdf' : await imageFormat(file);
      if (!extension) return json({ error: 'Adjunta un PDF, JPG, PNG o WebP de hasta 8 MB.' }, 400);
      uploadedKey = `shipping/${code}-${crypto.randomUUID()}.${extension}`;
      await bucket.put(uploadedKey, file, { httpMetadata: { contentType: file.type } });
    }
    const key = uploadedKey ?? order.shipping_receipt_key;
    if (!key) return json({ error: 'Adjunta el comprobante del transportista.' }, 400);
    const update = await db.prepare(`UPDATE orders SET status = 'SHIPPED', shipping_receipt_key = ?, pickup_password = ?
      WHERE order_code = ? AND status = ? AND shipping_receipt_key IS ? AND pickup_password IS ?`)
      .bind(key, password, code, order.status, order.shipping_receipt_key, order.pickup_password).run();
    if (!update.meta.changes) {
      if (uploadedKey) await bucket.delete(uploadedKey).catch(() => undefined);
      return json({ error: 'El pedido cambió. Actualiza el panel.' }, 409);
    }
    if (uploadedKey && order.shipping_receipt_key) await bucket.delete(order.shipping_receipt_key).catch(() => undefined);
    return json({ ok: true });
  } catch (error) {
    const saved = await getOrder().catch(() => undefined);
    if (saved?.shipping_receipt_key === uploadedKey && saved?.pickup_password === password) return json({ ok: true });
    if (uploadedKey && saved !== undefined && saved?.shipping_receipt_key !== uploadedKey) await bucket.delete(uploadedKey).catch(() => undefined);
    console.error('No se pudo registrar el envío.', error);
    return json({ error: 'No pudimos registrar el envío. Intenta nuevamente.' }, 503);
  }
};

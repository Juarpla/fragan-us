import type { APIRoute } from 'astro';
import { checkoutMode, isSameOrigin, json, shippingLabels, validCode } from '../../../lib/http';
import { canSubmitReceipt, expireReservations, hasReceipt, orderItems, type OrderRow } from '../../../lib/orders';
import { imageFormat, readImageForm } from '../../../lib/images';
import { storeEnv } from '../../../lib/runtime';
import { sendOrderNotification } from '../../../lib/telegram';

export const POST: APIRoute = async ({ request, locals }) => {
  if (!isSameOrigin(request)) return json({ error: 'Solicitud no válida.' }, 403);
  const env = storeEnv;
  const db = env.DB;
  const bucket = env.RECEIPTS_BUCKET;
  const mode = checkoutMode(env);
  if (!db || !bucket || mode === 'unavailable') return json({ error: 'El pago aún no está habilitado.' }, 503);
  const form = await readImageForm(request).catch(() => null);
  if (!form) return json({ error: 'Adjunta un comprobante de hasta 8 MB.' }, 400);
  const code = form.get('code');
  const payment = form.get('payment');
  if (!validCode(code) || (payment !== 'YAPE' && payment !== 'PLIN')) {
    return json({ error: 'Revisa tu código y el medio de pago.' }, 400);
  }

  const findOrder = () => db.prepare('SELECT * FROM orders WHERE order_code = ? AND is_demo = ?')
    .bind(code, mode === 'demo' ? 1 : 0).first<OrderRow>();
  const order = await expireReservations(db).then(findOrder).catch(() => undefined);
  if (order === undefined) return json({ error: 'No pudimos consultar tu pedido. Intenta de nuevo.' }, 503);
  if (!order) return json({ error: 'No encontramos tu pedido.' }, 404);
  if (hasReceipt(order)) return json({ code });
  if (!canSubmitReceipt(order, mode)) return json({ error: 'Tu pedido no está disponible para registrar un pago. Revisa su estado.' }, 409);

  const receipt = form.get('receipt');
  const extension = receipt instanceof File ? await imageFormat(receipt) : null;
  if (!(receipt instanceof File) || !extension) return json({ error: 'Adjunta un comprobante JPG, PNG o WebP de hasta 8 MB.' }, 400);
  const key = `receipts/${code}-${crypto.randomUUID()}.${extension}`;
  try {
    await bucket.put(key, receipt, { httpMetadata: { contentType: receipt.type } });
  } catch (error) {
    console.error('No se pudo guardar el comprobante.', error);
    return json({ error: 'No pudimos guardar el comprobante. Intenta de nuevo.' }, 503);
  }

  try {
    const update = await db.prepare(`UPDATE orders SET payment_method = ?, receipt_r2_key = ?, status = 'PENDING_VERIFICATION'
      WHERE order_code = ? AND status IN ('AWAITING_PAYMENT', 'EXPIRED')`).bind(payment, key, code).run();
    if (update.meta.changes) {
      if (mode === 'live') locals.cfContext.waitUntil(sendOrderNotification(env, {
        code, name: order.customer_name, phone: order.customer_phone, city: order.city,
        shipping: shippingLabels[order.shipping_method], payment, total: order.total_cents, items: orderItems(order.items_json),
      }, receipt));
      return json({ code }, 201);
    }
  } catch (error) {
    console.error('No se pudo confirmar la escritura del comprobante.', error);
  }

  const saved = await findOrder().catch(() => undefined);
  // Keep the receipt if the database cannot confirm the outcome.
  if (saved !== undefined && saved?.receipt_r2_key !== key) await bucket.delete(key).catch(() => undefined);
  if (saved && hasReceipt(saved)) return json({ code });
  if (saved && !canSubmitReceipt(saved, mode)) return json({ error: 'Tu pedido cambió de estado. Actualiza el enlace del pedido.' }, 409);
  return json({ error: 'No pudimos confirmar el comprobante. Intenta de nuevo con la misma imagen.' }, 503);
};

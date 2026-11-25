import type { APIRoute } from 'astro';
import { parseCart, priceCart } from '../../../lib/db';
import { checkoutMode, isSameOrigin, json, validId } from '../../../lib/http';
import { storeEnv } from '../../../lib/runtime';
import { sendRequestNotification } from '../../../lib/telegram';

export const POST: APIRoute = async ({ request, locals }) => {
  if (!isSameOrigin(request)) return json({ error: 'Solicitud no válida.' }, 403);
  const env = storeEnv;
  const db = env.DB;
  const mode = checkoutMode(env);
  if (!db || mode === 'unavailable') return json({ error: 'La compra aún no está habilitada.' }, 503);

  const body = await request.json<Record<string, unknown>>().catch(() => null);
  if (!body || !validId(body.checkoutId) || !validId(body.sessionId)) {
    return json({ error: 'La sesión de compra no es válida.' }, 400);
  }
  const { checkoutId, sessionId } = body;
  const isDemo = mode === 'demo' ? 1 : 0;
  const findExisting = () => db.prepare('SELECT order_code FROM orders WHERE checkout_id = ? AND is_demo = ?')
    .bind(checkoutId, isDemo).first<{ order_code: string }>();
  const field = (key: string) => typeof body[key] === 'string' ? body[key].trim() : '';
  const name = field('name');
  const phone = field('phone');
  const city = field('city');
  const address = field('address');
  if (name.length < 2 || name.length > 90 || !/^9\d{8}$/.test(phone) || field('shipping') !== 'SHALOM' ||
    city.length < 2 || city.length > 90 || address.length < 2 || address.length > 220) {
    return json({ error: 'Revisa tus datos y selecciona el envío por Shalom.' }, 400);
  }

  try {
    const existing = await findExisting();
    if (existing) return json({ code: existing.order_code });

    const priced = await priceCart(db, parseCart(body.cart));
    if (priced.total !== body.expectedTotal) {
      return json({ error: 'Actualizamos los precios. Revisa el total y vuelve a enviar tu solicitud.', quote: priced }, 409);
    }
    const code = 'FRG-' + crypto.randomUUID().replaceAll('-', '').slice(0, 16).toUpperCase();
    await db.batch([
      db.prepare(`INSERT INTO orders (
          order_code, checkout_id, customer_name, customer_phone, city, shipping_address, shipping_method,
          items_json, total_cents, is_demo, status
        ) VALUES (?, ?, ?, ?, ?, ?, 'SHALOM', ?, ?, ?, 'PENDING_CONFIRMATION')`)
        .bind(code, checkoutId, name, phone, city, address, JSON.stringify(priced.items), priced.total, isDemo),
      db.prepare(`UPDATE abandoned_carts SET status = 'CONVERTED', updated_at = CURRENT_TIMESTAMP
        WHERE session_id = ? AND customer_phone = ? AND status = 'ABANDONED'`).bind(sessionId, phone),
    ]);
    if (mode === 'live') locals.cfContext.waitUntil(sendRequestNotification(env, { code, name, phone, city, total: priced.total, items: priced.items }));
    return json({ code }, 201);
  } catch (error) {
    if (error instanceof Error && /^(Stock|Revisa)/.test(error.message)) return json({ error: error.message }, 409);
    const saved = await findExisting().catch(() => null);
    if (saved) return json({ code: saved.order_code });
    console.error('No se pudo registrar la solicitud.', error);
    return json({ error: 'No pudimos registrar la solicitud. Intenta de nuevo.' }, 503);
  }
};

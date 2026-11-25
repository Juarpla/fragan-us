import type { APIRoute } from 'astro';
import { parseCart, priceCart } from '../../../lib/db';
import { checkoutMode, isSameOrigin, json, validId } from '../../../lib/http';
import { storeEnv } from '../../../lib/runtime';

export const POST: APIRoute = async ({ request }) => {
  if (!isSameOrigin(request)) return json({ error: 'Solicitud no válida.' }, 403);
  const db = storeEnv.DB;
  if (!db || checkoutMode(storeEnv) === 'unavailable') return json({ error: 'Servicio no disponible.' }, 503);
  try {
    const { sessionId, name, phone, cart, consent } = await request.json<Record<string, unknown>>();
    if (!validId(sessionId) || typeof phone !== 'string' || !/^9\d{8}$/.test(phone) || consent !== true) {
      return json({ error: 'Revisa el número y la autorización de contacto.' }, 400);
    }
    const priced = await priceCart(db, parseCart(cart));
    await db.prepare(`
      INSERT INTO abandoned_carts (session_id, customer_name, customer_phone, items_json, total_cents)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(session_id) DO UPDATE SET customer_name = excluded.customer_name, customer_phone = excluded.customer_phone,
        items_json = excluded.items_json, total_cents = excluded.total_cents, updated_at = CURRENT_TIMESTAMP
      WHERE abandoned_carts.status = 'ABANDONED'
    `).bind(sessionId, typeof name === 'string' ? name.trim().slice(0, 90) : '', phone, JSON.stringify(priced.items), priced.total).run();
    return json({ ok: true });
  } catch (error) {
    console.error('No se pudo guardar el carrito.', error);
    return json({ error: 'No se pudo guardar la bolsa.' }, 400);
  }
};

export const DELETE: APIRoute = async ({ request }) => {
  if (!isSameOrigin(request)) return json({ error: 'Solicitud no válida.' }, 403);
  const db = storeEnv.DB;
  if (!db) return json({ error: 'Servicio no disponible.' }, 503);
  try {
    const { sessionId } = await request.json<{ sessionId: unknown }>();
    if (!validId(sessionId)) return json({ error: 'Identificador no válido.' }, 400);
    await db.prepare("DELETE FROM abandoned_carts WHERE session_id = ? AND status = 'ABANDONED'").bind(sessionId).run();
    return json({ ok: true });
  } catch {
    return json({ error: 'No se pudo retirar el permiso de contacto.' }, 400);
  }
};

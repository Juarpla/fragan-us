import type { APIRoute } from 'astro';
import { adminChallenge, isAdmin, isSameOrigin, json, validCode } from '../../../lib/http';
import { storeEnv } from '../../../lib/runtime';

export const POST: APIRoute = async ({ request }) => {
  if (!isAdmin(request, storeEnv)) return adminChallenge();
  if (!isSameOrigin(request)) return json({ error: 'Solicitud no válida.' }, 403);
  const db = storeEnv.DB;
  if (!db) return json({ error: 'Base de datos no disponible.' }, 503);
  const body = await request.json<Record<string, unknown> | null>().catch(() => null);
  const { code, action, freightCents } = body ?? {};
  if (!validCode(code) || typeof action !== 'string' || !['confirm', 'pay', 'ship', 'cancel'].includes(action)) return json({ error: 'Pedido o acción no válida.' }, 400);
  if (action === 'confirm' && (typeof freightCents !== 'number' || !Number.isInteger(freightCents) || freightCents < 0 || freightCents > 999999)) {
    return json({ error: 'Ingresa el importe confirmado por Shalom.' }, 400);
  }

  const target = action === 'confirm' ? 'AWAITING_PAYMENT' : action === 'pay' ? 'PAID' : action === 'ship' ? 'SHIPPED' : 'CANCELLED';
  try {
    const update = action === 'confirm'
      ? db.prepare(`UPDATE orders SET status = 'AWAITING_PAYMENT', freight_cents = ?
          WHERE order_code = ? AND status = 'PENDING_CONFIRMATION'`).bind(freightCents, code)
      : db.prepare(`UPDATE orders SET status = ? WHERE order_code = ? AND (
          (? = 'PAID' AND status = 'PENDING_VERIFICATION') OR
          (? = 'SHIPPED' AND status = 'PAID') OR
          (? = 'CANCELLED' AND status IN ('PENDING_CONFIRMATION', 'AWAITING_PAYMENT', 'PENDING_VERIFICATION'))
        )`).bind(target, code, target, target, target);
    const result = await update.run();
    if (result.meta.changes) return json({ ok: true });
    const row = await db.prepare('SELECT status, freight_cents FROM orders WHERE order_code = ?')
      .bind(code).first<{ status: string; freight_cents: number | null }>();
    if (!row) return json({ error: 'No se encontró el pedido.' }, 404);
    if (row.status === target && (action !== 'confirm' || row.freight_cents === freightCents)) return json({ ok: true });
    return json({ error: 'El pedido cambió de estado. Actualiza el panel.' }, 409);
  } catch (error) {
    if (String(error).includes('INSUFFICIENT_STOCK')) {
      return json({ error: 'Stock insuficiente. Revisa la disponibilidad antes de confirmar.' }, 409);
    }
    console.error('Error al actualizar pedido.', error);
    return json({ error: 'No se pudo actualizar el pedido.' }, 503);
  }
};

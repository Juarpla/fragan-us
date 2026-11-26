import type { APIRoute } from 'astro';
import { guardAdmin, isSameOrigin, json, validCode } from '../../../lib/http';
import { expireReservations } from '../../../lib/orders';
import { storeEnv } from '../../../lib/runtime';

const transitions = {
  enable_payment: { to: 'AWAITING_PAYMENT', from: ['PENDING_CONFIRMATION'] },
  pay: { to: 'PACKING', from: ['PENDING_VERIFICATION'] },
  pack: { to: 'PACKING', from: ['PAID'] },
  cancel: { to: 'CANCELLED', from: ['PENDING_CONFIRMATION', 'AWAITING_PAYMENT', 'PENDING_VERIFICATION', 'EXPIRED'] },
} as const;

export const POST: APIRoute = async ({ request }) => {
  const denied = await guardAdmin(request, storeEnv);
  if (denied) return denied;
  if (!isSameOrigin(request)) return json({ error: 'Solicitud no válida.' }, 403);
  const db = storeEnv.DB;
  if (!db) return json({ error: 'Base de datos no disponible.' }, 503);
  const body = await request.json<Record<string, unknown> | null>().catch(() => null);
  const { code, action } = body ?? {};
  if (!validCode(code) || typeof action !== 'string' || !Object.hasOwn(transitions, action)) {
    return json({ error: 'Pedido o acción no válida.' }, 400);
  }

  const { to, from } = transitions[action as keyof typeof transitions];
  try {
    await expireReservations(db);
    const result = await db.prepare(`UPDATE orders SET status = ?,
        stock_reserved = CASE WHEN ? = 'enable_payment' THEN 1 WHEN ? IN ('cancel', 'pay') THEN 0 ELSE stock_reserved END
      WHERE order_code = ? AND status IN (${from.map(() => '?').join(', ')})`).bind(to, action, action, code, ...from).run();
    if (result.meta.changes) return json({ ok: true });
    const row = await db.prepare('SELECT status FROM orders WHERE order_code = ?').bind(code).first<{ status: string }>();
    if (!row) return json({ error: 'No se encontró el pedido.' }, 404);
    if (row.status === to || (action === 'pay' && row.status === 'PAID')) return json({ ok: true });
    return json({ error: 'El pedido cambió de estado. Actualiza el panel.' }, 409);
  } catch (error) {
    if (String(error).includes('INSUFFICIENT_STOCK')) {
      return json({ error: 'Stock insuficiente. Revisa las unidades y el abono antes de continuar.' }, 409);
    }
    console.error('Error al actualizar pedido.', error);
    return json({ error: 'No se pudo actualizar el pedido.' }, 503);
  }
};

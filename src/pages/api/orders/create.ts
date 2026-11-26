import type { APIRoute } from 'astro';
import { validDocument } from '../../../lib/checkout-document';
import { reservationMinutes } from '../../../lib/orders';
import { parseCart, priceCart } from '../../../lib/db';
import { checkoutMode, isSameOrigin, json, validId } from '../../../lib/http';
import { storeEnv } from '../../../lib/runtime';
import { districtsByCode, getAgencyDirectory } from '../../../lib/shipping-directory';

export const POST: APIRoute = async ({ request }) => {
  if (!isSameOrigin(request)) return json({ error: 'Solicitud no válida.' }, 403);
  const env = storeEnv;
  const db = env.DB;
  const mode = checkoutMode(env);
  if (!db || mode === 'unavailable') return json({ error: 'El pago aún no está habilitado.' }, 503);

  const body = await request.json<Record<string, unknown>>().catch(() => null);
  if (!body || !validId(body.checkoutId) || !validId(body.sessionId)) {
    return json({ error: 'La sesión de compra no es válida.' }, 400);
  }
  const { checkoutId, sessionId, agencyId } = body;
  const isDemo = mode === 'demo' ? 1 : 0;
  const findExisting = () => db.prepare('SELECT order_code FROM orders WHERE checkout_id = ? AND is_demo = ?')
    .bind(checkoutId, isDemo).first<{ order_code: string }>();
  const field = (key: string) => typeof body[key] === 'string' ? body[key].trim() : '';
  const name = field('name');
  const phone = field('phone');
  const documentType = field('documentType');
  const documentNumber = field('documentNumber');
  const requestedDistrict = districtsByCode.get(field('ubigeo'));
  if (name.length < 2 || name.length > 90 || !/^9\d{8}$/.test(phone) || !requestedDistrict ||
      typeof agencyId !== 'number' || !Number.isSafeInteger(agencyId) || agencyId <= 0) {
    return json({ error: 'Revisa tus datos y elige la agencia donde recogerás el pedido.' }, 400);
  }

  try {
    const existing = await findExisting();
    if (existing) return json({ code: existing.order_code });
    if (!validDocument(documentType, documentNumber)) {
      return json({ error: 'Ingresa un DNI de 8 dígitos o un carné de extranjería de 9 dígitos.' }, 400);
    }

    const { agencies } = await getAgencyDirectory(env);
    const agency = agencies.find(item => item.id === agencyId);
    const agencyDistrict = agency && districtsByCode.get(agency.ubigeo);
    if (!agency || !agencyDistrict) return json({ error: 'La agencia elegida ya no está disponible. Actualiza el listado y selecciona otra.' }, 409);

    const priced = await priceCart(db, parseCart(body.cart));
    if (priced.total !== body.expectedTotal) {
      return json({ error: 'Actualizamos los precios. Revisa el total y vuelve a continuar al pago.', quote: priced }, 409);
    }
    const code = 'FRG-' + crypto.randomUUID().replaceAll('-', '').slice(0, 16).toUpperCase();
    const city = requestedDistrict.slice(1, 4).join(' / ');
    const address = `${agency.name} · ${agency.address} · ${agencyDistrict.slice(1, 4).join(' / ')}`;
    await db.batch([
      db.prepare(`INSERT INTO orders (
          order_code, checkout_id, customer_name, customer_phone, document_type, document_number, city, shipping_address, shipping_method,
          agency_id, destination_ubigeo, whatsapp_offers, items_json, total_cents, is_demo, status, stock_reserved, reserved_until
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'SHALOM', ?, ?, ?, ?, ?, ?, 'AWAITING_PAYMENT', 1, datetime('now', ?))`)
        .bind(code, checkoutId, name, phone, documentType, documentNumber, city, address, agency.id, requestedDistrict[0], body.whatsappOffers === true ? 1 : 0,
          JSON.stringify(priced.items), priced.total, isDemo, `+${reservationMinutes} minutes`),
      db.prepare(`UPDATE abandoned_carts SET status = 'CONVERTED', updated_at = CURRENT_TIMESTAMP
        WHERE session_id = ? AND status = 'ABANDONED'`).bind(sessionId),
    ]);
    return json({ code }, 201);
  } catch (error) {
    const saved = await findExisting().catch(() => null);
    if (saved) return json({ code: saved.order_code });
    if (error instanceof Error && /^(Stock|Revisa)/.test(error.message)) return json({ error: error.message }, 409);
    if (String(error).includes('INSUFFICIENT_STOCK')) return json({ error: 'Cambió el stock de tu bolsa. Revisa las cantidades e inténtalo de nuevo.' }, 409);
    console.error('No se pudo registrar el pedido.', error);
    return json({ error: 'No pudimos registrar el pedido. Intenta de nuevo.' }, 503);
  }
};

import { money } from './catalog';
import { validCode } from './http';
import { expireReservations, orderStages, type OrderRow } from './orders';

const dateFormat = new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Lima' });

export function adminDate(value: string) {
  return dateFormat.format(new Date(value.replace(' ', 'T') + 'Z'));
}

export function orderWhatsApp(order: OrderRow, origin: string) {
  const { order_code: code, customer_phone: phone } = order;
  const href = `https://wa.me/51${phone}`;
  const tracking = new URL(`/gracias/${code}`, origin);
  const receipt = new URL(`/api/orders/shipping-receipt?code=${code}`, origin);
  const actions: Record<string, { label: string; message: string }> = {
    AWAITING_PAYMENT: {
      label: 'Compartir enlace de pago',
      message: `Hola, puedes pagar los perfumes del pedido ${code} por ${money(order.total_cents)} desde ${new URL(`/pago/${code}`, origin)}. El flete se paga al transportista por separado.`,
    },
    PACKING: {
      label: 'Avisar de la confirmación',
      message: `Hola, confirmamos tu pedido ${code} y ya lo estamos preparando. Consulta su estado aquí:\n${tracking}`,
    },
    SHIPPED: {
      label: 'Avisar del envío',
      message: `Hola, tu pedido ${code} va en camino a la agencia que elegiste.${order.shipping_receipt_key ? `\n\nComprobante de envío:\n${receipt}` : ''}\n\nSeguimiento del pedido:\n${tracking}`,
    },
  };
  const action = actions[order.status === 'PAID' ? 'PACKING' : order.status];
  return action ? { label: action.label, href: `${href}?text=${encodeURIComponent(action.message)}` } : { label: 'Contactar cliente', href };
}

export async function loadAdminOrders(db: D1Database, request: Request, url: URL) {
  const selected = url.searchParams.get('estado');
  const stages = [...orderStages, { id: 'ARCHIVE', label: 'Solicitudes anteriores' }] as const;
  const legacyStates: Record<string, string> = { PAID: 'PACKING', PENDING_CONFIRMATION: 'ARCHIVE', CANCELLED: 'ARCHIVE' };
  const filter = stages.find(({ id }) => id === (legacyStates[selected ?? ''] ?? selected))?.id ?? 'PENDING_VERIFICATION';
  const conditions = {
    PENDING_VERIFICATION: "status = 'PENDING_VERIFICATION'",
    PACKING: "status IN ('PAID', 'PACKING')",
    SHIPPED: "status = 'SHIPPED' AND (archive_at IS NULL OR archive_at > CURRENT_TIMESTAMP)",
    ARCHIVE: "status IN ('PENDING_CONFIRMATION', 'CANCELLED') OR (status = 'SHIPPED' AND archive_at <= CURRENT_TIMESTAMP)",
  };

  let query = '';
  let pageValue = url.searchParams.get('p');
  if (request.method === 'POST') {
    const form = await request.formData().catch(() => null);
    const input = form?.get('q');
    query = typeof input === 'string' ? input.trim().slice(0, 90) : '';
    pageValue = String(form?.get('p') ?? '');
  }
  const normalized = query.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  const foldedName = Object.entries({ á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ü: 'u', ñ: 'n' })
    .reduce((expression, [letter, plain]) =>
      `replace(replace(${expression}, '${letter}', '${plain}'), '${letter.toUpperCase()}', '${plain}')`, 'customer_name');
  const documentQuery = normalized.replace(/[ -]/g, '');
  const codeQuery = query.toUpperCase();
  const isCode = validCode(codeQuery);
  const isDocument = /^\d+$/.test(documentQuery);
  const condition = !query ? conditions[filter]
    : isCode ? 'order_code = ?' : isDocument ? 'document_number = ?' : `instr(lower(${foldedName}), ?) > 0`;
  const terms = !query ? [] : [isCode ? codeQuery : isDocument ? documentQuery : normalized];
  const page = Math.max(1, Math.min(5000, Math.floor(Number(pageValue) || 1)));
  const limit = 25;
  await expireReservations(db);
  const orderResult = await db.prepare(`SELECT * FROM orders WHERE ${condition}
      ORDER BY COALESCE(shipped_at, created_at) DESC, order_code DESC LIMIT ? OFFSET ?`)
    .bind(...terms, limit + 1, (page - 1) * limit).all<OrderRow>();
  const orders = orderResult.results.slice(0, limit);
  return { orders, filter, query, page, hasNext: orderResult.results.length > limit, label: stages.find(stage => stage.id === filter)?.label };
}

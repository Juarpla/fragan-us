import { money } from './catalog';
import type { OrderRow } from './orders';

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
  return action ? { label: action.label, href: `${href}?text=${encodeURIComponent(action.message)}` } : { label: 'WhatsApp', href };
}

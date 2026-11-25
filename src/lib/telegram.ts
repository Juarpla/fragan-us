import { money } from './catalog';
import type { OrderItem } from './db';

interface OrderNotification {
  code: string;
  name: string;
  phone: string;
  city: string;
  shipping: string;
  payment: string;
  total: number;
  items: OrderItem[];
}

export async function sendOrderNotification(env: StoreEnv, order: OrderNotification, receipt: File) {
  const token = env.TELEGRAM_BOT_TOKEN;
  const chat = env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return;
  const details = order.items.map(item => `${item.quantity} × ${item.name}`).join(', ');
  const caption = [
    `Nuevo pedido ${order.code}`, `${order.name} · +51 ${order.phone}`, `${order.city} · ${order.shipping}`,
    `${money(order.total)} · ${order.payment}`, details, 'Pendiente de verificación. Revisa /admin.',
  ].join('\n').slice(0, 1000);
  const payload = new FormData();
  payload.set('chat_id', chat);
  payload.set('photo', receipt);
  payload.set('caption', caption);
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, { method: 'POST', body: payload, signal: AbortSignal.timeout(8000) });
    if (response.ok) return;
    const document = new FormData();
    document.set('chat_id', chat);
    document.set('document', receipt);
    document.set('caption', caption);
    const fallback = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, { method: 'POST', body: document, signal: AbortSignal.timeout(8000) });
    if (!fallback.ok) console.error('Telegram no pudo recibir el comprobante.', response.status, fallback.status);
  } catch {
    console.error('Error al notificar el pedido a Telegram.', order.code);
  }
}

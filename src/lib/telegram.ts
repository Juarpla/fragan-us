import { money } from './catalog';
import type { OrderItem } from './db';

interface OrderNotification {
  code: string;
  name: string;
  phone: string;
  payment: string;
  total: number;
  items: OrderItem[];
  adminUrl: URL;
}

const escapeHtml = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;').replaceAll('"', '&quot;');

export async function sendOrderNotification(env: StoreEnv, order: OrderNotification) {
  const token = env.TELEGRAM_BOT_TOKEN?.trim();
  const chat = env.TELEGRAM_CHAT_ID?.trim();
  if (!token || !chat) return;

  const products = order.items.map(item =>
    `• ${item.quantity}x ${escapeHtml(item.name)} de ${escapeHtml(item.brand)}`);
  const text = [
    `🛍️ <b>Nueva Compra #${escapeHtml(order.code)}</b>`,
    '',
    `👤 <b>Cliente:</b> ${escapeHtml(order.name)}`,
    `📱 <b>Contacto:</b> +51 ${escapeHtml(order.phone)}`,
    `💳 <b>Pago:</b> ${escapeHtml(order.payment)} — <b>${money(order.total)}</b>`,
    '📦 <b>Productos:</b>',
    ...products,
    '',
    `🔗 <a href="${escapeHtml(order.adminUrl.href)}">Revisar y aprobar en el Admin</a>`,
  ].join('\n');

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chat, text, parse_mode: 'HTML', link_preview_options: { is_disabled: true }, protect_content: true }),
      signal: AbortSignal.timeout(8000),
    });
    const result = await response.json<{ ok?: boolean }>().catch(() => null);
    if (!response.ok || !result?.ok) console.error('Telegram no aceptó la alerta de compra.', order.code, response.status);
  } catch {
    console.error('No se pudo enviar la alerta de compra a Telegram.', order.code);
  }
}

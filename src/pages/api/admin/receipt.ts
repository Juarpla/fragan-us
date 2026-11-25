import type { APIRoute } from 'astro';
import { guardAdmin, validCode } from '../../../lib/http';
import { storeEnv } from '../../../lib/runtime';

export const GET: APIRoute = async ({ request, url }) => {
  const env = storeEnv;
  const denied = await guardAdmin(request, env);
  if (denied) return denied;
  const code = url.searchParams.get('code');
  if (!validCode(code) || !env.DB || !env.RECEIPTS_BUCKET) return new Response('Comprobante no disponible.', { status: 404 });
  const order = await env.DB.prepare('SELECT receipt_r2_key FROM orders WHERE order_code = ?')
    .bind(code).first<{ receipt_r2_key: string | null }>();
  const photo = order?.receipt_r2_key && await env.RECEIPTS_BUCKET.get(order.receipt_r2_key);
  if (!photo) return new Response('Comprobante no encontrado.', { status: 404 });
  const type = photo.httpMetadata?.contentType;
  if (!type || !['image/jpeg', 'image/png', 'image/webp'].includes(type)) return new Response('Formato no disponible.', { status: 415 });
  return new Response(photo.body, {
    headers: { 'Content-Type': type, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' },
  });
};

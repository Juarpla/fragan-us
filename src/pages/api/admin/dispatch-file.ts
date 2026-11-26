import type { APIRoute } from 'astro';
import { guardAdmin, validCode } from '../../../lib/http';
import { storeEnv } from '../../../lib/runtime';

const mimeTypes: Record<string, string> = { pdf: 'application/pdf', jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

export const GET: APIRoute = async ({ request, url }) => {
  const denied = await guardAdmin(request, storeEnv);
  if (denied) return denied;
  const { DB: db, RECEIPTS_BUCKET: bucket } = storeEnv;
  const headers = new Headers({
    'Cache-Control': 'private, no-store',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
  });
  const missing = () => new Response(null, { status: 404, headers });
  const code = url.searchParams.get('code');
  if (!db || !bucket || !validCode(code)) return missing();
  const order = await db.prepare("SELECT shipping_receipt_key FROM orders WHERE order_code = ? AND status = 'SHIPPED'")
    .bind(code).first<{ shipping_receipt_key: string | null }>();
  if (!order?.shipping_receipt_key) return missing();
  const extension = order.shipping_receipt_key.split('.').at(-1) ?? '';
  if (!Object.hasOwn(mimeTypes, extension)) return missing();
  const file = await bucket.get(order.shipping_receipt_key);
  if (!file) return missing();
  headers.set('Content-Type', mimeTypes[extension]);
  return new Response(file.body, { headers });
};

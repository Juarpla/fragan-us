import type { APIRoute } from 'astro';
import { validCode } from '../../../lib/http';
import { storeEnv } from '../../../lib/runtime';

const headers = {
  'Cache-Control': 'private, no-store',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Robots-Tag': 'noindex, nofollow',
};

export const GET: APIRoute = async ({ url }) => {
  const { DB: db, RECEIPTS_BUCKET: bucket } = storeEnv;
  const code = url.searchParams.get('code');
  const missing = () => new Response(null, { status: 404, headers });
  if (!db || !bucket || !validCode(code)) return missing();
  const order = await db.prepare("SELECT shipping_receipt_key FROM orders WHERE order_code = ? AND status = 'SHIPPED'")
    .bind(code).first<{ shipping_receipt_key: string | null }>();
  if (!order?.shipping_receipt_key) return missing();
  const receipt = await bucket.get(order.shipping_receipt_key);
  const extension = order.shipping_receipt_key.split('.').at(-1);
  if (!receipt || !extension || !['pdf', 'jpg', 'png', 'webp'].includes(extension)) return missing();
  return new Response(receipt.body, {
    headers: {
      ...headers,
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="comprobante-envio-${code}.${extension}"`,
    },
  });
};

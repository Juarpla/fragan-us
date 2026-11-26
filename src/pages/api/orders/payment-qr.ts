import type { APIRoute } from 'astro';
import { checkoutMode, validCode } from '../../../lib/http';
import { expireReservations, isPayable, type OrderRow } from '../../../lib/orders';
import { storeEnv } from '../../../lib/runtime';

export const GET: APIRoute = async ({ url }) => {
  const { DB: db, RECEIPTS_BUCKET: bucket } = storeEnv;
  const code = url.searchParams.get('code');
  const unavailable = () => new Response(null, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  if (!db || !bucket || !validCode(code) || checkoutMode(storeEnv) !== 'live') {
    return unavailable();
  }

  await expireReservations(db);
  const order = await db.prepare('SELECT status, is_demo FROM orders WHERE order_code = ?')
    .bind(code).first<Pick<OrderRow, 'status' | 'is_demo'>>();
  if (!order || !isPayable(order, 'live')) return unavailable();
  const photo = await bucket.get('settings/payment-qr');
  const type = photo?.httpMetadata?.contentType;
  if (!photo || !type || !['image/jpeg', 'image/png', 'image/webp'].includes(type)) return unavailable();
  return new Response(photo.body, {
    headers: {
      'Content-Type': type,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      ...(url.searchParams.has('download') && {
        'Content-Disposition': `attachment; filename="fraganus-qr-pago.${type === 'image/jpeg' ? 'jpg' : type.split('/')[1]}"`,
      }),
    },
  });
};

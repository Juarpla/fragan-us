export const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
});

export function checkoutMode(env?: StoreEnv) {
  if (!env?.DB || !env.RECEIPTS_BUCKET) return 'unavailable';
  if (env.DEMO_MODE === 'true') return 'demo';
  if (env.STOREFRONT_PREVIEW === 'true') return 'unavailable';
  if (/^9\d{8}$/.test(env.PAYMENT_PHONE ?? '') && env.PAYMENT_RECIPIENT?.trim()) return 'live';
  return 'unavailable';
}

export function isSameOrigin(request: Request) {
  return request.headers.get('Origin') === new URL(request.url).origin;
}

export function isAdmin(request: Request, env?: StoreEnv) {
  if (!env?.ADMIN_USER || !env.ADMIN_PASSWORD) return false;
  const encoded = request.headers.get('Authorization')?.match(/^Basic ([A-Za-z0-9+/=]+)$/i)?.[1];
  if (!encoded) return false;
  try {
    const supplied = atob(encoded);
    const expected = `${env.ADMIN_USER}:${env.ADMIN_PASSWORD}`;
    let diff = supplied.length ^ expected.length;
    for (let i = 0; i < expected.length; i++) diff |= (supplied.charCodeAt(i) | 0) ^ expected.charCodeAt(i);
    return diff === 0;
  } catch {
    return false;
  }
}

export const adminChallenge = () => new Response('Acceso restringido.', {
  status: 401,
  headers: { 'WWW-Authenticate': 'Basic realm="FraganUS", charset="UTF-8"', 'Cache-Control': 'no-store' },
});

export const validId = (value: unknown): value is string =>
  typeof value === 'string' && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(value);

export const validCode = (value: unknown): value is string =>
  typeof value === 'string' && /^FRG-[A-F0-9]{16}$/.test(value);

export const shippingLabels: Record<string, string> = {
  TRUJILLO: 'Recojo en Trujillo', OLVA: 'Olva · Envío por pagar', SHALOM: 'Shalom · Envío por pagar',
};

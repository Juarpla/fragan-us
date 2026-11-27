import { timingSafeEqual } from 'node:crypto';

export const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
});

export function hasBearerToken(request: Request, token?: string) {
  if (!token || token.length < 32) return false;
  const given = Buffer.from(request.headers.get('Authorization') ?? '');
  const expected = Buffer.from(`Bearer ${token}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export function checkoutMode(env?: StoreEnv) {
  if (!env?.DB || !env.RECEIPTS_BUCKET) return 'unavailable';
  if (env.DEMO_MODE === 'true') return 'demo';
  if (env.STOREFRONT_PREVIEW === 'true') return 'unavailable';
  if (/^9\d{8}$/.test(env.PAYMENT_PHONE ?? '')) return 'live';
  return 'unavailable';
}

export function isSameOrigin(request: Request) {
  return request.headers.get('Origin') === new URL(request.url).origin;
}

function isAdmin(request: Request, env?: StoreEnv) {
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

const adminChallenge = () => new Response('Acceso restringido.', {
  status: 401,
  headers: { 'WWW-Authenticate': 'Basic realm="FraganUS", charset="UTF-8"', 'Cache-Control': 'no-store' },
});

export async function guardAdmin(request: Request, env: StoreEnv) {
  if (isAdmin(request, env)) return null;
  const ip = request.headers.get('CF-Connecting-IP');
  if (ip && env.ADMIN_LOGIN_LIMIT && request.headers.has('Authorization')) {
    const { success } = await env.ADMIN_LOGIN_LIMIT.limit({ key: ip });
    if (!success) return new Response('Demasiados intentos. Vuelve a intentarlo en un minuto.', {
      status: 429, headers: { 'Retry-After': '60', 'Cache-Control': 'no-store' },
    });
  }
  return adminChallenge();
}

export const validId = (value: unknown): value is string =>
  typeof value === 'string' && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(value);

export const validCode = (value: unknown): value is string =>
  typeof value === 'string' && /^FRG-[A-F0-9]{16}$/.test(value);

export const shippingLabels: Record<string, string> = {
  TRUJILLO: 'Recojo en Trujillo', OLVA: 'Olva · Envío por pagar', SHALOM: 'Shalom · Envío por pagar',
};

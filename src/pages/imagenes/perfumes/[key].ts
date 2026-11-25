import type { APIRoute } from 'astro';
import { storeEnv } from '../../../lib/runtime';

export const GET: APIRoute = async ({ params }) => {
  const key = params.key ?? '';
  if (!/^[a-f0-9-]{36}\.(jpg|png|webp)$/.test(key)) return new Response(null, { status: 404 });
  const image = await storeEnv.RECEIPTS_BUCKET?.get(`products/${key}`);
  const type = image?.httpMetadata?.contentType;
  if (!image || !type || !['image/jpeg', 'image/png', 'image/webp'].includes(type)) {
    return new Response(null, { status: 404 });
  }
  return new Response(image.body, {
    headers: { 'Content-Type': type, 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' },
  });
};

import type { APIRoute } from 'astro';
import { storeEnv } from '../../../lib/runtime';

export const GET: APIRoute = async ({ params }) => {
  const key = params.key ?? '';
  if (!/^[a-z0-9-]{1,100}-(640|1280)\.webp$/.test(key)) return new Response(null, { status: 404 });
  const image = await storeEnv.RECEIPTS_BUCKET?.get(`guides/${key}`);
  if (!image || image.httpMetadata?.contentType !== 'image/webp') return new Response(null, { status: 404 });
  return new Response(image.body, { headers: {
    'Content-Type': 'image/webp',
    'Cache-Control': 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff',
  } });
};

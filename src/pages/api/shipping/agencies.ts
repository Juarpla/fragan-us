import type { APIRoute } from 'astro';
import { getAgencyDirectory, districts } from '../../../lib/shipping-directory';
import { storeEnv } from '../../../lib/runtime';

export const GET: APIRoute = async () => {
  const { agencies, checkedAt } = await getAgencyDirectory(storeEnv);
  return Response.json({ agencies, checkedAt, districts }, {
    headers: { 'Cache-Control': 'public, max-age=300', 'X-Content-Type-Options': 'nosniff' },
  });
};

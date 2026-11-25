import type { APIRoute } from 'astro';
import { parseCart, priceCart } from '../../../lib/db';
import { checkoutMode, isSameOrigin, json } from '../../../lib/http';
import { storeEnv } from '../../../lib/runtime';

export const POST: APIRoute = async ({ request }) => {
  if (!isSameOrigin(request)) return json({ error: 'Solicitud no válida.' }, 403);
  if (!storeEnv.DB || checkoutMode(storeEnv) === 'unavailable') return json({ error: 'La compra aún no está habilitada.' }, 503);
  try {
    const { cart } = await request.json<{ cart: unknown }>();
    return json(await priceCart(storeEnv.DB, parseCart(cart)));
  } catch (error) {
    return json({ error: error instanceof Error && !error.message.startsWith('D1_') ? error.message : 'No pudimos revisar tu bolsa.' }, 400);
  }
};

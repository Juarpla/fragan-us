import { env } from 'cloudflare:workers';

export const storeEnv = env as StoreEnv;

export function publicStoreOrigin(url: URL) {
  return url.hostname === 'fragan-us.juarpla.workers.dev' ? 'https://fraganus.link' : url.origin;
}

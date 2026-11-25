import { env } from 'cloudflare:workers';

export const storeEnv = env as StoreEnv;

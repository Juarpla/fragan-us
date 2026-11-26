import { readFile, stat } from 'node:fs/promises';
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';

const verifyCatalogPhotoMasks = {
  name: 'fraganus:catalog-photo-masks',
  hooks: {
    async 'astro:build:start'() {
      const manifest = new URL('./src/data/catalog-photo-masks.json', import.meta.url);
      const masks = JSON.parse(await readFile(manifest, 'utf8'));
      await Promise.all(Object.values(masks).map(async path => {
        const file = await stat(new URL(`./public${path}`, import.meta.url)).catch(() => undefined);
        if (!file?.isFile() || !file.size) throw new Error(`Falta la máscara de foto del catálogo: ${path}`);
      }));
    },
  },
};

export default defineConfig({
  output: 'server',
  session: false,
  devToolbar: { enabled: false },
  adapter: cloudflare({ imageService: 'passthrough' }),
  integrations: [verifyCatalogPhotoMasks],
  vite: { plugins: [tailwindcss()] },
  server: { host: '127.0.0.1' },
});

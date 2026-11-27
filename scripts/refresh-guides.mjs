import { setTimeout } from 'node:timers/promises';
import sharp from 'sharp';

const agnesOrigin = 'https://apihub.agnes-ai.com/v1';
const textModel = 'agnes-3.0-flash';
const imageModel = 'agnes-image-2.5-flash';
const imageSizeLimit = 8 * 1024 * 1024;

async function agnesRequest(path, key, payload) {
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(`${agnesOrigin}/${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      redirect: 'error',
      signal: AbortSignal.timeout(120_000),
    });
    if (response.ok) return response.json();
    if (attempt >= 2 || ![429, 503].includes(response.status)) {
      throw new Error(`Agnes no completó ${path} (HTTP ${response.status}).`);
    }
    await response.body?.cancel();
    await setTimeout(15_000 * (attempt + 1));
  }
}

const inRange = (value, min, max) =>
  typeof value === 'string' && value.trim().length >= min && value.trim().length <= max && !/[<>\r\n\u0000]/.test(value);

async function draftRevision(guide, key) {
  const response = await agnesRequest('chat/completions', key, {
    model: textModel,
    temperature: 0.45,
    max_tokens: 1400,
    messages: [
      {
        role: 'system',
        content: [
          'Editas una guía de perfumes para FraganUS en español del Perú.',
          'Devuelve solo un objeto JSON con description, coverAlt e imagePrompt, sin Markdown.',
          'Reescribe la entradilla en 75 a 300 caracteres. Adelanta lo que el lector verá y usa solo datos del artículo.',
          'Conserva los periodos, categorías y alcances de las fuentes. Evita nuevas cifras, fechas, rankings y afirmaciones de venta.',
          'Propón una portada original con un motivo pertinente al artículo y una estética editorial de papel marfil, reflejos y ciruela suave.',
          'Formula imagePrompt en un párrafo de 40 a 1200 caracteres. Pide formato horizontal 3:2, sin texto, logos ni productos exactos.',
          'Escribe coverAlt en 15 a 200 caracteres y describe únicamente el motivo principal que estás pidiendo.',
        ].join(' '),
      },
      { role: 'user', content: JSON.stringify(guide) },
    ],
  });
  const output = response.choices?.[0]?.message?.content;
  if (typeof output !== 'string') throw new Error('Agnes no devolvió una entradilla.');
  const { description, coverAlt, imagePrompt } = JSON.parse(output.trim().replace(/^```(?:json)?\s*|\s*```$/gi, ''));
  if (!inRange(description, 75, 300) || !inRange(coverAlt, 15, 200) || !inRange(imagePrompt, 40, 1200)) {
    throw new Error('La propuesta de Agnes no tiene el texto o la portada esperados.');
  }
  return { description: description.trim(), coverAlt: coverAlt.trim(), imagePrompt: imagePrompt.trim() };
}

async function generateCover(prompt, key) {
  const response = await agnesRequest('images/generations', key, {
    model: imageModel,
    prompt,
    size: '1K',
    ratio: '3:2',
    return_base64: true,
    extra_body: { response_format: 'b64_json' },
  });
  const image = response.data?.[0];
  let bytes;
  if (typeof image?.b64_json === 'string' && image.b64_json.length > 0) {
    if (image.b64_json.length > Math.ceil(imageSizeLimit / 3) * 4) throw new Error('La portada supera el tamaño admitido.');
    bytes = Buffer.from(image.b64_json, 'base64');
  } else if (typeof image?.url === 'string') {
    const url = new URL(image.url);
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error('La URL de la portada no es válida.');
    const download = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(30_000) });
    if (!download.ok || !download.body) throw new Error(`No se pudo descargar la portada (HTTP ${download.status}).`);
    const reader = download.body.getReader();
    const chunks = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > imageSizeLimit) {
        await reader.cancel();
        throw new Error('La portada supera el tamaño admitido.');
      }
      chunks.push(value);
    }
    bytes = Buffer.concat(chunks);
  }
  if (!bytes?.length) throw new Error('Agnes no devolvió una imagen.');
  return Promise.all([640, 1280].map(width =>
    sharp(bytes, { limitInputPixels: 20_000_000 })
      .rotate()
      .resize(width, Math.round(width * 2 / 3))
      .webp({ quality: 79 })
      .toBuffer()));
}

async function main() {
  const { AGNES_API_KEY: agnesKey, GUIDES_AUTOMATION_TOKEN: storeToken, GUIDES_STORE_URL: storeUrl } = process.env;
  if (!agnesKey || !storeToken || !storeUrl) {
    throw new Error('Configura AGNES_API_KEY, GUIDES_AUTOMATION_TOKEN y GUIDES_STORE_URL.');
  }

  const endpoint = new URL('/api/guias/editorial', storeUrl);
  const headers = { Authorization: `Bearer ${storeToken}` };
  const response = await fetch(endpoint, { headers, redirect: 'error', signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`No se pudo consultar la guía editorial (HTTP ${response.status}).`);
  const { week, guide } = await response.json();
  if (!guide) {
    console.log('No hay una revisión pendiente para esta semana.');
    return;
  }

  const { revision, ...article } = guide;
  const draft = await draftRevision(article, agnesKey);
  const [small, large] = await generateCover(draft.imagePrompt, agnesKey);
  if (process.argv.includes('--preview')) {
    console.log(JSON.stringify({ slug: guide.slug, week, ...draft, coverBytes: [small.length, large.length] }, null, 2));
    return;
  }

  const form = new FormData();
  for (const [name, value] of Object.entries({ week, slug: guide.slug, revision, ...draft })) form.set(name, value);
  form.set('cover640', new Blob([small], { type: 'image/webp' }), 'cover-640.webp');
  form.set('cover1280', new Blob([large], { type: 'image/webp' }), 'cover-1280.webp');
  const saved = await fetch(endpoint, {
    method: 'POST', headers, body: form, redirect: 'error', signal: AbortSignal.timeout(30_000),
  });
  if (!saved.ok) throw new Error(`No se pudo publicar la revisión editorial (HTTP ${saved.status}).`);
  console.log(`Revisión del ${week} publicada en ${new URL(`/guias/${guide.slug}`, storeUrl)}`);
}

await main();

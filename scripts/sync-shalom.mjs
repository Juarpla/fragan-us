import { readFile, writeFile, rename } from 'node:fs/promises';
import { chromium } from 'playwright';

const source = 'https://shalom.com.pe/agencias';
const output = new URL('../src/data/shalom-agencies.json', import.meta.url);
const districts = new Set(JSON.parse(await readFile(new URL('../src/data/peru-districts.json', import.meta.url))).map(row => row[0]));
const previous = await readFile(output, 'utf8').then(JSON.parse, error => {
  if (error.code === 'ENOENT') return { agencies: [] };
  throw error;
});

// These three entries use a different code from the district listed in Shalom's address.
const districtCorrections = new Map([
  ['622:010205:BAGUA', '010201'],
  ['50:060418:CHOTA', '060401'],
  ['309:130112:VICTOR LARCO HERRERA', '130111'],
]);
const browser = await chromium.launch({ executablePath: process.env.SHALOM_BROWSER_PATH || undefined });
let raw;
try {
  const page = await browser.newPage({ locale: 'es-PE' });
  // Run the public branch finder in Chromium. Its own client loads the current dataset.
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    return url.origin === new URL(source).origin && !['image', 'font', 'media'].includes(route.request().resourceType())
      ? route.continue() : route.abort();
  });
  await page.goto(source, { waitUntil: 'domcontentloaded', timeout: 45000 });
  const snapshot = await page.waitForFunction(() => {
    const app = document.querySelector('#app')?.__vue_app__;
    const store = app?.config.globalProperties.$pinia?._s?.get('store_agencias');
    if (!store?.version || !store.destinos.length) return null;
    return { version: store.version, agencies: store.destinos.map(row => ({
      id: row.ter_id, name: row.nombre, address: row.direccion, district: row.zona,
      ubigeo: row.ubi_id, latitude: row.latitud, longitude: row.longitud,
      web: row.web, agent: row.agente, pro: row.puntospro,
    })) };
  }, undefined, { timeout: 60000 });
  raw = await snapshot.jsonValue();
} finally {
  await browser.close();
}

const clean = value => String(value ?? '').trim().replace(/\s+/g, ' ');
const agencies = raw.agencies.filter(row => row.web === 1 && row.agent === 0 && row.pro === 0).map(row => {
  const id = Number(row.id);
  const original = String(row.ubigeo).padStart(6, '0');
  const ubigeo = districtCorrections.get(`${id}:${original}:${clean(row.district)}`) ?? original;
  const latitude = Number(row.latitude);
  const longitude = Number(row.longitude);
  const name = clean(row.name);
  const address = clean(row.address);
  if (!Number.isSafeInteger(id) || id <= 0 || !districts.has(ubigeo) || !name || name.length > 140 || !address || address.length > 300 ||
      !(latitude >= -19 && latitude <= 0 && longitude >= -82 && longitude <= -68)) {
    throw new Error(`Agencia inválida en la fuente: ${id} (${original})`);
  }
  return { id, ubigeo, name, address, latitude: +latitude.toFixed(6), longitude: +longitude.toFixed(6) };
}).sort((a, b) => a.id - b.id);

const minimum = Math.max(100, Math.floor(previous.agencies.length * .85));
if (agencies.length < minimum || new Set(agencies.map(row => row.id)).size !== agencies.length) {
  throw new Error(`El listado de ${agencies.length} agencias es incompleto o contiene duplicados. Se conserva el último listado válido.`);
}
const data = { sourceVersion: String(raw.version), checkedAt: new Date().toISOString() };
const json = JSON.stringify(data, null, 2).replace(/\n}$/, ',\n  "agencies": [\n' +
  agencies.map(agency => '    ' + JSON.stringify(agency)).join(',\n') + '\n  ]\n}\n');
const next = new URL(output.href + '.tmp');
await writeFile(next, json);
await rename(next, output);
console.log(`${agencies.length} agencias habilitadas para recibir encomiendas (versión ${raw.version}).`);

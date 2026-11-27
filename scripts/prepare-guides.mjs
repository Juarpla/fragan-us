import { readdir, readFile, writeFile } from 'node:fs/promises';

const directory = new URL('../content/guias/articulos/', import.meta.url);
const directions = new URL('../content/guias/direcciones/', import.meta.url);
const stories = new URL('../src/pages/guias/', import.meta.url);
const segmenter = new Intl.Segmenter('es', { granularity: 'word' });
const files = (await readdir(directory)).filter(file => file.endsWith('.json')).sort();
if (!files.length) throw new Error('No hay guías en el directorio editorial.');

const articles = await Promise.all(files.map(async file => {
  const article = JSON.parse(await readFile(new URL(file, directory), 'utf8'));
  if (!/^[a-z0-9-]+$/.test(article.slug) || ['index', 'lote'].includes(article.slug) || file !== `${article.slug}.json`) {
    throw new Error(`Ruta editorial no válida en ${file}.`);
  }
  const body = article.content.chapters.flatMap(chapter => chapter.body);
  if (!body.length || body.some(paragraph => typeof paragraph !== 'string' || !paragraph.trim())) {
    throw new Error(`Párrafos no válidos en ${file}.`);
  }
  const words = [...segmenter.segment(body.join(' '))].filter(segment => segment.isWordLike).length;
  if (words < 800) {
    throw new Error(`${article.slug} tiene ${words} palabras. El cuerpo debe tener al menos 800.`);
  }
  const [directionText, story] = await Promise.all([
    readFile(new URL(file, directions), 'utf8'),
    readFile(new URL(`${article.slug}.astro`, stories), 'utf8'),
  ]);
  const { cover, story: concept } = JSON.parse(directionText);
  if (![cover, concept, story].every(value => typeof value === 'string' && value.trim())) {
    throw new Error(`Falta la dirección creativa o la puesta en escena de ${article.slug}.`);
  }
  console.log(`${article.slug}: ${words} palabras en el cuerpo`);
  return article;
}));

for (const article of articles) {
  const next = article.content.nextGuide?.slug;
  if (next && !articles.some(candidate => candidate.slug === next && next !== article.slug)) {
    throw new Error(`La lectura relacionada de ${article.slug} no existe en el plan de publicación.`);
  }
}

const [command, file, ...slugs] = process.argv.slice(2);
if (command === undefined) process.exit(0);
if (command !== '--migration' || !/^\d{4}_[a-z0-9_]+\.sql$/.test(file ?? '') || !slugs.length) {
  throw new Error('Uso: npm run guides:check -- --migration 0010_nombre.sql slug [otro-slug]');
}

const quote = value => `'${value.replaceAll("'", "''")}'`;
const statements = slugs.map(slug => {
  const guide = articles.find(article => article.slug === slug);
  if (!guide) throw new Error(`No se encontró ${slug}.`);
  const values = [guide.slug, guide.title, guide.description, guide.cover_key, guide.cover_alt,
    JSON.stringify(guide.content, null, 2), guide.published_on];
  return `INSERT INTO guides (slug, title, description, cover_key, cover_alt, content, published_on)
VALUES (\n  ${values.map(quote).join(',\n  ')}\n)
ON CONFLICT(slug) DO UPDATE SET
  title = excluded.title, description = excluded.description,
  cover_key = excluded.cover_key, cover_alt = excluded.cover_alt,
  content = excluded.content, published_on = COALESCE(guides.published_on, excluded.published_on);`;
});

await writeFile(new URL(`../migrations/${file}`, import.meta.url),
  `-- Preparada a partir de content/guias/articulos.\n\n${statements.join('\n\n')}\n`, { flag: 'wx' });

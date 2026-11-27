import { createHash } from 'node:crypto';
import type { APIRoute } from 'astro';
import { hasBearerToken, json } from '../../../lib/http';
import { imageFormat, readImageForm } from '../../../lib/images';
import { storeEnv } from '../../../lib/runtime';

interface Candidate {
  slug: string;
  title: string;
  description: string;
  cover_key: string;
  cover_alt: string;
  content: string;
}

const weekStart = "date('now', '-5 hours', '-' || strftime('%w', 'now', '-5 hours') || ' days')";

async function editorialTarget(db: D1Database) {
  const current = await db.prepare(`SELECT ${weekStart} AS week, EXISTS (
    SELECT 1 FROM guide_refreshes WHERE week_start = ${weekStart}
  ) AS completed`).first<{ week: string; completed: number }>();
  if (!current) throw new Error('No se encontró la semana editorial.');
  const guide = current.completed ? null : await db.prepare(`SELECT slug, title, description, cover_key, cover_alt, content
    FROM published_guides ORDER BY refreshed_on ASC NULLS FIRST, published_on, slug LIMIT 1`).first<Candidate>();
  return { week: current.week, guide };
}

const guideRevision = (guide: Candidate) => createHash('sha256').update(JSON.stringify(guide)).digest('hex');

function plainText(value: FormDataEntryValue | null, min: number, max: number) {
  if (typeof value !== 'string' || /[<>\r\n\u0000]/.test(value)) return '';
  const text = value.trim();
  return text.length >= min && text.length <= max ? text : '';
}

const webp = async (file: FormDataEntryValue | null) =>
  file instanceof File && file.size <= 600_000 && await imageFormat(file) === 'webp' ? file : null;

export const GET: APIRoute = async ({ request }) => {
  if (!hasBearerToken(request, storeEnv.GUIDES_AUTOMATION_TOKEN)) return json({ error: 'Acceso restringido.' }, 401);
  const db = storeEnv.DB;
  if (!db) return json({ error: 'Guías no disponibles.' }, 503);
  const { week, guide } = await editorialTarget(db);
  return json({
    week,
    guide: guide && {
      slug: guide.slug,
      title: guide.title,
      description: guide.description,
      content: JSON.parse(guide.content),
      revision: guideRevision(guide),
    },
  });
};

export const POST: APIRoute = async ({ request }) => {
  if (!hasBearerToken(request, storeEnv.GUIDES_AUTOMATION_TOKEN)) return json({ error: 'Acceso restringido.' }, 401);
  const { DB: db, RECEIPTS_BUCKET: bucket } = storeEnv;
  if (!db || !bucket) return json({ error: 'Guías no disponibles.' }, 503);

  const form = await readImageForm(request).catch(() => null);
  if (!form) return json({ error: 'Revisión no válida.' }, 400);
  const description = plainText(form.get('description'), 75, 300);
  const coverAlt = plainText(form.get('coverAlt'), 15, 200);
  const imagePrompt = plainText(form.get('imagePrompt'), 40, 1600);
  const [small, large] = await Promise.all([webp(form.get('cover640')), webp(form.get('cover1280'))]);
  if (!description || !coverAlt || !imagePrompt || !small || !large) {
    return json({ error: 'Texto o portada no válidos.' }, 400);
  }

  const { week, guide } = await editorialTarget(db);
  if (!guide || week !== form.get('week') || guide.slug !== form.get('slug') || guideRevision(guide) !== form.get('revision')) {
    return json({ error: 'La guía cambió o la revisión semanal ya fue publicada.' }, 409);
  }

  const coverKey = `atlas-${crypto.randomUUID()}`;
  const keys = [`guides/${coverKey}-640.webp`, `guides/${coverKey}-1280.webp`];
  const removeCover = () => bucket.delete(keys).catch(() => undefined);
  const uploads = await Promise.allSettled([small, large].map((file, index) =>
    bucket.put(keys[index], file, { httpMetadata: { contentType: 'image/webp' } })));
  if (uploads.some(upload => upload.status === 'rejected')) {
    await removeCover();
    return json({ error: 'No se pudo guardar la portada.' }, 503);
  }

  try {
    const result = await db.prepare(`INSERT INTO guide_refreshes (week_start, guide_slug, description, cover_key, cover_alt, image_prompt)
      SELECT ?, slug, ?, ?, ?, ? FROM published_guides
      WHERE slug = ? AND title = ? AND description = ? AND cover_key = ? AND cover_alt = ? AND content = ?
        AND ? = ${weekStart}
      ON CONFLICT(week_start) DO NOTHING`).bind(week, description, coverKey, coverAlt, imagePrompt,
      guide.slug, guide.title, guide.description, guide.cover_key, guide.cover_alt, guide.content, week).run();
    if (result.meta.changes) return json({ slug: guide.slug, week, coverKey });
  } catch {
    const saved = await db.prepare('SELECT cover_key FROM guide_refreshes WHERE week_start = ?')
      .bind(week).first<{ cover_key: string }>().catch(() => undefined);
    if (saved?.cover_key === coverKey) return json({ slug: guide.slug, week, coverKey });
    if (saved !== undefined) await removeCover();
    return json({ error: 'No se pudo publicar la revisión.' }, 503);
  }

  await removeCover();
  return json({ error: 'La guía cambió o la revisión semanal ya fue publicada.' }, 409);
};

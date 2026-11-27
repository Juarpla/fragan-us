export interface GuideCard {
  slug: string;
  title: string;
  description: string;
  cover_key: string;
  cover_alt: string;
  published_on: string;
}

export interface GuideChapter {
  id: string;
  place?: string;
  heading: string;
  point?: [longitude: number, latitude: number];
  label?: string;
  body: string[];
  ranking?: string[];
  marketShare?: { percent: number; scope: string; attribution: string };
  image?: { key: string; alt: string };
  sources?: string[];
}

interface GuideContent {
  mapView?: [x: number, y: number, width: number, height: number];
  chapters: GuideChapter[];
  nextGuide?: {
    slug: string;
    description: string;
    preview?: { heading: string; topics: { icon: 'boutique' | 'auction' | 'collection'; title: string; text: string }[] };
  };
  sources: { id: string; label: string; href: string }[];
}

export type Guide = GuideCard & { content: GuideContent };
export type GuideReading = Omit<NonNullable<GuideContent['nextGuide']>, 'slug'> & {
  card: Pick<GuideCard, 'title' | 'slug'>;
};

export const guidesPerPage = 6;
const limaDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', dateStyle: 'short' });

export function guideIndexRequest(url: URL, now = new Date()) {
  const today = limaDate.format(now);
  const requestedDay = url.searchParams.get('fecha') ?? '';
  const ordinal = /^\d{4}-\d{2}-\d{2}$/.test(requestedDay) ? Date.parse(requestedDay) : NaN;
  const validDay = Number.isFinite(ordinal) && new Date(ordinal).toISOString().slice(0, 10) === requestedDay;
  const day = validDay && requestedDay <= today ? requestedDay : today;
  const requestedPage = Number(url.searchParams.get('pagina'));
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 && requestedPage <= 1000 ? requestedPage : 1;
  return { day, page };
}

export function guideIndexUrl(day: string, page: number) {
  return `/guias?fecha=${day}&pagina=${page}`;
}

export async function listGuidePage(db: D1Database | undefined, day: string, page: number) {
  const dayNumber = Date.parse(day) / 86_400_000;
  const offset = page === 1 ? 0 : 1 + (page - 1) * guidesPerPage;
  const limit = guidesPerPage + (page === 1 ? 1 : 0);
  const list = await db?.prepare(`WITH ordered AS (
    SELECT slug, title, description, cover_key, cover_alt, published_on,
      ROW_NUMBER() OVER (ORDER BY published_on DESC, slug) - 1 AS position,
      COUNT(*) OVER () AS total
    FROM published_guides WHERE published_on <= ?1
  )
  SELECT slug, title, description, cover_key, cover_alt, published_on FROM ordered
  ORDER BY (((position - ?2) % total + total) % total) LIMIT ?3 OFFSET ?4`)
    .bind(day, dayNumber, limit + 1, offset).all<GuideCard>();
  const cards = list?.results.slice(0, limit) ?? [];
  const featured = page === 1 ? cards.shift() : undefined;
  return { featured, cards, hasMore: (list?.results.length ?? 0) > limit };
}

function getGuideCard(db: D1Database | undefined, slug: string) {
  return db?.prepare('SELECT slug, title FROM published_guides WHERE slug = ?')
    .bind(slug).first<Pick<GuideCard, 'slug' | 'title'>>();
}

async function getGuide(db: D1Database | undefined, slug: string) {
  const row = await db?.prepare(`SELECT slug, title, description, cover_key, cover_alt, published_on, content
    FROM published_guides WHERE slug = ?`)
    .bind(slug).first<GuideCard & { content: string }>();
  return row && { ...row, content: JSON.parse(row.content) as GuideContent };
}

export async function getGuideStory(db: D1Database | undefined, slug: string) {
  const guide = await getGuide(db, slug);
  const followup = guide?.content.nextGuide;
  const card = followup && await getGuideCard(db, followup.slug);
  const next: GuideReading | undefined = followup && card
    ? { card, description: followup.description, preview: followup.preview }
    : undefined;
  return { guide, next };
}

export function guideImage(key: string, width: 640 | 1280) {
  return `/imagenes/guias/${encodeURIComponent(key)}-${width}.webp`;
}

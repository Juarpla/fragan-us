interface GuideCard {
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
  image?: { key: string; alt: string };
  sources?: string[];
}

interface GuideContent {
  mapView?: [x: number, y: number, width: number, height: number];
  chapters: GuideChapter[];
  comparison?: {
    heading: string;
    description: string;
    groups: { heading: string; scope: string; entries: string[]; source: string }[];
  };
  sources: { id: string; label: string; href: string }[];
}

export async function listGuides(db?: D1Database): Promise<GuideCard[]> {
  const list = await db?.prepare(`SELECT slug, title, description, cover_key, cover_alt, published_on
    FROM published_guides ORDER BY published_on DESC, slug`).all<GuideCard>();
  return list?.results ?? [];
}

export async function getGuide(db: D1Database | undefined, slug: string) {
  const row = await db?.prepare(`SELECT slug, title, description, cover_key, cover_alt, published_on, content
    FROM published_guides WHERE slug = ?`)
    .bind(slug).first<GuideCard & { content: string }>();
  return row && { ...row, content: JSON.parse(row.content) as GuideContent };
}

export function guideImage(key: string, width: 640 | 1280) {
  return `/imagenes/guias/${encodeURIComponent(key)}-${width}.webp`;
}

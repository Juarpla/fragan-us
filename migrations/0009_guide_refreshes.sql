CREATE TABLE guide_refreshes (
  week_start TEXT PRIMARY KEY,
  guide_slug TEXT NOT NULL REFERENCES guides(slug),
  description TEXT NOT NULL,
  cover_key TEXT NOT NULL,
  cover_alt TEXT NOT NULL,
  image_prompt TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX guide_refreshes_by_slug ON guide_refreshes(guide_slug, week_start DESC);

CREATE VIEW published_guides AS
SELECT guides.slug, guides.title,
  COALESCE(refresh.description, guides.description) AS description,
  COALESCE(refresh.cover_key, guides.cover_key) AS cover_key,
  COALESCE(refresh.cover_alt, guides.cover_alt) AS cover_alt,
  guides.published_on, guides.content, refresh.week_start AS refreshed_on
FROM guides
LEFT JOIN guide_refreshes AS refresh ON refresh.week_start = (
  SELECT week_start FROM guide_refreshes WHERE guide_slug = guides.slug
  ORDER BY week_start DESC LIMIT 1
)
WHERE guides.published_on IS NOT NULL AND guides.published_on <= date('now');

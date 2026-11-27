export async function productSharePath(db: D1Database | undefined, slug: string) {
  try {
    const row = await db?.prepare('SELECT id FROM product_share_links WHERE product_slug = ?')
      .bind(slug).first<{ id: number }>();
    return row ? `/p/${row.id.toString(36)}` : undefined;
  } catch (error) {
    console.error('No se pudo obtener el enlace corto del perfume.', error);
  }
}

export async function sharedProductSlug(db: D1Database | undefined, code: string) {
  if (!/^[1-9a-z][0-9a-z]{0,10}$/.test(code)) return undefined;
  const id = Number.parseInt(code, 36);
  if (!Number.isSafeInteger(id)) return undefined;
  const row = await db?.prepare(`
    SELECT products.slug FROM product_share_links
    JOIN products ON products.slug = product_share_links.product_slug
    WHERE product_share_links.id = ? AND products.active = 1
  `).bind(id).first<{ slug: string }>();
  return row?.slug;
}

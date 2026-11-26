-- Olfactory comparisons, not manufacturer endorsements.
-- Asad comparison: https://www.thelastspritz.com/lattafa-asad-vs-dior-sauvage-elixir
-- Sauvage Elixir product photo: https://ajeeb.net/products/dior-sauvage-elixir-60ml
UPDATE products
SET inspiration_name = 'Sauvage Elixir de Dior',
    inspiration_image_url = '/perfumes/referencias/sauvage-elixir.webp'
WHERE slug = 'asad' AND inspiration_name IS NULL;

-- Mandarin Sky comparison: https://www.figdecants.com/blogs/guias/mandarin-sky-vs-scandal-pour-homme
-- Scandal Pour Homme product photo: https://felix.com.pa/products/jean-paul-gaultier-scandal-pour-homme-eau-de-toilette
UPDATE products
SET inspiration_name = 'Scandal Pour Homme de Jean Paul Gaultier',
    inspiration_image_url = '/perfumes/referencias/scandal-pour-homme.webp'
WHERE slug = 'odyssey-mandarin-sky' AND inspiration_name IS NULL;

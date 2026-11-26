-- Initial prices in soles set for FraganUS. Stock is zero until the operator counts it.
-- Notes verified with Armaf (Odyssey Mandarin Sky), Lattafa (Khamrah Qahwa and Hayaati) and Rasasi (Hawas for Him).
-- Photography: Armaf product gallery, Época Cosméticos (Qahwa), user-selected Falabella (Hawas),
-- and PerfumeBox (Hayaati).
INSERT INTO products (
  slug, name, brand, price_cents, stock, image_url, volume, concentration, audience, family, tone,
  collections, climate, occasions, notes, description, position, active
) VALUES
  ('odyssey-mandarin-sky', 'Odyssey Mandarin Sky', 'Armaf', 15500, 0, '/perfumes/odyssey-mandarin-sky.webp', 100, 'EDP', 'Para él', 'Cítrico · Dulce', 'peach',
   '["arabes"]', '["calido","fresco"]', '["diario","noche"]',
   '{"opening":"Mandarina, naranja, salvia y azafrán","heart":"Caramelo, haba tonka y tagete","base":"Vetiver, cedro y ambroxán"}',
   'La mandarina y la naranja abren una fragancia que se vuelve dulce con el caramelo y termina sobre un fondo amaderado. La versión clásica de Armaf.', 5, 1),
  ('khamrah-qahwa', 'Khamrah Qahwa', 'Lattafa', 15900, 0, '/perfumes/khamrah-qahwa.webp', 100, 'EDP', 'Unisex', 'Dulce · Especiado', 'sand',
   '["arabes"]', '["fresco"]', '["noche"]',
   '{"opening":"Jengibre, canela y cardamomo","heart":"Praliné, frutas confitadas y flores blancas","base":"Café arábica, haba tonka, almizcle, benjuí y vainilla"}',
   'El café arábica distingue esta versión de Khamrah. Se mezcla con praliné, vainilla y especias, una combinación para tardes frescas y salidas de noche.', 6, 1),
  ('hawas-for-him', 'Hawas for Him', 'Rasasi', 16000, 0, '/perfumes/hawas-for-him.webp', 100, 'EDP', 'Para él', 'Acuático · Frutal', 'ice',
   '["arabes"]', '["calido","fresco"]', '["diario","noche"]',
   '{"opening":"Manzana, bergamota, limón y canela","heart":"Notas acuáticas, ciruela, flor de azahar y cardamomo","base":"Pachulí, ámbar gris, madera flotante y almizcle"}',
   'Una salida de manzana y cítricos da paso a un corazón acuático con ciruela. Una opción fresca para el día a día o una salida.', 7, 1),
  ('hayaati', 'Hayaati', 'Lattafa', 10900, 0, '/perfumes/hayaati.webp', 100, 'EDP', 'Para él', 'Amaderado · Aromático', 'lilac',
   '["arabes"]', '["calido","fresco"]', '["diario"]',
   '{"opening":"Manzana y bergamota","heart":"Canela y notas amaderadas","base":"Almizcle y vainilla"}',
   'Hayaati del frasco negro combina manzana y bergamota con canela y maderas. El fondo de almizcle y vainilla suaviza la fragancia para el día a día.', 8, 1)
ON CONFLICT(slug) DO NOTHING;

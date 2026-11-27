CREATE TABLE guides (
  slug TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  cover_key TEXT NOT NULL,
  cover_alt TEXT NOT NULL,
  content TEXT NOT NULL CHECK (json_valid(content)),
  published_on TEXT
);

INSERT INTO guides (slug, title, description, cover_key, cover_alt, content, published_on) VALUES (
  'origen-fragancias-mas-vendidas',
  '¿De dónde vienen las fragancias más vendidas?',
  'De París a Calabria, Marruecos y Milán. Sigue el origen de las casas y los ingredientes detrás de algunas fragancias que lideraron las ventas en 2025.',
  'atlas-origenes-v1',
  'Frasco de perfume ámbar sobre un mapa antiguo, junto a una rama de bergamota',
  '{
    "mapView": [166, 32, 38, 33],
    "chapters": [
      {
        "id": "paris",
        "place": "París, Francia",
        "heading": "Dónde nace una casa",
        "point": [2.35, 48.86],
        "label": "París",
        "body": [
          "La historia de la casa Dior lleva al 30 de la avenida Montaigne, en París. En su balance de 2025, LVMH identificó a Sauvage como la fragancia masculina más vendida del mundo.",
          "Esa ubicación cuenta la historia de la marca. La salida cítrica de una de sus versiones nos lleva a otro país."
        ],
        "sources": ["dior-paris", "lvmh"]
      },
      {
        "id": "calabria",
        "place": "Reggio de Calabria, Italia",
        "heading": "La bergamota de Sauvage",
        "point": [15.65, 38.11],
        "label": "Calabria",
        "body": [
          "En la ficha de Sauvage Eau de Toilette, Dior identifica la bergamota de Reggio de Calabria y describe el trabajo del perfumista François Demachy con productores locales.",
          "El dato se refiere a esa versión y a ese ingrediente. Es una forma más precisa de seguir el rastro de un perfume que atribuir toda la fórmula a un solo lugar."
        ],
        "image": { "key": "bergamota-calabria-v1", "alt": "Ilustración de un fruto de bergamota en un huerto frente a la costa de Calabria" },
        "sources": ["dior-sauvage"]
      },
      {
        "id": "marruecos",
        "place": "Marruecos",
        "heading": "Libre cruza el Mediterráneo",
        "point": [-6.5, 32.5],
        "label": "Marruecos",
        "body": [
          "Yves Saint Laurent describe Libre Eau de Parfum a partir del azahar de Marruecos y la lavanda de Francia. Su contraste es parte del perfil de la fragancia.",
          "Libre aparece en el grupo de tres fragancias femeninas destacadas por L’Oréal en sus resultados de 2025, junto a La Vie Est Belle de Lancôme y Paradoxe de Prada."
        ],
        "image": { "key": "azahar-marruecos-v1", "alt": "Ilustración de flores de azahar y naranjos al sol en un huerto marroquí" },
        "sources": ["ysl", "loreal"]
      },
      {
        "id": "milan",
        "place": "Milán, Italia",
        "heading": "Qué nos dice el nombre Prada",
        "point": [9.19, 45.46],
        "label": "Milán",
        "body": [
          "Prada abrió su primera tienda en la Galleria Vittorio Emanuele II de Milán en 1913. Esa es la procedencia de la casa que da nombre a Paradoxe.",
          "El origen de una marca, la procedencia de una materia prima y el país de fabricación son datos distintos. Para saber dónde se fabricó un frasco concreto, lo más directo es consultar su envase o la ficha de esa presentación."
        ],
        "sources": ["prada"]
      }
    ],
    "comparison": {
      "heading": "Qué sabemos del ranking de 2025",
      "description": "Los resultados públicos de LVMH y L’Oréal cubren categorías distintas. Los presentamos por separado. Los comunicados citados no detallan unidades vendidas por fragancia ni permiten construir un top mundial único.",
      "groups": [
        {
          "heading": "Fragancia masculina",
          "scope": "Mundial · ejercicio 2025 · según LVMH",
          "entries": ["Sauvage · Dior"],
          "source": "lvmh"
        },
        {
          "heading": "Tres fragancias femeninas destacadas",
          "scope": "Ejercicio 2025 · según L’Oréal Luxe · presentadas como grupo",
          "entries": ["Libre · Yves Saint Laurent", "La Vie Est Belle · Lancôme", "Paradoxe · Prada"],
          "source": "loreal"
        }
      ]
    },
    "sources": [
      { "id": "lvmh", "label": "LVMH · Resultados de 2025", "href": "https://www.lvmh.com/en/publications/solid-performance-in-a-disrupted-global-economic-and-geopolitical-environment" },
      { "id": "loreal", "label": "L’Oréal · Resultados anuales 2025", "href": "https://www.loreal-finance.com/eng/press-release/2025-annual-results" },
      { "id": "dior-paris", "label": "Dior · La historia del 30 Montaigne", "href": "https://www.dior.com/en_int/fashion/30-montaigne/the-story-of-30-montaigne" },
      { "id": "dior-sauvage", "label": "Dior · Sauvage Eau de Toilette", "href": "https://www.dior.com/en_int/beauty/products/sauvage-eau-de-toilette-Y0685240.html" },
      { "id": "ysl", "label": "Yves Saint Laurent Beauty · Libre Eau de Parfum", "href": "https://www.yslbeauty.com/int/fragrance/fragrance-for-her/libre/libre-eau-de-parfum/WW-50424YSL.html" },
      { "id": "prada", "label": "Prada · Galleria 1913", "href": "https://www.prada.com/ww/en/pradasphere/places/galleria-1913.html" }
    ]
  }',
  '2026-11-27'
);

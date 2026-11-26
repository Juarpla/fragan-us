export interface Product {
  slug: string;
  name: string;
  brand: string;
  price_cents: number;
  stock: number;
  image_url: string;
  volume: number;
  concentration: string;
  audience: string;
  family: string;
  tone: string;
  badge: string;
  collections: string[];
  climate: string[];
  occasions: string[];
  notes: { opening: string; heart: string; base: string };
  description: string;
  position: number;
  inspiration_name?: string | null;
  inspiration_image_url?: string | null;
}

export const sampleCatalog: Product[] = [
  {
    slug: 'khamrah', name: 'Khamrah', brand: 'Lattafa', price_cents: 15900, stock: 12,
    image_url: '/perfumes/khamrah.webp', volume: 100, concentration: 'EDP', audience: 'Unisex',
    family: 'Dulce · Especiado', tone: 'sand', badge: 'Selección FraganUS',
    collections: ['arabes'], climate: ['fresco'], occasions: ['noche', 'regalo'],
    notes: { opening: 'Canela, nuez moscada y bergamota', heart: 'Dátiles, praliné y nardo', base: 'Vainilla, haba tonka y madera de ámbar' },
    description: 'Canela y dátiles sobre un fondo de vainilla y ámbar. Una fragancia envolvente para noches frescas y ocasiones especiales.', position: 1,
  },
  {
    slug: 'yara', name: 'Yara', brand: 'Lattafa', price_cents: 13900, stock: 16,
    image_url: '/perfumes/yara.webp', volume: 100, concentration: 'EDP', audience: 'Para ella',
    family: 'Dulce · Floral', tone: 'rose', badge: '',
    collections: ['arabes'], climate: ['calido'], occasions: ['diario', 'regalo'],
    notes: { opening: 'Mandarina, heliotropo y orquídea', heart: 'Frutas tropicales y acorde gourmand', base: 'Vainilla, sándalo y almizcle' },
    description: 'Orquídea y frutas tropicales con un fondo suave de vainilla. Una opción dulce para acompañarte en el día a día.', position: 2,
  },
  {
    slug: 'asad', name: 'Asad', brand: 'Lattafa', price_cents: 14900, stock: 10,
    image_url: '/perfumes/asad.webp', volume: 100, concentration: 'EDP', audience: 'Para él',
    family: 'Ambarado · Especiado', tone: 'lilac', badge: '',
    collections: ['arabes'], climate: ['fresco'], occasions: ['noche'],
    notes: { opening: 'Pimienta negra, piña y tabaco', heart: 'Café, iris y pachulí', base: 'Ámbar, vainilla y maderas secas' },
    description: 'La pimienta negra da paso al café y a un fondo cálido de ámbar. Tiene carácter para cenas, salidas de noche y días fríos.', position: 3,
  },
  {
    slug: 'qaed-al-fursan', name: 'Qaed Al Fursan', brand: 'Lattafa', price_cents: 11900, stock: 14,
    image_url: '/perfumes/qaed-al-fursan.webp', volume: 90, concentration: 'EDP', audience: 'Para él',
    family: 'Frutal · Amaderado', tone: 'sage', badge: '',
    collections: ['arabes', 'frescos'], climate: ['calido', 'fresco'], occasions: ['diario'],
    notes: { opening: 'Piña y azafrán', heart: 'Jazmín y bálsamo de abeto', base: 'Oud, cedro y ámbar' },
    description: 'Una salida jugosa de piña sobre maderas y ámbar. Ideal si buscas un perfume frutal para planes de día.', position: 4,
  },
];

export const money = (cents: number) => `S/ ${(cents / 100).toFixed(2)}`;
export const climateLabel: Record<string, string> = { calido: 'Clima cálido', fresco: 'Clima fresco' };
export const occasionLabel: Record<string, string> = { diario: 'Día a día', noche: 'Noche y eventos' };

export const productPhotoPlaceholder = '/brand/perfume-sin-foto.svg';

export function productSpecs(product: Pick<Product, 'concentration' | 'volume' | 'family'>) {
  const format = [product.concentration, product.volume > 0 ? `${product.volume} ml` : ''].filter(Boolean).join(' · ');
  return [format, product.family].filter(Boolean).join(' / ');
}

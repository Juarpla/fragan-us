import { climateLabel, occasionLabel } from './catalog';

export const audiences = ['Para él', 'Para ella', 'Unisex'];
export const tones = { sand: 'Arena', rose: 'Rosa', lilac: 'Lila', sage: 'Verde salvia' };

export function parseProduct(form: FormData) {
  const field = (name: string) => {
    const value = form.get(name);
    return typeof value === 'string' ? value.trim() : '';
  };
  const name = field('name');
  const brand = field('brand');
  const slug = `${name}-${brand}`.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const price = field('price');
  const priceCents = /^\d{1,3}(?:[.,]\d{1,2})?$/.test(price) ? Math.round(Number(price.replace(',', '.')) * 100) : 0;
  const stock = Number(field('stock'));
  const volume = Number(field('volume'));
  const tone = field('tone');
  const audience = field('audience');
  const concentration = field('concentration');
  const family = field('family');
  const description = field('description');
  const notes = { opening: field('opening'), heart: field('heart'), base: field('base') };
  if (name.length < 2 || name.length > 65 || brand.length < 2 || brand.length > 45 || !slug || slug.length > 80 ||
      priceCents < 1 || priceCents > 16000 || !/^\d{1,5}$/.test(field('stock')) || stock > 10000 ||
      !Number.isInteger(volume) || volume < 1 || volume > 2000 || !audiences.includes(audience) ||
      !Object.hasOwn(tones, tone) || !concentration || concentration.length > 24 || !family || family.length > 60 ||
      description.length < 10 || description.length > 500 || Object.values(notes).some(note => !note || note.length > 130)) return null;
  return {
    slug, name, brand, priceCents, stock, volume, concentration, audience, family, tone, description, notes,
    climate: Object.keys(climateLabel).filter(key => form.getAll('climate').includes(key)),
    occasions: Object.keys(occasionLabel).filter(key => form.getAll('occasion').includes(key)),
    active: field('active') === 'on' ? 1 : 0,
  };
}

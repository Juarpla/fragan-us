export const documentFormats = {
  DNI: { label: 'DNI', digits: 8 },
  CE: { label: 'Carné de extranjería', digits: 9 },
} as const;

export type DocumentType = keyof typeof documentFormats;

export function documentFormat(type: unknown) {
  return typeof type === 'string' && Object.hasOwn(documentFormats, type)
    ? documentFormats[type as DocumentType] : undefined;
}

export function validDocument(type: unknown, number: unknown) {
  const format = documentFormat(type);
  return format && typeof number === 'string' && /^[0-9]+$/.test(number) && number.length === format.digits;
}

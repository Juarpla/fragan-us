const maxImage = 8 * 1024 * 1024;
const maxRequest = maxImage + 64 * 1024;

export async function imageFormat(file: File) {
  if (!file.size || file.size > maxImage) return null;
  const b = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (file.type === 'image/jpeg' && b[0] === 255 && b[1] === 216 && b[2] === 255) return 'jpg';
  if (file.type === 'image/png' && [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => b[index] === byte)) return 'png';
  if (file.type === 'image/webp' && String.fromCharCode(...b.slice(0, 4)) === 'RIFF' && String.fromCharCode(...b.slice(8, 12)) === 'WEBP') return 'webp';
  return null;
}

export async function readImageForm(request: Request) {
  const type = request.headers.get('Content-Type') ?? '';
  const length = Number(request.headers.get('Content-Length') ?? 0);
  if (!type.toLowerCase().startsWith('multipart/form-data;') || length > maxRequest || !request.body) return null;
  if (length > 0) return request.formData();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const next = await reader.read();
    if (next.done) break;
    size += next.value.byteLength;
    if (size > maxRequest) { await reader.cancel(); return null; }
    chunks.push(next.value);
  }
  return new Response(new Blob(chunks.map(chunk => new Uint8Array(chunk))), {
    headers: { 'Content-Type': type },
  }).formData();
}

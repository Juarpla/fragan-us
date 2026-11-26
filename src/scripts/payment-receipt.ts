import { imageFormat } from '../lib/images';

function uploadReceipt(body: FormData, progress: HTMLProgressElement, status: HTMLElement) {
  return new Promise<{ code?: string; error?: string }>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('POST', '/api/orders/receipt');
    request.responseType = 'json';
    request.timeout = 60000;
    request.upload.addEventListener('progress', event => {
      if (!event.lengthComputable) return;
      progress.value = event.loaded / event.total;
    });
    request.upload.addEventListener('load', () => {
      progress.removeAttribute('value');
      status.textContent = 'Guardando el comprobante…';
    });
    request.onload = () => resolve(request.response ?? {});
    request.onerror = request.ontimeout = () => reject(new Error('No pudimos enviar el comprobante. Vuelve a intentarlo.'));
    request.send(body);
  });
}

export function setupPaymentReceipt(form: HTMLFormElement) {
  const submit = form.querySelector<HTMLButtonElement>('[data-send-receipt]')!;
  const label = form.querySelector<HTMLElement>('[data-receipt-label]')!;
  const error = form.querySelector<HTMLElement>('[data-receipt-error]')!;
  const input = form.querySelector<HTMLInputElement>('input[type=file]')!;
  const preview = form.querySelector<HTMLElement>('[data-receipt-preview]')!;
  const picture = preview.querySelector('img')!;
  const filename = preview.querySelector<HTMLElement>('[data-file-name]')!;
  const upload = form.querySelector<HTMLElement>('[data-receipt-progress]')!;
  const progress = upload.querySelector('progress')!;
  const status = upload.querySelector<HTMLElement>('[role=status]')!;
  const chooseLabel = form.querySelector<HTMLElement>('[data-upload-label]')!;
  let blob: string | undefined;

  const resetPreview = () => {
    if (blob) URL.revokeObjectURL(blob);
    blob = undefined;
    picture.removeAttribute('src');
    preview.hidden = true;
    chooseLabel.textContent = 'Subir comprobante de pago';
  };
  input.addEventListener('change', async () => {
    resetPreview();
    error.textContent = '';
    const file = input.files?.[0];
    submit.disabled = true;
    if (!file) return;
    if (!await imageFormat(file)) {
      if (input.files?.[0] !== file) return;
      error.textContent = 'Adjunta una imagen JPG, PNG o WebP de hasta 8 MB.';
      input.value = '';
      return;
    }
    if (input.files?.[0] !== file) return;
    const url = URL.createObjectURL(file);
    blob = url;
    picture.src = url;
    try {
      await picture.decode();
    } catch {
      if (blob !== url) return;
      resetPreview();
      input.value = '';
      error.textContent = 'No pudimos abrir la imagen. Elige otro comprobante.';
      return;
    }
    if (blob !== url) return;
    filename.textContent = file.name;
    preview.hidden = false;
    submit.disabled = false;
    chooseLabel.textContent = 'Cambiar comprobante';
  });
  window.addEventListener('pagehide', event => { if (!event.persisted) resetPreview(); });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (submit.disabled || !blob) return;
    const formData = new FormData(form);
    submit.disabled = true;
    input.disabled = true;
    label.textContent = 'Enviando comprobante…';
    error.textContent = '';
    status.textContent = 'Subiendo comprobante…';
    progress.value = 0;
    upload.hidden = false;
    try {
      const result = await uploadReceipt(formData, progress, status);
      if (!result.code) throw new Error(result.error ?? 'No pudimos registrar el comprobante. Intenta de nuevo.');
      location.assign(`/gracias/${result.code}`);
      return;
    } catch (failure) {
      error.textContent = failure instanceof Error ? failure.message : 'No pudimos enviar el comprobante.';
    }
    upload.hidden = true;
    submit.disabled = false;
    input.disabled = false;
    label.textContent = 'Enviar comprobante';
  });
}

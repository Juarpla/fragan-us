import { showTemporaryStatus } from './temporary-status';

export async function copyValue(
  value: string,
  status: HTMLElement,
  fallback: HTMLInputElement | HTMLTextAreaElement,
  successMessage = 'Copiado.',
) {
  fallback.hidden = true;
  try {
    await navigator.clipboard.writeText(value);
    showTemporaryStatus(status, successMessage);
  } catch {
    fallback.value = value;
    fallback.hidden = false;
    fallback.focus();
    fallback.select();
    showTemporaryStatus(status, 'Selecciona y copia el texto.');
  }
}

document.addEventListener('click', async event => {
  const button = (event.target as Element).closest<HTMLButtonElement>('button[data-copy-value]');
  const region = button?.closest<HTMLElement>('[data-copy-region]');
  const status = region?.querySelector<HTMLElement>('[data-copy-message]');
  const fallback = region?.querySelector<HTMLInputElement | HTMLTextAreaElement>('[data-copy-fallback]');
  if (!button || !status || !fallback) return;
  await copyValue(button.dataset.copyValue ?? '', status, fallback, button.dataset.copySuccess);
});

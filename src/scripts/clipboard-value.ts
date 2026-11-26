import { showTemporaryStatus } from './temporary-status';

document.addEventListener('click', async event => {
  const button = (event.target as Element).closest<HTMLButtonElement>('button[data-copy-value]');
  const region = button?.closest<HTMLElement>('[data-copy-region]');
  const status = region?.querySelector<HTMLElement>('[data-copy-message]');
  const fallback = region?.querySelector<HTMLInputElement | HTMLTextAreaElement>('[data-copy-fallback]');
  if (!button || !status || !fallback) return;
  const value = button.dataset.copyValue ?? '';
  fallback.hidden = true;
  try {
    await navigator.clipboard.writeText(value);
    showTemporaryStatus(status, button.dataset.copySuccess ?? 'Copiado.');
  } catch {
    fallback.value = value;
    fallback.hidden = false;
    fallback.select();
    fallback.focus();
    showTemporaryStatus(status, 'Selecciona y copia el texto.');
  }
});

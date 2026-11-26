import { save } from './admin-ui';

const panel = document.querySelector<HTMLElement>('[data-admin-orders]');

if (panel) {
  const refresh = panel.querySelector<HTMLButtonElement>('[data-order-refresh]')!;
  const feedback = panel.querySelector<HTMLElement>('[data-order-feedback]')!;
  const search = panel.querySelector<HTMLFormElement>('#order-search')!;
  const heading = panel.querySelector<HTMLElement>('#order-list')!;
  let results = panel.querySelector<HTMLElement>('[data-order-results]')!;
  let busy = false;

  async function update(success: string) {
    const url = new URL(search.action);
    url.pathname += '/lista';
    url.searchParams.set('p', results.dataset.page ?? '1');
    // Reuse the applied search and keep names and document numbers out of the URL.
    const query = search.querySelector<HTMLInputElement>('input[name=q]')!.defaultValue;
    const response = await (query ? fetch(url, {
      method: 'POST', body: new URLSearchParams({ q: query, p: url.searchParams.get('p')! }),
    }) : fetch(url));
    if (!response.ok) throw new Error();
    const next = new DOMParser().parseFromString(await response.text(), 'text/html')
      .querySelector<HTMLElement>('[data-order-results]');
    if (!next) throw new Error();
    results.replaceWith(next);
    results = next;
    feedback.textContent = success;
  }

  function setBusy(active: boolean) {
    busy = active;
    refresh.setAttribute('aria-disabled', String(active));
    results.setAttribute('aria-busy', String(active));
    if (active) feedback.textContent = '';
  }

  async function changeOrder(button: HTMLButtonElement, alert: HTMLElement, url: string, init: RequestInit, success: string) {
    if (busy || button.disabled) return;
    const focused = document.activeElement === button;
    setBusy(true);
    try {
      if (!await save(button, alert, url, init)) return;
      try {
        await update(success);
      } catch {
        feedback.textContent = `${success} Pulsa «Actualizar pedidos» para ver los cambios.`;
      }
    } finally {
      setBusy(false);
      if (focused && document.activeElement === document.body) {
        (button.disabled ? heading : button).focus({ preventScroll: true });
      }
    }
  }

  refresh.hidden = false;
  refresh.addEventListener('click', async () => {
    if (busy) return;
    setBusy(true);
    feedback.textContent = 'Actualizando pedidos…';
    try {
      await update('Pedidos actualizados.');
    } catch {
      feedback.textContent = 'No pudimos actualizar los pedidos. Vuelve a intentarlo.';
    } finally {
      setBusy(false);
    }
  });

  panel.addEventListener('click', event => {
    const button = (event.target as Element).closest<HTMLButtonElement>('button[data-order]');
    if (!button || busy) return;
    const { order: code, action } = button.dataset;
    if (action === 'cancel' && !window.confirm('¿Cancelar este pedido?')) return;
    const success = action === 'pay' ? 'Pago confirmado.' : action === 'cancel' ? 'Pedido cancelado.' : 'Pago habilitado.';
    void changeOrder(button, button.closest('article')!.querySelector('[role=alert]')!, '/api/orders/verify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, action }),
    }, success);
  });

  panel.addEventListener('submit', event => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || !form.hasAttribute('data-dispatch-form')) return;
    event.preventDefault();
    const button = form.querySelector<HTMLButtonElement>('button[type=submit]')!;
    void changeOrder(button, form.querySelector('[role=alert]')!, form.action, {
      method: 'POST', body: new FormData(form),
    }, 'Datos de envío guardados.');
  });
}

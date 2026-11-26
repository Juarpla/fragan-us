const statusDestinations: Record<string, string> = {
  enable_payment: 'PENDING_VERIFICATION', pay: 'PACKING', cancel: 'ARCHIVE',
};

async function save(control: HTMLButtonElement, message: HTMLElement, url: string, init: RequestInit) {
  control.disabled = true;
  message.textContent = '';
  try {
    const response = await fetch(url, init);
    const data = await response.json<{ error?: string; ok?: boolean }>().catch(() => null);
    if (!response.ok || !data?.ok) throw new Error(data?.error ?? 'No pudimos guardar el cambio.');
    return true;
  } catch (error) {
    message.textContent = error instanceof TypeError ? 'Revisa tu conexión y vuelve a intentarlo.'
      : error instanceof Error ? error.message : 'No pudimos guardar el cambio.';
    control.disabled = false;
    return false;
  }
}

document.querySelectorAll<HTMLButtonElement>('[data-order]').forEach(button => {
  button.addEventListener('click', async () => {
    const { order: code, action } = button.dataset;
    if (!action || (action === 'cancel' && !window.confirm('¿Cancelar este pedido?'))) return;
    const record = button.closest('article')!;
    const others = [...record.querySelectorAll('button')].filter(control => control !== button);
    others.forEach(control => { control.disabled = true; });
    const saved = await save(button, record.querySelector('[role=alert]')!, '/api/orders/verify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, action }),
    });
    if (saved) location.assign(`/admin/pedidos?estado=${statusDestinations[action]}#order-list`);
    else others.forEach(control => { control.disabled = false; });
  });
});

document.querySelectorAll<HTMLFormElement>('[data-product-form], [data-stock]').forEach(form => {
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const data = new FormData(form);
    const button = form.querySelector<HTMLButtonElement>('button[type=submit]')!;
    const message = form.querySelector<HTMLElement>('[role=alert]')!;
    const { stock: slug, previousStock, previousActive, previousPrice } = form.dataset;
    const init = slug ? {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, stock: Number(data.get('stock')), active: data.has('active'),
        priceCents: Math.round(Number(data.get('price')) * 100), previousPriceCents: Number(previousPrice),
        previousStock: Number(previousStock), previousActive: previousActive === '1' }),
    } : { method: form.dataset.edit ? 'PUT' : 'POST', body: data };
    if (await save(button, message, '/api/admin/products', init)) {
      sessionStorage.setItem('fraganus:admin-feedback', slug ? 'Inventario actualizado.' : 'Perfume guardado.');
      location.assign('/admin/catalogo#stock');
    }
  });
});

document.querySelectorAll<HTMLFormElement>('[data-dispatch-form], [data-inspiration-form]').forEach(form => {
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const dispatch = form.hasAttribute('data-dispatch-form');
    const button = form.querySelector<HTMLButtonElement>('button[type=submit]')!;
    const message = form.querySelector<HTMLElement>('[role=alert]')!;
    if (button.disabled) return;
    const saved = await save(button, message, dispatch ? '/api/admin/dispatch' : '/api/admin/inspiration', {
      method: 'POST', body: new FormData(form),
    });
    if (!saved) return;
    sessionStorage.setItem('fraganus:admin-feedback', dispatch ? 'Datos de envío guardados.' : 'Inspiración guardada.');
    if (dispatch && !['SHIPPED', 'ARCHIVE'].includes(new URLSearchParams(location.search).get('estado') ?? '')) {
      location.assign('/admin/pedidos?estado=SHIPPED#order-list');
    } else {
      if (!dispatch) location.assign('/admin/catalogo#stock');
    }
  });
});

const paymentQR = document.querySelector<HTMLFormElement>('[data-payment-qr-form]');
paymentQR?.addEventListener('submit', async event => {
  event.preventDefault();
  if (!paymentQR) return;
  const button = paymentQR.querySelector<HTMLButtonElement>('button[type=submit]')!;
  const error = paymentQR.querySelector<HTMLElement>('[role=alert]')!;
  if (await save(button, error, '/api/admin/payment-qr', { method: 'POST', body: new FormData(paymentQR) })) {
    sessionStorage.setItem('fraganus:admin-feedback', 'QR guardado. Ya está visible en el paso de pago.');
    location.reload();
  }
});

const feedback = sessionStorage.getItem('fraganus:admin-feedback');
if (feedback) {
  const label = document.querySelector<HTMLElement>('[data-admin-feedback]')!;
  label.textContent = feedback;
  sessionStorage.removeItem('fraganus:admin-feedback');
}

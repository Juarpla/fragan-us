import { setupAgencyPicker } from './agency-picker';
import { money } from '../lib/catalog';
import type { OrderItem } from '../lib/db';
import { cartChanged, checkoutId, compactCart, completeCheckout, readCart, sessionId, totalCart } from './cart';

const root = document.querySelector<HTMLElement>('[data-checkout]')!;
const form = root.querySelector<HTMLFormElement>('[data-order-form]')!;
const phone = form.elements.namedItem('phone') as HTMLInputElement;
const resume = form.elements.namedItem('resume') as HTMLInputElement;
const customer = form.elements.namedItem('name') as HTMLInputElement;
const submit = form.querySelector<HTMLButtonElement>('[data-confirm]')!;
const message = form.querySelector<HTMLElement>('[data-checkout-error]')!;
const controls = form.querySelector('fieldset')!;
const edit = root.querySelector<HTMLButtonElement>('[data-cart-open]')!;
const drawer = document.querySelector<HTMLDialogElement>('#cart-drawer');
const list = root.querySelector<HTMLElement>('[data-checkout-list]')!;
const empty = root.querySelector<HTMLElement>('[data-checkout-empty]')!;
const content = root.querySelector<HTMLElement>('[data-checkout-content]')!;
const totalLabel = root.querySelector<HTMLElement>('[data-checkout-total]')!;

let total = 0;
let submitting = false;
let captureQueue = Promise.resolve();
const paymentEnabled = root.dataset.mode !== 'unavailable';
const picker = setupAgencyPicker(form, submit, paymentEnabled);

function render(items: OrderItem[], value: number) {
  total = value;
  totalLabel.textContent = money(value);
  list.replaceChildren(...items.map(item => {
    const row = document.createElement('div');
    const photo = document.createElement('img');
    photo.src = item.image_url;
    photo.alt = '';
    const name = document.createElement('span');
    name.textContent = `${item.quantity} × ${item.name}`;
    const price = document.createElement('strong');
    price.textContent = money(item.quantity * item.price_cents);
    [photo, name, price].forEach(node => row.appendChild(node));
    return row;
  }));
  empty.hidden = items.length > 0;
  content.hidden = !empty.hidden;
  if (content.hidden && drawer?.open) {
    drawer.addEventListener('close', () => empty.querySelector('a')?.focus(), { once: true });
  }
}

function renderCart() {
  const lines = readCart();
  render(lines, totalCart(lines));
}

function phoneDigits() {
  return phone.value.replace(/\D/g, '').replace(/^51(?=9\d{8}$)/, '');
}

function capture() {
  if (root.dataset.mode === 'unavailable' || submitting) return;
  const digits = phoneDigits();
  const cart = compactCart(readCart());
  const consent = resume.checked;
  if (consent && (!/^9\d{8}$/.test(digits) || !cart.length)) return;
  const payload = { sessionId: sessionId(), phone: digits, name: customer.value, cart, consent };
  captureQueue = captureQueue.then(async () => {
    await fetch('/api/cart/abandon', {
      method: consent ? 'POST' : 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }).catch(() => undefined);
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (submitting || !paymentEnabled || submit.disabled) return;
  const digits = phoneDigits();
  phone.setCustomValidity(/^9\d{8}$/.test(digits) ? '' : 'Ingresa un celular peruano de 9 dígitos.');
  if (!form.reportValidity()) return;

  const data = new FormData(form);
  const payload = {
    name: data.get('name'), phone: digits, ubigeo: data.get('ubigeo'), agencyId: Number(data.get('agency')), whatsappOffers: resume.checked,
    cart: compactCart(readCart()), checkoutId: checkoutId(), sessionId: sessionId(), expectedTotal: total,
  };
  submitting = true;
  controls.disabled = true;
  edit.disabled = true;
  message.textContent = '';
  const submitLabel = submit.innerHTML;
  submit.textContent = 'Abriendo el pago…';
  try {
    await captureQueue;
    const response = await fetch('/api/orders/create', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    const data: { code?: string; error?: string; quote?: { items: OrderItem[]; total: number } } = await response.json();
    if (data.quote) render(data.quote.items, data.quote.total);
    if (response.status === 409 && data.error?.startsWith('La agencia')) void picker.reload();
    if (!response.ok || !data.code) throw new Error(data.error ?? 'No pudimos registrar el pedido.');
    if (checkoutId() === payload.checkoutId) completeCheckout();
    window.location.assign(`/pago/${data.code}`);
  } catch (error) {
    if (checkoutId() !== payload.checkoutId) renderCart();
    message.textContent = error instanceof Error && !(error instanceof SyntaxError) && !(error instanceof TypeError)
      ? error.message : 'No pudimos registrar el pedido. Intenta de nuevo.';
    submitting = false;
    controls.disabled = false;
    edit.disabled = false;
    submit.innerHTML = submitLabel;
  }
});
phone.addEventListener('input', () => phone.setCustomValidity(''));
phone.addEventListener('blur', () => { if (resume.checked) capture(); });
resume.addEventListener('change', capture);
renderCart();
cartChanged(() => { if (!submitting) renderCart(); });

import { money } from '../lib/catalog';
import { addProduct, cartChanged, readCart, totalCart, updateQuantity, type Line } from './cart';

const dialog = document.querySelector<HTMLDialogElement>('#cart-drawer')!;
const items = dialog.querySelector<HTMLElement>('[data-drawer-items]')!;
const footer = dialog.querySelector<HTMLElement>('[data-drawer-footer]')!;
const empty = dialog.querySelector<HTMLElement>('[data-drawer-empty]')!;
const feedback = document.querySelector<HTMLElement>('[data-cart-feedback]')!;
const feedbackCopy = feedback.querySelector<HTMLElement>('[data-cart-feedback-copy]')!;
let feedbackTimer: number | undefined;
const status = document.querySelector<HTMLElement>('[data-cart-status]')!;

function textElement<K extends keyof HTMLElementTagNameMap>(tag: K, text: string) {
  const node = document.createElement(tag);
  node.textContent = text;
  return node;
}

function action(line: Line, text: string, label: string, change: number | 'remove', disabled = false) {
  const button = textElement('button', text);
  button.type = 'button';
  button.setAttribute('aria-label', label);
  button.disabled = disabled;
  if (change === 'remove') button.className = 'remove-item';
  button.addEventListener('click', () => {
    const lineIndex = Array.from(items.children).indexOf(button.closest('.drawer-line')!);
    updateQuantity(line.slug, change);
    const nextLine = items.children[Math.min(lineIndex, items.children.length - 1)];
    const followUp = Array.from(nextLine?.querySelectorAll<HTMLButtonElement>('button') ?? []).find(control => !control.disabled && control.getAttribute('aria-label') === label);
    (followUp ?? nextLine?.querySelector<HTMLButtonElement>('button:not(:disabled)') ?? dialog.querySelector<HTMLButtonElement>('button'))?.focus();
  });
  return button;
}

function itemRow(line: Line) {
  const row = document.createElement('article');
  row.className = 'drawer-line';
  const image = document.createElement('img');
  image.alt = '';
  image.src = line.image_url;
  const detail = document.createElement('div');
  const name = document.createElement('h3');
  const link = textElement('a', line.name);
  link.href = `/perfumes/${line.slug}`;
  name.appendChild(link);
  const quantity = document.createElement('div');
  quantity.className = 'quantity';
  const controls = [
    action(line, '−', `Reducir cantidad de ${line.name}`, -1, line.quantity === 1),
    textElement('span', String(line.quantity)),
    action(line, '+', `Aumentar cantidad de ${line.name}`, 1, line.quantity >= Math.min(line.stock, 20)),
    action(line, 'Quitar', `Quitar ${line.name}`, 'remove'),
  ];
  controls.forEach(control => quantity.appendChild(control));
  [name, textElement('p', line.brand), quantity].forEach(element => detail.appendChild(element));
  [image, detail, textElement('strong', money(line.price_cents * line.quantity))].forEach(element => row.appendChild(element));
  return row;
}

function render() {
  const lines = readCart();
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);
  document.querySelectorAll('[data-cart-count]').forEach(node => { node.textContent = String(count); });
  document.querySelector('.bag-button')?.setAttribute('aria-label', `Abrir bolsa, ${count} ${count === 1 ? 'producto' : 'productos'}`);
  empty.hidden = !!lines.length;
  footer.hidden = !lines.length;
  items.replaceChildren(...lines.map(itemRow));
  footer.querySelector('[data-drawer-total]')!.textContent = money(totalCart(lines));
}

cartChanged(render);
render();
function dismissFeedbackLater() {
  window.clearTimeout(feedbackTimer);
  if (feedback.hidden) return;
  feedbackTimer = window.setTimeout(() => {
    if (!feedback.matches(':focus-within') && !dialog.open) feedback.hidden = true;
  }, 6500);
}

document.querySelectorAll('[data-cart-open]').forEach(button => {
  button.addEventListener('click', () => dialog.showModal());
});
dialog.addEventListener('close', dismissFeedbackLater);
feedback.addEventListener('focusout', dismissFeedbackLater);
dialog.querySelector('[data-cart-continue]')?.addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });

document.querySelectorAll<HTMLButtonElement>('[data-add]').forEach(button => {
  button.addEventListener('click', () => {
    const product = JSON.parse(button.dataset.add!);
    const added = addProduct(product);
    const copy = added ? `${product.name} se agregó a tu bolsa.` : 'Llegaste al máximo disponible para tu bolsa.';
    status.textContent = copy;
    feedbackCopy.textContent = copy;
    feedback.hidden = false;
    dismissFeedbackLater();
  });
});

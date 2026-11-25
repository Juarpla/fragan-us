import { catalogHref, catalogSelection } from '../lib/catalog-filters';

const section = document.querySelector<HTMLElement>('#catalogo')!;
const results = section.querySelector<HTMLElement>('[data-catalog-results]')!;
const status = section.querySelector<HTMLElement>('[data-catalog-status]')!;
let currentSearch = location.search;
let pending: AbortController | undefined;

async function update(url: URL, push: boolean, focused?: string) {
  pending?.abort();
  if (url.search === currentSearch) {
    results.removeAttribute('aria-busy');
    return;
  }
  const controller = new AbortController();
  pending = controller;
  results.setAttribute('aria-busy', 'true');
  try {
    const response = await fetch(url.pathname + url.search, { signal: controller.signal });
    const page = new DOMParser().parseFromString(await response.text(), 'text/html');
    const updated = page.querySelector('[data-catalog-results]');
    if (!response.ok || !updated) throw new Error('Catálogo no disponible.');
    if (controller.signal.aborted) return;
    const keepFocus = focused && results.contains(document.activeElement);
    results.replaceChildren(...updated.childNodes);
    currentSearch = url.search;
    if (push) history.pushState(null, '', url);
    const { filter, query } = catalogSelection(url.searchParams);
    document.querySelectorAll<HTMLAnchorElement>('.hero-actions a, .main-nav a, #mobile-nav a').forEach(link => {
      const anchor = link.hash.slice(1);
      if (['catalogo', 'climas', 'ocasiones'].includes(anchor)) link.href = catalogHref(filter, query, anchor);
    });
    if (keepFocus) {
      const next = [...results.querySelectorAll<HTMLAnchorElement>('[data-catalog-filter]')]
        .find(link => link.dataset.catalogFilter === focused);
      (next ?? results.querySelector<HTMLElement>('#climas'))?.focus({ preventScroll: true });
    }
    status.textContent = results.querySelector('.query-status p')?.textContent ?? '';
  } catch {
    if (!controller.signal.aborted) {
      if (push) location.assign(url);
      else location.reload();
    }
  } finally {
    if (pending === controller) results.removeAttribute('aria-busy');
  }
}

section.addEventListener('click', event => {
  const link = (event.target as Element).closest<HTMLAnchorElement>('[data-catalog-filter], [data-catalog-clear]');
  if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  void update(new URL(link.href), true, link.dataset.catalogFilter ?? 'clear');
});
window.addEventListener('popstate', () => void update(new URL(location.href), false));

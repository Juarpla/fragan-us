import { catalogHref, catalogSelection, toggleCatalogFilter } from '../lib/catalog-filters';

const section = document.querySelector<HTMLElement>('#catalogo')!;
const results = section.querySelector<HTMLElement>('[data-catalog-results]')!;
const announcement = section.querySelector<HTMLElement>('[data-catalog-status]')!;
let renderedSearch = location.search;
let pending: { controller: AbortController; url: URL } | undefined;

async function update(url: URL, control?: HTMLAnchorElement) {
  pending?.controller.abort();
  if (url.search === renderedSearch) {
    pending = undefined;
    results.removeAttribute('aria-busy');
    return;
  }
  const controller = new AbortController();
  pending = { controller, url };
  results.setAttribute('aria-busy', 'true');
  try {
    const response = await fetch(url.pathname + url.search, { signal: controller.signal });
    const page = new DOMParser().parseFromString(await response.text(), 'text/html');
    const updated = page.querySelector('[data-catalog-results]');
    if (!response.ok || !updated) throw new Error('Catálogo no disponible.');
    if (controller.signal.aborted) return;

    const keepFocus = results.contains(document.activeElement);
    results.replaceChildren(...updated.childNodes);
    const canonical = new URL(response.url);
    renderedSearch = canonical.search;
    if (control) history.pushState(null, '', canonical);
    else if (url.search !== renderedSearch) history.replaceState(history.state, '', canonical);

    const heading = results.querySelector<HTMLElement>('[data-results-heading]')!;
    if (control?.hasAttribute('data-catalog-page')) {
      heading.focus({ preventScroll: true });
      heading.scrollIntoView({ behavior: 'instant', block: 'start' });
    } else if (keepFocus) {
      const next = [...results.querySelectorAll<HTMLAnchorElement>('[data-catalog-control]')]
        .find(link => link.dataset.catalogControl === control?.dataset.catalogControl);
      (next ?? heading).focus({ preventScroll: true });
    }
    const count = heading.querySelector('p')?.textContent ?? '';
    const pagination = results.querySelector('.catalog-pagination span')?.textContent;
    announcement.textContent = [count, pagination].filter(Boolean).join('. ');
  } catch {
    if (!controller.signal.aborted) {
      if (control) location.assign(url);
      else location.reload();
    }
  } finally {
    if (pending?.controller === controller) {
      pending = undefined;
      results.removeAttribute('aria-busy');
    }
  }
}

section.addEventListener('click', event => {
  const link = (event.target as Element).closest<HTMLAnchorElement>('a[data-catalog-control][href]');
  if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  const filter = link.dataset.catalogControl;
  if (pending && filter && link.classList.contains('filter')) {
    const { filters, query } = catalogSelection(pending.url.searchParams);
    const href = catalogHref(toggleCatalogFilter(filters, filter), query);
    void update(new URL(href, location.origin), link);
  } else {
    void update(new URL(link.href), link);
  }
});
window.addEventListener('popstate', () => void update(new URL(location.href)));

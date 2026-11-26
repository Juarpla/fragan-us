document.documentElement.classList.add('fragrance-ready');

document.addEventListener('click', event => {
  const target = (event.target as Element).closest<HTMLButtonElement>('[data-inspiration-toggle]');
  const visual = target?.closest<HTMLElement>('[data-inspiration]');
  if (!target || !visual) return;

  const showingReference = visual.dataset.inspiration === 'product';
  const front = visual.querySelector<HTMLElement>('[data-inspiration-front]');
  const back = visual.querySelector<HTMLElement>('[data-inspiration-back]');

  visual.dataset.inspiration = showingReference ? 'reference' : 'product';
  if (front) {
    front.inert = showingReference;
    front.setAttribute('aria-hidden', String(showingReference));
  }
  if (back) {
    back.inert = !showingReference;
    back.setAttribute('aria-hidden', String(!showingReference));
  }
  target.setAttribute('aria-pressed', String(showingReference));
});

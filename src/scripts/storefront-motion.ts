const selector = '.hero-phrase, .shipping-map-grid, .button.primary, .button.whatsapp-support, .product-add, .hero-actions .button.secondary';

if ('IntersectionObserver' in window) {
  const hero = document.querySelector<HTMLElement>('.hero-phrase');
  const phrases = [...(hero?.querySelectorAll('span') ?? [])];
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let current = 0;
  let phraseTimer: number | undefined;

  const canRotatePhrases = () => hero?.hasAttribute('data-motion-active') && !document.hidden && !motion.matches;

  function schedulePhrase() {
    window.clearTimeout(phraseTimer);
    if (phrases.length < 2 || !hero || !canRotatePhrases()) return;
    phraseTimer = window.setTimeout(() => {
      if (!canRotatePhrases()) return;
      hero.setAttribute('data-rotating', '');
      phrases[current].removeAttribute('data-current');
      current = (current + 1) % phrases.length;
      phrases[current].setAttribute('data-current', '');
      schedulePhrase();
    }, 5000);
  }

  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      entry.target.toggleAttribute('data-motion-active', entry.isIntersecting);
      if (entry.target === hero) schedulePhrase();
    }
  });

  const track = (node: Node, observe: boolean) => {
    if (!(node instanceof Element)) return;
    const targets = node.matches(selector) ? [node, ...node.querySelectorAll(selector)] : node.querySelectorAll(selector);
    for (const target of targets) {
      if (observe) observer.observe(target);
      else observer.unobserve(target);
    }
  };
  track(document.body, true);
  new MutationObserver(records => {
    for (const record of records) {
      record.removedNodes.forEach(node => track(node, false));
      record.addedNodes.forEach(node => track(node, true));
    }
  }).observe(document.body, { childList: true, subtree: true });

  const sync = () => {
    document.documentElement.toggleAttribute('data-motion-hidden', document.hidden);
    schedulePhrase();
  };
  document.addEventListener('visibilitychange', sync);
  if (hero) motion.addEventListener('change', () => {
    if (motion.matches) {
      hero.removeAttribute('data-rotating');
      phrases[current].removeAttribute('data-current');
      current = 0;
      phrases[current].setAttribute('data-current', '');
    }
    schedulePhrase();
  });
  sync();
}

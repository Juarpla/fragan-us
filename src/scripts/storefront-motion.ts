const selector = '.hero-phrase, .shipping-map-grid, .button.primary, .button.whatsapp-support, .product-add, .hero-actions .button.secondary';

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) entry.target.toggleAttribute('data-motion-active', entry.isIntersecting);
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

  const sync = () => document.documentElement.toggleAttribute('data-motion-hidden', document.hidden);
  document.addEventListener('visibilitychange', sync);
  sync();
}

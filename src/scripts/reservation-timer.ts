function formatRemaining(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

export function setupReservationTimer(element: HTMLElement) {
  const time = element.querySelector('time');
  const deadline = Number(element.dataset.paymentDeadline);
  const serverTime = Number(element.dataset.serverTime);
  if (!time || !Number.isFinite(deadline) || !Number.isFinite(serverTime)) return;
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  const initialElapsed = Math.max(0, performance.now() - (navigation?.responseStart || performance.now()));
  const start = performance.now();
  const wallStart = Date.now();
  let timer: ReturnType<typeof setTimeout>;

  const tick = () => {
    clearTimeout(timer);
    const elapsed = initialElapsed + Math.max(performance.now() - start, Date.now() - wallStart);
    const seconds = Math.max(0, Math.ceil((deadline - serverTime - elapsed) / 1000));
    time.textContent = formatRemaining(seconds);
    if (seconds) {
      timer = setTimeout(tick, 250);
      return;
    }
    element.hidden = true;
    document.querySelector('[data-payment-destination]')?.setAttribute('hidden', '');
    document.querySelector('[data-expired-payment]')?.removeAttribute('hidden');
    window.removeEventListener('pageshow', tick);
    document.removeEventListener('visibilitychange', tick);
  };
  window.addEventListener('pageshow', tick);
  document.addEventListener('visibilitychange', tick);
  tick();
}

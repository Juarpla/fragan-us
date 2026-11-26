const timers = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>();

export function showTemporaryStatus(element: HTMLElement, message: string) {
  clearTimeout(timers.get(element));
  element.textContent = message;
  timers.set(element, setTimeout(() => {
    element.textContent = '';
    timers.delete(element);
  }, 3500));
}

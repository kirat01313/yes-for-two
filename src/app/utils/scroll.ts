export function stagePosition(stage: HTMLElement, count: number): number {
  const distance = stage.offsetHeight - window.innerHeight;
  if (count < 2 || distance <= 0) return 0;

  const progress = Math.min(1, Math.max(0, -stage.getBoundingClientRect().top / distance));
  const raw = progress * (count - 1);
  const base = Math.floor(raw);
  const fraction = raw - base;
  const slide = fraction < 0.2 ? 0 : fraction > 0.8 ? 1 : smooth((fraction - 0.2) / 0.6);
  return Math.min(count - 1, base + slide);
}

export function scrollToStep(
  stage: HTMLElement,
  step: number,
  screensPerStep: number,
  behavior: ScrollBehavior,
): void {
  const stageTop = window.scrollY + stage.getBoundingClientRect().top;
  window.scrollTo({ top: stageTop + step * window.innerHeight * screensPerStep + 1, behavior });
}

function smooth(value: number): number {
  return value * value * (3 - 2 * value);
}

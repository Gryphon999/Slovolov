// Скрытая диагностика. Внутри ВК консоль браузера недоступна, поэтому игра сама
// записывает, что ответила площадка, и показывает это на панели (пять нажатий по названию игры).

const log = new Map<string, string>();
let panel: HTMLElement | null = null;

const stamp = (): string => new Date().toTimeString().slice(0, 8);

export function describeError(e: unknown): string {
  try {
    return (e instanceof Error ? e.message : JSON.stringify(e)).slice(0, 220);
  } catch {
    return String(e).slice(0, 220);
  }
}

export function diag(key: string, value: string): void {
  log.set(key, `${value} (${stamp()})`);
  render();
}

function render(): void {
  if (!panel) return;
  const list = panel.querySelector('dl')!;
  list.replaceChildren();
  for (const [k, v] of log) {
    const dt = document.createElement('dt');
    dt.textContent = k;
    const dd = document.createElement('dd');
    dd.textContent = v;
    list.append(dt, dd);
  }
}

export interface DiagAction {
  label: string;
  run: () => void;
}

export function toggleDiag(actions: DiagAction[]): void {
  if (panel) {
    panel.remove();
    panel = null;
    return;
  }
  panel = document.createElement('div');
  panel.className = 'diag';
  const title = document.createElement('b');
  title.textContent = 'Диагностика';
  const buttons = document.createElement('div');
  for (const a of actions) {
    const b = document.createElement('button');
    b.textContent = a.label;
    b.addEventListener('click', a.run);
    buttons.append(b);
  }
  panel.append(title, document.createElement('dl'), buttons);
  document.body.append(panel);
  render();
}

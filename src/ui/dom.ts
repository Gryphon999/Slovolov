// Маленький помощник для сборки DOM и набор собственных иконок (системные эмодзи в игре не используются).

type Props = {
  class?: string;
  text?: string;
  html?: string;
  title?: string;
  onclick?: () => void;
};

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Props = {},
  ...kids: (Node | string | null | false)[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (props.class) el.className = props.class;
  if (props.text !== undefined) el.textContent = props.text;
  if (props.html !== undefined) el.innerHTML = props.html;
  if (props.title) {
    el.title = props.title;
    el.setAttribute('aria-label', props.title);
  }
  if (props.onclick) el.addEventListener('click', props.onclick);
  for (const k of kids) if (k) el.append(k);
  return el;
}

const PATHS = {
  back: '<path d="M15 5l-7 7 7 7"/>',
  shuffle: '<path d="M3 7h3c5 0 7 10 12 10h3M18 14l3 3-3 3M3 17h3c1.6 0 2.9-1 4-2.4M21 7h-3c-1.6 0-2.9 1-4 2.4M18 4l3 3-3 3"/>',
  backspace: '<path d="M9 5h11v14H9l-6-7z"/><path d="M12 9l5 6M17 9l-5 6"/>',
  bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z"/>',
  star: '<path fill="currentColor" d="M12 3l2.7 5.6 6.1.8-4.5 4.2 1.2 6-5.5-3-5.5 3 1.2-6L3.2 9.4l6.1-.8z"/>',
  fish: '<path d="M3 12c3-5 9-6 13-2l5-3v10l-5-3c-4 4-10 3-13-2z"/><circle cx="8" cy="11" r=".8" fill="currentColor"/>',
  share: '<path d="M12 15V4M8 8l4-4 4 4M5 13v6h14v-6"/>',
  post: '<path d="M4 5h16v11H9l-5 4z"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.5-4 3-6 6.5-6s6 2 6.5 6M16 4.8a3.5 3.5 0 0 1 0 6.4M18 14.5c2 .8 3.2 2.6 3.5 5.5"/>',
  trophy: '<path d="M7 4h10v5a5 5 0 0 1-10 0zM7 6H4c0 3 1 5 3.5 5M17 6h3c0 3-1 5-3.5 5M12 14v4M8 21h8"/>',
  soundOn: '<path d="M4 9v6h4l5 4V5L8 9zM16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>',
  soundOff: '<path d="M4 9v6h4l5 4V5L8 9zM16 9l5 6M21 9l-5 6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  flame: '<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z"/>',
  grid: '<path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  next: '<path d="M9 5l7 7-7 7"/>',
} as const;

export type IconName = keyof typeof PATHS;

export function icon(name: IconName, cls = ''): HTMLElement {
  return h('span', {
    class: `ic ${cls}`,
    html: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PATHS[name]}</svg>`,
  });
}

/** Кнопка с иконкой и подписью. */
export function btn(cls: string, label: string, ic: IconName | null, onclick: () => void): HTMLButtonElement {
  const b = h('button', { class: `btn ${cls}`, onclick });
  if (ic) b.append(icon(ic));
  if (label) b.append(h('span', { text: label }));
  else if (ic) b.setAttribute('aria-label', ic);
  return b;
}

export function formatClock(sec: number): string {
  const s = Math.max(0, Math.ceil(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function formatLong(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(Math.floor(s / 3600))}:${p(Math.floor(s / 60) % 60)}:${p(s % 60)}`;
}

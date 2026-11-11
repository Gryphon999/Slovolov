// Правила игры со словами. Чистые функции, без DOM и без платформы.

export const MIN_LEN = 3;

export function normalize(s: string): string {
  return s.trim().toLowerCase().replaceAll('ё', 'е');
}

export function letterCounts(word: string): Map<string, number> {
  const m = new Map<string, number>();
  for (const ch of word) m.set(ch, (m.get(ch) ?? 0) + 1);
  return m;
}

/** Можно ли сложить word из букв source (каждую букву берём не чаще, чем она есть). */
export function canForm(word: string, source: string): boolean {
  const left = letterCounts(source);
  for (const ch of word) {
    const n = left.get(ch) ?? 0;
    if (n === 0) return false;
    left.set(ch, n - 1);
  }
  return true;
}

/** Все слова словаря, которые складываются из букв source (кроме него самого). */
export function subwords(dict: Iterable<string>, source: string): string[] {
  const out: string[] = [];
  for (const w of dict) {
    if (w.length >= MIN_LEN && w.length <= source.length && w !== source && canForm(w, source)) out.push(w);
  }
  return out;
}

const POINTS = [0, 0, 0, 1, 2, 4, 7, 11];

/** Очки за слово: длинные слова ценятся заметно дороже коротких. */
export function points(word: string): number {
  return word.length >= POINTS.length ? 16 : POINTS[word.length];
}

/** Сколько слов нужно найти на 1, 2 и 3 звезды. */
export function starGoals(total: number): [number, number, number] {
  return [
    Math.min(Math.ceil(total * 0.15), 12),
    Math.min(Math.ceil(total * 0.3), 25),
    Math.min(Math.ceil(total * 0.5), 45),
  ];
}

export function starsFor(found: number, total: number): number {
  return starGoals(total).filter((g) => found >= g).length;
}

/** Склонение: plural(5, 'слово', 'слова', 'слов') → 'слов'. */
export function plural(n: number, one: string, few: string, many: string): string {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b === 1) return one;
  if (b >= 2 && b <= 4) return few;
  return many;
}

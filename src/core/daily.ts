// Слово дня одно для всех игроков. Сутки считаем по московскому времени.

const DAY = 86_400_000;
const MSK = 3 * 3_600_000;
const EPOCH_DAY = 20_393; // 01.11.2025 — точка отсчёта, чтобы номера дней были небольшими

export const DAILY_SECONDS = 180;

export function dayNumber(now: number): number {
  return Math.floor((now + MSK) / DAY) - EPOCH_DAY;
}

/** Дата дня в виде «11.11». */
export function dayLabel(day: number): string {
  const d = new Date((day + EPOCH_DAY) * DAY);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getUTCDate())}.${p(d.getUTCMonth() + 1)}`;
}

export function msToNextDay(now: number): number {
  return DAY - ((now + MSK) % DAY);
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Перемешивание с фиксированным зерном: порядок одинаковый у всех игроков. */
export function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const a = items.slice();
  const rnd = mulberry32(seed);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Слово на день: пул идёт по кругу, каждый круг перемешан по-своему, без повторов внутри круга. */
export function dailyWord(day: number, pool: readonly string[]): string {
  const n = pool.length;
  const cycle = Math.floor(day / n);
  const idx = ((day % n) + n) % n;
  return seededShuffle(pool, 7919 + cycle)[idx];
}

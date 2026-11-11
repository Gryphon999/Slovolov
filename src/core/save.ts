// Сохранение игрока. Хранится строкой JSON; для ВК режется на части (лимит 4096 байт на значение).

export interface DailyState {
  day: number;
  startedAt: number;
  words: string[];
  done: boolean;
}

export interface Save {
  v: 1;
  savedAt: number;
  hints: number;
  tutorialDone: boolean;
  sound: boolean;
  total: number;
  unlocked: number;
  /** найденные слова по уровням путешествия: индекс уровня → слова через пробел */
  levels: Record<string, string>;
  /** звёзды по уровням: индекс уровня → 0..3 */
  stars: Record<string, number>;
  daily: DailyState | null;
  streak: number;
  lastDailyDay: number;
  bestDaily: number;
  favAsked: boolean;
}

export function newSave(): Save {
  return {
    v: 1, savedAt: 0, hints: 3, tutorialDone: false, sound: true, total: 0, unlocked: 0,
    levels: {}, stars: {}, daily: null, streak: 0, lastDailyDay: -1, bestDaily: 0, favAsked: false,
  };
}

export function parseSave(raw: string | null): Save | null {
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw);
    if (!obj || obj.v !== 1) return null;
    return { ...newSave(), ...obj };
  } catch {
    return null;
  }
}

/** Из двух сохранений (устройство и облако) берём более свежее. */
export function newer(a: Save | null, b: Save | null): Save | null {
  if (!a) return b;
  if (!b) return a;
  return b.savedAt > a.savedAt ? b : a;
}

// Кириллица в UTF-8 занимает 2 байта на букву, поэтому 1500 символов гарантированно меньше 4096 байт.
export const CHUNK = 1500;

export function chunk(s: string, size = CHUNK): string[] {
  const out: string[] = [];
  for (let i = 0; i < s.length; i += size) out.push(s.slice(i, i + size));
  return out;
}

/** Серия дней после завершения слова дня. */
export function nextStreak(streak: number, lastDay: number, today: number): number {
  if (lastDay === today) return streak;
  return lastDay === today - 1 ? streak + 1 : 1;
}

import { describe, expect, it } from 'vitest';
import { canForm, plural, points, starGoals, starsFor, subwords } from '../src/core/words';
import { Round } from '../src/core/round';
import { dailyWord, dayNumber, msToNextDay, seededShuffle } from '../src/core/daily';
import { CHUNK, chunk, newSave, newer, nextStreak, parseSave } from '../src/core/save';

const DICT = ['кот', 'ток', 'лето', 'тело', 'атлет', 'откат', 'котлета', 'слон', 'ка'];

describe('слова', () => {
  it('буква используется не чаще, чем она есть в исходном слове', () => {
    expect(canForm('атлет', 'котлета')).toBe(true); // две «т» есть
    expect(canForm('атака', 'котлета')).toBe(false); // «а» только одна
  });
  it('subwords не включает само слово, короткие и чужие слова', () => {
    expect(subwords(DICT, 'котлета').sort()).toEqual(['атлет', 'кот', 'лето', 'откат', 'тело', 'ток']);
  });
  it('очки растут с длиной', () => {
    expect([3, 4, 5, 6, 7, 8, 11].map((n) => points('а'.repeat(n)))).toEqual([1, 2, 4, 7, 11, 16, 16]);
  });
  it('цели на звёзды возрастают и ограничены сверху', () => {
    expect(starGoals(20)).toEqual([3, 6, 10]);
    expect(starGoals(300)).toEqual([12, 25, 45]);
    expect(starsFor(6, 20)).toBe(2);
  });
  it('склонение', () => {
    expect([1, 3, 5, 11, 21, 112].map((n) => plural(n, 'слово', 'слова', 'слов'))).toEqual(
      ['слово', 'слова', 'слов', 'слов', 'слово', 'слов'],
    );
  });
});

describe('раунд', () => {
  it('различает все исходы хода', () => {
    const r = new Round('котлета', DICT);
    expect(r.submit('ка')).toBe('short');
    expect(r.submit('слон')).toBe('nofit');
    expect(r.submit('лак')).toBe('unknown');
    expect(r.submit('котлета')).toBe('self');
    expect(r.submit('Кот')).toBe('ok');
    expect(r.submit('кот')).toBe('dup');
    expect(r.score).toBe(1);
    expect(r.longestFound()).toBe('кот');
  });
  it('восстанавливает найденное и отбрасывает мусор из сохранения', () => {
    const r = new Round('котлета', DICT, ['ток', 'слон']);
    expect(r.found).toEqual(['ток']);
  });
  it('подсказка предпочитает слова из 4–5 букв и не даёт найденные', () => {
    const r = new Round('котлета', DICT, ['лето', 'тело', 'атлет', 'откат']);
    expect(['кот', 'ток']).toContain(r.pickHint());
    const r2 = new Round('котлета', DICT);
    expect(r2.pickHint(() => 0)!.length).toBeGreaterThanOrEqual(4);
  });
});

describe('слово дня', () => {
  const pool = ['а', 'б', 'в', 'г', 'д'];
  it('сутки меняются в полночь по Москве', () => {
    const t = Date.UTC(2026, 10, 11, 20, 59, 59); // 23:59:59 МСК
    expect(dayNumber(t + 1000)).toBe(dayNumber(t) + 1);
    expect(msToNextDay(t)).toBe(1000);
  });
  it('в пределах круга слова не повторяются, порядок у всех одинаковый', () => {
    const round = [0, 1, 2, 3, 4].map((d) => dailyWord(d, pool));
    expect(new Set(round).size).toBe(5);
    expect(dailyWord(3, pool)).toBe(dailyWord(3, pool));
    expect(seededShuffle(pool, 1)).toEqual(seededShuffle(pool, 1));
  });
});

describe('сохранение', () => {
  it('режется на части и собирается обратно', () => {
    const s = 'я'.repeat(CHUNK * 2 + 7);
    const parts = chunk(s);
    expect(parts.length).toBe(3);
    expect(parts.every((p) => new TextEncoder().encode(p).length <= 4096)).toBe(true);
    expect(parts.join('')).toBe(s);
  });
  it('битое сохранение не роняет игру, новые поля получают значения по умолчанию', () => {
    expect(parseSave('{oops')).toBeNull();
    expect(parseSave('{"v":1,"hints":9}')!.streak).toBe(0);
  });
  it('побеждает более свежее сохранение', () => {
    const a = { ...newSave(), savedAt: 5 };
    const b = { ...newSave(), savedAt: 9 };
    expect(newer(a, b)).toBe(b);
    expect(newer(null, a)).toBe(a);
  });
  it('серия растёт только за соседние дни', () => {
    expect(nextStreak(3, 10, 11)).toBe(4);
    expect(nextStreak(3, 9, 11)).toBe(1);
    expect(nextStreak(3, 11, 11)).toBe(3);
  });
});

describe('даты', () => {
  it('номер дня превращается в подпись по московскому календарю', async () => {
    const { dayLabel } = await import('../src/core/daily');
    expect(dayLabel(dayNumber(Date.UTC(2026, 10, 11, 12)))).toBe('11.11');
    expect(dayLabel(dayNumber(Date.UTC(2026, 10, 11, 22)))).toBe('12.11'); // после 21:00 UTC в Москве уже завтра
  });
});

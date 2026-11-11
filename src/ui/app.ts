import levels from '../data/levels.json';
import { DAILY_SECONDS, dailyWord, dayLabel, dayNumber, msToNextDay } from '../core/daily';
import { Round } from '../core/round';
import { HISTORY_MAX, type Save, nextStreak } from '../core/save';
import { plural, points, starsFor } from '../core/words';
import { type Platform, saveLocal } from '../platform/platform';
import { renderCard } from './card';
import { btn, formatLong, h, icon } from './dom';
import { PlayView } from './play';
import { play, setSound } from './sound';

const AD_GAP_MS = 150_000; // не чаще одной рекламы между уровнями раз в 2,5 минуты
const REWARD_HINTS = 2;

/** Связывает экраны, сохранение и площадку. */
export class App {
  private view: PlayView | null = null;
  private ticker = 0;
  private cloudTimer = 0;
  private lastAdAt = Date.now();

  constructor(
    private readonly root: HTMLElement,
    private readonly platform: Platform,
    private readonly dict: string[],
    private readonly save: Save,
  ) {
    setSound(save.sound);
    // Новый игрок сразу попадает в учебный уровень: правила объясняет сама игра.
    if (!save.tutorialDone) this.openLevel(0);
    else this.showMenu();
  }

  // ---------- общее ----------

  private persist(): void {
    this.save.savedAt = Date.now();
    const data = JSON.stringify(this.save);
    saveLocal(data);
    window.clearTimeout(this.cloudTimer);
    this.cloudTimer = window.setTimeout(() => void this.platform.save(data), 1500);
  }

  private show(el: HTMLElement): void {
    this.view?.destroy();
    this.view = null;
    window.clearInterval(this.ticker);
    document.querySelectorAll('.modal, .toast').forEach((n) => n.remove());
    this.root.replaceChildren(el);
  }

  private modal(title: string, text: string, ...buttons: HTMLElement[]): HTMLElement {
    const m = h('div', { class: 'modal' },
      h('div', { class: 'card' }, h('h2', { text: title }), h('p', { text }), h('div', { class: 'col' }, ...buttons)),
    );
    document.body.append(m);
    return m;
  }

  private toast(text: string): void {
    const t = h('div', { class: 'toast', text });
    document.body.append(t);
    window.setTimeout(() => t.remove(), 2600);
  }

  private async useHint(): Promise<boolean> {
    if (this.save.hints > 0) {
      this.save.hints--;
      this.persist();
      return true;
    }
    return new Promise((resolve) => {
      const m = this.modal(
        'Подсказки закончились',
        `Посмотри короткий ролик и получи ${REWARD_HINTS} подсказки.`,
        btn('primary', 'Смотреть ролик', 'bulb', async () => {
          m.remove();
          if (await this.platform.showRewarded()) {
            this.save.hints += REWARD_HINTS - 1; // одну тратим сразу
            this.persist();
            resolve(true);
          } else {
            this.toast('Ролик не досмотрен, подсказка не начислена');
            resolve(false);
          }
        }),
        btn('ghost', 'Не сейчас', null, () => {
          m.remove();
          resolve(false);
        }),
      );
    });
  }

  private get today(): number {
    return dayNumber(Date.now());
  }

  private get totalStars(): number {
    return Object.values(this.save.stars).reduce((a, b) => a + b, 0);
  }

  // ---------- меню ----------

  private showMenu(): void {
    const s = this.save;
    const daily = s.daily?.day === this.today ? s.daily : null;
    const countdown = h('span', {});
    const dailyCard = h('div', { class: 'card daily' },
      h('div', { class: 'row' },
        h('h2', { text: 'Слово дня' }),
        s.streak > 0 && s.lastDailyDay >= this.today - 1
          ? h('span', { class: 'pill' }, icon('flame'), h('span', { text: `${s.streak} ${plural(s.streak, 'день', 'дня', 'дней')}` }))
          : null,
      ),
      daily?.done
        ? h('p', {}, `Твой улов: ${daily.words.length} ${plural(daily.words.length, 'слово', 'слова', 'слов')}. Новое слово через `, countdown)
        : h('p', { text: 'Одно слово на всех и 3 минуты. Сколько слов поймаешь ты?' }),
      daily?.done
        ? btn('primary', 'Мой результат', 'trophy', () => this.showDailyResult())
        : btn('primary', daily ? 'Продолжить' : 'Играть', 'fish', () => this.openDaily()),
    );

    const level = Math.min(s.unlocked, levels.journey.length - 1);
    const journeyCard = h('div', { class: 'card' },
      h('div', { class: 'row' },
        h('h2', { text: 'Путешествие' }),
        h('span', { class: 'pill' }, icon('star', 'on'), h('span', { text: String(this.totalStars) })),
      ),
      h('p', { text: `Уровень ${level + 1} из ${levels.journey.length}. Без таймера, в своём темпе.` }),
      h('div', { class: 'row' },
        btn('primary grow', 'Продолжить', 'next', () => this.openLevel(level)),
        btn('secondary', 'Уровни', 'grid', () => this.showLevels()),
      ),
    );

    const soundBtn = btn('tool', 'Звук', s.sound ? 'soundOn' : 'soundOff', () => {
      s.sound = !s.sound;
      setSound(s.sound);
      this.persist();
      this.showMenu();
    });

    const el = h('div', { class: 'screen menu' },
      h('div', { class: 'logo' }, icon('fish'), h('h1', { text: 'Словолов' }), h('p', { text: 'Лови слова из букв одного слова' })),
      dailyCard,
      journeyCard,
      h('div', { class: 'tools' },
        btn('tool', 'Рекорды', 'trophy', () => this.showRecords()),
        btn('tool', 'Позвать друзей', 'users', () => void this.platform.invite()),
        soundBtn,
      ),
      h('p', { class: 'foot', text: `Очки: ${s.total} · Подсказки: ${s.hints}` }),
    );
    this.show(el);

    const tick = () => {
      countdown.textContent = formatLong(msToNextDay(Date.now()));
      if (daily && dayNumber(Date.now()) !== daily.day) this.showMenu();
    };
    tick();
    this.ticker = window.setInterval(tick, 1000);
  }

  private showLevels(): void {
    const s = this.save;
    const cells = levels.journey.map((_, i) => {
      const open = i <= s.unlocked;
      const stars = s.stars[i] ?? 0;
      const cell = h('button', { class: open ? 'cell' : 'cell locked' },
        open ? h('b', { text: String(i + 1) }) : icon('lock'),
        open ? h('div', { class: 'stars' }, ...[0, 1, 2].map((k) => icon('star', k < stars ? 'on' : 'off'))) : null,
      );
      if (open) cell.addEventListener('click', () => this.openLevel(i));
      else cell.disabled = true;
      return cell;
    });
    this.show(h('div', { class: 'screen' },
      h('header', { class: 'top' },
        btn('ghost', '', 'back', () => this.showMenu()),
        h('div', { class: 'title' }, h('b', { text: 'Уровни' }), h('span', { class: 'sub', text: `Звёзд: ${this.totalStars}` })),
      ),
      h('div', { class: 'grid' }, ...cells),
    ));
  }

  // ---------- рекорды ----------

  private showRecords(): void {
    const s = this.save;
    const stat = (value: number, label: string) => h('div', { class: 'stat' }, h('b', { text: String(value) }), h('span', { text: label }));
    const best = Math.max(0, ...s.history.map((r) => r.words));
    const rows = s.history.slice().reverse().map((r) =>
      h('tr', { class: r.words === best && best > 0 ? 'best' : '' },
        h('td', { text: dayLabel(r.day) }),
        h('td', { class: 'w', text: r.word.toUpperCase() }),
        h('td', { text: String(r.words) }),
        h('td', { text: String(r.score) }),
      ),
    );
    const vk = this.platform.name === 'vk';
    this.show(h('div', { class: 'screen records' },
      h('header', { class: 'top' },
        btn('ghost', '', 'back', () => this.showMenu()),
        h('div', { class: 'title' }, h('b', { text: 'Рекорды' }), h('span', { class: 'sub', text: 'Твои лучшие уловы' })),
      ),
      h('div', { class: 'statgrid' },
        stat(s.bestDaily, 'рекорд слова дня'),
        stat(Math.max(s.bestStreak, s.streak), plural(Math.max(s.bestStreak, s.streak), 'день подряд', 'дня подряд', 'дней подряд')),
        stat(s.total, 'очков всего'),
        stat(this.totalStars, plural(this.totalStars, 'звезда', 'звезды', 'звёзд')),
      ),
      vk
        ? btn('primary', 'Рейтинг игроков', 'trophy', () => void this.platform.leaderboard(s.total))
        : h('p', { class: 'foot', text: 'Общий рейтинг игроков и друзей доступен в игре во ВКонтакте.' }),
      h('div', { class: 'card' },
        h('h3', { text: 'Уловы по дням' }),
        rows.length
          ? h('table', { class: 'table' },
              h('thead', {}, h('tr', {}, h('th', { text: 'День' }), h('th', { class: 'w', text: 'Слово' }), h('th', { text: 'Слов' }), h('th', { text: 'Очки' }))),
              h('tbody', {}, ...rows),
            )
          : h('p', { text: 'Здесь появятся твои результаты слова дня. Сыграй сегодня, чтобы открыть таблицу.' }),
      ),
      btn('secondary', 'Позвать друзей', 'users', () => void this.platform.invite()),
    ));
  }

  // ---------- путешествие ----------

  private openLevel(idx: number): void {
    const s = this.save;
    const round = new Round(levels.journey[idx], this.dict, (s.levels[idx] ?? '').split(' ').filter(Boolean));
    const hasNext = idx + 1 < levels.journey.length;
    const view = new PlayView({
      title: `Уровень ${idx + 1}`,
      round,
      tutorial: idx === 0 && !s.tutorialDone,
      hints: () => s.hints,
      useHint: () => this.useHint(),
      onBack: () => this.showMenu(),
      onFound: (word, before, now) => {
        s.levels[idx] = round.found.join(' ');
        s.total += points(word);
        if (now > before) {
          s.stars[idx] = now;
          s.hints += now - before;
          this.toast(now === 3 ? 'Три звезды! +1 подсказка' : 'Новая звезда! +1 подсказка');
          if (hasNext && s.unlocked <= idx) s.unlocked = idx + 1;
        }
        this.persist();
      },
      onNext: hasNext ? () => void this.nextLevel(idx + 1) : undefined,
      onTutorialDone: () => {
        s.tutorialDone = true;
        this.persist();
      },
    });
    this.show(view.el);
    this.view = view;
  }

  private async nextLevel(idx: number): Promise<void> {
    const s = this.save;
    if (idx >= 2 && Date.now() - this.lastAdAt > AD_GAP_MS) {
      this.lastAdAt = Date.now();
      await this.platform.showInterstitial();
    }
    if (idx === 3 && !s.favAsked) {
      s.favAsked = true;
      this.persist();
      void this.platform.addToFavorites();
    }
    this.openLevel(idx);
  }

  // ---------- слово дня ----------

  private dailyRound(): Round {
    return new Round(dailyWord(this.today, levels.daily), this.dict, this.save.daily?.words ?? []);
  }

  private openDaily(): void {
    const s = this.save;
    if (s.daily?.day !== this.today) s.daily = null;
    if (s.daily?.done) return this.showDailyResult();
    if (s.daily && Date.now() - s.daily.startedAt >= DAILY_SECONDS * 1000) return this.finishDaily();
    if (s.daily) return this.playDaily();

    const m = this.modal(
      'Слово дня',
      'Сегодня у всех игроков одно и то же слово. У тебя 3 минуты и одна попытка: поймай как можно больше слов. Потом сравни улов с друзьями.',
      btn('primary', 'Забросить удочку', 'fish', () => {
        m.remove();
        s.daily = { day: this.today, startedAt: Date.now(), words: [], done: false };
        this.persist();
        this.playDaily();
      }),
      btn('ghost', 'Позже', null, () => m.remove()),
    );
  }

  private playDaily(): void {
    const d = this.save.daily!;
    const round = this.dailyRound();
    const view = new PlayView({
      title: 'Слово дня',
      round,
      endsAt: d.startedAt + DAILY_SECONDS * 1000,
      tutorial: false,
      hints: () => this.save.hints,
      useHint: () => this.useHint(),
      onBack: () => this.showMenu(),
      onFound: (word) => {
        d.words = round.found.slice();
        this.save.total += points(word);
        this.persist();
      },
      onTimeUp: () => this.finishDaily(),
    });
    this.show(view.el);
    this.view = view;
  }

  private finishDaily(): void {
    const s = this.save;
    const d = s.daily!;
    if (!d.done) {
      d.done = true;
      s.streak = nextStreak(s.streak, s.lastDailyDay, d.day);
      s.lastDailyDay = d.day;
      s.bestDaily = Math.max(s.bestDaily, d.words.length);
      s.bestStreak = Math.max(s.bestStreak, s.streak);
      const round = this.dailyRound();
      s.history = [...s.history.filter((r) => r.day !== d.day), { day: d.day, word: round.source, words: round.found.length, score: round.score }].slice(-HISTORY_MAX);
      s.hints += 1;
      this.persist();
      play('star');
    }
    this.showDailyResult();
  }

  private showDailyResult(): void {
    const s = this.save;
    const d = s.daily!;
    const round = this.dailyRound();
    const n = round.found.length;
    const missed = round.missed().sort((a, b) => b.length - a.length || a.localeCompare(b)).slice(0, 6);
    const card = () => renderCard({ word: round.source, words: n, score: round.score, streak: s.streak, longest: round.longestFound() });
    const wallText = `Мой улов в «Словолове» сегодня: ${n} ${plural(n, 'слово', 'слова', 'слов')} из слова «${round.source.toUpperCase()}». Сможешь больше?`;
    const countdown = h('b', {});
    const stars = starsFor(n, round.all.size);

    const el = h('div', { class: 'screen result' },
      h('header', { class: 'top' },
        btn('ghost', '', 'back', () => this.showMenu()),
        h('div', { class: 'title' }, h('b', { text: 'Улов дня' }), h('span', { class: 'sub', text: 'Слово одно для всех игроков' })),
      ),
      h('div', { class: 'word' }, ...[...round.source].map((ch) => h('i', { text: ch.toUpperCase() }))),
      h('div', { class: 'card big' },
        h('div', { class: 'num', text: String(n) }),
        h('div', { class: 'cap', text: plural(n, 'слово поймано', 'слова поймано', 'слов поймано') }),
        h('div', { class: 'stars' }, ...[0, 1, 2].map((i) => icon('star', i < stars ? 'on' : 'off'))),
        h('div', { class: 'stats' },
          h('div', {}, h('b', { text: String(round.score) }), h('span', { text: plural(round.score, 'очко', 'очка', 'очков') })),
          h('div', {}, h('b', { text: String(s.streak) }), h('span', { text: `${plural(s.streak, 'день', 'дня', 'дней')} подряд` })),
          h('div', {}, h('b', { text: String(s.bestDaily) }), h('span', { text: 'рекорд' })),
        ),
        round.longestFound() ? h('p', { text: `Лучшее слово: ${round.longestFound().toUpperCase()}` }) : null,
      ),
      btn('primary', 'Поделиться в истории', 'share', async () => {
        if (!(await this.platform.shareStory(card()))) this.toast('Не получилось поделиться');
      }),
      h('div', { class: 'row' },
        btn('secondary grow', 'На стену', 'post', () => void this.platform.shareWall(wallText)),
        btn('secondary grow', 'Позвать друзей', 'users', () => void this.platform.invite()),
      ),
      missed.length
        ? h('div', { class: 'card' },
            h('h3', { text: 'Крупная рыба, которая ушла' }),
            h('div', { class: 'chips' }, ...missed.map((w) => h('span', { class: 'chip', text: w }))),
          )
        : null,
      h('p', { class: 'foot' }, 'Новое слово через ', countdown, '. За улов дня: +1 подсказка.'),
      btn('ghost wide', 'В меню', null, () => this.showMenu()),
    );
    this.show(el);
    const tick = () => {
      countdown.textContent = formatLong(msToNextDay(Date.now()));
      if (dayNumber(Date.now()) !== d.day) this.showMenu();
    };
    tick();
    this.ticker = window.setInterval(tick, 1000);
  }
}

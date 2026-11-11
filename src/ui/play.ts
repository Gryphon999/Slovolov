import { Round } from '../core/round';
import { plural, points, starGoals, starsFor } from '../core/words';
import { btn, formatClock, h, icon } from './dom';
import { play } from './sound';

export interface PlayOptions {
  title: string;
  round: Round;
  /** Момент окончания раунда (мс). Нет — раунд без таймера. */
  endsAt?: number;
  tutorial: boolean;
  hints: () => number;
  /** Игрок просит подсказку. true — подсказка списана и её можно показать. */
  useHint: () => Promise<boolean>;
  onFound: (word: string, starsBefore: number, starsNow: number) => void;
  onBack: () => void;
  onTimeUp?: () => void;
  onNext?: () => void;
  onTutorialDone?: () => void;
}

interface Tile {
  id: number;
  ch: string;
  el: HTMLButtonElement;
}

const PRAISE = ['Поймал!', 'Есть!', 'Хороший улов!', 'Клюёт!'];
const PRAISE_BIG = ['Крупная рыба!', 'Вот это улов!', 'Мастер!'];
const TUT_WORD = 'кот';

/** Игровой экран: буквы, собранное слово, улов. Не знает про сохранения и площадку. */
export class PlayView {
  readonly el: HTMLElement;
  private readonly o: PlayOptions;
  private readonly tiles: Tile[];
  private picked: Tile[] = [];
  private hint: { word: string; shown: number } | null = null;
  private tut = 0;
  private timer = 0;
  private lastTick = -1;

  private readonly sub = h('span', { class: 'sub' });
  private readonly starsEl = h('div', { class: 'stars' });
  private readonly bar = h('i');
  private readonly foundEl = h('div', { class: 'found' });
  private readonly hintEl = h('div', { class: 'hintline' });
  private readonly msgEl = h('div', { class: 'msg' });
  private readonly builtEl = h('div', { class: 'built' });
  private readonly tilesEl = h('div', { class: 'tiles' });
  private readonly coach = h('div', { class: 'coach' });
  private readonly clockEl = h('div', { class: 'clock' });
  private readonly hintBadge = h('b', { class: 'badge' });
  private readonly submitBtn: HTMLButtonElement;
  private readonly backBtn: HTMLButtonElement;
  private readonly nextBtn: HTMLButtonElement;

  constructor(o: PlayOptions) {
    this.o = o;
    this.tiles = [...o.round.source].map((ch, id) => {
      const el = h('button', { class: 'tile', text: ch.toUpperCase() });
      const t = { id, ch, el };
      el.addEventListener('click', () => this.pick(t));
      return t;
    });

    this.submitBtn = btn('primary catch', 'Поймать', 'fish', () => this.submit());
    this.backBtn = btn('round', '', 'backspace', () => this.unpick());
    this.backBtn.title = 'Стереть букву';
    const shuffleBtn = btn('round', '', 'shuffle', () => this.shuffle());
    shuffleBtn.title = 'Перемешать буквы';
    const hintBtn = btn('round hint', '', 'bulb', () => void this.askHint());
    hintBtn.title = 'Подсказка';
    hintBtn.append(this.hintBadge);
    this.nextBtn = btn('next', 'Следующий уровень', 'next', () => o.onNext?.());

    const cols = this.tiles.length > 7 ? Math.ceil(this.tiles.length / 2) : this.tiles.length;
    this.tilesEl.style.setProperty('--cols', String(cols));

    this.el = h('div', { class: 'screen play' },
      h('header', { class: 'top' },
        btn('ghost', '', 'back', () => o.onBack()),
        h('div', { class: 'title' }, h('b', { text: o.title }), this.sub),
        o.endsAt ? this.clockEl : this.starsEl,
      ),
      h('div', { class: 'progress' }, this.bar),
      this.foundEl,
      this.coach,
      this.hintEl,
      this.msgEl,
      this.builtEl,
      this.tilesEl,
      h('div', { class: 'actions' }, shuffleBtn, hintBtn, this.backBtn, this.submitBtn),
      this.nextBtn,
    );

    if (o.tutorial) this.tut = o.round.found.includes(TUT_WORD) ? 3 : 1;
    this.renderTiles();
    this.refresh();

    window.addEventListener('keydown', this.onKey);
    if (o.endsAt) {
      this.timer = window.setInterval(() => this.tick(), 200);
      this.tick();
    }
  }

  destroy(): void {
    window.removeEventListener('keydown', this.onKey);
    window.clearInterval(this.timer);
  }

  private readonly onKey = (e: KeyboardEvent): void => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'Enter') this.submit();
    else if (e.key === 'Backspace') this.unpick();
    else if (e.key === ' ') this.shuffle();
    else {
      const ch = e.key.toLowerCase().replace('ё', 'е');
      const t = this.tiles.find((x) => x.ch === ch && !this.picked.includes(x));
      if (!t) return;
      this.pick(t);
    }
    e.preventDefault();
  };

  private get built(): string {
    return this.picked.map((t) => t.ch).join('');
  }

  private pick(t: Tile): void {
    if (this.picked.includes(t)) return;
    this.picked.push(t);
    play('tap');
    this.say('');
    this.refreshBuilt();
  }

  private unpick(index = this.picked.length - 1): void {
    if (index < 0) return;
    this.picked.splice(index, 1);
    play('tap');
    this.refreshBuilt();
  }

  private shuffle(): void {
    for (let i = this.tiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.tiles[i], this.tiles[j]] = [this.tiles[j], this.tiles[i]];
    }
    play('tap');
    this.renderTiles();
  }

  private renderTiles(): void {
    this.tilesEl.replaceChildren(...this.tiles.map((t) => t.el));
  }

  private say(text: string, kind: 'good' | 'bad' | '' = ''): void {
    this.msgEl.textContent = text;
    this.msgEl.className = `msg ${kind}`;
    if (text) {
      // перезапуск анимации появления
      this.msgEl.style.animation = 'none';
      void this.msgEl.offsetWidth;
      this.msgEl.style.animation = '';
    }
  }

  private submit(): void {
    const word = this.built;
    if (!word) return;
    const before = starsFor(this.o.round.found.length, this.o.round.all.size);
    const res = this.o.round.submit(word);
    if (res === 'ok') {
      const p = points(word);
      const big = word.length >= 6;
      const list = big ? PRAISE_BIG : PRAISE;
      this.say(`${list[Math.floor(Math.random() * list.length)]} +${p}`, 'good');
      play(big ? 'big' : 'ok');
      this.picked = [];
      if (this.hint?.word === word) this.hint = null;
      const now = starsFor(this.o.round.found.length, this.o.round.all.size);
      if (now > before) play('star');
      if (this.tut === 2 || this.tut === 1) this.tut = 3;
      else if (this.tut === 3) this.tut = 4;
      this.o.onFound(word, before, now);
      this.refresh(word);
      return;
    }
    const text = {
      dup: 'Это слово уже в улове',
      short: 'Нужно хотя бы 3 буквы',
      unknown: 'Такого слова нет в словаре',
      self: 'Это само слово. Ищи другие!',
      nofit: 'Таких букв нет',
    }[res];
    this.say(text, 'bad');
    play('bad');
    this.builtEl.classList.remove('shake');
    void this.builtEl.offsetWidth;
    this.builtEl.classList.add('shake');
  }

  private async askHint(): Promise<void> {
    const r = this.o.round;
    if (this.hint && this.hint.shown >= this.hint.word.length - 1) {
      this.say('Осталась одна буква, справишься!');
      return;
    }
    if (!this.hint && r.missed().length === 0) return;
    if (!(await this.o.useHint())) {
      this.refreshHint();
      return;
    }
    if (this.hint) this.hint.shown++;
    else this.hint = { word: r.pickHint()!, shown: 1 };
    this.refreshHint();
  }

  private refreshHint(): void {
    this.hintBadge.textContent = String(this.o.hints());
    if (!this.hint) {
      this.hintEl.replaceChildren();
      return;
    }
    const { word, shown } = this.hint;
    this.hintEl.replaceChildren(
      icon('bulb'),
      h('span', { text: 'Подсказка:' }),
      ...[...word].map((ch, i) => h('i', { class: i < shown ? 'on' : '', text: i < shown ? ch.toUpperCase() : '' })),
    );
  }

  private refreshBuilt(): void {
    if (this.picked.length === 0) {
      this.builtEl.replaceChildren(h('span', { class: 'ph', text: 'Собери слово из букв' }));
    } else {
      this.builtEl.replaceChildren(
        ...this.picked.map((t, i) => h('button', { class: 'letter', text: t.ch.toUpperCase(), onclick: () => this.unpick(i) })),
      );
    }
    for (const t of this.tiles) t.el.classList.toggle('used', this.picked.includes(t));
    this.submitBtn.disabled = this.picked.length === 0;
    this.syncTutorial();
  }

  private refreshFound(fresh?: string): void {
    const r = this.o.round;
    const byLen = new Map<number, string[]>();
    for (const w of r.found) byLen.set(w.length, [...(byLen.get(w.length) ?? []), w]);
    const totals = new Map<number, number>();
    for (const w of r.all) totals.set(w.length, (totals.get(w.length) ?? 0) + 1);

    if (r.found.length === 0) {
      this.foundEl.replaceChildren(h('p', { class: 'empty', text: 'Здесь будет твой улов. Слова — существительные в начальной форме, от 3 букв.' }));
      return;
    }
    const groups = [...byLen.keys()].sort((a, b) => b - a).map((len) =>
      h('section', {},
        h('h3', { text: `${len} ${plural(len, 'буква', 'буквы', 'букв')} · ${byLen.get(len)!.length} из ${totals.get(len)}` }),
        h('div', { class: 'chips' },
          ...byLen.get(len)!.slice().sort().map((w) => h('span', { class: w === fresh ? 'chip fresh' : 'chip', text: w })),
        ),
      ),
    );
    this.foundEl.replaceChildren(...groups);
    this.foundEl.querySelector('.fresh')?.scrollIntoView({ block: 'nearest' });
  }

  private refresh(fresh?: string): void {
    const r = this.o.round;
    const n = r.found.length;
    const total = r.all.size;
    const goals = starGoals(total);
    const stars = starsFor(n, total);
    const nextGoal = goals.find((g) => n < g);
    this.sub.textContent = this.o.endsAt
      ? `${n} ${plural(n, 'слово', 'слова', 'слов')} · ${r.score} ${plural(r.score, 'очко', 'очка', 'очков')}`
      : nextGoal
        ? `${n} из ${total} · до звезды ещё ${nextGoal - n}`
        : `${n} из ${total} слов`;
    this.starsEl.replaceChildren(...[0, 1, 2].map((i) => icon('star', i < stars ? 'on' : 'off')));
    const span = nextGoal ?? total;
    const prev = [0, ...goals].filter((g) => g <= n).pop() ?? 0;
    this.bar.style.width = `${Math.min(100, ((n - prev) / Math.max(1, span - prev)) * 100)}%`;
    this.nextBtn.hidden = !this.o.onNext || stars < 1 || this.tut > 0;
    this.refreshFound(fresh);
    this.refreshHint();
    this.refreshBuilt();
  }

  private tick(): void {
    const left = (this.o.endsAt! - Date.now()) / 1000;
    this.clockEl.replaceChildren(icon('clock'), h('span', { text: formatClock(left) }));
    this.clockEl.classList.toggle('hot', left <= 10);
    const sec = Math.ceil(left);
    if (left <= 10 && left > 0 && sec !== this.lastTick) {
      this.lastTick = sec;
      play('tick');
    }
    if (left <= 0) {
      window.clearInterval(this.timer);
      this.o.onTimeUp?.();
    }
  }

  // Обучение через игру: первый уровень ведёт игрока за руку.
  private syncTutorial(): void {
    for (const t of this.tiles) t.el.classList.remove('pulse');
    this.submitBtn.classList.remove('pulse');
    this.backBtn.classList.remove('pulse');
    this.coach.hidden = this.tut === 0;
    if (this.tut === 0) return;

    const built = this.built;
    if (this.tut === 2 && built !== TUT_WORD) this.tut = 1;
    if (this.tut === 1 && built === TUT_WORD) this.tut = 2;

    if (this.tut === 1) {
      this.coach.replaceChildren(h('span', { text: 'Собери слово КОТ: нажимай на буквы по очереди.' }));
      if (TUT_WORD.startsWith(built)) {
        const need = TUT_WORD[built.length];
        this.tiles.find((t) => t.ch === need && !this.picked.includes(t))?.el.classList.add('pulse');
      } else {
        this.backBtn.classList.add('pulse');
      }
    } else if (this.tut === 2) {
      this.coach.replaceChildren(h('span', { text: 'Слово готово. Жми «Поймать»!' }));
      this.submitBtn.classList.add('pulse');
    } else if (this.tut === 3) {
      this.coach.replaceChildren(h('span', { text: 'Получилось! Теперь найди ещё одно слово сам. Например, ЛЕТО или ТОК.' }));
    } else {
      this.coach.replaceChildren(
        h('span', { text: 'Отлично! Лампочка подскажет слово, стрелки перемешают буквы. Набери слов на первую звезду, и откроется следующий уровень.' }),
        btn('primary small', 'Понятно', null, () => {
          this.tut = 0;
          this.o.onTutorialDone?.();
          this.refresh();
        }),
      );
    }
  }
}

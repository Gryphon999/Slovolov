import { MIN_LEN, canForm, normalize, points, subwords } from './words';

export type SubmitResult = 'ok' | 'dup' | 'short' | 'nofit' | 'unknown' | 'self';

/** Один раунд: исходное слово, все возможные ответы и то, что игрок уже поймал. */
export class Round {
  readonly source: string;
  readonly all: Set<string>;
  readonly found: string[];

  constructor(source: string, dict: Iterable<string>, found: string[] = []) {
    this.source = normalize(source);
    this.all = new Set(subwords(dict, this.source));
    this.found = found.filter((w) => this.all.has(w));
  }

  get score(): number {
    return this.found.reduce((s, w) => s + points(w), 0);
  }

  submit(raw: string): SubmitResult {
    const w = normalize(raw);
    if (w.length < MIN_LEN) return 'short';
    if (w === this.source) return 'self';
    if (!canForm(w, this.source)) return 'nofit';
    if (this.found.includes(w)) return 'dup';
    if (!this.all.has(w)) return 'unknown';
    this.found.push(w);
    return 'ok';
  }

  missed(): string[] {
    return [...this.all].filter((w) => !this.found.includes(w));
  }

  longestFound(): string {
    return this.found.reduce((best, w) => (w.length > best.length ? w : best), '');
  }

  /** Слово для подсказки: сначала из 4–5 букв, их приятнее всего угадывать. */
  pickHint(rnd: () => number = Math.random): string | null {
    const missed = this.missed();
    if (missed.length === 0) return null;
    const easy = missed.filter((w) => w.length === 4 || w.length === 5);
    const pool = easy.length > 0 ? easy : missed;
    return pool[Math.floor(rnd() * pool.length)];
  }
}

import { plural } from '../core/words';

export interface CardData {
  word: string;
  words: number;
  score: number;
  streak: number;
  longest: string;
}

function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, hgt: number, r: number): void {
  c.beginPath();
  c.roundRect(x, y, w, hgt, r);
}

/** Картинка 1080×1920 для истории: слово дня и улов игрока. Возвращает data URL PNG. */
export function renderCard(d: CardData): string {
  const W = 1080;
  const H = 1920;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const c = cv.getContext('2d')!;
  const font = (px: number, weight = 800) => `${weight} ${px}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;

  const bg = c.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#0e3b5c');
  bg.addColorStop(0.55, '#0f6f8a');
  bg.addColorStop(1, '#12a3a0');
  c.fillStyle = bg;
  c.fillRect(0, 0, W, H);

  // волны
  for (let k = 0; k < 4; k++) {
    c.beginPath();
    const base = H - 420 + k * 110;
    c.moveTo(0, base);
    for (let x = 0; x <= W; x += 20) c.lineTo(x, base + Math.sin(x / 90 + k * 1.7) * 26);
    c.lineTo(W, H);
    c.lineTo(0, H);
    c.closePath();
    c.fillStyle = `rgba(255,255,255,${0.05 + k * 0.03})`;
    c.fill();
  }

  c.textAlign = 'center';
  c.fillStyle = '#ffffff';
  c.font = font(96);
  c.fillText('СЛОВОЛОВ', W / 2, 250);
  c.font = font(46, 600);
  c.fillStyle = 'rgba(255,255,255,.8)';
  c.fillText('Слово дня', W / 2, 400);

  // плитки слова
  const letters = [...d.word.toUpperCase()];
  const perRow = letters.length > 8 ? Math.ceil(letters.length / 2) : letters.length;
  const size = Math.min(130, Math.floor((W - 160) / perRow) - 14);
  const rows = [letters.slice(0, perRow), letters.slice(perRow)].filter((r) => r.length);
  rows.forEach((row, ri) => {
    const total = row.length * (size + 14) - 14;
    row.forEach((ch, i) => {
      const x = (W - total) / 2 + i * (size + 14);
      const y = 460 + ri * (size + 18);
      roundRect(c, x, y, size, size, size * 0.22);
      c.fillStyle = '#fff6e3';
      c.fill();
      c.fillStyle = '#0e3b5c';
      c.font = font(size * 0.62);
      c.fillText(ch, x + size / 2, y + size * 0.72);
    });
  });

  const top = 460 + rows.length * (size + 18) + 110;
  roundRect(c, 110, top, W - 220, 620, 56);
  c.fillStyle = 'rgba(255,255,255,.14)';
  c.fill();

  c.fillStyle = 'rgba(255,255,255,.85)';
  c.font = font(52, 600);
  c.fillText('Мой улов', W / 2, top + 100);
  c.fillStyle = '#ffd166';
  c.font = font(230);
  c.fillText(String(d.words), W / 2, top + 320);
  c.fillStyle = '#ffffff';
  c.font = font(64);
  c.fillText(plural(d.words, 'слово', 'слова', 'слов'), W / 2, top + 410);
  c.font = font(44, 600);
  c.fillStyle = 'rgba(255,255,255,.85)';
  const extra = [`${d.score} ${plural(d.score, 'очко', 'очка', 'очков')}`];
  if (d.streak > 1) extra.push(`серия ${d.streak} ${plural(d.streak, 'день', 'дня', 'дней')}`);
  c.fillText(extra.join('  ·  '), W / 2, top + 500);
  if (d.longest) c.fillText(`лучшее слово: ${d.longest.toUpperCase()}`, W / 2, top + 570);

  c.fillStyle = '#ffffff';
  c.font = font(64);
  c.fillText('А сколько поймаешь ты?', W / 2, top + 780);
  return cv.toDataURL('image/png');
}

// Живой фон: бесконечная подводная сцена. Лучи света, стайки рыб на трёх глубинах,
// пузырьки и всплывающие буквы. Всё рисуется на одном холсте и никогда не повторяется.

interface Fish {
  x: number;
  y: number;
  size: number;
  speed: number; // пикселей в секунду, знак задаёт направление
  phase: number;
  depth: number; // 0 — далеко (бледная, медленная), 1 — близко
  bob: number;
}

interface Bubble {
  x: number;
  y: number;
  r: number;
  speed: number;
  phase: number;
}

interface Letter {
  x: number;
  y: number;
  ch: string;
  size: number;
  speed: number;
  spin: number;
  angle: number;
  phase: number;
}

const LETTERS = 'АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЭЮЯ';
const rand = (a: number, b: number) => a + Math.random() * (b - a);

export function startBackdrop(canvas: HTMLCanvasElement): void {
  const c = canvas.getContext('2d');
  if (!c) return;
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let w = 0;
  let h = 0;
  let fish: Fish[] = [];
  let bubbles: Bubble[] = [];
  let letters: Letter[] = [];

  const newFish = (depth: number, x?: number, y?: number, dir?: number): Fish => {
    const d = dir ?? (Math.random() < 0.5 ? 1 : -1);
    return {
      x: x ?? rand(0, w),
      y: y ?? rand(h * 0.08, h * 0.92),
      size: 10 + depth * 26 + rand(0, 8),
      speed: d * (14 + depth * 34 + rand(0, 10)),
      phase: rand(0, 6.28),
      depth,
      bob: rand(4, 12),
    };
  };

  /** Стайка: несколько рыб плывут рядом в одну сторону. */
  const newSchool = (offscreen: boolean): Fish[] => {
    const depth = rand(0.1, 0.75);
    const dir = Math.random() < 0.5 ? 1 : -1;
    const n = Math.floor(rand(4, 9));
    const cx = offscreen ? (dir > 0 ? -rand(60, 260) : w + rand(60, 260)) : rand(0, w);
    const cy = rand(h * 0.12, h * 0.85);
    return Array.from({ length: n }, () => {
      const f = newFish(depth, cx + rand(-70, 70), cy + rand(-45, 45), dir);
      f.size *= 0.6;
      f.speed = dir * (22 + depth * 30);
      return f;
    });
  };

  const newBubble = (anywhere: boolean): Bubble => ({
    x: rand(0, w),
    y: anywhere ? rand(0, h) : h + rand(10, 80),
    r: rand(1.5, 6),
    speed: rand(18, 55),
    phase: rand(0, 6.28),
  });

  const newLetter = (anywhere: boolean): Letter => ({
    x: rand(0, w),
    y: anywhere ? rand(0, h) : h + rand(30, 120),
    ch: LETTERS[Math.floor(Math.random() * LETTERS.length)],
    size: rand(22, 54),
    speed: rand(6, 16),
    spin: rand(-0.25, 0.25),
    angle: rand(-0.5, 0.5),
    phase: rand(0, 6.28),
  });

  const resize = (): void => {
    // На телефонах большой холст съедает память, поэтому плотность пикселей ограничена.
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const area = (w * h) / 100_000; // плотность сцены одинакова на любом экране
    fish = [
      ...Array.from({ length: Math.round(2 + area * 0.9) }, () => newFish(rand(0.05, 1))),
      ...Array.from({ length: Math.round(1 + area * 0.35) }, () => newSchool(false)).flat(),
    ];
    bubbles = Array.from({ length: Math.round(10 + area * 3) }, () => newBubble(true));
    letters = Array.from({ length: Math.round(4 + area * 1.1) }, () => newLetter(true));
  };

  const drawRays = (t: number): void => {
    for (let i = 0; i < 6; i++) {
      const sway = Math.sin(t * 0.12 + i * 1.9) * 0.12;
      const x = w * (0.08 + i * 0.17) + Math.sin(t * 0.07 + i) * 40;
      const width = 50 + (i % 3) * 38;
      const len = h * (0.75 + (i % 2) * 0.2);
      const dx = Math.tan(0.28 + sway) * len;
      const g = c.createLinearGradient(x, 0, x + dx, len);
      const a = 0.05 + 0.035 * Math.sin(t * 0.3 + i * 2.3);
      g.addColorStop(0, `rgba(255,255,255,${a + 0.05})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(x, -10);
      c.lineTo(x + width, -10);
      c.lineTo(x + width * 2.2 + dx, len);
      c.lineTo(x + dx - width * 0.6, len);
      c.closePath();
      c.fill();
    }
  };

  const drawFish = (f: Fish, t: number): void => {
    const dir = Math.sign(f.speed);
    const wag = Math.sin(t * (3 + f.depth * 3) + f.phase) * 0.35;
    const s = f.size;
    c.save();
    c.translate(f.x, f.y + Math.sin(t * 0.8 + f.phase) * f.bob);
    c.scale(dir, 1);
    c.fillStyle = `rgba(255,255,255,${0.07 + f.depth * 0.13})`;
    c.beginPath();
    c.ellipse(0, 0, s, s * 0.42, 0, 0, 6.2832);
    c.fill();
    c.beginPath(); // хвост виляет
    c.moveTo(-s * 0.8, 0);
    c.lineTo(-s * 1.55, -s * 0.5 + wag * s);
    c.lineTo(-s * 1.55, s * 0.5 + wag * s);
    c.closePath();
    c.fill();
    c.restore();
  };

  const step = (dt: number, t: number): void => {
    for (const f of fish) {
      f.x += f.speed * dt;
      const m = f.size * 3;
      if (f.speed > 0 && f.x > w + m) Object.assign(f, newFish(f.depth, -m, undefined, 1));
      else if (f.speed < 0 && f.x < -m) Object.assign(f, newFish(f.depth, w + m, undefined, -1));
    }
    for (const b of bubbles) {
      b.y -= b.speed * dt;
      b.x += Math.sin(t * 1.5 + b.phase) * 12 * dt;
      if (b.y < -10) Object.assign(b, newBubble(false));
    }
    for (const l of letters) {
      l.y -= l.speed * dt;
      l.angle += l.spin * dt;
      l.x += Math.sin(t * 0.4 + l.phase) * 8 * dt;
      if (l.y < -60) Object.assign(l, newLetter(false));
    }
  };

  const draw = (t: number): void => {
    c.clearRect(0, 0, w, h);
    drawRays(t);
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    for (const l of letters) {
      c.save();
      c.translate(l.x, l.y);
      c.rotate(l.angle);
      c.fillStyle = 'rgba(255,246,227,0.09)';
      c.font = `800 ${l.size}px system-ui, sans-serif`;
      c.fillText(l.ch, 0, 0);
      c.restore();
    }
    for (const f of fish) drawFish(f, t);
    c.strokeStyle = 'rgba(255,255,255,0.28)';
    c.lineWidth = 1;
    for (const b of bubbles) {
      c.beginPath();
      c.arc(b.x, b.y, b.r, 0, 6.2832);
      c.stroke();
    }
  };

  resize();
  window.addEventListener('resize', resize);

  if (calm) {
    draw(0); // игрок просил меньше движения: показываем неподвижную сцену
    return;
  }
  let last = performance.now();
  const frame = (now: number): void => {
    const dt = Math.min(0.05, (now - last) / 1000); // после сворачивания вкладки сцена не «прыгает»
    last = now;
    step(dt, now / 1000);
    draw(now / 1000);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

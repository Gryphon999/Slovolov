// Готовит картинки для витрины ВК: иконку, сниппет и скриншоты. Результат в docs/store/vk/.
// Запуск: npm run build, npm run preview (в другом окне), затем node scripts/store.mjs
import { chromium } from 'playwright-core';
import { mkdirSync, readFileSync } from 'node:fs';

const URL = process.env.URL ?? 'http://127.0.0.1:4180/';
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = 'docs/store/vk';
mkdirSync(OUT, { recursive: true });

const dict = readFileSync('public/dict.txt', 'utf8').split('\n');
const { journey, daily } = JSON.parse(readFileSync('src/data/levels.json', 'utf8'));
const fits = (w, src) => {
  const left = [...src];
  return [...w].every((ch) => {
    const i = left.indexOf(ch);
    if (i < 0) return false;
    left.splice(i, 1);
    return true;
  });
};
const answers = (src, n) => dict.filter((w) => w !== src && fits(w, src)).sort((a, b) => b.length - a.length).slice(0, n);

const FISH = '<svg viewBox="0 0 64 40" width="W" height="H"><path d="M2 20C10 7 26 4 36 15l12-8v26l-12-8C26 36 10 33 2 20z" fill="#fff6e3"/><circle cx="15" cy="17" r="3" fill="#0e3b5c"/></svg>';
const page = (body, w, h) => `<html><body style="margin:0;width:${w}px;height:${h}px;overflow:hidden;font-family:'Segoe UI',system-ui,sans-serif;color:#fff;background:linear-gradient(180deg,#0e3b5c,#0f6f8a 55%,#12a3a0)">${body}</body></html>`;
const tiles = (word, size) => [...word].map((ch) => `<span style="display:inline-grid;place-items:center;width:${size}px;height:${size}px;margin:0 ${size * 0.05}px;border-radius:22%;background:#fff6e3;color:#0e3b5c;font-weight:900;font-size:${size * 0.62}px;box-shadow:0 ${size * 0.07}px 0 #d9c9a3">${ch}</span>`).join('');

const browser = await chromium.launch({ executablePath: CHROME, headless: true });

async function html(name, w, h, body) {
  const p = await browser.newPage({ viewport: { width: w, height: h } });
  await p.setContent(page(body, w, h));
  await p.screenshot({ path: `${OUT}/${name}.png` });
  await p.close();
}

const icon = (s) => `<div style="height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${s * 0.06}px">${FISH.replace('W', s * 0.56).replace('H', s * 0.35)}<div>${tiles('СЛОВО', s * 0.145)}</div></div>`;
await html('icon-576', 576, 576, icon(576));
await html('icon-278', 278, 278, icon(278));
await html('icon-150', 150, 150, icon(150));
await html('favicon-32', 32, 32, `<div style="height:100%;display:grid;place-items:center">${FISH.replace('W', 26).replace('H', 16)}</div>`);
await html('snippet-1120x630', 1120, 630, `<div style="height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:26px">${FISH.replace('W', 150).replace('H', 94)}<div style="font-size:104px;font-weight:900;line-height:1">Словолов</div><div>${tiles('КОТЛЕТА', 84)}</div><div style="font-size:38px;font-weight:600;opacity:.9">Лови слова из букв одного слова</div></div>`);

// Скриншоты из настоящей игры: подкладываем сохранение и открываем нужный экран.
const today = Math.floor((Date.now() + 3 * 3600e3) / 864e5) - 20393;
const dayWord = (() => {
  // тот же порядок, что в src/core/daily.ts
  let a = (7919 + Math.floor(today / daily.length)) >>> 0;
  const rnd = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const arr = daily.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr[today % daily.length];
})();
const save = {
  v: 1, savedAt: Date.now(), hints: 5, tutorialDone: true, sound: false, total: 486, unlocked: 12,
  levels: { 12: answers(journey[12], 60).filter((_, i) => i % 3 === 0).join(' ') },
  stars: { 0: 3, 1: 3, 2: 2, 3: 3, 4: 2, 5: 3, 6: 1, 7: 2, 8: 3, 9: 2, 10: 1, 11: 2 },
  daily: { day: today, startedAt: Date.now() - 200_000, words: answers(dayWord, 40).filter((_, i) => i % 2 === 1), done: true },
  streak: 6, lastDailyDay: today, bestDaily: 27, favAsked: true,
};

async function game(name, w, h, steps, scale = 1) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: scale });
  const p = await ctx.newPage();
  await p.addInitScript((s) => localStorage.setItem('slovolov.save', s), JSON.stringify(save));
  await p.goto(URL);
  await p.waitForSelector('.menu');
  await steps(p);
  await p.waitForTimeout(500);
  await p.screenshot({ path: `${OUT}/${name}.png` });
  await ctx.close();
}

for (const [suffix, w, h, scale] of [['1200x600', 1200, 600, 1], ['phone', 390, 844, 1], ['1080x1920', 360, 640, 3]]) {
  await game(`screen-1-level-${suffix}`, w, h, async (p) => {
    await p.getByText('Продолжить').click();
    for (const ch of journey[12].slice(0, 4).toUpperCase()) await p.locator('.tile:not(.used)', { hasText: ch }).first().click();
  }, scale);
  await game(`screen-2-menu-${suffix}`, w, h, async () => {}, scale);
  await game(`screen-3-daily-${suffix}`, w, h, async (p) => p.getByText('Мой результат').click(), scale);
  await game(`screen-4-levels-${suffix}`, w, h, async (p) => p.getByText('Уровни').click(), scale);
}
await browser.close();
console.log('готово:', OUT);

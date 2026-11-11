// Проходит игру в невидимом Chrome и снимает экраны в папку shots/.
// Запуск: npm run build, npm run preview (в другом окне), затем node scripts/shots.mjs
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const URL = process.env.URL ?? 'http://127.0.0.1:4180/';
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
mkdirSync('shots', { recursive: true });

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const errors = [];

async function run(name, viewport) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2, acceptDownloads: true });
  const page = await ctx.newPage();
  // В невидимом Chrome нет системного окна «Поделиться», проверяем запасной путь: скачивание картинки.
  await page.addInitScript(() => { navigator.canShare = () => false; });
  page.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`${name}: ${m.text()}`));
  const shot = (n) => page.screenshot({ path: `shots/${name}-${n}.png` });
  const type = async (w) => {
    // Нажимаем буквы, как игрок; слова, которые не сложить из букв, пропускаем.
    for (const ch of w.toUpperCase()) {
      const t = page.locator('.tile:not(.used)', { hasText: ch }).first();
      if (!(await t.count())) break;
      await t.click({ force: true });
    }
    await page.locator('.catch').click({ force: true });
    while (await page.locator('.built .letter').count()) await page.locator('.built .letter').first().click();
    await page.waitForTimeout(60);
  };
  const key = (k) => page.evaluate((k) => window.dispatchEvent(new KeyboardEvent('keydown', { key: k })), k);

  await page.goto(URL);
  await page.waitForSelector('.tile');
  await shot('01-tutorial-start');
  for (const ch of 'КОТ') await page.locator('.tile.pulse', { hasText: ch }).click({ force: true });
  await shot('02-tutorial-catch');
  await page.locator('.catch.pulse').click({ force: true });
  await page.waitForTimeout(200);
  await shot('03-tutorial-own');
  for (const k of ['л', 'е', 'т', 'о', 'Enter']) await key(k); // проверка ввода с клавиатуры
  await page.waitForTimeout(150);
  await shot('04-tutorial-tips');
  await page.getByText('Понятно').click();
  for (const w of ['ток', 'тело', 'атлет', 'кот', 'ыыы', 'откат', 'лак', 'акт', 'котел', 'толк']) await type(w);
  await page.locator('.btn.hint').click();
  await page.waitForTimeout(200);
  await shot('05-level-star');
  await page.locator('.btn.next').click();
  await page.waitForSelector('.tile');
  await shot('06-level-2');
  await page.locator('.top .btn.ghost').click();
  await shot('07-menu');
  await page.getByText('Уровни').click();
  await shot('08-levels');
  await page.locator('.top .btn.ghost').click();

  await page.getByText('Играть').click();
  await shot('09-daily-intro');
  await page.getByText('Забросить удочку').click();
  await page.waitForSelector('.clock');
  const source = (await page.locator('.tile').allTextContents()).join('').toLowerCase();
  const dict = (await (await fetch(`${URL}dict.txt`)).text()).split('\n');
  const fits = (w) => {
    const left = [...source];
    return [...w].every((ch) => {
      const i = left.indexOf(ch);
      if (i < 0) return false;
      left.splice(i, 1);
      return true;
    });
  };
  const answers = dict.filter((w) => w !== source && fits(w)).sort((a, b) => b.length - a.length).slice(3, 20);
  for (const w of answers) await type(w);
  await shot('10-daily-play');

  // Перематываем таймер: считаем, что раунд начался 3 минуты назад.
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('slovolov.save'));
    s.daily.startedAt -= 180_000;
    s.savedAt = Date.now();
    localStorage.setItem('slovolov.save', JSON.stringify(s));
  });
  await page.reload();
  await page.getByText('Продолжить').first().click();
  await page.waitForSelector('.result');
  await shot('11-daily-result');
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByText('Поделиться в истории').click()]);
  await download.saveAs(`shots/${name}-12-story-card.png`);
  await page.getByText('В меню').click();
  await shot('13-menu-after-daily');
  await page.getByText('Рекорды').click();
  await page.waitForSelector('.records');
  await shot('14-records');
  console.log(name, 'ok, слово дня:', source);
  await ctx.close();
}

await run('phone', { width: 390, height: 844 });
await run('desktop', { width: 1000, height: 700 });
await run('small', { width: 360, height: 600 });
await browser.close();
if (errors.length) {
  console.error('ОШИБКИ:\n' + errors.join('\n'));
  process.exit(1);
}

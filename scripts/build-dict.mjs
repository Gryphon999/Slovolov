// Собирает словарь игры и список уровней.
// Вход:  data/nouns.txt (Harrix/Russian-Nouns, MIT), data/sources.txt (слова-уровни)
// Выход: public/dict.txt, src/data/levels.json
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const MIN = 3;
const MAX = 12;
// Корни и слова, которым не место в семейной игре.
const BAD = /хуй|хуе|хуя|пизд|бляд|блят|еба|ебл|ебу|муда|мудо|жоп|говн|дерьм|сран|срак|сруль|шлюх|гандон|гондон|залуп|манд[аоу]|елда|дроч|педик|пидор|педера|трах|минет|сиськ|сперм|онани|мастурб|проститу|порно|секс|блуд|шалав|потаскух|ублюд|выродок|сволоч|мраз|дебил|кретин|идиот|жид|чурк|хохол|кацап|негр|наркот|героин|кокаин|гашиш|марихуан/;
const BAD_EXACT = new Set(['сука', 'сучка', 'курва', 'падла', 'гад', 'стерва', 'член', 'анус', 'пенис', 'вагина', 'фаллос', 'кал', 'моча', 'понос', 'рвота', 'труп', 'суицид']);

const norm = (w) => w.trim().toLowerCase().replaceAll('ё', 'е');

const dict = [...new Set(
  readFileSync('data/nouns.txt', 'utf8')
    .split(/\r?\n/)
    .map(norm)
    .filter((w) => /^[а-я]+$/.test(w) && w.length >= MIN && w.length <= MAX)
    .filter((w) => !BAD.test(w) && !BAD_EXACT.has(w)),
)].sort();

const counts = (w) => {
  const c = {};
  for (const ch of w) c[ch] = (c[ch] ?? 0) + 1;
  return c;
};
const canForm = (w, src) => {
  const c = { ...src };
  for (const ch of w) {
    if (!c[ch]) return false;
    c[ch]--;
  }
  return true;
};

const dictSet = new Set(dict);
const sources = readFileSync('data/sources.txt', 'utf8').split(/\s+/).map(norm).filter(Boolean);
const rows = [];
for (const s of [...new Set(sources)]) {
  if (!dictSet.has(s)) {
    console.warn('нет в словаре:', s);
    continue;
  }
  const c = counts(s);
  const subs = dict.filter((w) => w !== s && w.length <= s.length && canForm(w, c));
  if (subs.length < 18) {
    console.warn('мало слов:', s, subs.length);
    continue;
  }
  rows.push({ s, n: subs.length });
}

// Путешествие: сначала короткие слова, потом длинные. Первый уровень учебный.
const journey = rows
  .slice()
  .sort((a, b) => (a.s === 'котлета' ? -1 : b.s === 'котлета' ? 1 : a.s.length - b.s.length))
  .map((r) => r.s);
// Слово дня: длинные слова, по ним можно набрать большой улов.
const daily = rows.filter((r) => r.s.length >= 9).map((r) => r.s);

mkdirSync('public', { recursive: true });
mkdirSync('src/data', { recursive: true });
writeFileSync('public/dict.txt', dict.join('\n'));
writeFileSync('src/data/levels.json', JSON.stringify({ journey, daily }));

const ns = rows.map((r) => r.n).sort((a, b) => a - b);
console.log(`словарь: ${dict.length} слов; уровней: ${journey.length}; слов дня: ${daily.length}`);
console.log(`слов на уровень: мин ${ns[0]}, медиана ${ns[ns.length >> 1]}, макс ${ns.at(-1)}`);
if (process.argv[2]) {
  const s = norm(process.argv[2]);
  const c = counts(s);
  console.log(dict.filter((w) => w !== s && canForm(w, c)).join(' '));
}

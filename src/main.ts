import './style.css';
import { newSave, newer, parseSave } from './core/save';
import { loadLocal, pickPlatform } from './platform/platform';
import { App } from './ui/app';
import { startBackdrop } from './ui/backdrop';
import { describeError, diag } from './ui/diag';

async function boot(): Promise<void> {
  const root = document.getElementById('app')!;
  startBackdrop(document.getElementById('bg') as HTMLCanvasElement);
  try {
    window.addEventListener('error', (e) => diag('ошибка', e.message));
    window.addEventListener('unhandledrejection', (e) => diag('ошибка', describeError(e.reason)));
    const platform = await pickPlatform();
    diag('версия', __BUILD__);
    const [dictText, cloud] = await Promise.all([
      fetch('./dict.txt').then((r) => {
        if (!r.ok) throw new Error(`dict ${r.status}`);
        return r.text();
      }),
      // Если площадка не отвечает, через 6 секунд запускаемся с сохранением на устройстве.
      Promise.race([
        platform.init().then(() => platform.load()).catch((e) => (diag('запуск', `ОШИБКА ${describeError(e)}`), null)),
        new Promise<null>((r) => setTimeout(() => r(null), 6000)),
      ]),
    ]);
    const save = newer(parseSave(loadLocal()), parseSave(cloud)) ?? newSave();
    new App(root, platform, dictText.split(/\r?\n/), save);
  } catch (e) {
    console.error(e);
    root.innerHTML = '<p class="boot">Не получилось загрузить игру. Проверь интернет и обнови страницу.</p>';
  }
}

void boot();

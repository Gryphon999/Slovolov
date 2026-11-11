import './style.css';
import { newSave, newer, parseSave } from './core/save';
import { loadLocal, pickPlatform } from './platform/platform';
import { App } from './ui/app';
import { startBackdrop } from './ui/backdrop';

async function boot(): Promise<void> {
  const root = document.getElementById('app')!;
  startBackdrop(document.getElementById('bg') as HTMLCanvasElement);
  try {
    const platform = await pickPlatform();
    const [dictText, cloud] = await Promise.all([
      fetch('./dict.txt').then((r) => {
        if (!r.ok) throw new Error(`dict ${r.status}`);
        return r.text();
      }),
      platform.init().then(() => platform.load()).catch(() => null),
    ]);
    const save = newer(parseSave(loadLocal()), parseSave(cloud)) ?? newSave();
    new App(root, platform, dictText.split('\n'), save);
  } catch (e) {
    console.error(e);
    root.innerHTML = '<p class="boot">Не получилось загрузить игру. Проверь интернет и обнови страницу.</p>';
  }
}

void boot();

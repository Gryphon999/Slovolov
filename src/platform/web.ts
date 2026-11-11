import type { Platform } from './platform';

/** Обычный браузер (GitHub Pages, локальный запуск): без рекламы, шаринг средствами браузера. */
export class WebPlatform implements Platform {
  readonly name = 'web' as const;

  async init(): Promise<void> {}

  async load(): Promise<string | null> {
    return null; // на устройстве сохранение читает сама игра
  }

  async save(): Promise<void> {}

  async showRewarded(): Promise<boolean> {
    return true; // рекламы нет — подсказку отдаём сразу
  }

  async showInterstitial(): Promise<void> {}

  async shareStory(pngDataUrl: string): Promise<boolean> {
    const blob = await (await fetch(pngDataUrl)).blob();
    const file = new File([blob], 'slovolov.png', { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
        return true;
      } catch (e) {
        // Игрок сам закрыл окно — это не ошибка. Иначе отдаём картинку файлом.
        if ((e as Error).name === 'AbortError') return false;
      }
    }
    const a = document.createElement('a');
    a.href = pngDataUrl;
    a.download = 'slovolov.png';
    a.click();
    return true;
  }

  async shareWall(text: string): Promise<boolean> {
    try {
      if (navigator.share) await navigator.share({ text, url: location.href });
      else await navigator.clipboard.writeText(`${text} ${location.href}`);
      return true;
    } catch {
      return false;
    }
  }

  async invite(): Promise<void> {
    await this.shareWall('Давай со мной в «Словолов»: кто больше слов поймает?');
  }

  async leaderboard(): Promise<void> {}

  async addToFavorites(): Promise<void> {}
}

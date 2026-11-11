import { App as CapApp } from '@capacitor/app';
import { registerPlugin } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { describeError, diag } from '../ui/diag';
import type { Platform } from './platform';

interface YandexAdsPlugin {
  showInterstitial(): Promise<{ shown: boolean }>;
  showRewarded(): Promise<{ shown: boolean; rewarded: boolean }>;
}

// Нативный плагин с рекламой Яндекса живёт в android/ (ставится скриптом patch-android.mjs).
const YandexAds = registerPlugin<YandexAdsPlugin>('YandexAds');

const STORE_URL = 'https://www.rustore.ru/catalog/app/ru.gryphon999.slovolov';

/** Приложение для Android (RuStore): реклама Яндекса, системное окно «Поделиться», кнопка «Назад». */
export class AndroidPlatform implements Platform {
  readonly name = 'android' as const;

  async init(): Promise<void> {
    diag('площадка', 'android');
  }

  async load(): Promise<string | null> {
    return null; // прогресс хранится на устройстве, его читает сама игра
  }

  async save(): Promise<void> {}

  async showRewarded(): Promise<boolean> {
    try {
      const res = await YandexAds.showRewarded();
      diag('реклама: ролик', JSON.stringify(res));
      return res.rewarded === true;
    } catch (e) {
      diag('реклама: ролик', `ОШИБКА ${describeError(e)}`);
      return false;
    }
  }

  async showInterstitial(): Promise<void> {
    try {
      diag('реклама: между уровнями', JSON.stringify(await YandexAds.showInterstitial()));
    } catch (e) {
      diag('реклама: между уровнями', `ОШИБКА ${describeError(e)}`);
    }
  }

  async shareStory(pngDataUrl: string): Promise<boolean> {
    try {
      // Системному окну «Поделиться» нужен файл, а не строка: кладём картинку во временную папку.
      const file = await Filesystem.writeFile({
        path: 'slovolov-ulov.png',
        data: pngDataUrl.slice(pngDataUrl.indexOf(',') + 1),
        directory: Directory.Cache,
      });
      await Share.share({ files: [file.uri], text: `Мой улов в «Словолове». А сколько поймаешь ты? ${STORE_URL}` });
      diag('поделиться картинкой', 'ок');
      return true;
    } catch (e) {
      diag('поделиться картинкой', `ОШИБКА ${describeError(e)}`);
      return (e as Error)?.message?.toLowerCase().includes('cancel') ?? false; // закрыл окно — не ошибка
    }
  }

  async shareWall(text: string): Promise<boolean> {
    try {
      await Share.share({ text: `${text} ${STORE_URL}` });
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

  onBack(handler: () => boolean): void {
    void CapApp.addListener('backButton', () => {
      if (!handler()) void CapApp.minimizeApp(); // в меню «Назад» сворачивает игру
    });
  }
}

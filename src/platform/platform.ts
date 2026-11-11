// Всё, что зависит от площадки, спрятано за этим интерфейсом.
// Игра не знает, запущена она во ВКонтакте, в приложении для Android или в обычном браузере.
import { Capacitor } from '@capacitor/core';

export interface Platform {
  readonly name: 'vk' | 'web' | 'android';
  init(): Promise<void>;
  load(): Promise<string | null>;
  save(data: string): Promise<void>;
  /** Ролик за награду. true — досмотрен до конца, награду можно выдать. */
  showRewarded(): Promise<boolean>;
  /** Реклама между уровнями. Никогда не бросает ошибку. */
  showInterstitial(): Promise<void>;
  shareStory(pngDataUrl: string): Promise<boolean>;
  shareWall(text: string): Promise<boolean>;
  invite(): Promise<void>;
  leaderboard(score: number): Promise<void>;
  addToFavorites(): Promise<void>;
  /** Системная кнопка «Назад» (есть только на Android). handler возвращает true, если нажатие обработано. */
  onBack?(handler: () => boolean): void;
}

const LS_KEY = 'slovolov.save';

export function loadLocal(): string | null {
  try {
    return localStorage.getItem(LS_KEY);
  } catch {
    return null;
  }
}

export function saveLocal(data: string): void {
  try {
    localStorage.setItem(LS_KEY, data);
  } catch {
    // приватный режим или переполнение — играем без сохранения на устройстве
  }
}

export async function pickPlatform(): Promise<Platform> {
  if (Capacitor.isNativePlatform()) {
    const { AndroidPlatform } = await import('./android');
    return new AndroidPlatform();
  }
  if (new URLSearchParams(location.search).has('vk_app_id')) {
    const { VkPlatform } = await import('./vk');
    return new VkPlatform();
  }
  const { WebPlatform } = await import('./web');
  return new WebPlatform();
}

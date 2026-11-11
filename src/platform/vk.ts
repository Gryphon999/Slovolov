import bridge from '@vkontakte/vk-bridge';
import { chunk } from '../core/save';
import type { Platform } from './platform';

const KEY_N = 'save_n';
const key = (i: number) => `save_${i}`;

/** ВКонтакте: облачное хранилище, реклама, истории, стена, приглашения, рейтинг друзей. */
export class VkPlatform implements Platform {
  readonly name = 'vk' as const;
  private readonly appId = Number(new URLSearchParams(location.search).get('vk_app_id')) || 0;
  private lastParts = 0;

  async init(): Promise<void> {
    await bridge.send('VKWebAppInit');
  }

  private get appUrl(): string {
    return `https://vk.com/app${this.appId}`;
  }

  async load(): Promise<string | null> {
    try {
      const head = await bridge.send('VKWebAppStorageGet', { keys: [KEY_N] });
      const n = Number(head.keys[0]?.value) || 0;
      if (n === 0) return null;
      this.lastParts = n;
      const keys = Array.from({ length: n }, (_, i) => key(i));
      const res = await bridge.send('VKWebAppStorageGet', { keys });
      const byKey = new Map(res.keys.map((k) => [k.key, k.value]));
      return keys.map((k) => byKey.get(k) ?? '').join('');
    } catch {
      return null;
    }
  }

  async save(data: string): Promise<void> {
    try {
      const parts = chunk(data);
      for (let i = 0; i < parts.length; i++) {
        await bridge.send('VKWebAppStorageSet', { key: key(i), value: parts[i] });
      }
      // Счётчик частей пишем последним: пока он старый, читается целое старое сохранение.
      await bridge.send('VKWebAppStorageSet', { key: KEY_N, value: String(parts.length) });
      for (let i = parts.length; i < this.lastParts; i++) {
        await bridge.send('VKWebAppStorageSet', { key: key(i), value: '' });
      }
      this.lastParts = parts.length;
    } catch {
      // нет сети — останется копия на устройстве
    }
  }

  private async showAd(format: 'reward' | 'interstitial'): Promise<boolean> {
    try {
      const res = await bridge.send('VKWebAppShowNativeAds', { ad_format: format as never });
      return res.result === true;
    } catch {
      return false; // закрыл ролик или рекламы нет — награду не даём
    }
  }

  showRewarded(): Promise<boolean> {
    return this.showAd('reward');
  }

  async showInterstitial(): Promise<void> {
    await this.showAd('interstitial');
  }

  async shareStory(pngDataUrl: string): Promise<boolean> {
    try {
      await bridge.send('VKWebAppShowStoryBox', {
        background_type: 'image',
        blob: pngDataUrl,
        attachment: { text: 'go_to', type: 'url', url: this.appUrl },
      });
      return true;
    } catch {
      return false;
    }
  }

  async shareWall(text: string): Promise<boolean> {
    try {
      await bridge.send('VKWebAppShowWallPostBox', { message: text, attachments: this.appUrl });
      return true;
    } catch {
      return false;
    }
  }

  async invite(): Promise<void> {
    try {
      await bridge.send('VKWebAppShowInviteBox');
    } catch {
      // игрок закрыл окно
    }
  }

  async leaderboard(score: number): Promise<void> {
    try {
      await bridge.send('VKWebAppShowLeaderBoardBox', { user_result: score });
    } catch {
      // окно закрыто
    }
  }

  async addToFavorites(): Promise<void> {
    try {
      await bridge.send('VKWebAppAddToFavorites');
    } catch {
      // отказался — больше не спрашиваем
    }
  }
}

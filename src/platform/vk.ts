import bridge from '@vkontakte/vk-bridge';
import { chunk } from '../core/save';
import { describeError, diag } from '../ui/diag';
import type { Platform } from './platform';

const KEY_N = 'save_n';
const key = (i: number) => `save_${i}`;

/** ВКонтакте: облачное хранилище, реклама, истории, стена, приглашения, рейтинг друзей. */
export class VkPlatform implements Platform {
  readonly name = 'vk' as const;
  private readonly appId = Number(new URLSearchParams(location.search).get('vk_app_id')) || 0;
  private lastParts = 0;

  async init(): Promise<void> {
    diag('площадка', `vk, приложение ${this.appId}, ${new URLSearchParams(location.search).get('vk_platform') ?? '?'}`);
    await bridge.send('VKWebAppInit');
    diag('запуск', 'VKWebAppInit ок');
  }

  private get appUrl(): string {
    return `https://vk.com/app${this.appId}`;
  }

  async load(): Promise<string | null> {
    try {
      const head = await bridge.send('VKWebAppStorageGet', { keys: [KEY_N] });
      const n = Number(head.keys[0]?.value) || 0;
      if (n === 0) {
        diag('облако: чтение', 'пусто (новый игрок)');
        return null;
      }
      this.lastParts = n;
      const keys = Array.from({ length: n }, (_, i) => key(i));
      const res = await bridge.send('VKWebAppStorageGet', { keys });
      const byKey = new Map(res.keys.map((k) => [k.key, k.value]));
      const data = keys.map((k) => byKey.get(k) ?? '').join('');
      diag('облако: чтение', `ок, частей ${n}, символов ${data.length}`);
      return data;
    } catch (e) {
      diag('облако: чтение', `ОШИБКА ${describeError(e)}`);
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
      diag('облако: запись', `ок, частей ${parts.length}`);
    } catch (e) {
      diag('облако: запись', `ОШИБКА ${describeError(e)}`); // останется копия на устройстве
    }
  }

  private async showAd(format: 'reward' | 'interstitial'): Promise<boolean> {
    try {
      const res = await bridge.send('VKWebAppShowNativeAds', { ad_format: format as never });
      diag(`реклама: ${format}`, `result=${res.result}`);
      return res.result === true;
    } catch (e) {
      diag(`реклама: ${format}`, `ОШИБКА ${describeError(e)}`);
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
      diag('история', 'ок');
      return true;
    } catch (e) {
      diag('история', `ОШИБКА ${describeError(e)}`);
      return false;
    }
  }

  async shareWall(text: string): Promise<boolean> {
    try {
      await bridge.send('VKWebAppShowWallPostBox', { message: text, attachments: this.appUrl });
      diag('стена', 'ок');
      return true;
    } catch (e) {
      diag('стена', `ОШИБКА ${describeError(e)}`);
      return false;
    }
  }

  async invite(): Promise<void> {
    try {
      await bridge.send('VKWebAppShowInviteBox');
      diag('приглашение', 'ок');
    } catch (e) {
      diag('приглашение', `ОШИБКА ${describeError(e)}`);
    }
  }

  async leaderboard(score: number): Promise<void> {
    try {
      await bridge.send('VKWebAppShowLeaderBoardBox', { user_result: score });
      diag('рейтинг', `ок, очки ${score}`);
    } catch (e) {
      diag('рейтинг', `ОШИБКА ${describeError(e)}`);
    }
  }

  async addToFavorites(): Promise<void> {
    try {
      await bridge.send('VKWebAppAddToFavorites');
      diag('избранное', 'ок');
    } catch (e) {
      diag('избранное', `ОШИБКА ${describeError(e)}`);
    }
  }
}

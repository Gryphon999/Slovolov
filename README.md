# Словолов

Игра в слова для ВКонтакте: лови слова из букв одного слова.

- **Слово дня.** Одно слово на всех игроков, 3 минуты, одна попытка. Результат можно отправить в историю, на стену и сравнить с друзьями.
- **Путешествие.** 156 уровней без таймера, три звезды на каждом.
- Подсказки: выдаются за звёзды, за слово дня и за просмотр ролика.

## Запуск

```
npm install
npm run dev        # разработка
npm run build      # словарь + проверка типов + сборка в dist/
npm run preview    # готовая сборка на http://127.0.0.1:4180
npm test           # тесты ядра
node scripts/shots.mjs   # сквозной прогон игры в невидимом Chrome (нужен запущенный preview)
node scripts/store.mjs   # картинки для витрины ВК в docs/store/vk
```

## Как устроено

- `src/core/` — правила игры без DOM и без площадки: слова, раунд, слово дня, сохранение. Покрыто тестами.
- `src/platform/` — всё, что зависит от площадки. `vk.ts` работает через VK Bridge (хранилище, реклама, истории, стена, приглашения, рейтинг), `web.ts` — запасной вариант для обычного браузера. Площадка определяется по параметру `vk_app_id` в адресе.
- `src/ui/` — экраны на обычном DOM (без игрового движка: текст чёткий на любом экране).
- `scripts/build-dict.mjs` — собирает `public/dict.txt` и список уровней из `data/`.

Подробности решений: [docs/design.md](docs/design.md).

## Словарь

Список существительных взят из проекта [Harrix/Russian-Nouns](https://github.com/Harrix/Russian-Nouns) (лицензия MIT, © Sergienko Anton). Из него убраны грубые слова, буква «ё» заменена на «е».

## Android (RuStore)

Игра упакована в приложение через Capacitor, пакет `ru.gryphon999.slovolov`. Реклама: Yandex Mobile Ads (ролик за подсказки и реклама между уровнями).

```
npm run build
npx cap sync android
node C:/Users/user/android-keys/patch-android.mjs . ru.gryphon999.slovolov <код версии> <версия> portrait
node scripts/android-theme.mjs
cd android && gradlew assembleRelease bundleRelease
```

Нужны `ANDROID_HOME` и `JAVA_HOME` (JDK 21). Ключ подписи лежит вне репозитория, в `C:/Users/user/android-keys`. Рекламные блоки задаются в `android/app/src/main/res/values/ads.xml`; пока там демо-блоки Яндекса. Каждое обновление в магазине требует увеличить код версии.

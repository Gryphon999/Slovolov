// Красит системные полоски Android в цвета игры: сверху тёмно-синий, снизу бирюзовый,
// как края игрового фона. Запускать после patch-android.mjs (см. README, раздел «Android»).
import { readFileSync, writeFileSync } from 'node:fs';

const res = 'android/app/src/main/res/values';
writeFileSync(`${res}/game_colors.xml`, `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="gameTop">#0e3b5c</color>
    <color name="gameBottom">#12a3a0</color>
</resources>
`);

const file = `${res}/styles.xml`;
let s = readFileSync(file, 'utf8');
if (!s.includes('gameTop')) {
  s = s.replace(
    '<item name="android:background">@null</item>',
    `<item name="android:background">@null</item>
        <item name="android:windowBackground">@color/gameTop</item>
        <item name="android:statusBarColor">@color/gameTop</item>
        <item name="android:navigationBarColor">@color/gameBottom</item>
        <item name="android:windowLightStatusBar">false</item>`,
  );
  writeFileSync(file, s);
}
console.log('тема Android обновлена');

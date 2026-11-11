import { defineConfig } from 'vite';

// base './' — игра работает и на GitHub Pages в подпапке, и в iframe ВК.
export default defineConfig({
  base: './',
  build: { target: 'es2020' },
  // Метка сборки видна в диагностике: так понятно, какая версия открылась во ВК.
  define: { __BUILD__: JSON.stringify(new Date().toISOString().slice(0, 16).replace('T', ' ')) },
});

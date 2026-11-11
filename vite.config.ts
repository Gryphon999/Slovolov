import { defineConfig } from 'vite';

// base './' — игра работает и на GitHub Pages в подпапке, и в iframe ВК.
export default defineConfig({ base: './', build: { target: 'es2020' } });

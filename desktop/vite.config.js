import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'

// Десктопное приложение: обычный сайт, без service worker — оно нужно только дома за компьютером.
export default defineConfig({
  plugins: [vue()],
  base: './',
  resolve: {
    alias: { '@shared': fileURLToPath(new URL('../shared', import.meta.url)) },
  },
  server: { port: 5174 },
  build: {
    outDir: '../dist/desktop',
    emptyOutDir: true,
  },
})

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [
    vue(),
    // PWA: манифест (для установки на главный экран) + service worker (для работы без интернета).
    // Service worker при первом открытии сохраняет все файлы приложения в кэш телефона,
    // и дальше приложение открывается из кэша, даже без сети.
    VitePWA({
      // Новая версия скачивается в фоне и включается при следующем открытии приложения.
      // Данные при этом не теряются — они лежат в IndexedDB, а не в кэше.
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Тренировки',
        short_name: 'Тренировки',
        description: 'Дневник силовых тренировок, работает без интернета',
        lang: 'ru',
        // Относительные пути — приложение работает и из подпапки на GitHub Pages.
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#030e22',
        background_color: '#d4d8df',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          // maskable — Android может обрезать иконку под форму своей темы (круг, капля…).
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Какие файлы сборки положить в кэш для офлайна.
        globPatterns: ['**/*.{js,css,html,svg,png}'],
      },
    }),
  ],
  // Относительные пути: собранное приложение работает из любой папки (в т.ч. на GitHub Pages).
  base: './',
  resolve: {
    // import { ... } from '@shared/csv.js' — общий код из папки shared/
    alias: { '@shared': fileURLToPath(new URL('../shared', import.meta.url)) },
  },
  server: {
    // Доступ с телефона по Wi-Fi: http://<ip-компьютера>:5173
    host: true,
  },
  build: {
    outDir: '../dist/mobile',
    emptyOutDir: true,
  },
})

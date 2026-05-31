import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate', // Aplikacja zaktualizuje się sama w tle, gdy wydasz nową wersję
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      
      // Definicja tego, co Service Worker ma zapisać w pamięci telefonu (PWA offline)
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      },

      // Manifest - mówi systemom iOS i Android, że to jest "prawdziwa" aplikacja
      manifest: {
        name: 'Aplikacja Treningowa',
        short_name: 'Treningi',
        description: 'Twój osobisty asystent treningowy działający offline.',
        theme_color: '#121212', // Kolor paska powiadomień na telefonie (dopasowany do Twojego dark mode)
        background_color: '#121212', // Kolor tła podczas ładowania aplikacji
        display: 'standalone', // Najważniejsze: ukrywa pasek URL przeglądarki (pełny ekran)
        orientation: 'portrait', // Wymusza widok pionowy
        icons: [
          // Tu w przyszłości podepniemy wygenerowane ikony z Twoim logo
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ]
});
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        
        // NOWOŚĆ: Uczymy apkę zapisywać zdjęcia z internetu do pamięci offline!
        runtimeCaching: [
          {
            // Ten kod wyłapie WSZYSTKIE pliki graficzne oraz pliki z serwerów Firebase
            urlPattern: ({ url }) => {
              return url.origin.includes('firebasestorage.googleapis.com') || 
                     url.pathname.match(/\.(jpeg|jpg|png|gif|svg|webp)$/i);
            },
            handler: 'CacheFirst', // Strategia: Najpierw szukaj w pamięci offline
            options: {
              cacheName: 'exercises-images-cache',
              expiration: {
                maxEntries: 200, // Zapamiętaj maksymalnie 200 zdjęć
                maxAgeSeconds: 60 * 60 * 24 * 30 // Trzymaj je w pamięci przez 30 dni
              },
              cacheableResponse: {
                statuses: [0, 200] // Wymagane dla żądań z innych serwerów (CORS)
              }
            }
          }
        ]
      },

      manifest: {
        name: 'Aplikacja Treningowa',
        short_name: 'Treningi',
        description: 'Twój osobisty asystent treningowy działający offline.',
        theme_color: '#121212',
        background_color: '#121212',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
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
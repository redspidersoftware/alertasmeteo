import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Use custom service worker that adds push notification support
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      // Solo la app-shell: las imágenes (WebP/PNG) se sirven con HTTP cache
      includeAssets: ['icons/*.png'],
      manifest: {
        name: 'MeteoAlerta - Avisos Meteorológicos',
        short_name: 'MeteoAlerta',
        description: 'Alertas meteorológicas en tiempo real de AEMET. Consulta avisos de lluvia, viento, nieve y tormentas con mapa interactivo.',
        theme_color: '#003f87',
        background_color: '#003f87',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        lang: 'es',
        categories: ['weather', 'utilities'],
        icons: [
          {
            src: '/icons/icon-72x72.png',
            sizes: '72x72',
            type: 'image/png',
          },
          {
            src: '/icons/icon-96x96.png',
            sizes: '96x96',
            type: 'image/png',
          },
          {
            src: '/icons/icon-128x128.png',
            sizes: '128x128',
            type: 'image/png',
          },
          {
            src: '/icons/icon-144x144.png',
            sizes: '144x144',
            type: 'image/png',
          },
          {
            src: '/icons/icon-152x152.png',
            sizes: '152x152',
            type: 'image/png',
          },
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/icons/icon-384x384.png',
            sizes: '384x384',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      injectManifest: {
        // App-shell: JS/CSS/HTML + el icono que usa la notificación push.
        // Las imágenes grandes (WebP, banner, resto de iconos) se sirven con cache HTTP.
        globPatterns: ['**/*.{js,css,html,ico,svg,woff2}', 'icons/icon-192x192.png'],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        // Vendor separado: cambia menos veces que la app → mejor caché
        manualChunks(id: string) {
          if (id.includes('node_modules/react-dom/') || id.includes('node_modules/react/') || id.includes('node_modules/scheduler/')) {
            return 'react-vendor';
          }
          if (id.includes('node_modules/framer-motion/')) return 'motion';
          if (id.includes('node_modules/@supabase/')) return 'supabase';
          if (id.includes('node_modules/lucide-react/')) return 'icons';
          return undefined;
        },
      },
    },
  },
})

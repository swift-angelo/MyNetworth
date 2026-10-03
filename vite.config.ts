import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  define: { __BUILD_TIME__: JSON.stringify(new Date().toISOString()) },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false, // registered manually in main.tsx so it can re-check for updates
      includeAssets: ['logos/*.png'],
      workbox: { globPatterns: ['**/*.{js,css,html}', 'logos/*.png', 'icon-*.png', 'apple-touch-icon.png'] },
      manifest: {
        name: 'WealthRadar',
        short_name: 'WealthRadar',
        description: 'Track how much money you put into each bank and wallet.',
        theme_color: '#e9fee7',
        background_color: '#e9fee7',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        ],
      },
    }),
  ],
  server: { host: true },
  test: { environment: 'node' },
})

import fs from 'fs'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'

// Locally-trusted cert (see mkcert.exe) — plain HTTP over a LAN IP isn't a
// "secure context", so browsers won't register a service worker or offer a
// real install, only a browser-tab shortcut. HTTPS fixes that.
const httpsConfig = fs.existsSync('./cert.pem')
  ? { cert: fs.readFileSync('./cert.pem'), key: fs.readFileSync('./key.pem') }
  : undefined

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: { enabled: true },
      includeAssets: ['icon-192.png', 'icon-512.png', 'icon-maskable-192.png', 'icon-maskable-512.png'],
      workbox: {
        // Precache everything the app needs so it keeps working with no
        // network/server reachable at all once it's been opened once.
        globPatterns: ['**/*.{js,css,html,png,svg,ico,woff,woff2}'],
      },
      manifest: {
        name: 'Ledger — Weight & TDEE',
        short_name: 'Ledger',
        description: 'Minimal daily weight log with an adaptive TDEE calculator.',
        theme_color: '#0a0a0a',
        background_color: '#0a0a0a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    https: httpsConfig,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    https: httpsConfig,
  },
})

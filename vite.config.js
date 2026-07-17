import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync } from 'node:fs'
import { resolve } from 'node:path'
import path from 'node:path'

// Copia index.html como 404.html para que GitHub Pages sirva la SPA en rutas profundas
const spa404 = () => ({
  name: 'spa-404-fallback',
  closeBundle() {
    try {
      copyFileSync(resolve(__dirname, 'dist/index.html'), resolve(__dirname, 'dist/404.html'))
    } catch { /* dist aún no existe en dev */ }
  },
})

// https://vitejs.dev/config/
// base por defecto '/' (dominio raíz: crearttech.com).
// Para GitHub Pages usar: npm run build:gh (vite build --base=/WEBCREART.TECH/)
export default defineConfig(() => {
  return {
    plugins: [react(), spa404()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    esbuild: {
      drop: ['console', 'debugger'],
    },
    build: {
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        output: {
          manualChunks: {
            three: ['three', '@react-three/fiber', '@react-three/drei'],
            react: ['react', 'react-dom', 'react-router-dom'],
            firebase: ['firebase/app', 'firebase/firestore'],
            anim: ['gsap', 'framer-motion', '@studio-freight/lenis'],
          },
        },
      },
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:4000',
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})
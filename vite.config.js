import { copyFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages non conosce le rotte dell'app (es. /admin): serve 404.html, che quindi è una copia di index.html
const spaFallback = {
  name: 'spa-404-fallback',
  closeBundle() {
    copyFileSync('dist/index.html', 'dist/404.html')
  },
}

export default defineConfig({
  // Su GitHub Pages il sito vive in /<nome-repository>/: lo imposta il workflow di deploy
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), spaFallback],
})

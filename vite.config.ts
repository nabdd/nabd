import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  // The Nest API runs on :4000 in development. Proxying keeps the browser on one origin (no CORS setup).
  server: { proxy: { '/api': { target: 'http://127.0.0.1:4000', changeOrigin: false } } },
})

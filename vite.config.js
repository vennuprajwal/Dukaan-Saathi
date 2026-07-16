import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173, // Force port 5173 to match Google OAuth config
    open: true,
    proxy: {
      '/api': 'http://localhost:3001',
      '/webhooks': 'http://localhost:3001',
    },
  },
})

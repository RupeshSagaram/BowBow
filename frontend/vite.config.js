import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    css: false,
    env: {
      VITE_API_URL: 'http://localhost:8080',
      VITE_CLERK_PUBLISHABLE_KEY: 'pk_test_placeholder',
    },
  },
})

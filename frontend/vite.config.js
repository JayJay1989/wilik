import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // 127.0.0.1, not localhost: on Windows, "localhost" can add a ~200ms
      // IPv6-then-IPv4 fallback delay per request since Flask's dev server
      // only listens on IPv4
      '/api': 'http://127.0.0.1:5000',
    },
  },
})

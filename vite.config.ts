import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    host: '0.0.0.0',
    port: 4317,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4318',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://127.0.0.1:4318',
        changeOrigin: true,
      },
    },
  },
  plugins: [tanstackStart(), viteReact(), tailwindcss()],
})

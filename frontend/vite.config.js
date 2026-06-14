import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    host: '0.0.0.0',
    port: 5184,
    proxy: {
      '/api': {
        target: 'http://localhost:3084',
        changeOrigin: true
      }
    }
  }
})

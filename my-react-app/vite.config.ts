import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'leaflet-vendor': ['leaflet', 'react-leaflet'],
          'chart-vendor': ['recharts'],
        },
      },
    },
  },
  // CORS 문제 해결을 위한 프록시 설정 (개발 환경)
  // 프로덕션에서는 API 서버가 CORS를 허용해야 함
})

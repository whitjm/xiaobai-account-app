import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite 配置:只处理前端 React 代码，不处理 electron 目录
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          // React 核心库独立打包
          'vendor-react': ['react', 'react-dom'],
          // 图表库独立打包（体积大）
          'vendor-charts': ['recharts'],
          // 日期处理库独立打包
          'vendor-date': ['date-fns'],
          // SQLite 库独立打包
          'vendor-sqlite': ['sql.js'],
          // React DatePicker 独立打包（包含大量 CSS）
          'vendor-datepicker': ['react-datepicker'],
        },
      },
    },
  },
});

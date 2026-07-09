import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite 配置:驱动 React 开发。base 用相对路径,方便后续 Electron 打包后加载本地文件。
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
  },
})

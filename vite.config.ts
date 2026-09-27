import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // 相对路径，构建产物可部署到任意子路径（如 GitHub Pages 的 /<仓库名>/）
  base: './',
  plugins: [vue()],
})

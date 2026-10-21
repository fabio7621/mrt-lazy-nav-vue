import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  // 相對路徑：build 出來的 dist 可以直接放到 GitHub Pages 子路徑
  base: './',
  test: {
    environment: 'jsdom',
    include: ['src/**/*.spec.js'],
    setupFiles: ['src/__tests__/setup.js'],
    coverage: {
      include: ['src/**/*.{js,vue}'],
      exclude: ['src/main.js', 'src/**/*.spec.js', 'src/__tests__/**'],
    },
  },
})

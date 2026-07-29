import { defineConfig } from 'vite'
import { SITE_URL } from './site.config.js'

export default defineConfig({
  plugins: [{
    name: 'site-url',
    transformIndexHtml(html) {
      return html.replaceAll('{{SITE_URL}}', SITE_URL)
    }
  }],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    open: false
  },
  build: {
    outDir: 'dist',
    // 资源优化
    assetsInlineLimit: 4096, // 小于 4kb 的资源内联为 base64
    cssCodeSplit: true, // CSS 代码分割
    // 压缩优化
    minify: 'esbuild',
    target: 'es2015',
    // Chunk 分割策略
    rollupOptions: {
      output: {
        manualChunks: {
          // 将第三方库分离（如果将来添加）
          // vendor: ['some-library']
        },
        // 资源文件命名
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    // 报告压缩后的大小
    reportCompressedSize: true,
    // 启用 sourcemap（可选，生产环境可关闭）
    sourcemap: false
  }
})

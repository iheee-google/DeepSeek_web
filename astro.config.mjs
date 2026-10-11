// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

/**
 * 静态输出部署 Cloudflare Pages（见 docs/CI.md 框架判定）。
 * 依赖方向：Types → Config → Repo → Service → Runtime → UI（Harness §5）。
 */
export default defineConfig({
  site: 'https://hechufu.pages.dev',
  output: 'static',
  trailingSlash: 'ignore',
  build: {
    // 内容页零客户端 JS：只有显式使用 client:* 指令的 island 才会带脚本
    inlineStylesheets: 'auto',
  },
  integrations: [react()],
  vite: {
    build: {
      // 首屏影像体积可控：超过阈值的资源单独成文件，避免阻塞关键 CSS
      assetsInlineLimit: 2048,
    },
  },
});

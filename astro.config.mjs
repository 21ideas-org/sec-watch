// @ts-check
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://sec.21ideas.org',
  base: '/',
  integrations: [sitemap()],
  // Никаких rehype-плагинов и подсветки кода: тексты пишет гейт, а не человек,
  // и каждый шаг разбора здесь — это секунды в окне между PUT и живой страницей.
});

// @ts-check
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://sec.21ideas.org',
  base: '/',
  integrations: [sitemap()],
  // Не добавлять rehype-плагины и подсветку в critical path: approved target пишет
  // content create-only из sec-watcher-bot, а короткая сборка сужает окно custom 404.
});

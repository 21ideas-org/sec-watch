# sec-web

Сайт [sec.21ideas.org](https://sec.21ideas.org) — критические security-оповещения
для биткоинеров. Сейчас контент ведётся в репозитории; автоматическая доставка из
[`sec-watcher-bot`](https://github.com/21ideas-org/sec-watcher-bot) через Contents API
ещё не реализована. После каждого push в `main` Actions собирают и деплоят сайт на
GitHub Pages.

Astro без фреймворков, статика.

```
npm install
npm run dev
```

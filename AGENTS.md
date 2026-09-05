# AGENTS.md

`sec-web` — публичный статический сайт `sec.21ideas.org`. Сейчас content поддерживается
в repository; автоматическая доставка из
[`sec-watcher-bot`](https://github.com/21ideas-org/sec-watcher-bot) через Contents API
ещё не реализована. Approved target: сайт хранит канонический текст и permalink,
Telegram уведомляет со ссылкой на него.

Implementation work приходит только из central tracker
[`21ideas-org/sec-watcher-bot`](https://github.com/21ideas-org/sec-watcher-bot/issues).
Issue обязан содержать применимые решения website delivery plan; не достраивать target
по комментариям вне текущего issue или произвольному описанию.

## Safety contract

- Content schema проверяет обязательную форму и оставляет status-словари открытыми:
  неизвестное значение free-string поля отрисовывается neutral. Неверная форма должна
  останавливать check/build; schema errors не проглатывать.
- В bot-generated incident content `reason`, raw model links и URL без cross-check не
  публикуются: ссылки приходят только из validated `links[]`, hijack banner строится
  кодом из trusted `vendor`. Human-maintained archive отдельно использует доверенный
  `sourceUrl`; не переносить этот путь в автоматическую доставку.
- Slug равен basename Markdown file. Папка не входит в route. Никогда не переименовывать
  опубликованный basename/permalink.
- Incident filename: `<product>-<YYYY-MM-DD>-<short>.md`; date — UTC frozen logical
  publication time, известное до GitHub/Telegram network calls. Archive сохраняет свой
  `<YYYY-MM-DD>-<name>` naming.
- `parent` у update равен root slug. Orphan должен остаться видимой самостоятельной
  страницей, а не уронить build.
- `external: true` одновременно отключает собственную incident page и RSS, исключает
  запись из counter и направляет link на `sourceUrl`. Не разъединять эти следствия.
- Counter считает от первого post последнего thread; current status/statistics берут
  последний post thread.

## Current schema и approved target

- Current schema/UI используют legacy free-string `urgency[]` и `audience[]`; content
  в repository должен продолжать собираться без изменения URLs.
- Bot уже классифицирует четырьмя независимыми осями: `exploitationStatus`, `fixStatus`,
  `updateSufficiency`, `actionTiming`. Approved site slice добавляет их как optional
  free strings и выводит `urgency[]` только как deterministic compatibility layer.
- Не схлопывать оси обратно: exploitation может сосуществовать с available fix, а fix
  может быть недостаточен для уже затронутого пользователя.
- `telegramUrl` optional и reserved. Первый create-only slice не перезаписывает Markdown
  после Telegram delivery.
- Website create идёт перед Telegram, но bot не ждёт workflow, Pages, DNS или HTTP 200.
  Custom 404 честно покрывает build window.
- В approved target live и `--dry-run` bot publications одинаково пишут канонический
  public incident content в `sec-web/main` для `https://sec.21ideas.org`. Runtime mode
  меняет только парный Telegram target (`channel` или `dry_channel`) и не выбирает
  другой website, staging или mode-specific content. PAT, live seed/state,
  Pages/DNS/settings и deploy — human rollout, не agent implementation.

## Не менять автономно

- Schema/routes/thread/RSS/OG/status UI — только по scoped issue и с fixture/tests,
  затем `npm run check` и `npm run build`.
- `.github/workflows/*`, Pages settings, custom domain и DNS — deployment boundary;
  workflow files правятся только отдельным явно разрешённым issue.
- Existing `src/content/**/*.md` URLs/frontmatter не переписывать массово.
- Donation addresses намеренно публичны; они живут только в `src/consts.ts` и
  показываются только на `/support`. Не дублировать их в alert content.

## Rendering invariants

- Unknown urgency stays `.u-neutral`; missing/unknown status is never green by default.
- OG images are static assets selected by code. Не добавлять per-incident generation в
  deploy critical path.
- Dates форматируются в UTC, независимо от timezone builder.
- Command-line flags в prose не переносятся по внутреннему hyphen (`keepFlags`).
- Link preview/third-party assets не добавляются в critical alert path.

## Команды

| Команда | Назначение |
| --- | --- |
| `npm run check` | Astro/TypeScript validation; обязательно для PR |
| `npm run build` | production build; обязательно для PR |
| `npm run dev` | локальный development server |
| `npm run og` | ручная пересборка static OG assets |

Не запускать deploy и не менять repository settings из coding session. Commit/PR —
короткие, без AI attribution и `Co-Authored-By`.

## Visual system

- Dark tokens — base; light theme overrides tokens. Explicit choice sets `data-theme`,
  otherwise use `prefers-color-scheme`.
- Background is a fixed time scale; spacing follows `--step`. Do not replace it with a
  scrolling decorative grid.
- `.panel` is opaque with a hard shadow. List rows use translucent fill, not separator
  rules over the grid.
- Urgency colors encode only alert state; links use a separate signal color. Card accent
  is an inset `::before`, not `border-left`.
- JetBrains Mono is for instrument UI; IBM Plex Sans is for prose. Fonts stay local in
  `public/fonts`.
- Keep three size tiers (11px service text, 15px navigation, 18px section headings) and
  one `.sec-h` treatment for peer section headings.

import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/**
 * ⚠️ Схема проверяет ФОРМУ и НЕ проверяет СЛОВАРЬ.
 *
 * Сейчас content поддерживается в repository; согласованный target — create-only files
 * от `sec-watcher-bot`. Упавшая сборка останавливает ВЕСЬ сайт, а не один плохой пост,
 * поэтому
 * `urgency`, `audience` и `vendor` — свободные строки: неизвестное значение
 * отрисуется нейтрально (см. `urgencyClass`), а расхождение контракта поймает
 * глаз в ленте, а не 404 на всём домене.
 */
const incidents = defineCollection({
  loader: glob({
    pattern: '**/*.md',
    base: './src/content',
    // Папка (`incidents/` или `archive/`) — способ хранения, а НЕ часть адреса.
    // Без этого slug выходит `incidents/cln-...`, и постоянная ссылка становится
    // /incidents/incidents/cln-... — а её потом уже не переименовать: она уехала
    // в канал. Slug = имя файла, и только оно.
    generateId: ({ entry }) => entry.replace(/^.*\//, '').replace(/\.md$/, ''),
  }),
  schema: z.object({
    title: z.string().min(1),
    description: z.string().default(''),
    pubDate: z.coerce.date(),

    /**
     * ⚠️ Legacy compatibility list, не каноническая классификация. Бот уже хранит
     * четыре независимые status-оси; согласованный site slice добавит их отдельными
     * optional free-string fields, а `urgency[]` будет выводить детерминированно.
     */
    urgency: z.array(z.string()).default([]),
    audience: z.array(z.string()).default([]),

    product: z.string().optional(),
    vendor: z.string().optional(),
    action: z.string().optional(),

    /**
     * Ссылки приходят из вердикта ПОСЛЕ позиционной сверки. Модель не выдаёт
     * URL никогда — сайт лишь показывает то, что уже сверено кодом.
     */
    links: z
      .array(z.object({ label: z.string(), url: z.url() }))
      .default([]),

    /** CVE / GHSA / fingerprint — по нему бот склеивает тред. */
    incidentKey: z.string().optional(),
    /** Заполняется у апдейта треда: slug первого поста. */
    parent: z.string().optional(),
    /** Reserved: первый create-only delivery slice не перезаписывает файл после Telegram. */
    telegramUrl: z.url().optional(),

    /**
     * Историческая хроника. Три следствия одного флага: своей страницы нет,
     * ссылка ведёт на первоисточник, в RSS не попадает и счётчик не обнуляет.
     * Иначе раскрытие 2014 года однажды уедет подписчикам как свежее оповещение.
     */
    external: z.boolean().default(false),
    source: z.string().optional(),
    sourceUrl: z.url().optional(),

    draft: z.boolean().default(false),
  }),
});

export const collections = { incidents };

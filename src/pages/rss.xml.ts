import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { SITE_DESCRIPTION, SITE_NAME } from '../consts.ts';
import { allIncidents, own } from '../lib.ts';

/**
 * Полнотекстовый фид: аудитория операторов нод читает ридерами.
 *
 * ⚠️ Хроника сюда не попадает НИКОГДА (`own` отсекает `external`). Ридер
 * забирает элемент один раз — иначе раскрытие 2014 года уедет подписчикам
 * как свежее оповещение.
 */
export async function GET(context: APIContext) {
  const posts = own(await allIncidents());
  return rss({
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    site: context.site!,
    items: posts.map((e) => ({
      title: e.data.title,
      description: e.data.description,
      pubDate: e.data.pubDate,
      link: `/incidents/${e.id}/`,
      content: e.body ?? e.data.description,
      categories: [...e.data.urgency, ...e.data.audience],
    })),
    customData: '<language>ru</language>',
  });
}

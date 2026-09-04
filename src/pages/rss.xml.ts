import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { SITE_DESCRIPTION, SITE_NAME } from '../consts.ts';
import { allIncidents, own, type Incident } from '../lib.ts';
import { displayUrgency } from '../status.ts';

const esc = (t: string) =>
  t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Тело элемента фида.
 *
 * ⚠️ Собирается из полей, а не берётся из `body`. Пост канала целиком укладывается
 * во фронтматтер (заголовок, описание, «что делать», ссылки), и тело у такого файла
 * пустое — а пустая строка мимо `??` проходит, то есть полнотекстовый фид уезжал бы
 * подписчику с пустыми элементами. Вылезло на бэкфиле 30.08.2026, где пустых тел
 * оказалось десять из десяти.
 *
 * ⚠️ «Что делать» входит в тело намеренно: ридер показывает элемент целиком и никуда
 * не докликивает, а это единственная строка поста, ради которой он написан.
 */
function itemContent(e: Incident): string {
  return [
    e.data.hijacked &&
      `<p><strong>Похоже, официальный аккаунт ${esc(e.data.vendor ?? 'вендора')} угнан.</strong><br>` +
        'Не переходите по ссылкам из его постов и никуда не вводите seed.</p>',
    e.data.description && `<p>${esc(e.data.description)}</p>`,
    e.data.action && `<p><strong>Что делать:</strong> ${esc(e.data.action)}</p>`,
    e.body?.trim(),
  ]
    .filter(Boolean)
    .join('\n');
}

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
      content: itemContent(e),
      categories: [...displayUrgency(e.data), ...e.data.audience],
    })),
    customData: '<language>ru</language>',
  });
}

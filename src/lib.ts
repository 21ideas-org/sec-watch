import { getCollection, type CollectionEntry } from 'astro:content';

export type Incident = CollectionEntry<'incidents'>;

const live = (e: Incident) => !e.data.draft;
const byDateDesc = (a: Incident, b: Incident) =>
  b.data.pubDate.valueOf() - a.data.pubDate.valueOf();

export async function allIncidents(): Promise<Incident[]> {
  return (await getCollection('incidents')).filter(live).sort(byDateDesc);
}

/** Публикации бота: то, что имеет собственную страницу и уезжает в RSS. */
export const own = (list: Incident[]) => list.filter((e) => !e.data.external);
/** Хроника, которая ведётся руками. */
export const archive = (list: Incident[]) => list.filter((e) => e.data.external);
/** Начала тредов: апдейт (`parent`) новым инцидентом не считается. */
export const threadStarts = (list: Incident[]) => own(list).filter((e) => !e.data.parent);

/**
 * Точка отсчёта счётчика.
 *
 * ⚠️ Считаем от НАЧАЛА последнего треда, а не от последнего поста. Инцидент
 * происходит один раз; апдейты («вышел патч», «уводите узел в офлайн», «всё
 * оказалось хуже») — это тот же инцидент, и двигать ими отсчёт значит держать
 * счётчик примёрзшим к нулю ещё неделю после того, как всё кончилось.
 * Хроника не участвует: она датирована 2013 годом и обнулять ей нечего.
 */
export function counterAnchor(list: Incident[]): Date | null {
  const starts = threadStarts(list);
  return starts.length ? starts[0]!.data.pubDate : null;
}

export function stats(list: Incident[]) {
  const yearAgo = Date.now() - 365 * 864e5;
  return {
    lastYear: threadStarts(list).filter((e) => e.data.pubDate.valueOf() >= yearAgo).length,
    // Наивно и сознательно: тредовой логики у сайта нет, он не знает, закрыт ли
    // патч более поздним постом того же треда. Когда бот научится отдавать два
    // ярлыка разом, считать это будет он, а не сборка.
    unpatched: threadStarts(list).filter((e) => e.data.urgency.includes('#патча_нет')).length,
  };
}

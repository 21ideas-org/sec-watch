import { getCollection, type CollectionEntry } from 'astro:content';

export type Incident = CollectionEntry<'incidents'>;

/**
 * Даты страниц — В UTC, а не в зоне машины сборки.
 *
 * ⚠️ Без `timeZone` формат берёт зону сборщика, и одна и та же дата уезжает разной:
 * пост 2026-08-28T20:01Z на машине разработчика (UTC+4) рендерится как «29.08», а в
 * деплое (GitHub Actions, UTC) — как «28.08». Для канала, где дата инцидента стоит и
 * в постоянном адресе (`<продукт>-<ГГГГ-ММ-ДД>-<короткое>`), это значит, что адрес и
 * страница расходятся на сутки в зависимости от того, кто нажал сборку.
 *
 * ⚠️ Именно UTC, а не зона аудитории: в UTC датирует бот (`posted_at`), в UTC собран
 * slug, и совпадение всех трёх — единственное, что здесь можно проверить глазами.
 */
const UTC = { timeZone: 'UTC' } as const;
/** 29.08.2026 — лента и карточки. */
export const dateShort = (d: Date) =>
  d.toLocaleDateString('ru-RU', { ...UTC, day: '2-digit', month: '2-digit', year: 'numeric' });
/** 29.08 — оглавление треда, где год у всех один. */
export const dateDay = (d: Date) =>
  d.toLocaleDateString('ru-RU', { ...UTC, day: '2-digit', month: '2-digit' });
/** 29 августа 2026 — шапка страницы инцидента. ru-RU дописывает « г.»; в шапке
 *  оповещения это шум. */
export const dateLong = (d: Date) =>
  d
    .toLocaleDateString('ru-RU', { ...UTC, day: 'numeric', month: 'long', year: 'numeric' })
    .replace(/\s*г\.$/, '');

const escapeHtml = (t: string) =>
  t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Не дать ключу командной строки разорваться по собственному дефису.
 *
 * ⚠️ Перенос после дефиса законен по правилам набора, и на выдуманном контенте это
 * было незаметно. На настоящем — в строке «Что делать» поста Blockstream — `--offline`
 * встал как `--` в конце строки и `offline` в начале следующей. Это единственная
 * команда, которую читатель должен выполнить дословно, и разорванный ключ учит
 * набирать его неправильно.
 *
 * ⚠️ Текст поста при этом НЕ меняется: правится только перенос на показе. Тот же
 * приём и по той же причине, по какой бот заворачивает имена пакетов в `<code>`
 * (`lib/render.ts`, `markPackages`) — типографика ключа это часть его смысла.
 */
export function keepFlags(text: string): string {
  return escapeHtml(text).replace(
    /(^|[\s(«"„])(--?[a-zA-Z][\w-]*)/gu,
    (_m, before: string, flag: string) => `${before}<span class="nb">${flag}</span>`,
  );
}

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
 * Начало треда, которому принадлежит пост.
 *
 * ⚠️ Сирота — пост, чей `parent` не находится, — считается началом собственного треда.
 * Битая ссылка обязана дать одинокую страницу, а не отсутствующую: файлы сюда кладёт
 * бот, и опечатка в `parent` не повод потерять оповещение.
 */
export function threadStart(list: Incident[], entry: Incident): Incident {
  if (!entry.data.parent) return entry;
  return own(list).find((e) => e.id === entry.data.parent) ?? entry;
}

/** Весь тред по возрастанию даты: начало, затем апдейты. */
export function thread(list: Incident[], start: Incident): Incident[] {
  return [start, ...own(list).filter((e) => e.data.parent === start.id)].sort(
    (a, b) => a.data.pubDate.valueOf() - b.data.pubDate.valueOf(),
  );
}

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
    /**
     * Открытые без патча — по ПОСЛЕДНЕМУ посту треда, а не по началу.
     *
     * ⚠️ Раньше считалось по началу, и на пустом сайте это было незаметно. На бэкфиле
     * 30.08.2026 вылезло сразу: авария Core Lightning начинается постом «патча нет»
     * (26.08) и заканчивается тремя «патч есть» (28–29.08), то есть табло держало бы
     * «открыто без патча: 1» про инцидент, закрытый вендором три поста назад. Для
     * канала оповещений ложная тревога на главной хуже отсутствующей цифры.
     *
     * ⚠️ Тредовая логика тут законна, а в счётчике (`counterAnchor`) — нет, и это не
     * противоречие: счётчик отвечает «когда это началось», а табло — «как обстоит
     * дело сейчас». Первому нужен первый пост, второму — последний.
     */
    unpatched: threadStarts(list).filter((s) =>
      thread(list, s).at(-1)!.data.urgency.includes('#патча_нет'),
    ).length,
  };
}

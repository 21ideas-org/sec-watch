// Единственное место, где живут несекретные постоянные сайта.

export const SITE_TITLE = 'sec_₿';
export const SITE_NAME = 'Bitcoin Security Watcher';
export const SITE_DESCRIPTION = 'Критические оповещения для биткоинеров';
export const SITE_URL = 'https://sec.21ideas.org';

export const TELEGRAM_URL = 'https://t.me/';

// Поддержка. Реквизиты живут ТОЛЬКО здесь и показываются ТОЛЬКО на /support.
// В оповещении стоит ссылка на страницу, а не адрес: пост вида «🚨 срочно
// обновитесь» с платёжным реквизитом рядом — структурно тот же паттерн, от
// которого канал защищает, и подмену адреса в таком посте читатель не заметит.
export const SUPPORT_ONCHAIN = 'bc1q805dq3u6t76nd5av3jdln0vy6zxt4y5djem4s5';
export const SUPPORT_LN_ADDRESS = 'tony_lightning@coinos.io';

// Legacy urgency labels нужны для backfill/display. После status-axis slice новые files
// получают их как derived compatibility layer; неизвестное значение остаётся neutral,
// а не роняет build. Отсюда берутся только цвет и порядок.
export const URGENCY_ORDER = ['#эксплуатируется', '#патча_нет', '#патч_есть'] as const;

export function urgencyClass(tag: string): string {
  if (tag === '#эксплуатируется') return 'u-crit';
  if (tag === '#патча_нет') return 'u-warn';
  if (tag === '#патч_есть') return 'u-ok';
  return 'u-neutral'; // ярлык, которого мы ещё не знаем
}

/**
 * Цвет сигнальной полосы карточки по срочности.
 *
 * ⚠️ Незнакомый или отсутствующий ярлык даёт НЕЙТРАЛЬНЫЙ цвет, а не зелёный. Прежний
 * тернарник в index.astro сваливался в `--ok-fg` на всём, что не красное и не жёлтое, —
 * то есть обещал «патч есть» по любому ярлыку, которого сайт ещё не знает. Ровно тот
 * случай, ради которого схема не проверяет словарь.
 */
export function urgencyAccent(urgency: string[] = []): string {
  if (urgency.includes('#эксплуатируется')) return 'var(--crit-fg)';
  if (urgency.includes('#патча_нет')) return 'var(--warn-fg)';
  if (urgency.includes('#патч_есть')) return 'var(--ok-fg)';
  return 'var(--dim)';
}

/** OG-картинка выбирается КОДОМ по срочности — не моделью. */
export function ogFor(urgency: string[] = []): string {
  if (urgency.includes('#эксплуатируется')) return '/og/critical.png';
  if (urgency.includes('#патча_нет')) return '/og/unpatched.png';
  if (urgency.includes('#патч_есть')) return '/og/patched.png';
  return '/og/default.png';
}

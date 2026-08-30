// Одноразовый генератор OG-картинок: `npm run og`.
//
// ⚠️ Картинок ровно четыре, они лежат в public/og и КОММИТЯТСЯ. Персональная
// карточка на каждый инцидент не стоит того времени деплоя, которое за неё
// платится: в это время ссылка уже разослана, а страницы ещё нет. По той же
// причине sharp — devDependency: в деплое он не запускается никогда.
//
// Выбор картинки делает КОД по срочности (`ogFor` в src/consts.ts), не модель.
//
// Карточка повторяет тёмную тему сайта, потому что превью в мессенджере — первое,
// что читатель видит от канала, и узнать его он должен до того, как откроет
// страницу: клетка, непрозрачная плашка с жёсткой тенью светлее фона, моноширинный
// набор, полоса срочности слева.
import { mkdir, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const W = 1200, H = 630;
const FONT = 'JetBrains Mono, Menlo, DejaVu Sans Mono, monospace';

// Токены тёмной темы — те же, что в :root (src/styles/global.css).
const BG = '#0b0d12', SUR = '#13161f', BD = '#2a3142', TX = '#e4e8f0', SHADOW = '#303950', HAIR = '#222836';

const STEP = 32;   // шаг клетки; на 1200px это та же плотность, что --step: 16px на колонке сайта
const M = 64;      // поле вокруг плашки: две клетки, чтобы разлиновка читалась рамкой, а не щелью
const D = 12;      // вынос жёсткой тени; плашка + тень укладываются ровно в поле M со всех сторон
const PAD = 48;    // отбивка текста внутри плашки
const BAR = 10;    // полоса срочности слева, как border-left у .card

const PANEL = { x: M, y: M, w: W - 2 * M - D, h: H - 2 * M - D };
const TX_X = PANEL.x + BAR + PAD;
const TX_W = PANEL.x + PANEL.w - PAD - TX_X;

const CARDS = [
  { file: 'critical.png',  label: 'ЭКСПЛУАТИРУЕТСЯ',          tracking: 4, accent: '#ff6a5c', note: 'Средства уходят прямо сейчас' },
  { file: 'unpatched.png', label: 'ПАТЧА НЕТ',                tracking: 4, accent: '#f2a63d', note: 'Исправления пока не существует' },
  { file: 'patched.png',   label: 'ПАТЧ ЕСТЬ',                tracking: 4, accent: '#4fc884', note: 'Обновитесь, эксплуатации не видно' },
  { file: 'default.png',   label: 'Bitcoin Security Watcher', tracking: 2, accent: '#7fa9e8', note: 'Критические оповещения для биткоинеров' },
];

/**
 * Кегль второй строки считается по её длине, а не задан числом.
 *
 * ⚠️ Именно здесь была поломка: фиксированные 52px на самой длинной строке
 * («Критические оповещения для биткоинеров», 38 знаков) давали ~1190px в плашке
 * шириной 954 — хвост уезжал за край и обрезался. Моноширинный набор считается
 * точно, поэтому строка гарантированно влезает в ОДНУ, как и задумано.
 */
const ADVANCE = 0.602;             // ширина знака моноширинного шрифта в долях кегля
const fit = (text, box, max) => Math.min(max, Math.floor(box / (text.length * ADVANCE)));

const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Разлиновка. Прозрачность выше, чем на сайте (0.032): превью показывают ужатым
// до ~600px и пережимают, и на сайтовом значении клетка пропадает совсем.
const grid = () => {
  let d = '';
  for (let x = 0; x <= W; x += STEP) d += `M${x} 0V${H}`;
  for (let y = 0; y <= H; y += STEP) d += `M0 ${y}H${W}`;
  return `<path d="${d}" stroke="${TX}" stroke-opacity="0.06" stroke-width="1"/>`;
};

const svg = ({ label, tracking, accent, note }) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${BG}"/>
  ${grid()}
  <!-- Тень СВЕТЛЕЕ фона: на тёмной теме иначе её физически не видно. -->
  <rect x="${PANEL.x + D}" y="${PANEL.y + D}" width="${PANEL.w}" height="${PANEL.h}" fill="${SHADOW}"/>
  <rect x="${PANEL.x}" y="${PANEL.y}" width="${PANEL.w}" height="${PANEL.h}" fill="${SUR}" stroke="${BD}" stroke-width="2"/>
  <rect x="${PANEL.x}" y="${PANEL.y}" width="${BAR}" height="${PANEL.h}" fill="${accent}"/>
  <text x="${TX_X}" y="257" font-family="${FONT}" font-size="30" font-weight="700"
        fill="${accent}" letter-spacing="${tracking}">${esc(label)}</text>
  <!-- Линейка во всю ширину набора: те же волосяные отбивки держат табло на главной
       (.board .stats). Без неё две строки висят островком в пустой плашке. -->
  <line x1="${TX_X}" y1="301" x2="${TX_X + TX_W}" y2="301" stroke="${HAIR}" stroke-width="2"/>
  <text x="${TX_X}" y="373" font-family="${FONT}" font-size="${fit(note, TX_W, 48)}" font-weight="700"
        fill="${TX}">${esc(note)}</text>
</svg>`;

await mkdir('public/og', { recursive: true });
for (const card of CARDS) {
  const png = await sharp(Buffer.from(svg(card))).png().toBuffer();
  await writeFile(`public/og/${card.file}`, png);
  console.log('og →', card.file, `кегль ${fit(card.note, TX_W, 48)}`, png.length, 'байт');
}

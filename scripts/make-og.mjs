// Одноразовый генератор OG-картинок: `npm run og`.
//
// ⚠️ Картинок ровно четыре, они лежат в public/og и КОММИТЯТСЯ. Персональная
// карточка на каждый инцидент не стоит того времени деплоя, которое за неё
// платится: в это время ссылка уже разослана, а страницы ещё нет. По той же
// причине sharp — devDependency: в деплое он не запускается никогда.
//
// Выбор картинки делает КОД по срочности (`ogFor` в src/consts.ts), не модель.
import { mkdir, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const W = 1200, H = 630;
const FONT = 'JetBrains Mono, Menlo, DejaVu Sans Mono, monospace';

const CARDS = [
  { file: 'critical.png',  label: 'ЭКСПЛУАТИРУЕТСЯ',  accent: '#ff6a5c', note: 'Средства уходят прямо сейчас' },
  { file: 'unpatched.png', label: 'ПАТЧА НЕТ',        accent: '#f2a63d', note: 'Исправления пока не существует' },
  { file: 'patched.png',   label: 'ПАТЧ ЕСТЬ',        accent: '#4fc884', note: 'Обновитесь, эксплуатации не видно' },
  { file: 'default.png',   label: 'SEC.21IDEAS.ORG',  accent: '#7fa9e8', note: 'Критические оповещения для биткоинеров' },
];

const grid = () => {
  let out = '';
  for (let x = 0; x <= W; x += 32) out += `<line x1="${x}" y1="0" x2="${x}" y2="${H}"/>`;
  for (let y = 0; y <= H; y += 32) out += `<line x1="0" y1="${y}" x2="${W}" y2="${y}"/>`;
  return `<g stroke="#e4e8f0" stroke-opacity="0.032" stroke-width="1">${out}</g>`;
};

const svg = ({ label, accent, note }) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#0b0d12"/>
  ${grid()}
  <rect x="72" y="96" width="1056" height="438" fill="#13161f" stroke="#2a3142"/>
  <rect x="72" y="96" width="10" height="438" fill="${accent}"/>
  <text x="124" y="196" font-family="${FONT}" font-size="34" font-weight="700" fill="${accent}"
        letter-spacing="4">${label}</text>
  <text x="124" y="300" font-family="${FONT}" font-size="52" font-weight="700" fill="#e4e8f0"
        letter-spacing="-1">${note}</text>
  <text x="124" y="470" font-family="${FONT}" font-size="26" fill="#7d8698"
        letter-spacing="3">SEC.21IDEAS.ORG</text>
</svg>`;

await mkdir('public/og', { recursive: true });
for (const card of CARDS) {
  const png = await sharp(Buffer.from(svg(card))).png().toBuffer();
  await writeFile(`public/og/${card.file}`, png);
  console.log('og →', card.file, png.length, 'байт');
}

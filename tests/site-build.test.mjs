import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const ROOT = dirname(fileURLToPath(import.meta.url));
const REPOSITORY = dirname(ROOT);

const INCIDENT_IDS = [
  'btcpay-2026-08-26-cln-routes-off',
  'btcpay-2026-08-29-cln-26067',
  'cln-2026-08-27-offline-guidance',
  'cln-2026-08-28-blockstream-advisory',
  'cln-2026-08-28-release-26067',
  'ledger-2026-08-27-donjon-bulletins',
  'ledger-2026-08-28-qr-phishing',
  'npm-2026-08-29-test-in-one',
  'start9-2026-08-26-cln-update',
  'umbrel-2026-08-27-cln-update',
];

const ARCHIVE_SOURCE_URLS = new Map([
  ['2013-08-11-android-securerandom', 'https://bitcoin.org/en/alert/2013-08-11-android'],
  ['2014-04-11-heartbleed', 'https://bitcoin.org/en/alert/2014-04-11-heartbleed'],
  ['2018-11-20-event-stream-copay', 'https://blog.npmjs.org/post/180565383195/details-about-the-event-stream-incident'],
  ['2020-01-31-trezor-voltage-glitch', 'https://blog.trezor.io/our-response-to-the-read-protection-downgrade-attack-28d23f8949c6'],
  ['2020-05-18-coldcard-laser', 'https://blog.coinkite.com/laser-fault-injection/'],
  ['2021-05-11-cake-wallet-seeds', 'https://milksad.info/posts/research-update-9/'],
  ['2022-06-07-electrum-file-scheme', 'https://github.com/spesmilo/electrum/security/advisories/GHSA-4fh4-hx35-r355'],
  ['2023-08-08-milk-sad', 'https://milksad.info/disclosure.html'],
  ['2023-11-14-randstorm', 'https://www.unciphered.com/disclosure-of-vulnerable-bitcoin-wallet-library-2/'],
  ['2024-01-04-bip3x-weak-rng', 'https://milksad.info/posts/research-update-4/'],
  ['2025-04-03-pypi-bitcoinlib', 'https://www.reversinglabs.com/blog/malicious-python-packages-target-popular-bitcoin-library'],
  ['2026-01-30-phpcoinaddress', 'https://milksad.info/posts/research-update-18/'],
  ['2026-07-30-coldcard-entropy', 'https://blog.coinkite.com/entropy-technical-backgrounder/'],
]);

const ROOT_FIXTURE_ID = 'fixture-2031-09-04-status-axes';
const UPDATE_FIXTURE_ID = 'fixture-2031-09-05-status-update';
const UNKNOWN_FIXTURE_ID = 'fixture-2032-09-04-unknown-status';

const rootFixture = `---
title: "Status axes fixture"
description: "All canonical axes coexist"
pubDate: 2031-09-04T12:00:00.000Z
urgency: ["#патча_нет"]
audience: ["держатели"]
product: "Fixture"
vendor: "Fixture Vendor"
action: "Use the safe release"
exploitationStatus: "active"
fixStatus: "available"
updateSufficiency: "additional_action_required"
actionTiming: "now"
hijacked: true
incidentKey: "fixture-thread"
links:
  - label: "must not render for hijack"
    url: "https://untrusted.example/"
---
`;

const updateFixture = `---
title: "Status axes update fixture"
description: "Update remains in the root thread"
pubDate: 2031-09-05T12:00:00.000Z
urgency: []
audience: ["операторы"]
product: "Fixture"
vendor: "Fixture Vendor"
action: "Review the update"
exploitationStatus: "observed"
fixStatus: "partial"
updateSufficiency: "additional_action_required"
actionTiming: "now"
hijacked: false
incidentKey: "fixture-thread"
parent: "${ROOT_FIXTURE_ID}"
links: []
---
`;

const unknownFixture = `---
title: "Unknown status fixture"
description: "Unknown canonical values stay neutral"
pubDate: 2032-09-04T12:00:00.000Z
urgency: ["#патч_есть"]
audience: []
product: "Fixture"
vendor: "Fixture Vendor"
exploitationStatus: "future_exploitation_state"
fixStatus: "future_fix_state"
updateSufficiency: "future_sufficiency_state"
actionTiming: "future_timing_state"
hijacked: false
incidentKey: "fixture-unknown"
links: []
---
`;

async function withTemporaryDirectory(run) {
  const directory = await mkdtemp(join(tmpdir(), 'sec-web-test-'));
  try {
    return await run(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

async function copySite(target) {
  const excluded = new Set(['.astro', '.git', 'dist', 'node_modules']);
  await cp(REPOSITORY, target, {
    recursive: true,
    filter(source) {
      const first = relative(REPOSITORY, source).split('/')[0];
      return !excluded.has(first);
    },
  });
  await symlink(join(REPOSITORY, 'node_modules'), join(target, 'node_modules'), 'dir');
}

async function text(path) {
  return readFile(path, 'utf8');
}

test('temporary fixture cleanup also runs after a failed assertion', async () => {
  let created;
  await assert.rejects(
    withTemporaryDirectory(async (directory) => {
      created = directory;
      throw new Error('intentional fixture failure');
    }),
    /intentional fixture failure/,
  );
  assert.equal(existsSync(created), false);
});

test('isolated generated fixtures preserve routes, archive behavior, status rendering, and threads', async () => {
  await withTemporaryDirectory(async (directory) => {
    const site = join(directory, 'site');
    await copySite(site);

    const fixtureDirectory = join(site, 'src/content/incidents');
    await writeFile(join(fixtureDirectory, `${ROOT_FIXTURE_ID}.md`), rootFixture);
    await writeFile(join(fixtureDirectory, `${UPDATE_FIXTURE_ID}.md`), updateFixture);
    await writeFile(join(fixtureDirectory, `${UNKNOWN_FIXTURE_ID}.md`), unknownFixture);

    const build = spawnSync(process.execPath, [join(REPOSITORY, 'node_modules/astro/bin/astro.mjs'), 'build'], {
      cwd: site,
      encoding: 'utf8',
      env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' },
      timeout: 120_000,
    });
    assert.equal(build.status, 0, `${build.stdout}\n${build.stderr}`);

    for (const id of INCIDENT_IDS) {
      assert.equal(existsSync(join(site, 'dist/incidents', id, 'index.html')), true, id);
    }

    const feed = await text(join(site, 'dist/feed/index.html'));
    const rss = await text(join(site, 'dist/rss.xml'));
    for (const [id, expectedUrl] of ARCHIVE_SOURCE_URLS) {
      const source = await text(join(site, 'src/content/archive', `${id}.md`));
      const actualUrl = source.match(/^sourceUrl: ["']([^"']+)["']$/m)?.[1];
      assert.equal(actualUrl, expectedUrl, `${id} sourceUrl changed`);
      assert.equal(existsSync(join(site, 'dist/incidents', id, 'index.html')), false, id);
      assert.ok(feed.includes(expectedUrl), `${id} missing from archive feed`);
      assert.ok(!rss.includes(expectedUrl), `${id} leaked into RSS`);
    }

    const rootPage = await text(join(site, 'dist/incidents', ROOT_FIXTURE_ID, 'index.html'));
    const updatePage = await text(join(site, 'dist/incidents', UPDATE_FIXTURE_ID, 'index.html'));
    const unknownPage = await text(join(site, 'dist/incidents', UNKNOWN_FIXTURE_ID, 'index.html'));
    const index = await text(join(site, 'dist/index.html'));

    assert.ok(rootPage.includes('#эксплуатируется'));
    assert.ok(rootPage.includes('#патч_есть'));
    assert.ok(!rootPage.includes('#патча_нет'));
    assert.ok(updatePage.includes('#патч_частичный'));
    assert.ok(updatePage.includes('class="u u-warn">#патч_частичный</span>'));

    const hijack = rootPage.match(/<aside class="hijack[^>]*>([\s\S]*?)<\/aside>/);
    assert.ok(hijack, 'trusted hijack banner is missing');
    assert.ok(hijack[1].includes('официальный аккаунт Fixture Vendor угнан'));
    assert.ok(!hijack[1].includes('<a '), 'hijack banner must not contain links');
    assert.ok(!rootPage.includes('https://untrusted.example/'), 'hijacked page must suppress source links');

    assert.ok(!unknownPage.includes('class="u u-ok"'));
    assert.ok(!unknownPage.includes('#патч_есть'));
    assert.match(index, /<article class="card panel" style="--accent: var\(--dim\)">[\s\S]*?Unknown status fixture/);
    assert.ok(index.includes('<span>всего<b>13</b></span>'), 'archive entries leaked into counters');

    assert.ok(rootPage.includes(`/incidents/${UPDATE_FIXTURE_ID}/`));
    assert.ok(updatePage.includes(`/incidents/${ROOT_FIXTURE_ID}/`));
    assert.ok(rss.includes(`/incidents/${ROOT_FIXTURE_ID}/`));
    assert.ok(rss.includes('#эксплуатируется'));
    assert.ok(rss.includes('#патч_есть'));
    assert.ok(rss.includes('официальный аккаунт Fixture Vendor угнан'));
    assert.ok(!rss.includes('https://untrusted.example/'));
    assert.ok(!rss.includes('src/content/archive'));
  });

  for (const id of [ROOT_FIXTURE_ID, UPDATE_FIXTURE_ID, UNKNOWN_FIXTURE_ID]) {
    assert.equal(existsSync(join(REPOSITORY, 'src/content/incidents', `${id}.md`)), false);
  }
});

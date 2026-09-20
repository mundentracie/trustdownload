// TrustDownload verify — zero-dependency local smoke test.
// 1) static audit: manifest permissions, no-network patterns in shipped sources
// 2) unit tests for the pure logic in src/lib.js
// Run: npm run verify
import { readFileSync } from 'fs';
import { join } from 'path';

let pass = 0;
let fail = 0;
const results = [];

function check(name, fn) {
  try {
    fn();
    pass++;
    results.push(`ok   ${name}`);
  } catch (err) {
    fail++;
    results.push(`FAIL ${name}: ${err.message}`);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed');
}
function eq(a, b, msg) {
  if (a !== b) throw new Error(`${msg || 'eq'}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}

/* ---------- 1. static audit ---------- */

const manifest = JSON.parse(readFileSync('manifest.json', 'utf8'));

check('manifest: exactly the 4 minimal permissions', () => {
  const want = ['downloads', 'downloads.open', 'downloads.shelf', 'storage'].sort();
  eq(JSON.stringify([...manifest.permissions].sort()), JSON.stringify(want), 'permissions');
});

check('manifest: no host_permissions / no content scripts / no web_accessible_resources', () => {
  assert(!manifest.host_permissions, 'host_permissions must be absent');
  assert(!manifest.content_scripts, 'content_scripts must be absent');
  assert(!manifest.web_accessible_resources, 'web_accessible_resources must be absent');
  assert(!manifest.optional_permissions, 'optional_permissions must be absent');
});

check('manifest: background is our service worker, popup wired', () => {
  eq(manifest.background?.service_worker, 'src/background.js');
  eq(manifest.action?.default_popup, 'src/popup.html');
});

for (const file of ['src/background.js', 'src/popup.js', 'src/lib.js', 'src/license.js', 'src/popup.html', 'src/popup.css']) {
  check(`zero-network audit: ${file}`, () => {
    const src = readFileSync(file, 'utf8').replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
    for (const bad of ['fetch(', 'XMLHttpRequest', 'WebSocket', 'sendBeacon', 'importScripts', 'eval(', 'new Function', 'innerHTML', 'https://', 'http://']) {
      assert(!src.includes(bad), `forbidden pattern "${bad}" found in ${file}`);
    }
  });
}

check('xss audit: popup.js never uses innerHTML/outerHTML/insertAdjacentHTML', () => {
  const src = readFileSync('src/popup.js', 'utf8').replace(/\/\/[^\n]*/g, '');
  for (const bad of ['innerHTML', 'outerHTML', 'insertAdjacentHTML', 'document.write']) {
    assert(!src.includes(bad), `forbidden DOM API "${bad}" in popup.js`);
  }
});

/* ---------- 2. unit tests: src/lib.js ---------- */

const lib = await import('../src/lib.js');

check('formatBytes', () => {
  eq(lib.formatBytes(0), '0 B');
  eq(lib.formatBytes(512), '512 B');
  eq(lib.formatBytes(2048), '2.0 KB');
  eq(lib.formatBytes(5 * 1024 * 1024), '5.0 MB');
  eq(lib.formatBytes(3.5 * 1024 ** 3), '3.5 GB');
  eq(lib.formatBytes(-1), '');
  eq(lib.formatBytes(undefined), '');
});

check('bucketOf', () => {
  eq(lib.bucketOf({ state: 'in_progress' }), 'active');
  eq(lib.bucketOf({ state: 'complete' }), 'done');
  eq(lib.bucketOf({ state: 'interrupted', error: 'NETWORK_FAILED' }), 'failed');
  eq(lib.bucketOf({ state: 'interrupted' }), 'stopped');
  eq(lib.bucketOf(null), 'other');
});

check('applyFilter', () => {
  const items = [
    { state: 'in_progress' },
    { state: 'complete' },
    { state: 'interrupted', error: 'X' },
  ];
  eq(lib.applyFilter(items, 'all').length, 3);
  eq(lib.applyFilter(items, 'active').length, 1);
  eq(lib.applyFilter(items, 'done').length, 1);
  eq(lib.applyFilter(items, 'failed').length, 1);
  eq(lib.applyFilter(items, 'stopped').length, 0);
});

check('badgeCount counts only in_progress', () => {
  const items = [
    { state: 'in_progress' },
    { state: 'in_progress' },
    { state: 'complete' },
    { state: 'interrupted', error: 'X' },
    null,
  ];
  eq(lib.badgeCount(items), 2);
  eq(lib.badgeCount([]), 0);
});

check('fileNameOf handles / and \\', () => {
  eq(lib.fileNameOf('C:\\Users\\a\\file.zip'), 'file.zip');
  eq(lib.fileNameOf('/home/a/file.tar.gz'), 'file.tar.gz');
  eq(lib.fileNameOf(''), '(unknown)');
});

check('categoryOf', () => {
  eq(lib.categoryOf('a.zip'), 'archive');
  eq(lib.categoryOf('b.PNG'), 'image');
  eq(lib.categoryOf('c.mp4'), 'video');
  eq(lib.categoryOf('d.pdf'), 'doc');
  eq(lib.categoryOf('e'), 'other');
});

check('percentOf clamps', () => {
  eq(lib.percentOf({ bytesReceived: 50, total: 200 }), 25);
  eq(lib.percentOf({ bytesReceived: 500, total: 200 }), 100);
  eq(lib.percentOf({ bytesReceived: 0, total: 0 }), null);
  eq(lib.percentOf(null), null);
});

check('dayKey', () => {
  eq(lib.dayKey('2026-09-18T01:02:03.000Z'), '2026-09-18');
  eq(lib.dayKey(undefined), 'unknown');
});

/* ---------- 3. unit tests: Pro rules engine (pure) ---------- */

check('safeSegment strips path tricks', () => {
  eq(lib.safeSegment('  Images '), 'Images');
  eq(lib.safeSegment('a/b\\c:d'), 'abcd');
  eq(lib.safeSegment('../etc'), 'etc');
  eq(lib.safeSegment(''), '');
  eq(lib.safeSegment('x'.repeat(100)), 'x'.repeat(60));
});

check('dateSegment month/day', () => {
  eq(lib.dateSegment('2026-09-20T10:00:00.000Z', 'month'), '2026-09');
  eq(lib.dateSegment('2026-09-20T10:00:00.000Z', 'day'), '2026-09-20');
  eq(lib.dateSegment(undefined, 'month'), null);
  eq(lib.dateSegment('garbage', 'day'), null);
});

check('proSubdir: off / no-pro / no-match', () => {
  const item = { filename: '/Downloads/photo.jpg', startTime: '2026-09-20T10:00:00.000Z' };
  eq(lib.proSubdir(item, { organize: 'off' }), null);
  eq(lib.proSubdir(item, {}), null);
  eq(lib.proSubdir(item, { organize: false }), null);
  eq(lib.proSubdir(null, { organize: 'type' }), null);
  eq(lib.proSubdir({ filename: '/Downloads/x' }, { organize: 'date', dateFormat: 'month', folders: {} }), null);
});

check('proSubdir: by type uses editable folders', () => {
  const item = { filename: 'C:\\DL\\report.pdf', startTime: '2026-09-20T10:00:00.000Z' };
  eq(lib.proSubdir(item, { organize: 'type', folders: {} }), 'Documents');
  eq(
    lib.proSubdir(item, { organize: 'type', folders: { doc: 'Work Docs' } }),
    'Work Docs',
  );
  eq(lib.proSubdir({ filename: 'x.unknownext', startTime: item.startTime }, { organize: 'type', folders: {} }), 'Other');
});

check('proSubdir: by date and type+date', () => {
  const item = { filename: '/Downloads/song.mp3', startTime: '2026-09-20T10:00:00.000Z' };
  eq(lib.proSubdir(item, { organize: 'date', dateFormat: 'month', folders: {} }), '2026-09');
  eq(lib.proSubdir(item, { organize: 'date', dateFormat: 'day', folders: {} }), '2026-09-20');
  eq(
    lib.proSubdir(item, { organize: 'type+date', dateFormat: 'month', folders: {} }),
    'Audio/2026-09',
  );
  // date with no valid startTime falls back to type part only
  eq(
    lib.proSubdir({ filename: '/Downloads/song.mp3' }, { organize: 'type+date', dateFormat: 'month', folders: {} }),
    'Audio',
  );
});

check('proSubdir: user folder names are sanitized', () => {
  const item = { filename: '/Downloads/x.jpg', startTime: '2026-09-20T10:00:00.000Z' };
  eq(lib.proSubdir(item, { organize: 'type', folders: { image: '../evil' } }), 'evil');
});

/* ---------- report ---------- */

const report = results.join('\n');
console.log(report);
console.log(`\n${pass} passed, ${fail} failed`);
const fs = await import('fs');
fs.writeFileSync('verify-report.txt', `${report}\n\n${pass} passed, ${fail} failed\n`);
process.exit(fail > 0 ? 1 : 0);

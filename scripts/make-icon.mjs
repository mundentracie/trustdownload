// Renders the TrustDownload icon (128x128 PNG) from inline SVG using the
// local Playwright Chromium — no image libraries needed.
// Output: src/icons/icon128.png
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'src', 'icons');
mkdirSync(OUT, { recursive: true });

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <rect width="128" height="128" rx="24" fill="#0d1117"/>
  <rect x="4" y="4" width="120" height="120" rx="21" fill="none" stroke="#2563eb" stroke-width="3" opacity="0.55"/>
  <path d="M64 26 v40" stroke="#e6edf3" stroke-width="9" stroke-linecap="round"/>
  <path d="M44 56 l20 20 l20 -20" stroke="#e6edf3" stroke-width="9" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M34 92 h60" stroke="#2563eb" stroke-width="8" stroke-linecap="round"/>
  <circle cx="64" cy="66" r="0" fill="none"/>
  <circle cx="98" cy="34" r="15" fill="#0d1117" stroke="#2ea043" stroke-width="3"/>
  <path d="M91 34 l5 5 l9 -10" stroke="#2ea043" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const html = `<!doctype html><html><head><style>*{margin:0;padding:0}body{width:128px;height:128px;overflow:hidden}svg{display:block}</style></head><body>${svg}</body></html>`;
const htmlPath = join(OUT, 'icon.html');
writeFileSync(htmlPath, html);

try {
  const context = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    headless: true,
    viewport: { width: 128, height: 128 },
    args: [],
  });
  const page = await context.newPage();
  await page.goto('file:///' + htmlPath.replace(/\\/g, '/'));
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(OUT, 'icon128.png'), clip: { x: 0, y: 0, width: 128, height: 128 } });
  await context.close();
  console.log('icon written: src/icons/icon128.png');
} finally {
  /* no server to kill */
}

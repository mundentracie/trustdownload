// Generates Chrome Web Store promo assets for TrustJSON + TrustDownload
// by rendering inline HTML/SVG with the local Playwright Chromium.
// Output: <repo>/store/promo-small.png (440x280), <repo>/store/promo-marquee.png (1400x560),
//         <repo>/store/screenshots/store-{light,dark}.png (1280x800)
// All screenshots are RGB PNG (no alpha) — verified store requirement.
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const WS = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const shot = async (page, html, w, h, out) => {
  const tmp = out.replace(/\.png$/, '.html');
  writeFileSync(tmp, html);
  await page.setViewportSize({ width: w, height: h });
  await page.goto('file:///' + tmp.replace(/\\/g, '/'));
  await page.waitForTimeout(250);
  await page.screenshot({ path: out, clip: { x: 0, y: 0, width: w, height: h } });
  console.log('written', out);
};
const writeTmp = (p, body) => {
  writeFileSync(p, body);
};

const BASE_CSS = (w, h) => `*{margin:0;padding:0;box-sizing:border-box}
body{width:${w}px;height:${h}px;overflow:hidden;font-family:'Segoe UI',Helvetica,Arial,sans-serif}`;

/* ---------- TrustJSON ---------- */

const tjIcon = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 128 128">
  <rect width="128" height="128" rx="24" fill="#0d1117"/>
  <rect x="4" y="4" width="120" height="120" rx="21" fill="none" stroke="#2ea043" stroke-width="3" opacity="0.55"/>
  <text x="34" y="86" font-family="Consolas, monospace" font-size="56" font-weight="bold" fill="#e6edf3" text-anchor="middle">{</text>
  <text x="94" y="86" font-family="Consolas, monospace" font-size="56" font-weight="bold" fill="#e6edf3" text-anchor="middle">}</text>
  <circle cx="64" cy="66" r="17" fill="#0d1117" stroke="#2ea043" stroke-width="3"/>
  <path d="M56 66 l6 6 l11 -12" stroke="#2ea043" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const tjJsonMock = (scale) => `
<div style="font-family:Consolas,monospace;font-size:${18 * scale}px;line-height:1.7;color:#e6edf3;background:#161b22;border:1px solid #30363d;border-radius:12px;padding:${24 * scale}px ${30 * scale}px;box-shadow:0 12px 40px rgba(0,0,0,.4)">
<div><span style="color:#79c0ff">"tracking"</span><span style="color:#8b949e">: </span><span style="color:#a5d6ff">"none"</span><span style="color:#8b949e">,</span></div>
<div><span style="color:#79c0ff">"ads"</span><span style="color:#8b949e">: </span><span style="color:#a5d6ff">false</span><span style="color:#8b949e">,</span></div>
<div><span style="color:#79c0ff">"network"</span><span style="color:#8b949e">: </span><span style="color:#a5d6ff">"zero requests"</span><span style="color:#8b949e">,</span></div>
<div><span style="color:#79c0ff">"source"</span><span style="color:#8b949e">: </span><span style="color:#7ee787">"open ✓ auditable"</span></div>
<div style="color:#8b949e">}</div>
</div>`;

const tjChecks = (fs) => `
<div style="display:flex;flex-direction:column;gap:${fs * 0.5}px;font-size:${fs}px;color:#c9d1d9">
  <div><span style="color:#2ea043;font-weight:700">✓</span>&nbsp; No ads, no affiliate code</div>
  <div><span style="color:#2ea043;font-weight:700">✓</span>&nbsp; Zero network requests — proven by tests</div>
  <div><span style="color:#2ea043;font-weight:700">✓</span>&nbsp; Open source, MIT licensed</div>
</div>`;

async function trustjson(page) {
  const out = join(WS, 'trustjson', 'store');
  mkdirSync(out, { recursive: true });

  // marquee 1400x560
  await shot(page, `<!doctype html><html><head><style>${BASE_CSS(1400, 560)}
  body{background:#0d1117;display:flex;align-items:center;justify-content:space-between;padding:0 90px}
  .bg{position:absolute;inset:0;background:linear-gradient(135deg,#0d1117 55%,#101827)}
  .wrap{position:relative;display:flex;align-items:center;gap:70px;width:100%;justify-content:space-between}
  .left{display:flex;flex-direction:column;gap:26px}
  .brand{display:flex;align-items:center;gap:24px}
  .name{font-size:64px;font-weight:800;color:#e6edf3;letter-spacing:.5px}
  .sub{font-size:26px;color:#8b949e}
  </style></head><body><div class="bg"></div><div class="wrap">
  <div class="left">
    <div class="brand">${tjIcon(110)}<div><div class="name">TrustJSON</div><div class="sub">Open-source JSON formatter for Chrome</div></div></div>
    ${tjChecks(24)}
  </div>
  ${tjJsonMock(1.3)}
  </div></body></html>`, 1400, 560, join(out, 'promo-marquee.png'));

  // small 440x280
  await shot(page, `<!doctype html><html><head><style>${BASE_CSS(440, 280)}
  body{background:#0d1117;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px}
  .brand{display:flex;align-items:center;gap:14px}
  .name{font-size:34px;font-weight:800;color:#e6edf3}
  .sub{font-size:15px;color:#2ea043}
  </style></head><body>
  <div class="brand">${tjIcon(72)}<div class="name">TrustJSON</div></div>
  <div class="sub">✓ no ads &nbsp; ✓ no tracking &nbsp; ✓ zero requests</div>
  <div style="font-size:13px;color:#8b949e">Open-source JSON formatter</div>
  </body></html>`, 440, 280, join(out, 'promo-small.png'));
}

/* ---------- TrustDownload ---------- */

const tdIcon = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 128 128">
  <rect width="128" height="128" rx="24" fill="#0d1117"/>
  <rect x="4" y="4" width="120" height="120" rx="21" fill="none" stroke="#2563eb" stroke-width="3" opacity="0.55"/>
  <path d="M64 26 v40" stroke="#e6edf3" stroke-width="9" stroke-linecap="round"/>
  <path d="M44 56 l20 20 l20 -20" stroke="#e6edf3" stroke-width="9" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M34 92 h60" stroke="#2563eb" stroke-width="8" stroke-linecap="round"/>
  <circle cx="98" cy="34" r="15" fill="#0d1117" stroke="#2ea043" stroke-width="3"/>
  <path d="M91 34 l5 5 l9 -10" stroke="#2ea043" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const tdChecks = (fs) => `
<div style="display:flex;flex-direction:column;gap:${fs * 0.5}px;font-size:${fs}px;color:#c9d1d9">
  <div><span style="color:#2ea043;font-weight:700">✓</span>&nbsp; Accurate badge, always in sync</div>
  <div><span style="color:#2ea043;font-weight:700">✓</span>&nbsp; Safe delete with confirmation</div>
  <div><span style="color:#2ea043;font-weight:700">✓</span>&nbsp; Zero network requests — proven by tests</div>
</div>`;

const tdListMock = (scale) => {
  const row = (name, meta, state, pct, color) => `
  <div style="display:flex;align-items:center;gap:${12 * scale}px;padding:${10 * scale}px 0;border-bottom:1px solid #21262d">
    <div style="width:${34 * scale}px;height:${34 * scale}px;border-radius:8px;background:#161b22;border:1px solid #30363d;display:flex;align-items:center;justify-content:center;font-size:${11 * scale}px;font-weight:700;color:#4493f8">${name.split('.').pop().slice(0, 4).toUpperCase()}</div>
    <div style="flex:1">
      <div style="font-size:${15 * scale}px;color:#e6edf3;font-weight:500">${name}</div>
      <div style="font-size:${12 * scale}px;color:${color};margin-top:2px">${meta}</div>
      ${pct !== null ? `<div style="margin-top:${5 * scale}px;height:${3 * scale}px;border-radius:2px;background:#21262d"><i style="display:block;height:100%;width:${pct}%;background:#4493f8;border-radius:2px"></i></div>` : ''}
    </div>
  </div>`;
  return `
  <div style="width:${420 * scale}px;background:#0d1117;border:1px solid #30363d;border-radius:14px;padding:${18 * scale}px ${20 * scale}px;box-shadow:0 16px 50px rgba(0,0,0,.5)">
    <div style="display:flex;gap:${8 * scale}px;margin-bottom:${10 * scale}px">
      ${['All', 'Active', 'Done', 'Failed'].map((t, i) => `<span style="font-size:${12 * scale}px;padding:${4 * scale}px ${12 * scale}px;border-radius:999px;border:1px solid ${i === 0 ? '#4493f8' : '#30363d'};color:${i === 0 ? '#4493f8' : '#8b949e'};background:${i === 0 ? '#1f3a5f' : 'transparent'}">${t}</span>`).join('')}
    </div>
    ${row('quarterly-report.pdf', 'Done · 2.4 MB', '', null, '#3fb950')}
    ${row('backup.zip', 'Downloading 64% · 148 MB / 230 MB', '', 64, '#4493f8')}
    ${row('dataset.csv', 'Done · 18 MB', '', null, '#3fb950')}
    ${row('installer.exe', 'Failed: NETWORK_FAILED', '', null, '#f85149')}
  </div>`;
};

async function trustdownload(page) {
  const out = join(WS, 'trustdownload', 'store');
  mkdirSync(join(out, 'screenshots'), { recursive: true });

  // marquee 1400x560
  await shot(page, `<!doctype html><html><head><style>${BASE_CSS(1400, 560)}
  body{background:linear-gradient(135deg,#0d1117 55%,#0f1a2e);display:flex;align-items:center;justify-content:space-between;padding:0 90px;position:relative}
  .wrap{position:relative;display:flex;align-items:center;gap:70px;width:100%;justify-content:space-between}
  .left{display:flex;flex-direction:column;gap:26px}
  .name{font-size:64px;font-weight:800;color:#e6edf3}
  .sub{font-size:26px;color:#8b949e}
  </style></head><body><div class="wrap">
  <div class="left">
    <div style="display:flex;align-items:center;gap:24px">${tdIcon(110)}<div><div class="name">TrustDownload</div><div class="sub">Lightweight download manager for Chrome</div></div></div>
    ${tdChecks(24)}
  </div>
  ${tdListMock(1.05)}
  </div></body></html>`, 1400, 560, join(out, 'promo-marquee.png'));

  // small 440x280
  await shot(page, `<!doctype html><html><head><style>${BASE_CSS(440, 280)}
  body{background:#0d1117;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px}
  .brand{display:flex;align-items:center;gap:14px}
  .name{font-size:32px;font-weight:800;color:#e6edf3}
  .sub{font-size:15px;color:#2ea043}
  </style></head><body>
  <div class="brand">${tdIcon(72)}<div class="name">TrustDownload</div></div>
  <div class="sub">✓ accurate badge &nbsp; ✓ safe delete &nbsp; ✓ zero requests</div>
  <div style="font-size:13px;color:#8b949e">Lightweight download manager</div>
  </body></html>`, 440, 280, join(out, 'promo-small.png'));

  // screenshots 1280x800 (light + dark): centered popup mock on soft background
  const shotPage = (theme) => {
    const dark = theme === 'dark';
    const c = dark
      ? { bg1: '#0d1117', bg2: '#101827', card: '#0d1117', border: '#30363d', fg: '#e6edf3', dim: '#8b949e', sub: '#161b22' }
      : { bg1: '#f6f8fa', bg2: '#eef2f7', card: '#ffffff', border: '#d1d9e0', fg: '#1f2328', dim: '#59636e', sub: '#f6f8fa' };
    const row = (name, meta, color, pct) => `
      <div style="display:flex;align-items:center;gap:14px;padding:12px 0;border-bottom:1px solid ${c.border}">
        <div style="width:38px;height:38px;border-radius:9px;background:${c.sub};border:1px solid ${c.border};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#2563eb">${name.split('.').pop().slice(0, 4).toUpperCase()}</div>
        <div style="flex:1">
          <div style="font-size:16px;color:${c.fg};font-weight:500">${name}</div>
          <div style="font-size:13px;color:${color};margin-top:2px">${meta}</div>
          ${pct !== null ? `<div style="margin-top:6px;height:4px;border-radius:2px;background:${c.sub}"><i style="display:block;height:100%;width:${pct}%;background:#2563eb;border-radius:2px"></i></div>` : ''}
        </div>
        <div style="font-size:13px;color:${c.dim}">⋯</div>
      </div>`;
    return `<!doctype html><html><head><style>${BASE_CSS(1280, 800)}
    body{background:linear-gradient(135deg,${c.bg1},${c.bg2});display:flex;align-items:center;justify-content:center;gap:80px}
    .panel{width:430px;background:${c.card};border:1px solid ${c.border};border-radius:16px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,${dark ? '.5' : '.12'})}
    .hdr{display:flex;align-items:center;gap:8px;padding:14px 16px;border-bottom:1px solid ${c.border};background:${c.sub}}
    .chips{display:flex;gap:8px;padding:12px 16px;border-bottom:1px solid ${c.border}}
    .chip{font-size:13px;padding:4px 14px;border-radius:999px;border:1px solid ${c.border};color:${c.dim}}
    .chip.on{border-color:#2563eb;color:#2563eb;background:${dark ? '#1f3a5f' : '#dbeafe'};font-weight:600}
    .list{padding:6px 16px 12px}
    .side{max-width:360px}
    </style></head><body>
    <div class="panel">
      <div class="hdr"><span style="font-weight:700;color:${c.fg}">TrustDownload</span><span style="flex:1"></span><span style="font-size:12px;color:${c.dim}">Auto ▾</span><span style="font-size:12px;color:#cf222e;border:1px solid #cf222e;border-radius:6px;padding:3px 10px">Clear all</span></div>
      <div class="chips"><span class="chip on">All</span><span class="chip">Active</span><span class="chip">Done</span><span class="chip">Failed</span></div>
      <div class="list">
        ${row('quarterly-report.pdf', 'Done · 2.4 MB', dark ? '#3fb950' : '#1a7f37', null)}
        ${row('backup.zip', 'Downloading 64% · 148 MB / 230 MB', dark ? '#4493f8' : '#2563eb', 64)}
        ${row('dataset.csv', 'Done · 18 MB', dark ? '#3fb950' : '#1a7f37', null)}
        ${row('installer.exe', 'Failed: NETWORK_FAILED', '#f85149', null)}
      </div>
    </div>
    <div class="side">
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:18px">${tdIcon(56)}<span style="font-size:30px;font-weight:800;color:${c.fg}">TrustDownload</span></div>
      <div style="font-size:17px;color:${c.dim};line-height:1.7;margin-bottom:14px">A lightweight, privacy-first download manager.<br>No ads. No tracking. <b style="color:${c.fg}">Zero network requests</b> — verified by automated tests.</div>
      <div style="font-size:14px;color:${c.dim}">Open source · MIT · 4 permissions only</div>
    </div>
    </body></html>`;
  };
  await shot(page, shotPage('light'), 1280, 800, join(out, 'screenshots', 'store-light.png'));
  await shot(page, shotPage('dark'), 1280, 800, join(out, 'screenshots', 'store-dark.png'));
}

(async () => {
  const context = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    headless: true,
    viewport: { width: 1400, height: 560 },
    args: [],
  });
  const page = await context.newPage();
  await trustjson(page);
  await trustdownload(page);
  await context.close();

  // verify: no alpha in every PNG we just wrote
  const fs = await import('fs');
  const all = [
    'trustjson/store/promo-marquee.png', 'trustjson/store/promo-small.png',
    'trustdownload/store/promo-marquee.png', 'trustdownload/store/promo-small.png',
    'trustdownload/store/screenshots/store-light.png', 'trustdownload/store/screenshots/store-dark.png',
  ];
  for (const p of all) {
    const b = fs.readFileSync(join(WS, p));
    const ct = b[25];
    console.log(p, b.readUInt32BE(16) + 'x' + b.readUInt32BE(20), 'colorType=' + ct, ct === 6 ? 'FAIL: HAS ALPHA' : 'OK no-alpha');
  }
})();

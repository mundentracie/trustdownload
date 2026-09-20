// TrustDownload popup — download list UI.
// ZERO-NETWORK RULE: no fetch/XHR/WebSocket/sendBeacon, ever.
// XSS RULE: all dynamic strings are injected via textContent ONLY (zero innerHTML).
import {
  applyFilter,
  bucketOf,
  categoryOf,
  dayKey,
  fileNameOf,
  formatBytes,
  percentOf,
} from './lib.js';

const $ = (sel) => document.querySelector(sel);
const listEl = $('#list');
const emptyEl = $('#empty');
const modalEl = $('#modal');

const DEFAULTS = { theme: 'auto', filter: 'all', shelf: false };
let prefs = { ...DEFAULTS };
let items = [];
let pendingConfirm = null; // { kind: 'erase-one', id } | { kind: 'erase-all' }

/* ---------- prefs / theme ---------- */

async function loadPrefs() {
  try {
    const stored = await chrome.storage.local.get(Object.keys(DEFAULTS));
    prefs = { ...DEFAULTS, ...stored };
  } catch {
    prefs = { ...DEFAULTS };
  }
}

async function savePrefs() {
  try {
    await chrome.storage.local.set(prefs);
    if (chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({ type: 'prefs-updated' }, () => void chrome.runtime.lastError);
    }
  } catch {
    /* storage unavailable — keep session-only prefs */
  }
}

function applyTheme() {
  const root = $('#app');
  const dark =
    prefs.theme === 'dark' ||
    (prefs.theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  root.dataset.theme = dark ? 'dark' : 'light';
  $('#btn-theme').textContent = prefs.theme.charAt(0).toUpperCase() + prefs.theme.slice(1);
}

async function cycleTheme() {
  const order = ['auto', 'light', 'dark'];
  prefs.theme = order[(order.indexOf(prefs.theme) + 1) % order.length];
  applyTheme();
  await savePrefs();
}

/* ---------- data ---------- */

async function refresh() {
  try {
    items = await chrome.downloads.search({ orderBy: ['-startTime'], limit: 1000 });
  } catch {
    items = [];
  }
  render();
}

/* ---------- rendering ---------- */

function chip(name) {
  const el = document.createElement('span');
  el.className = 'td-fileicon';
  el.textContent = name.slice(0, 4);
  return el;
}

const ICONS = {
  open: [['path', { d: 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6' }], ['polyline', { points: '15 3 21 3 21 9' }], ['line', { x1: '10', y1: '14', x2: '21', y2: '3' }]],
  folder: [['path', { d: 'M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z' }]],
  trash: [['polyline', { points: '3 6 5 6 21 6' }], ['path', { d: 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2' }]],
  pause: [['rect', { x: '6', y: '4', width: '4', height: '16' }], ['rect', { x: '14', y: '4', width: '4', height: '16' }]],
  play: [['polygon', { points: '5 3 19 12 5 21 5 3' }]],
  retry: [['polyline', { points: '1 4 1 10 7 10' }], ['path', { d: 'M3.51 15a9 9 0 1 0 2.13-9.36L1 10' }]],
  x: [['line', { x1: '18', y1: '6', x2: '6', y2: '18' }], ['line', { x1: '6', y1: '6', x2: '18', y2: '18' }]],
};
const SVG_NS = 'http://www.w3.org/2000/svg';
const ICON_FOR_LABEL = { Open: 'open', 'Show in folder': 'folder', Delete: 'trash', Pause: 'pause', Resume: 'play', Cancel: 'x', Retry: 'retry' };

function icon(name) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  for (const [tag, attrs] of ICONS[name]) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    svg.appendChild(el);
  }
  return svg;
}

const ERROR_LABELS = {
  USER_CANCELED: 'Canceled by you',
  USER_SHUTDOWN: 'Stopped (browser closed)',
  NETWORK_FAILED: 'Network error',
  NETWORK_TIMEOUT: 'Network timeout',
  NETWORK_INVALID_REQUEST: 'Invalid request',
  SERVER_FAILED: 'Server error',
  SERVER_FORBIDDEN: 'Server refused (403)',
  SERVER_UNAUTHORIZED: 'Authorization required (401)',
  SERVER_BAD_CONTENT: 'File not found on server (404)',
  FILE_FAILED: 'Could not save file',
  FILE_ACCESS_DENIED: 'Access denied',
  FILE_NO_SPACE: 'Not enough disk space',
  FILE_NAME_TOO_LONG: 'File name too long',
  CRASH: 'Download crashed',
};

function lowerFirstError(e) {
  return String(e).toLowerCase().replace(/_/g, ' ');
}

function act(label, cls, onClick) {
  const b = document.createElement('button');
  b.className = `td-act ${cls || ''}`;
  b.appendChild(icon(ICON_FOR_LABEL[label] || 'open'));
  b.title = label;
  b.setAttribute('aria-label', label);
  b.addEventListener('click', onClick);
  return b;
}

function stateLabel(item) {
  const bucket = bucketOf(item);
  if (bucket === 'active') {
    const pct = percentOf(item);
    return pct === null ? 'Downloading…' : `Downloading ${pct}%`;
  }
  if (bucket === 'done') return 'Done';
  if (bucket === 'failed') return `Failed${item.error ? `: ${ERROR_LABELS[item.error] || lowerFirstError(item.error)}` : ''}`;
  if (bucket === 'stopped') return 'Paused / stopped';
  return item.state;
}

function itemRow(item) {
  const row = document.createElement('div');
  row.className = 'td-item';
  row.dataset.downloadId = String(item.id);

  const name = fileNameOf(item.filename);
  row.appendChild(chip(name));

  const main = document.createElement('div');
  main.className = 'td-main';

  const nameEl = document.createElement('div');
  nameEl.className = 'td-name';
  nameEl.textContent = name; // textContent only — never innerHTML
  main.appendChild(nameEl);

  const meta = document.createElement('div');
  meta.className = 'td-meta';
  const bucket = bucketOf(item);
  meta.classList.add(`td-state-${bucket}`);
  const sizeTxt =
    item.state === 'in_progress' && item.total
      ? `${formatBytes(item.bytesReceived)} / ${formatBytes(item.total)}`
      : formatBytes(item.total);
  meta.textContent = [stateLabel(item), sizeTxt, categoryOf(name)].filter(Boolean).join(' · ');
  main.appendChild(meta);

  if (bucket === 'active') {
    const pct = percentOf(item);
    const bar = document.createElement('div');
    bar.className = 'td-bar';
    const fill = document.createElement('i');
    fill.style.width = `${pct === null ? 4 : pct}%`;
    bar.appendChild(fill);
    main.appendChild(bar);
  }
  row.appendChild(main);

  const actions = document.createElement('div');
  actions.className = 'td-actions';
  if (bucket === 'active') {
    if (item.paused) {
      actions.appendChild(act('Resume', '', () => chrome.downloads.resume(item.id)));
      actions.appendChild(act('Cancel', 'danger', () => chrome.downloads.cancel(item.id)));
    } else {
      actions.appendChild(act('Pause', '', () => chrome.downloads.pause(item.id)));
    }
  } else if (bucket === 'done') {
    actions.appendChild(act('Open', '', () => chrome.downloads.open(item.id)));
    actions.appendChild(act('Show in folder', '', () => chrome.downloads.show(item.id)));
  } else if (bucket === 'failed' || bucket === 'stopped') {
    actions.appendChild(act('Retry', '', () => chrome.downloads.resume(item.id)));
    if (item.exists) {
      actions.appendChild(act('Open', '', () => chrome.downloads.open(item.id)));
    }
  }
  actions.appendChild(
    act('Delete', 'danger', () => {
      pendingConfirm = { kind: 'erase-one', id: item.id };
      openModal(`Remove “${name}” from the list? The file on disk is not touched.`);
    }),
  );
  row.appendChild(actions);
  return row;
}

function render() {
  listEl.textContent = '';
  const visible = applyFilter(items, prefs.filter);
  emptyEl.hidden = visible.length > 0;

  let lastDay = '';
  for (const item of visible) {
    const day = dayKey(item.startTime);
    if (day !== lastDay) {
      lastDay = day;
      const h = document.createElement('div');
      h.className = 'td-day';
      h.textContent = day;
      listEl.appendChild(h);
    }
    listEl.appendChild(itemRow(item));
  }
  // selected chip state
  for (const chipEl of $('#filters').querySelectorAll('.td-chip')) {
    chipEl.setAttribute('aria-selected', String(chipEl.dataset.filter === prefs.filter));
  }
}

/* ---------- modal ---------- */

function openModal(bodyText) {
  $('#modal-body').textContent = bodyText;
  $('#modal-ok').textContent = pendingConfirm?.kind === 'erase-all' ? 'Erase all' : 'Remove';
  modalEl.hidden = false;
}

function closeModal() {
  pendingConfirm = null;
  modalEl.hidden = true;
}

async function confirmAction() {
  if (!pendingConfirm) return closeModal();
  try {
    if (pendingConfirm.kind === 'erase-all') {
      await chrome.downloads.erase({});
    } else {
      await chrome.downloads.erase({ id: pendingConfirm.id });
    }
  } catch {
    /* already gone */
  }
  closeModal();
  await refresh();
}

/* ---------- events ---------- */

$('#btn-theme').addEventListener('click', cycleTheme);
$('#btn-clear').addEventListener('click', () => {
  pendingConfirm = { kind: 'erase-all' };
  openModal('Erase the ENTIRE download history list? Files on disk are not deleted.');
});
$('#modal-cancel').addEventListener('click', closeModal);
$('#modal-ok').addEventListener('click', confirmAction);
modalEl.addEventListener('click', (e) => {
  if (e.target === modalEl) closeModal();
});
$('#filters').addEventListener('click', async (e) => {
  const chipEl = e.target.closest('.td-chip');
  if (!chipEl) return;
  prefs.filter = chipEl.dataset.filter;
  await savePrefs();
  render();
});

// Live updates while the popup is open (event-driven; popup closes = listeners gone).
chrome.downloads.onCreated.addListener(refresh);
chrome.downloads.onChanged.addListener(refresh);
chrome.downloads.onErased.addListener(refresh);

/* ---------- boot ---------- */

(async function init() {
  await loadPrefs();
  applyTheme();
  render();
  await refresh();
})();

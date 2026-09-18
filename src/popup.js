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

function act(label, cls, onClick) {
  const b = document.createElement('button');
  b.className = `td-act ${cls || ''}`;
  b.textContent = label;
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
  if (bucket === 'failed') return `Failed${item.error ? `: ${item.error}` : ''}`;
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

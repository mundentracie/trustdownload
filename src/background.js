// TrustDownload service worker — MV3.
// ZERO-NETWORK RULE: no fetch/XHR/WebSocket/sendBeacon/importScripts, ever.
// Event-driven only: no alarms, no polling, no timers. Every badge update is
// computed from a FRESH chrome.downloads.search() so the count can never drift.
import { badgeCount, fileNameOf, proSubdir } from './lib.js';

const DEFAULTS = {
  theme: 'auto',
  shelf: false,
  filter: 'all',
  pro: false,
  organize: 'off',
  dateFormat: 'month',
  folders: {},
};

async function getPrefs() {
  try {
    const stored = await chrome.storage.local.get(Object.keys(DEFAULTS));
    return { ...DEFAULTS, ...stored };
  } catch {
    return { ...DEFAULTS };
  }
}

async function setShelf(hidden) {
  try {
    // downloads.shelf permission: hide Chrome's bottom download bar when we own the UI.
    await chrome.downloads.setShelfEnabled(!hidden);
  } catch {
    // API unavailable (or called too early) — silently keep native shelf.
  }
}

/** Recount in-progress downloads and repaint the action badge. 宁缺勿错: 0 clears it. */
async function refreshBadge() {
  let count = 0;
  try {
    const items = await chrome.downloads.search({});
    count = badgeCount(items);
  } catch {
    count = 0;
  }
  try {
    await chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
    await chrome.action.setBadgeBackgroundColor({ color: '#2563eb' });
  } catch {
    /* headless / test environments may lack action painting */
  }
}

async function applyShelfPref() {
  const prefs = await getPrefs();
  await setShelf(prefs.shelf);
}

chrome.runtime.onInstalled.addListener(() => {
  applyShelfPref();
  refreshBadge();
});

chrome.runtime.onStartup.addListener(() => {
  applyShelfPref();
  refreshBadge();
});

// Every downloads event → recount from scratch (cheap, exact, drift-proof).
for (const ev of [
  chrome.downloads.onCreated,
  chrome.downloads.onChanged,
  chrome.downloads.onErased,
]) {
  ev.addListener(() => {
    refreshBadge();
  });
}

// Popup asks us to re-apply the shelf setting after the user toggles it.
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === 'prefs-updated') {
    applyShelfPref().then(() => sendResponse({ ok: true }));
    return true; // async sendResponse
  }
  if (msg && msg.type === 'ping') {
    sendResponse({ ok: true });
  }
  return undefined;
});

/* ---------- TrustDownload Pro: auto-organize on download start ---------- */
// Registers ONE onDeterminingFilename listener (Chrome allows max one per extension).
// When rules are off/unlocked-absent we pass the suggestion through untouched, so
// behavior is byte-identical to not having the listener at all.
// ZERO-NETWORK RULE: the subdirectory comes from local rules; nothing is fetched.

async function rulesFor(item) {
  try {
    const stored = await chrome.storage.local.get(['pro', 'organize', 'dateFormat', 'folders']);
    if (!stored.pro) return null;
    return {
      organize: stored.organize || 'off',
      dateFormat: stored.dateFormat || 'month',
      folders: stored.folders || {},
    };
  } catch {
    return null;
  }
}

chrome.downloads.onDeterminingFilename.addListener((item, suggest) => {
  rulesFor(item)
    .then((rules) => {
      if (!rules) {
        suggest(); // accept default path unchanged
        return;
      }
      const subdir = proSubdir(item, rules);
      if (!subdir) {
        suggest(); // no rule matched — keep default location
        return;
      }
      const name = fileNameOf(item.filename);
      suggest({ filename: `${subdir}/${name}`, conflictAction: 'uniquify' });
    })
    .catch(() => suggest()); // never block a download because of an extension error
  return true; // suggest is called asynchronously
});

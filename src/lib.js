// ZERO-NETWORK RULE: this file must never import, fetch, or send anything.
// Pure, testable helpers shared by background.js and popup.js.
// No chrome.* calls here either — callers pass data in and get values back.

/** Human-readable file size. */
export function formatBytes(n) {
  if (typeof n !== 'number' || !isFinite(n) || n < 0) return '';
  if (n < 1024) return `${n} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let v = n;
  let i = -1;
  do { v /= 1024; i++; } while (v >= 1024 && i < units.length - 1);
  return `${v >= 100 ? Math.round(v) : v.toFixed(1)} ${units[i]}`;
}

/** Group key for a download's start time, e.g. "2026-09-18". Used for date sections. */
export function dayKey(isoString) {
  if (!isoString) return 'unknown';
  return String(isoString).slice(0, 10);
}

/** Stable filter buckets by state + error state. */
export function bucketOf(item) {
  if (!item || typeof item !== 'object') return 'other';
  const s = item.state;
  if (s === 'in_progress') return 'active';
  if (s === 'complete') return 'done';
  if (s === 'interrupted') return item.error ? 'failed' : 'stopped';
  return 'other';
}

/** Which items survive a filter chip. */
export function applyFilter(items, filter) {
  if (filter === 'all') return items;
  return items.filter((it) => bucketOf(it) === filter);
}

/**
 * Accurate badge count: number of truly in-progress downloads.
 * Derived from a fresh search on every event — never from a drifting counter.
 */
export function badgeCount(items) {
  return items.filter((it) => it && it.state === 'in_progress').length;
}

/** Filename from a file path, cross-platform. */
export function fileNameOf(path) {
  if (!path) return '(unknown)';
  const i = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
  return i >= 0 ? path.slice(i + 1) : path;
}

/** Simple category from filename extension (for filter chips + icons). */
export function categoryOf(filename) {
  const ext = (filename.match(/\.([a-z0-9]{1,8})$/i) || [])[1];
  const e = (ext || '').toLowerCase();
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'].includes(e)) return 'archive';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(e)) return 'image';
  if (['mp4', 'mkv', 'webm', 'avi', 'mov', 'flv', 'wmv'].includes(e)) return 'video';
  if (['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac'].includes(e)) return 'audio';
  if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'md', 'csv'].includes(e)) return 'doc';
  return 'other';
}

/** Percent downloaded 0..100, or null when unknown. */
export function percentOf(item) {
  if (!item || !item.total || item.total <= 0) return null;
  const p = Math.round(((item.bytesReceived || 0) / item.total) * 100);
  return Math.max(0, Math.min(100, p));
}

/** Escape nothing — popup.js injects ONLY via textContent (Trusted Types/XSS safe). */
export function assertNoHtml(str) {
  if (/[<&>]/.test(String(str))) {
    // caller must not pass untrusted markup; file names are always injected via textContent
    return String(str).replace(/[<&>]/g, '');
  }
  return String(str);
}

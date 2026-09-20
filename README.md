# TrustDownload

**A lightweight, privacy-first download manager for Chrome. Open source, verifiable by tests, zero network requests.**

> Local-first or it doesn't ship.

TrustDownload replaces Chrome's bottom download bar with a clean popup list: pause / resume / cancel, one-click clear (with confirmation), accurate badge, delete confirmation, filters by type and date, and a dark mode that only affects its own UI.

## Why it exists

Every download manager in the Chrome Web Store has the same review history:

- *"causes Chrome to freeze / high RAM"*
- *"no way to clear all downloads at once"*
- *"the badge count is wrong"*
- *"deleted an entry by accident — no confirmation"*
- *"suspected miner / shady data practices"*

TrustDownload is the answer to all five lines. It is built by the same author as [TrustJSON](https://github.com/mundentracie/trustjson) and follows the same three rules:

1. **Local-first** — everything stays on your machine. The extension makes **zero network requests**.
2. **Verifiable** — the proof is an automated test, not a promise. See below.
3. **Minimal** — 4 permissions, nothing more. No `tabs`, no `webRequest`, no host permissions, no background page doing who-knows-what.

## The proof: zero network requests

```ts
// e2e/extension.spec.ts — runs on every push (CI included)
context.on('request', (request) => {
  if (
    !url.startsWith('chrome-extension://') &&
    !url.startsWith('devtools://') &&
    !url.startsWith('http://localhost:8080')
  ) external.push(url);
});
// ... after real UI interactions with real downloads in flight:
expect(external).toEqual([]);
```

While the popup is being used **and real downloads are running**, the extension makes zero external requests. `npm run test:e2e` fails if that ever stops being true.

## Permissions (and why)

| Permission | Why it is needed |
|---|---|
| `downloads` | Read and control the download list (pause/resume/cancel/erase) — the core feature |
| `downloads.open` | The "Open" button on a finished download |
| `downloads.shelf` | Optionally hide Chrome's bottom download bar while TrustDownload manages the list |
| `storage` | Save your theme and filter preference locally |

**Not requested:** `tabs`, `webRequest`, `host_permissions`, `cookies`, `history`, `nativeMessaging`, `offscreen`, `alarms`. No content scripts run on any page.

## Features

- Download list in the toolbar popup (grouped by date, searchable by eye, unlimited history)
- Pause / resume / cancel; retry failed downloads
- **One-click "Clear all"** — with a confirmation step
- **Delete confirmation** on every item (files on disk are never touched)
- **Accurate badge** — recounted from a fresh query on every event, never a drifting counter
- Filters: All / Active / Done / Failed
- Dark mode that works (auto / light / dark, persisted)
- Remembers your last filter choice

## TrustDownload Pro — auto-organize (one-time purchase)

The free version is the full download manager. **Pro** adds one thing: automatic folder organization for finished downloads.

- Sort by **file type** (`Images/`, `Documents/`, …), **date** (`2026-09/`), or **both** (`Documents/2026-09/`)
- Every folder name is editable; file names are never altered
- Implemented via `chrome.downloads.onDeterminingFilename` — the destination is chosen as the download starts. Nothing is moved after the fact, nothing is scanned, nothing is uploaded.
- **Offline licensing**: a Pro key is an ECDSA-P256 signature over the license id, verified locally with WebCrypto against a public key embedded in the source. No account, no server, no activation call — a paid feature that is provably unable to phone home.
- Key generator: `node scripts/make-license.mjs secrets/private.jwk.json` (seller-side only)

## Not in scope (by design)

No multi-threaded acceleration, no batch/sniffer scraping, no torrents, no video-site downloading. These are the features that force other managers to ask for 13–14 permissions. We would rather be boring and trustworthy.

## Install

Chrome Web Store: _coming soon (under review)_

From source:

```bash
git clone https://github.com/mundentracie/trustdownload.git
cd trustdownload
npm install
npm run build        # -> dist/
npm run verify       # 30+ local checks: permissions, zero-network audit, unit tests
npm run test:e2e     # real Chromium, real downloads, zero-network proof
```

Then load `dist/` via `chrome://extensions` → Developer mode → **Load unpacked**.

## Privacy

See [PRIVACY.md](PRIVACY.md). Short version: nothing leaves your machine; settings live in `chrome.storage.local` (theme, filter, shelf preference). No analytics, no error reporting, no accounts.

## Status

- [x] v0.1.0 — MVP: list, pause/resume/cancel, clear all, filters, badge, dark mode
- [x] v0.2.0 — Pro: auto-organize rules engine + offline license activation
- [ ] Chrome Web Store review
- [ ] "Save to last-used folder" preference
- [ ] Export history to CSV

## License

[MIT](LICENSE) — do anything, just keep the notice.

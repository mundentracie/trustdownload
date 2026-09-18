# Privacy Policy — TrustDownload

_Last updated: 2026-09-18_

TrustDownload makes **zero network requests**. This is enforced by an automated test (`e2e/extension.spec.ts` asserts no external requests while the UI is used and downloads are running).

## Data handling

| Question | Answer |
|---|---|
| Do you collect personal data? | No |
| Do you use analytics / telemetry? | No |
| Do you sell or share data? | No |
| Do you require an account? | No |
| Do you read browsing history? | No (`history` permission is not requested) |
| Can you see web content? | No (no content scripts, no `webRequest`, no host permissions) |

## Data stored locally

Only UI preferences, in `chrome.storage.local` (never synced, never leaves the device):

| Key | Type | Meaning |
|---|---|---|
| `theme` | `"auto"` \| `"light"` \| `"dark"` | Popup color theme |
| `filter` | `"all"` \| `"active"` \| `"done"` \| `"failed"` | Last selected filter chip |
| `shelf` | boolean | Whether Chrome's native download bar is hidden |

Download history itself is Chrome's own `chrome.downloads` store; TrustDownload only reads it to display the list and can erase entries at your request ("Clear all" / per-item delete). **Deleting a list entry never deletes the file from disk.**

## Third parties

None. No CDNs, no fonts, no error reporting, no affiliate links, no ads.

## Source code

MIT-licensed and auditable: https://github.com/mundentracie/trustdownload

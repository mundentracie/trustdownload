# TrustDownload — Chrome Web Store 上架材料（v0.1.1）

> 提交地址：https://chrome.google.com/webstore/devconsole（同账号，**免 $5**，注册费一次性已缴）
> 上传包：`trustdownload/trustdownload-v0.1.1-store.zip`（11.8KB，含 v0.1.1 图标按钮 + 错误文案修复）
> 截图：`trustdownload/store/screenshots/store-light.png`、`store-dark.png`（1280×800）
> 宣传图：`store/promo-small.png`（440×280）、`store/promo-marquee.png`（1400×560）
> ⚠️ 账号发布限额 2 个：本件提交后槽位用满，勿再新建 item

---

## Store listing

**Name**（≤45 字符，实测 43）
```
TrustDownload — Open Source Download Manager
```

**Summary**（≤132 字符，实测 129）
```
Privacy-first download manager. Open source, no ads, no tracking, zero network requests. Lightweight, accurate badge, dark mode.
```

**Category**: Developer Tools
**Language**: English (United States)

**Description**
```
TrustDownload manages your download list — locally, lightly, and with zero network requests.

WHY TRUSTDOWNLOAD EXISTS
Popular download managers freeze, eat RAM, lose accurate badge counts, delete records without asking, or raise tracking concerns. TrustDownload is the open-source (MIT), auditable alternative: every line of code is on GitHub, and an automated end-to-end test proves the extension makes zero external requests.

FEATURES
• Full download history in a compact popup — no limit on how far back it goes
• Grouped by day, filter chips: All / Active / Done / Failed
• Pause, resume, cancel, and retry — right on each row
• One-click "Clear all" and per-item delete, both with confirmation dialogs (files on disk are never touched)
• Accurate toolbar badge — recount on every download event, never drifts
• Open file / Show in folder
• Light / dark / auto theme (dark mode done right, the first time)
• Optional: hide Chrome's native download shelf (toggleable)
• Clear, human-readable error messages instead of raw error codes

PRIVACY (the whole point)
• ZERO network requests — verified by an automated test in our repository
• No analytics, no tracking, no ads, no affiliate code
• Your download history stays on your device, always
• The only stored preferences are your theme and filter choice (chrome.storage.local)
• Fully open source under MIT: https://github.com/mundentracie/trustdownload

What it deliberately does NOT do: no video sniffing, no BitTorrent, no multi-thread "acceleration", no fetching pages for links. It is a download manager, full stop.
```

---

## Privacy tab（提交时的隐私问卷答案）

**Single purpose description**
```
Displays the browser's download history in one place and lets the user pause, resume, cancel, erase, or reopen downloads — entirely on-device.
```

**Do you collect or use user data?** → No（全部选 No：不收集个人数据、不用 creditworthiness、不转让数据、不为无关用途、不卖数据）

**Permission justifications**

| 权限 | 理由（英文，可直接粘贴） |
|---|---|
| `downloads` | Required to read the browser's download list, display it in the extension popup, compute the badge count, and perform user-requested actions (pause, resume, cancel, retry, erase records). All data remains on-device. |
| `downloads.open` | Used only when the user clicks the "Open file" button on a completed download row, to open that file with the system default application. |
| `downloads.shelf` | Used to let the user optionally hide Chrome's native download shelf, so the extension's popup can serve as the single download UI. The toggle is off by default behavior preserved. |
| `storage` | Stores the user's theme preference (light/dark/auto) and last selected filter locally via chrome.storage.local. No other data is stored. |

**Data usage disclosures**: 全部不勾（无任何数据收集）

---

## 提交步骤（你本人操作，约 15 分钟）

1. 打开 https://chrome.google.com/webstore/devconsole（已登录 mundentracie，注册费已缴）
2. **New item** → 上传 `trustdownload-v0.1.1-store.zip`（注意是 0.1.1）
3. **Store listing** 标签：粘贴 Name / Summary / Description；上传 2 张截图 + 小宣传图（440×280）+ 顶部宣传图（1400×560）；官方网址 = `https://github.com/mundentracie/trustdownload`，支持页 = `.../issues`；类别 = Developer Tools；语言 = English (United States)
4. **Privacy** 标签：按上面问卷答案填写 + 4 条权限理由逐条粘贴
5. **Distribution**: Public
6. Submit for review → 若弹"发布将被推迟"警告属正常（downloads 权限触发深入审核），直接提交；审核备注可用下段英文

**审核备注（如有 Permission justification 备注框）**
```
TrustDownload is an open-source download manager. The downloads permissions are used solely to display the user's download history and perform user-initiated actions locally. The extension makes zero network requests (verified by automated e2e tests in the public repo: https://github.com/mundentracie/trustdownload). No data is ever collected or transmitted.
```

## 审核风险预判（低）

- 🟢 无 host_permissions、无 content script、无远程代码；downloads 权限是下载管理器的标准配置，审核员熟悉这类工具
- 🟡 4 项权限比 TrustJSON 多，会触发比 JSON 格式器更仔细的权限审阅，理由表已逐条备好；被问询时指向 GitHub 的 e2e 零网络证明测试
- 🔴 若被拒，常见原因是"权限与功能不匹配"——回复时强调 downloads.open 仅绑定 Open 按钮、downloads.shelf 仅用于可关闭的原生底栏接管

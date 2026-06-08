# Gallery Reader

![Version](https://img.shields.io/badge/version-2.5.6-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Platform](https://img.shields.io/badge/platform-Chrome%20%7C%20Edge%20(Chromium)-brightgreen)

Gallery Reader 是一个 Chrome / Edge 浏览器扩展，为 E-Hentai、ExHentai、nhentai 和 hitomi.la 提供多站点阅读体验。

## 中文

### 功能

- 支持 E-Hentai / ExHentai MPV 页面自动接管。
- 支持 E-Hentai / ExHentai Gallery 页面按钮启动和缩略图直达。
- 支持 nhentai.net、nhentai.xxx 和 hitomi.la。
- 支持横向单页、纵向单页、横向连续、纵向连续阅读模式。
- 支持真实图片加载进度、阅读进度记忆、智能预加载、缩略图懒加载和自动翻页。
- 根据浏览器/系统语言自动切换中文或英文界面。

### 安装与调试

1. 打开 `chrome://extensions/` 或 `edge://extensions/`。
2. 开启“开发者模式”。
3. 选择“加载已解压的扩展程序”，加载本仓库目录。
4. 修改代码后，在扩展管理页点击此扩展卡片上的刷新按钮。
5. 如果需要调试日志，打开扩展设置页并启用 Debug mode。

### 构建

```powershell
powershell -ExecutionPolicy Bypass -File scripts\build.ps1
```

构建产物会生成到 `dist/gallery-reader-v{version}.zip`。

### 最新更新

#### v2.5.6 - 2026-06-08

- 修复 hitomi.la 官方 reader 图片 CDN 子域计算：AVIF/WebP 现在使用 `a1/a2` 与 `w1/w2`，不再错误生成 `aa/ba`。
- hitomi.la 详情页的 Read Online 会先进入原站 `/reader/{id}.html#page`，再由扩展接管，保留原站 reader 加载语境。
- hitomi.la 阅读时关闭主动相邻页预取和真实图缩略图加载，避免一次性触发大量 CDN 请求导致连接关闭或超时。
- 保留原图候选地址作为回退，并继续通过后台脚本获取 `gg.js` 与 `galleries/{id}.js`。

## English

Gallery Reader is a Chrome / Edge extension that provides a multi-site reading experience for E-Hentai, ExHentai, nhentai, and hitomi.la.

### Features

- Automatically takes over E-Hentai / ExHentai MPV pages.
- Adds launch buttons and thumbnail deep-link handling on E-Hentai / ExHentai gallery pages.
- Supports nhentai.net, nhentai.xxx, and hitomi.la.
- Supports single horizontal, single vertical, continuous horizontal, and continuous vertical reading modes.
- Includes real image loading progress, reading progress memory, smart preloading, lazy thumbnails, and auto paging.
- Switches UI language automatically between Chinese and English based on browser/system language.

### Install and Debug

1. Open `chrome://extensions/` or `edge://extensions/`.
2. Enable Developer mode.
3. Click "Load unpacked" and select this repository folder.
4. After changing code, click the reload button on this extension card.
5. For logs, open the extension options page and enable Debug mode.

### Build

```powershell
powershell -ExecutionPolicy Bypass -File scripts\build.ps1
```

The release package is generated at `dist/gallery-reader-v{version}.zip`.

### Latest Update

#### v2.5.6 - 2026-06-08

- Fixed hitomi.la reader CDN subdomains: AVIF/WebP now use `a1/a2` and `w1/w2` instead of the incorrect `aa/ba`.
- The hitomi.la detail page Read Online entry now navigates to the native `/reader/{id}.html#page` page before the extension takes over, preserving the native reader context.
- Disabled proactive adjacent-page prefetching and full-image thumbnail loading for hitomi.la to avoid flooding the CDN with simultaneous requests.
- Original-image candidates remain as fallbacks, while `gg.js` and `galleries/{id}.js` are still fetched through the background service worker.

## License

MIT License

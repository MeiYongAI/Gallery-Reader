# Gallery Reader

![Version](https://img.shields.io/badge/version-2.5.9-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Platform](https://img.shields.io/badge/platform-Chrome%20%7C%20Edge%20(Chromium)-brightgreen)

Gallery Reader is a Chrome / Edge extension that provides a multi-site reading experience for E-Hentai, ExHentai, nhentai, and hitomi.la.

## 中文

### 功能

- 支持 E-Hentai / ExHentai MPV 页面自动接管。
- 支持 E-Hentai / ExHentai Gallery 页面按钮启动和缩略图直达。
- 支持 nhentai.net、nhentai.xxx 和 hitomi.la。
- 支持横向单页、纵向单页、横向连续、纵向连续阅读模式。
- 支持真实图片加载进度、阅读进度记忆、智能预加载、缩略图懒加载和自动翻页。
- 根据浏览器或系统语言自动切换中文 / 英文界面。

### 安装与调试

1. 打开 `chrome://extensions/` 或 `edge://extensions/`。
2. 开启“开发者模式”。
3. 选择“加载已解压的扩展程序”，加载本仓库目录。
4. 修改代码后，在扩展管理页点击此扩展卡片上的刷新按钮。
5. 如需调试日志，打开扩展设置页并启用 Debug mode。

### 构建

```powershell
powershell -ExecutionPolicy Bypass -File scripts\build.ps1
```

构建产物会生成到 `dist/gallery-reader-v{version}.zip`。

### 最新更新

#### v2.5.9 - 2026-06-08

- 修复 hitomi.la 缩略图在阅读器中批量 404 的问题，为图片 CDN 请求补充 hitomi.la Referer。
- 缩略图改为复刻原站画廊页的 `<picture>` / AVIF / WebP 小图加载方式，并按设备像素比只请求必要小图。
- 优化 hitomi.la 缩略图加载队列，避免未加载成功就标记完成，并减少失败重试和无效请求。
- 缩短 hitomi.la 主图节流间隔，并只预取相邻页，改善连续阅读时的等待感。

## English

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

#### v2.5.9 - 2026-06-08

- Fixed bulk hitomi.la thumbnail 404s in the reader by attaching the required hitomi.la Referer for image CDN requests.
- Matched the native hitomi.la gallery thumbnail flow with `<picture>`, AVIF sources, and WebP fallback thumbnails.
- Improved the hitomi.la thumbnail queue so thumbnails are only marked loaded after a successful image load.
- Reduced hitomi.la main-image throttling and limited prefetching to nearby pages for snappier reading.

## License

MIT License

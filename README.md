# Gallery Reader

![Version](https://img.shields.io/badge/version-2.5.10-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Platform](https://img.shields.io/badge/platform-Chrome%20%7C%20Edge%20(Chromium)-brightgreen)

Gallery Reader is a Chrome / Edge extension that provides a multi-site reading experience for E-Hentai, ExHentai, nhentai, hitomi.la, and Wnacg.

## 中文

### 功能

- 支持 E-Hentai / ExHentai MPV 页面自动接管。
- 支持 E-Hentai / ExHentai Gallery 页面按钮启动和缩略图直达。
- 支持 nhentai.net、nhentai.xxx、hitomi.la 和紳士漫畫 / Wnacg。
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

#### v2.5.10 - 2026-06-08

- 新增紳士漫畫 / Wnacg 支持，覆盖 `wnacg.com`、`wnacg.ru`、`wn07` 和 `wn06` 镜像域名。
- 接管原站“下拉閱讀”、阅读页和单页图片页入口，启动后直接进入 Gallery Reader。
- 使用 Wnacg 的 `photos-item-aid-*` 图片列表和画廊分页缩略图，过滤站点装饰图并统一改用 HTTPS 图片地址。
- 为 Wnacg 缩略图增加直链加载路径，避免用大图生成缩略图导致加载慢。

## English

### Features

- Automatically takes over E-Hentai / ExHentai MPV pages.
- Adds launch buttons and thumbnail deep-link handling on E-Hentai / ExHentai gallery pages.
- Supports nhentai.net, nhentai.xxx, hitomi.la, and Wnacg.
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

#### v2.5.10 - 2026-06-08

- Added Wnacg support for `wnacg.com`, `wnacg.ru`, and the `wn07` / `wn06` mirror domains.
- Takes over the native drop-down reader, slide reader pages, and single image pages.
- Uses Wnacg `photos-item-aid-*` image lists plus gallery-page thumbnails, filters decorative site images, and normalizes image URLs to HTTPS.
- Adds direct thumbnail loading for Wnacg so the reader does not generate thumbnails from full-size images.

## License

MIT License

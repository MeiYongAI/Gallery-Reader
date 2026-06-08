/**
 * Wnacg Bootstrap Script
 * Build page data from Wnacg gallery endpoints and launch Gallery Reader.
 */

(function() {
  'use strict';

  if (window.ehWnacgBootstrapInjected) {
    return;
  }
  window.ehWnacgBootstrapInjected = true;

  if (!/^\/photos-(?:index(?:-page-\d+)?-aid-\d+|slide-aid-\d+|view-id-\d+)\.html$/i.test(window.location.pathname || '')) {
    return;
  }

  const dataCache = new Map();
  const dataPromises = new Map();
  let launchInFlight = false;

  function debugLog(...args) {
    try { console.log(...args); } catch {}
  }

  function appName() {
    return window.MGR_I18N && typeof window.MGR_I18N.t === 'function'
      ? window.MGR_I18N.t('appName')
      : 'Gallery Reader';
  }

  function ensureReaderContentScript() {
    if (window.ehModernReaderInjected) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      try {
        if (!chrome || !chrome.runtime || typeof chrome.runtime.sendMessage !== 'function') {
          reject(new Error('Extension runtime is unavailable'));
          return;
        }

        chrome.runtime.sendMessage({ action: 'ensureReaderContentScript' }, (response) => {
          const lastError = chrome.runtime.lastError;
          if (lastError) {
            reject(new Error(lastError.message));
            return;
          }

          if (!response || response.success !== true) {
            reject(new Error((response && response.error) || 'Failed to inject reader script'));
            return;
          }

          resolve();
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  function waitForBody(timeoutMs = 3000) {
    if (document.body) return Promise.resolve();

    return new Promise((resolve) => {
      let done = false;
      let observer = null;
      let timer = null;

      const finish = () => {
        if (done) return;
        done = true;
        if (observer) observer.disconnect();
        if (timer) clearTimeout(timer);
        resolve();
      };

      try {
        observer = new MutationObserver(() => {
          if (document.body) finish();
        });
        observer.observe(document.documentElement, { childList: true, subtree: true });
      } catch {}

      timer = setTimeout(finish, timeoutMs);
    });
  }

  function onReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  }

  function getPathInfo() {
    const path = window.location.pathname || '';
    const hashPage = parseInt((window.location.hash || '').replace('#', ''), 10);
    const normalizedHashPage = Number.isFinite(hashPage) && hashPage > 0 ? hashPage : null;

    let match = path.match(/^\/photos-index(?:-page-(\d+))?-aid-(\d+)\.html$/i);
    if (match) {
      return {
        aid: parseInt(match[2], 10),
        galleryPage: match[1] ? parseInt(match[1], 10) : 1,
        startPage: normalizedHashPage,
        isIndexPage: true,
        isSlidePage: false,
        isViewPage: false
      };
    }

    match = path.match(/^\/photos-slide-aid-(\d+)\.html$/i);
    if (match) {
      return {
        aid: parseInt(match[1], 10),
        startPage: normalizedHashPage || 1,
        isIndexPage: false,
        isSlidePage: true,
        isViewPage: false
      };
    }

    match = path.match(/^\/photos-view-id-(\d+)\.html$/i);
    if (match) {
      return {
        aid: null,
        viewId: parseInt(match[1], 10),
        startPage: null,
        isIndexPage: false,
        isSlidePage: false,
        isViewPage: true
      };
    }

    return null;
  }

  function normalizeUrl(url) {
    let value = String(url || '').trim();
    if (!value) return '';
    value = value.replace(/&amp;/g, '&');

    if (/^http:\/\//i.test(value)) {
      return `https://${value.replace(/^http:\/\//i, '')}`;
    }

    if (/^https:\/\//i.test(value)) {
      return value;
    }

    if (/^\/{2,}/.test(value)) {
      return `https://${value.replace(/^\/+/, '')}`;
    }

    if (value.startsWith('/')) {
      try { return new URL(value, window.location.origin).href; } catch {}
    }

    return value;
  }

  function galleryPageUrl(aid, page) {
    const normalizedPage = Number.isFinite(page) && page > 1 ? Math.floor(page) : 1;
    return normalizedPage === 1
      ? `${window.location.origin}/photos-index-aid-${aid}.html`
      : `${window.location.origin}/photos-index-page-${normalizedPage}-aid-${aid}.html`;
  }

  function galleryUrl(aid) {
    return galleryPageUrl(aid, 1);
  }

  function itemDataUrl(aid) {
    return `${window.location.origin}/photos-item-aid-${aid}.html`;
  }

  function legacyGalleryDataUrl(aid) {
    return `${window.location.origin}/photos-gallery-aid-${aid}.html`;
  }

  async function fetchText(url) {
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
      referrer: window.location.href,
      referrerPolicy: 'strict-origin-when-cross-origin'
    });

    const text = await response.text();
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${text.slice(0, 120)}`);
    }

    return text;
  }

  function decodeHtml(text) {
    const el = document.createElement('textarea');
    el.innerHTML = String(text || '');
    return el.value;
  }

  function cleanTitle(title) {
    return decodeHtml(title)
      .replace(/\s+-\s+(?:列表|紳士漫畫|绅士漫画).*$/i, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function titleFromDocument(doc) {
    const heading = doc.querySelector('#bodywrap h2, h2');
    if (heading && heading.textContent.trim()) {
      return cleanTitle(heading.textContent);
    }

    const crumb = Array.from(doc.querySelectorAll('#bread a[href*="photos-index-aid-"]')).pop();
    if (crumb && crumb.textContent.trim()) {
      return cleanTitle(crumb.textContent);
    }

    return cleanTitle(doc.title || document.title || 'Wnacg Gallery');
  }

  function isContentImageUrl(url) {
    return /^https?:\/\//i.test(url)
      && /\.(?:jpg|jpeg|png|gif|webp|avif)(?:[?#].*)?$/i.test(url)
      && /\/data\/\d+\//i.test(url)
      && !/\/themes\//i.test(url);
  }

  function captionFromUrl(url, fallbackIndex) {
    try {
      const path = new URL(url).pathname;
      const file = path.split('/').pop() || '';
      return decodeURIComponent(file.replace(/\.[^.]+$/, '')) || String(fallbackIndex + 1);
    } catch {
      return String(fallbackIndex + 1);
    }
  }

  function parseItemData(text) {
    const match = text.match(/["']?page_url["']?\s*:\s*\[([\s\S]*?)\]/i);
    if (!match) return [];

    const urls = [];
    const seen = new Set();
    const re = /"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'/g;
    let m;
    while ((m = re.exec(match[1])) !== null) {
      let raw = m[1] || m[2] || '';
      try { raw = JSON.parse(`"${raw.replace(/"/g, '\\"')}"`); } catch {}
      const url = normalizeUrl(raw);
      if (!isContentImageUrl(url) || seen.has(url)) continue;
      seen.add(url);
      urls.push({ url, caption: captionFromUrl(url, urls.length) });
    }

    return urls;
  }

  function parseLegacyGalleryData(text) {
    const pages = [];
    const seen = new Set();
    const re = /url\s*:\s*(?:fast_img_host\s*\+\s*)?"([^"]+)"/g;
    let m;
    while ((m = re.exec(text)) !== null) {
      const url = normalizeUrl(m[1]);
      if (!isContentImageUrl(url) || seen.has(url)) continue;
      seen.add(url);
      pages.push({ url, caption: captionFromUrl(url, pages.length) });
    }
    return pages;
  }

  function parseThumbsFromHtml(html, baseUrl) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const anchors = Array.from(doc.querySelectorAll('.gallary_wrap .pic_box a[href*="photos-view-id-"], .gallary_item a[href*="photos-view-id-"]'));
    const thumbs = [];
    const seen = new Set();

    anchors.forEach((anchor) => {
      const href = anchor.getAttribute('href') || '';
      const idMatch = href.match(/photos-view-id-(\d+)\.html/i);
      const viewId = idMatch ? parseInt(idMatch[1], 10) : null;
      const img = anchor.querySelector('img');
      const rawUrl = img
        ? (img.getAttribute('data-original') || img.getAttribute('data-src') || img.getAttribute('src') || '')
        : '';
      const thumbUrl = normalizeUrl(rawUrl);
      const key = viewId || thumbUrl;
      if (!thumbUrl || !key || seen.has(key)) return;
      seen.add(key);
      thumbs.push({
        viewId,
        thumbUrl,
        caption: img ? (img.getAttribute('alt') || '') : ''
      });
    });

    return {
      title: titleFromDocument(doc),
      thumbs,
      url: baseUrl
    };
  }

  function parseCurrentGalleryPage(aid) {
    const info = getPathInfo();
    if (!info || !info.isIndexPage || info.aid !== aid) return null;
    try {
      const parsed = parseThumbsFromHtml(document.documentElement.outerHTML || '', window.location.href);
      parsed.page = Number.isFinite(info.galleryPage) && info.galleryPage > 0 ? info.galleryPage : 1;
      return parsed;
    } catch {
      return null;
    }
  }

  async function fetchGalleryThumbPage(aid, page) {
    const url = galleryPageUrl(aid, page);
    const html = await fetchText(url);
    const parsed = parseThumbsFromHtml(html, url);
    parsed.page = page;
    return parsed;
  }

  async function resolveThumbnails(aid, pageCount) {
    const currentParsed = parseCurrentGalleryPage(aid);
    const firstParsed = currentParsed && currentParsed.page === 1
      ? currentParsed
      : await fetchGalleryThumbPage(aid, 1);
    const firstThumbs = firstParsed && Array.isArray(firstParsed.thumbs) ? firstParsed.thumbs : [];
    const perPage = firstThumbs.length > 0 ? firstThumbs.length : 12;
    const maxPages = Math.min(80, Math.max(1, Math.ceil(pageCount / perPage)));

    const pageResults = new Map([[1, firstParsed]]);
    if (currentParsed && currentParsed.page && currentParsed.page !== 1) {
      pageResults.set(currentParsed.page, currentParsed);
    }
    const requests = [];
    for (let page = 2; page <= maxPages; page++) {
      if (pageResults.has(page)) continue;
      requests.push(
        fetchGalleryThumbPage(aid, page)
          .then((parsed) => pageResults.set(page, parsed))
          .catch((error) => {
            debugLog('[Gallery Reader] Wnacg thumbnail page failed:', page, error && error.message ? error.message : error);
          })
      );
    }

    await Promise.all(requests);

    const thumbs = [];
    const seen = new Set();
    for (let page = 1; page <= maxPages; page++) {
      const parsed = pageResults.get(page);
      if (!parsed || !Array.isArray(parsed.thumbs)) continue;
      for (const item of parsed.thumbs) {
        const key = item.viewId || item.thumbUrl;
        if (!key || seen.has(key)) continue;
        seen.add(key);
        thumbs.push(item);
        if (thumbs.length >= pageCount) break;
      }
      if (thumbs.length >= pageCount) break;
    }

    return {
      title: firstParsed && firstParsed.title ? firstParsed.title : '',
      thumbs
    };
  }

  async function resolvePages(aid) {
    try {
      const text = await fetchText(itemDataUrl(aid));
      const pages = parseItemData(text);
      if (pages.length > 0) return pages;
    } catch (error) {
      debugLog('[Gallery Reader] Wnacg item endpoint failed:', error && error.message ? error.message : error);
    }

    const legacyText = await fetchText(legacyGalleryDataUrl(aid));
    return parseLegacyGalleryData(legacyText);
  }

  async function resolveSiteData(aid) {
    if (dataCache.has(aid)) return dataCache.get(aid);
    if (dataPromises.has(aid)) return dataPromises.get(aid);

    const promise = (async () => {
      const pages = await resolvePages(aid);
      if (!Array.isArray(pages) || pages.length === 0) {
        throw new Error('Wnacg image list is empty');
      }

      const thumbData = await resolveThumbnails(aid, pages.length).catch((error) => {
        debugLog('[Gallery Reader] Wnacg thumbnails failed:', error && error.message ? error.message : error);
        return { title: '', thumbs: [] };
      });

      const data = {
        aid,
        pages,
        thumbs: thumbData.thumbs || [],
        title: thumbData.title || cleanTitle(document.title || '') || 'Wnacg Gallery'
      };
      dataCache.set(aid, data);
      return data;
    })().finally(() => {
      dataPromises.delete(aid);
    });

    dataPromises.set(aid, promise);
    return promise;
  }

  function aidFromCurrentDocument() {
    const info = getPathInfo();
    if (info && info.aid) return info.aid;

    const candidates = Array.from(document.querySelectorAll('a[href*="photos-index-aid-"], link[href*="feed-index-aid-"]'));
    for (const node of candidates) {
      const href = node.getAttribute('href') || '';
      const match = href.match(/(?:photos-index|feed-index)-aid-(\d+)\.html/i);
      if (match) return parseInt(match[1], 10);
    }

    const html = document.documentElement ? document.documentElement.outerHTML : '';
    const match = html.match(/(?:photos-index|feed-index)-aid-(\d+)\.html/i);
    return match ? parseInt(match[1], 10) : null;
  }

  function startPageFromViewDocument(viewId) {
    const select = document.querySelector('select.pageselect');
    if (select) {
      if (select.selectedIndex >= 0) return select.selectedIndex + 1;
      const options = Array.from(select.querySelectorAll('option'));
      const byValue = options.findIndex((option) => String(option.value) === String(viewId));
      if (byValue >= 0) return byValue + 1;
      const bySelectedAttr = options.findIndex((option) => option.hasAttribute('selected'));
      if (bySelectedAttr >= 0) return bySelectedAttr + 1;
    }

    const img = document.querySelector('#picarea, #photo_body img.photo, #imgarea img');
    const alt = img ? (img.getAttribute('alt') || '') : '';
    const altMatch = alt.match(/^(\d{1,4})(?:[_\s.-]|$)/);
    if (altMatch) {
      const page = parseInt(altMatch[1], 10);
      if (Number.isFinite(page) && page > 0) return page;
    }

    return null;
  }

  function buildReaderData(siteData, startAt, viewId) {
    const viewIdPages = new Map();
    siteData.thumbs.forEach((thumb, index) => {
      if (thumb && Number.isFinite(thumb.viewId)) {
        viewIdPages.set(thumb.viewId, index + 1);
      }
    });

    let normalizedStart = Number.isFinite(startAt) && startAt > 0 ? Math.floor(startAt) : null;
    if (!normalizedStart && Number.isFinite(viewId) && viewIdPages.has(viewId)) {
      normalizedStart = viewIdPages.get(viewId);
    }

    const imagelist = siteData.pages.map((page, index) => {
      const thumb = siteData.thumbs[index] || null;
      const thumbUrls = [];
      if (thumb && thumb.thumbUrl) thumbUrls.push(thumb.thumbUrl);

      return {
        n: page.caption || String(index + 1),
        url: page.url,
        altUrls: [],
        thumbUrl: thumb ? thumb.thumbUrl : '',
        thumbUrls,
        viewId: thumb ? thumb.viewId : null
      };
    });

    const pageCount = imagelist.length;
    if (!normalizedStart || normalizedStart < 1 || normalizedStart > pageCount) {
      normalizedStart = undefined;
    }

    return {
      imagelist,
      imageSizes: [],
      pagecount: pageCount,
      gid: `wnacg_${siteData.aid}`,
      mpvkey: `wnacg_${siteData.aid}`,
      gallery_url: galleryUrl(siteData.aid),
      title: siteData.title || 'Wnacg Gallery',
      source: 'wnacg',
      startAt: normalizedStart
    };
  }

  async function launchReader(options = {}) {
    if (launchInFlight) return;
    launchInFlight = true;

    try {
      const aid = Number.isFinite(options.aid) ? options.aid : aidFromCurrentDocument();
      if (!Number.isFinite(aid)) {
        throw new Error('Unable to detect Wnacg gallery id');
      }

      const siteData = await resolveSiteData(aid);
      const data = buildReaderData(siteData, options.startAt, options.viewId);
      if (!data || !Array.isArray(data.imagelist) || data.imagelist.length === 0) {
        throw new Error('Wnacg reader data is empty');
      }

      window.__ehReaderData = data;
      window.__ehGalleryBootstrap = {
        enabled: true,
        fetchPageImageUrl: async function(page) {
          const entry = data.imagelist[page];
          return {
            pageNumber: page + 1,
            pageUrl: entry ? entry.url : '',
            imgkey: ''
          };
        }
      };

      await ensureReaderContentScript();
      await waitForBody();
      document.dispatchEvent(new CustomEvent('ehGalleryReaderReady', { detail: data }));
      debugLog('[Gallery Reader] Wnacg reader event dispatched');
    } catch (error) {
      removeReaderBootMask();
      console.warn('[Gallery Reader] Wnacg launch failed:', error && error.message ? error.message : error);
    } finally {
      launchInFlight = false;
    }
  }

  function removeReaderBootMask() {
    try {
      document.documentElement.classList.remove('gallery-reader-wnacg-boot');
      const style = document.getElementById('gallery-reader-wnacg-boot-style');
      if (style) style.remove();
    } catch {}
  }

  function installReaderBootMask() {
    const info = getPathInfo();
    if (!info || (!info.isSlidePage && !info.isViewPage)) return;

    try {
      document.documentElement.classList.add('gallery-reader-wnacg-boot');

      if (!document.getElementById('gallery-reader-wnacg-boot-style')) {
        const style = document.createElement('style');
        style.id = 'gallery-reader-wnacg-boot-style';
        style.textContent = [
          'html.gallery-reader-wnacg-boot,',
          'html.gallery-reader-wnacg-boot body {',
          '  background: #111317 !important;',
          '}',
          'html.gallery-reader-wnacg-boot body > :not(#eh-reader-container) {',
          '  visibility: hidden !important;',
          '}',
          'html.gallery-reader-wnacg-boot #eh-reader-container,',
          'html.gallery-reader-wnacg-boot #eh-reader-container * {',
          '  visibility: visible !important;',
          '}'
        ].join('\n');
        (document.head || document.documentElement).appendChild(style);
      }

      const observer = new MutationObserver(() => {
        if (document.getElementById('eh-reader-container')) {
          removeReaderBootMask();
          observer.disconnect();
        }
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });
    } catch {}
  }

  function bindGalleryEntryPoints() {
    const info = getPathInfo();
    if (!info || !info.isIndexPage || !Number.isFinite(info.aid)) return;

    const nativeButton = document.getElementById('reader-btn');
    if (nativeButton) {
      nativeButton.textContent = appName();
      nativeButton.setAttribute('title', appName());
      nativeButton.setAttribute('href', '#');
      nativeButton.addEventListener('click', (event) => {
        if (shouldBypass(event)) return;
        event.preventDefault();
        launchReader({ aid: info.aid, startAt: info.startPage || 1 }).catch(() => {});
      }, true);
      return;
    }

    const host = document.querySelector('.uwthumb') || document.querySelector('#bodywrap') || document.body;
    if (!host || document.getElementById('eh-wnacg-reader-launch')) return;

    const btn = document.createElement('button');
    btn.id = 'eh-wnacg-reader-launch';
    btn.type = 'button';
    btn.className = 'btn';
    btn.textContent = appName();
    btn.style.width = '130px';
    btn.addEventListener('click', () => {
      launchReader({ aid: info.aid, startAt: info.startPage || 1 }).catch(() => {});
    });
    host.appendChild(btn);
  }

  function shouldBypass(event) {
    return event.ctrlKey || event.shiftKey || event.metaKey || event.altKey || event.button === 1;
  }

  function interceptThumbnailClicks() {
    const info = getPathInfo();
    if (!info || !info.isIndexPage || !Number.isFinite(info.aid)) return;

    document.addEventListener('click', (event) => {
      if (event.defaultPrevented || shouldBypass(event)) return;
      const target = event.target && event.target.closest
        ? event.target.closest('.gallary_wrap a[href*="photos-view-id-"], .gallary_item a[href*="photos-view-id-"]')
        : null;
      if (!target) return;

      const href = target.getAttribute('href') || '';
      const match = href.match(/photos-view-id-(\d+)\.html/i);
      if (!match) return;

      event.preventDefault();
      launchReader({ aid: info.aid, viewId: parseInt(match[1], 10) }).catch(() => {});
    }, true);
  }

  function autoLaunchIfNeeded() {
    const info = getPathInfo();
    if (!info) return;

    if (info.isSlidePage && Number.isFinite(info.aid)) {
      launchReader({ aid: info.aid, startAt: info.startPage || 1 }).catch(() => {});
      return;
    }

    if (info.isViewPage && Number.isFinite(info.viewId)) {
      onReady(() => {
        const aid = aidFromCurrentDocument();
        const startAt = startPageFromViewDocument(info.viewId);
        launchReader({ aid, viewId: info.viewId, startAt }).catch(() => {});
      });
    }
  }

  installReaderBootMask();
  autoLaunchIfNeeded();

  onReady(() => {
    bindGalleryEntryPoints();
    interceptThumbnailClicks();
  });
})();

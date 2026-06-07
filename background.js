/**
 * Background Script - 后台脚本
 * 处理扩展的后台逻辑
 */

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('[EH Modern Reader] 扩展已安装');
    
    // 显示欢迎页面
    chrome.tabs.create({
      url: 'welcome.html'
    });
  } else if (details.reason === 'update') {
    console.log('[EH Modern Reader] 扩展已更新');
  }
});

// 监听来自 content script 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'ensureReaderContentScript') {
    const tabId = sender && sender.tab && sender.tab.id;
    const frameId = sender && typeof sender.frameId === 'number' ? sender.frameId : 0;

    if (typeof tabId !== 'number') {
      sendResponse({ success: false, error: 'No sender tab available' });
      return false;
    }

    if (!chrome.scripting || typeof chrome.scripting.executeScript !== 'function') {
      sendResponse({ success: false, error: 'chrome.scripting is unavailable' });
      return false;
    }

    try {
      const injection = chrome.scripting.executeScript({
        target: { tabId, frameIds: [frameId] },
        files: ['content.js']
      });

      if (injection && typeof injection.then === 'function') {
        injection
          .then(() => sendResponse({ success: true }))
          .catch((error) => {
            sendResponse({
              success: false,
              error: error && error.message ? error.message : String(error)
            });
          });
        return true;
      }

      sendResponse({ success: true });
    } catch (error) {
      sendResponse({
        success: false,
        error: error && error.message ? error.message : String(error)
      });
    }
    return true;
  }

  if (request.action === 'getSettings') {
    chrome.storage.sync.get(['readerSettings'], (result) => {
      sendResponse(result.readerSettings || {});
    });
    return true;
  }
  
  if (request.action === 'saveSettings') {
    chrome.storage.sync.set({ readerSettings: request.settings }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
});

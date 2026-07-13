/**
 * Background service worker.
 * - Watches network requests (chrome.webRequest) and DOM findings (content script)
 * - Classifies media URLs (HLS/DASH/MP4/segments/etc.)
 * - Maintains global + per-tab enable state
 * - Persists settings to chrome.storage.local, captured data to chrome.storage.session
 * - Serves the popup / side panel via chrome.runtime messaging
 */
import { MESSAGE_TYPES, SEGMENT_TYPES } from './shared/constants.js';
import { classifyMedia } from './shared/mediaClassifier.js';
import { loadSettings, saveSettings, loadTabsData, saveTabsData } from './shared/storage.js';

// ---------------------------------------------------------------------------
// In-memory state (rehydrated from storage on every service-worker startup)
// ---------------------------------------------------------------------------
let settings = null;          // { globalEnabled, captureSegments, clearOnNavigate, maxItemsPerTab }
let tabsData = {};            // { [tabId]: { enabled: bool, items: [ {id,url,type,label,method,source,tabTitle,timestamp,statusCode} ] } }
let initPromise = null;

const pendingSaveTabIds = new Set();
let saveTimer = null;

function scheduleSave(tabId) {
  if (tabId != null) pendingSaveTabIds.add(tabId);
  if (saveTimer) return;
  saveTimer = setTimeout(async () => {
    saveTimer = null;
    pendingSaveTabIds.clear();
    try {
      await saveTabsData(tabsData);
    } catch (e) {
      console.warn('[MUC] failed to persist tabsData', e);
    }
  }, 250);
}

async function init() {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    settings = await loadSettings();
    tabsData = await loadTabsData();
  })();
  return initPromise;
}
init();

function ensureTab(tabId, title) {
  if (!tabsData[tabId]) {
    tabsData[tabId] = { enabled: settings.globalEnabled, items: [], title: title || '' };
  } else if (title) {
    tabsData[tabId].title = title;
  }
  return tabsData[tabId];
}

function isTabEnabled(tabId) {
  if (!settings.globalEnabled) return false;
  const t = tabsData[tabId];
  if (!t) return settings.globalEnabled; // default to global state for unseen tabs
  return !!t.enabled;
}

let idCounter = 1;
function nextId() {
  return `${Date.now()}_${idCounter++}`;
}

function addCapturedEntry(tabId, { url, type, method, source, statusCode, tabTitle }) {
  const tab = ensureTab(tabId, tabTitle);
  if (tab.items.some((it) => it.url === url)) return false; // dedupe

  tab.items.push({
    id: nextId(),
    url,
    type,
    method: method || 'GET',
    source,                       // 'network' | 'dom'
    statusCode: statusCode ?? null,
    timestamp: Date.now()
  });

  // Bound memory / storage usage
  const cap = settings.maxItemsPerTab || 1500;
  if (tab.items.length > cap) {
    tab.items.splice(0, tab.items.length - cap);
  }

  scheduleSave(tabId);
  updateBadge(tabId);
  broadcastUpdate(tabId);
  return true;
}

function updateBadge(tabId) {
  const tab = tabsData[tabId];
  const count = tab ? tab.items.length : 0;
  const text = count > 0 ? (count > 999 ? '999+' : String(count)) : '';
  chrome.action.setBadgeText({ tabId, text }).catch(() => {});
  chrome.action.setBadgeBackgroundColor({ tabId, color: '#4f46e5' }).catch(() => {});
}

function broadcastUpdate(tabId) {
  chrome.runtime.sendMessage({ type: MESSAGE_TYPES.CAPTURE_UPDATED, tabId }).catch(() => {
    // no listeners open (popup/side panel closed) — fine, ignore
  });
}

async function tryCapture(tabId, url, { method, contentType, statusCode, source, tabTitle }) {
  await init();
  if (tabId == null || tabId < 0) return; // not associated with a real tab
  if (!isTabEnabled(tabId)) return;

  const classified = classifyMedia(url, contentType);
  if (!classified) return;
  if (SEGMENT_TYPES.has(classified.type) && !settings.captureSegments) return;

  addCapturedEntry(tabId, {
    url,
    type: classified.type,
    method,
    source,
    statusCode,
    tabTitle
  });
}

// ---------------------------------------------------------------------------
// Network capture: chrome.webRequest (observational only, no blocking)
// ---------------------------------------------------------------------------
const REQUEST_FILTER = { urls: ['<all_urls>'], types: ['media', 'xmlhttprequest', 'other', 'object', 'ping'] };

chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    tryCapture(details.tabId, details.url, {
      method: details.method,
      source: 'network',
      statusCode: null
    });
  },
  REQUEST_FILTER
);

chrome.webRequest.onHeadersReceived.addListener(
  (details) => {
    const headers = details.responseHeaders || [];
    const ctHeader = headers.find((h) => h.name.toLowerCase() === 'content-type');
    const contentType = ctHeader ? ctHeader.value : '';
    tryCapture(details.tabId, details.url, {
      method: details.method,
      contentType,
      source: 'network',
      statusCode: details.statusCode
    });
  },
  REQUEST_FILTER,
  ['responseHeaders', 'extraHeaders']
);

// ---------------------------------------------------------------------------
// DOM-level capture (content script findings: <video>/<source>/<audio> etc.)
// ---------------------------------------------------------------------------
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender).then(sendResponse).catch((err) => {
    console.warn('[MUC] message handler error', err);
    sendResponse({ error: String(err) });
  });
  return true; // async response
});

async function handleMessage(message, sender) {
  await init();
  switch (message.type) {
    case MESSAGE_TYPES.CONTENT_MEDIA_FOUND: {
      const tabId = sender.tab ? sender.tab.id : null;
      const tabTitle = sender.tab ? sender.tab.title : '';
      if (tabId != null) {
        await tryCapture(tabId, message.url, {
          method: 'GET',
          source: 'dom',
          tabTitle
        });
      }
      return { ok: true };
    }

    case MESSAGE_TYPES.GET_STATE: {
      const currentTabId = message.tabId ?? null;
      const tabs = await chrome.tabs.query({});
      const tabSummaries = tabs
        .filter((t) => t.id != null && t.id >= 0)
        .map((t) => ({
          tabId: t.id,
          title: t.title || t.url || `Tab ${t.id}`,
          url: t.url || '',
          favIconUrl: t.favIconUrl || '',
          enabled: tabsData[t.id] ? !!tabsData[t.id].enabled : settings.globalEnabled,
          count: tabsData[t.id] ? tabsData[t.id].items.length : 0,
          active: false
        }));
      return {
        settings,
        currentTabId,
        currentTabEnabled: currentTabId != null ? isTabEnabled(currentTabId) : settings.globalEnabled,
        currentTabCount: currentTabId != null && tabsData[currentTabId] ? tabsData[currentTabId].items.length : 0,
        tabs: tabSummaries
      };
    }

    case MESSAGE_TYPES.SET_GLOBAL_ENABLED: {
      settings.globalEnabled = !!message.enabled;
      await saveSettings(settings);
      return { ok: true, settings };
    }

    case MESSAGE_TYPES.SET_TAB_ENABLED: {
      const tab = ensureTab(message.tabId);
      tab.enabled = !!message.enabled;
      scheduleSave(message.tabId);
      return { ok: true };
    }

    case MESSAGE_TYPES.SET_CAPTURE_SEGMENTS: {
      settings.captureSegments = !!message.enabled;
      await saveSettings(settings);
      return { ok: true, settings };
    }

    case MESSAGE_TYPES.SET_CLEAR_ON_NAVIGATE: {
      settings.clearOnNavigate = !!message.enabled;
      await saveSettings(settings);
      return { ok: true, settings };
    }

    case MESSAGE_TYPES.GET_CAPTURED: {
      if (message.scope === 'all') {
        const merged = [];
        for (const [tabId, data] of Object.entries(tabsData)) {
          for (const item of data.items) {
            merged.push({ ...item, tabId: Number(tabId), tabTitle: data.title || '' });
          }
        }
        merged.sort((a, b) => a.timestamp - b.timestamp);
        return { items: merged };
      }
      const tabId = message.tabId;
      const data = tabsData[tabId];
      return { items: data ? data.items.map((it) => ({ ...it, tabId, tabTitle: data.title || '' })) : [] };
    }

    case MESSAGE_TYPES.CLEAR_CAPTURED: {
      if (message.scope === 'all') {
        for (const tabId of Object.keys(tabsData)) {
          tabsData[tabId].items = [];
          updateBadge(Number(tabId));
        }
      } else if (tabsData[message.tabId]) {
        tabsData[message.tabId].items = [];
        updateBadge(message.tabId);
      }
      scheduleSave(message.tabId ?? null);
      broadcastUpdate(message.tabId ?? null);
      return { ok: true };
    }

    case MESSAGE_TYPES.OPEN_SIDE_PANEL: {
      if (message.tabId != null) {
        await chrome.sidePanel.open({ tabId: message.tabId });
      }
      return { ok: true };
    }

    default:
      return { ok: false, error: 'unknown message type' };
  }
}

// ---------------------------------------------------------------------------
// Tab lifecycle
// ---------------------------------------------------------------------------
chrome.tabs.onRemoved.addListener(async (tabId) => {
  await init();
  if (tabsData[tabId]) {
    delete tabsData[tabId];
    scheduleSave(null);
  }
});

chrome.tabs.onCreated.addListener(async (tab) => {
  await init();
  if (tab.id != null) {
    ensureTab(tab.id, tab.title);
    scheduleSave(tab.id);
  }
});

// Clear a tab's captured list on a fresh top-level navigation (new page = new session of interest)
chrome.webNavigation.onCommitted.addListener(async (details) => {
  if (details.frameId !== 0) return; // main frame only
  await init();
  if (!settings.clearOnNavigate) return;
  if (tabsData[details.tabId]) {
    tabsData[details.tabId].items = [];
    updateBadge(details.tabId);
    scheduleSave(details.tabId);
    broadcastUpdate(details.tabId);
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.title) {
    await init();
    if (tabsData[tabId]) tabsData[tabId].title = changeInfo.title;
  }
});

// Inject the content script into already-open tabs on install/update so the
// extension works immediately without requiring a page reload.
chrome.runtime.onInstalled.addListener(async () => {
  await init();
  try {
    const tabs = await chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] });
    for (const tab of tabs) {
      if (tab.id == null) continue;
      chrome.scripting
        .executeScript({ target: { tabId: tab.id, allFrames: true }, files: ['content-script.js'] })
        .catch(() => {}); // some tabs (chrome web store, etc.) will reject — ignore
    }
  } catch (e) {
    console.warn('[MUC] onInstalled injection skipped', e);
  }
});

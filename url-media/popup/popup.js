import { MESSAGE_TYPES } from '../shared/constants.js';
import { buildExportText, downloadText } from '../shared/export.js';

const $ = (id) => document.getElementById(id);

const globalToggle = $('globalToggle');
const tabToggle = $('tabToggle');
const tabTitleHint = $('tabTitleHint');
const tabCountEl = $('tabCount');
const segmentsToggle = $('segmentsToggle');
const openPanelBtn = $('openPanelBtn');
const exportBtn = $('exportBtn');
const clearBtn = $('clearBtn');
const statusMsg = $('statusMsg');

let currentTabId = null;
let currentTabTitle = '';

function setStatus(msg, kind) {
  statusMsg.textContent = msg;
  statusMsg.className = kind || '';
  if (msg) {
    setTimeout(() => {
      statusMsg.textContent = '';
      statusMsg.className = '';
    }, 2200);
  }
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function refresh() {
  const tab = await getActiveTab();
  currentTabId = tab ? tab.id : null;
  currentTabTitle = tab ? (tab.title || tab.url || '') : '';
  tabTitleHint.textContent = currentTabTitle || '—';
  tabTitleHint.title = currentTabTitle;

  const state = await chrome.runtime.sendMessage({ type: MESSAGE_TYPES.GET_STATE, tabId: currentTabId });

  globalToggle.checked = !!state.settings.globalEnabled;
  segmentsToggle.checked = !!state.settings.captureSegments;
  tabToggle.checked = !!state.currentTabEnabled;
  tabToggle.disabled = !state.settings.globalEnabled;
  tabCountEl.textContent = state.currentTabCount ?? 0;
}

globalToggle.addEventListener('change', async () => {
  await chrome.runtime.sendMessage({ type: MESSAGE_TYPES.SET_GLOBAL_ENABLED, enabled: globalToggle.checked });
  await refresh();
});

tabToggle.addEventListener('change', async () => {
  if (currentTabId == null) return;
  await chrome.runtime.sendMessage({ type: MESSAGE_TYPES.SET_TAB_ENABLED, tabId: currentTabId, enabled: tabToggle.checked });
  await refresh();
});

segmentsToggle.addEventListener('change', async () => {
  await chrome.runtime.sendMessage({ type: MESSAGE_TYPES.SET_CAPTURE_SEGMENTS, enabled: segmentsToggle.checked });
});

openPanelBtn.addEventListener('click', async () => {
  if (currentTabId == null) return;
  await chrome.sidePanel.open({ tabId: currentTabId });
  window.close();
});

exportBtn.addEventListener('click', async () => {
  if (currentTabId == null) return;
  const res = await chrome.runtime.sendMessage({ type: MESSAGE_TYPES.GET_CAPTURED, scope: 'tab', tabId: currentTabId });
  if (!res.items || res.items.length === 0) {
    setStatus('Nothing to export yet', 'error');
    return;
  }
  const text = buildExportText(res.items, { scopeLabel: currentTabTitle || `Tab ${currentTabId}` });
  downloadText(text, `media-urls_tab-${currentTabId}_${Date.now()}.txt`);
  setStatus(`Exported ${res.items.length} URLs`, 'success');
});

clearBtn.addEventListener('click', async () => {
  if (currentTabId == null) return;
  await chrome.runtime.sendMessage({ type: MESSAGE_TYPES.CLEAR_CAPTURED, scope: 'tab', tabId: currentTabId });
  setStatus('Cleared', 'success');
  await refresh();
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === MESSAGE_TYPES.CAPTURE_UPDATED) {
    if (message.tabId == null || message.tabId === currentTabId) refresh();
  }
});

refresh();

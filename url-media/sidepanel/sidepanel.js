import { MESSAGE_TYPES, MEDIA_TYPE_LABELS } from '../shared/constants.js';
import { buildExportText, downloadText } from '../shared/export.js';

const $ = (id) => document.getElementById(id);

const globalToggle = $('globalToggle');
const segmentsToggle = $('segmentsToggle');
const scopeSelect = $('scopeSelect');
const searchInput = $('searchInput');
const typeFiltersEl = $('typeFilters');
const tabsStripEl = $('tabsStrip');
const listWrap = document.querySelector('.list-wrap');
const listBody = $('listBody');
const countLabel = $('countLabel');
const exportBtn = $('exportBtn');
const clearBtn = $('clearBtn');

const SCOPE_CURRENT = '__current__';
const SCOPE_ALL = '__all__';

let currentTabId = null;
let state = null;          // last GET_STATE response
let items = [];            // items for the current scope
let activeTypes = new Set(); // empty = all types
let searchTerm = '';
let scopeValue = SCOPE_CURRENT;

function toast(msg) {
  let el = document.querySelector('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 1800);
}

function fmtTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function typeBadgeClass(type) {
  return `type-badge type-${type}`;
}

// ---------------------------------------------------------------------------
// Data loading
// ---------------------------------------------------------------------------
async function loadState() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTabId = tab ? tab.id : null;
  state = await chrome.runtime.sendMessage({ type: MESSAGE_TYPES.GET_STATE, tabId: currentTabId });

  globalToggle.checked = !!state.settings.globalEnabled;
  segmentsToggle.checked = !!state.settings.captureSegments;

  renderScopeOptions();
  renderTabsStrip();
  await loadItems();
}

function renderScopeOptions() {
  const prev = scopeSelect.value || scopeValue;
  scopeSelect.innerHTML = '';

  const optCurrent = document.createElement('option');
  optCurrent.value = SCOPE_CURRENT;
  const currentTab = state.tabs.find((t) => t.tabId === currentTabId);
  optCurrent.textContent = `Current tab — ${currentTab ? truncate(currentTab.title, 40) : '…'}`;
  scopeSelect.appendChild(optCurrent);

  const optAll = document.createElement('option');
  optAll.value = SCOPE_ALL;
  optAll.textContent = `All tabs (${state.tabs.reduce((s, t) => s + t.count, 0)} items)`;
  scopeSelect.appendChild(optAll);

  for (const t of state.tabs) {
    if (t.count === 0) continue;
    const opt = document.createElement('option');
    opt.value = String(t.tabId);
    opt.textContent = `${truncate(t.title, 36)} (${t.count})`;
    scopeSelect.appendChild(opt);
  }

  scopeSelect.value = [...scopeSelect.options].some((o) => o.value === prev) ? prev : SCOPE_CURRENT;
  scopeValue = scopeSelect.value;
}

function truncate(str, n) {
  if (!str) return '';
  return str.length > n ? str.slice(0, n - 1) + '…' : str;
}

function renderTabsStrip() {
  tabsStripEl.innerHTML = '';
  const sorted = [...state.tabs].sort((a, b) => b.count - a.count);
  for (const t of sorted) {
    const pill = document.createElement('div');
    pill.className = 'tab-pill';

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = t.enabled;
    cb.disabled = !state.settings.globalEnabled;
    cb.title = 'Enable/disable capture for this tab';
    cb.addEventListener('change', async () => {
      await chrome.runtime.sendMessage({ type: MESSAGE_TYPES.SET_TAB_ENABLED, tabId: t.tabId, enabled: cb.checked });
      await loadState();
    });

    const title = document.createElement('span');
    title.className = 'pill-title';
    title.textContent = t.title || `Tab ${t.tabId}`;
    title.title = t.url || '';

    const count = document.createElement('span');
    count.className = 'pill-count';
    count.textContent = t.count;

    pill.appendChild(cb);
    pill.appendChild(title);
    pill.appendChild(count);
    if (t.tabId === currentTabId) pill.style.borderColor = 'var(--accent)';
    tabsStripEl.appendChild(pill);
  }
}

async function loadItems() {
  let res;
  if (scopeValue === SCOPE_ALL) {
    res = await chrome.runtime.sendMessage({ type: MESSAGE_TYPES.GET_CAPTURED, scope: 'all' });
  } else if (scopeValue === SCOPE_CURRENT) {
    res = await chrome.runtime.sendMessage({ type: MESSAGE_TYPES.GET_CAPTURED, scope: 'tab', tabId: currentTabId });
  } else {
    res = await chrome.runtime.sendMessage({ type: MESSAGE_TYPES.GET_CAPTURED, scope: 'tab', tabId: Number(scopeValue) });
  }
  items = res.items || [];
  renderTypeFilters();
  renderList();
}

// ---------------------------------------------------------------------------
// Type filter chips
// ---------------------------------------------------------------------------
function renderTypeFilters() {
  const presentTypes = [...new Set(items.map((i) => i.type))];
  typeFiltersEl.innerHTML = '';

  const allChip = document.createElement('span');
  allChip.className = 'chip' + (activeTypes.size === 0 ? ' active' : '');
  allChip.textContent = `All (${items.length})`;
  allChip.addEventListener('click', () => {
    activeTypes.clear();
    renderTypeFilters();
    renderList();
  });
  typeFiltersEl.appendChild(allChip);

  for (const type of presentTypes) {
    const count = items.filter((i) => i.type === type).length;
    const chip = document.createElement('span');
    chip.className = 'chip' + (activeTypes.has(type) ? ' active' : '');
    chip.textContent = `${MEDIA_TYPE_LABELS[type] || type} (${count})`;
    chip.addEventListener('click', () => {
      if (activeTypes.has(type)) activeTypes.delete(type);
      else activeTypes.add(type);
      renderTypeFilters();
      renderList();
    });
    typeFiltersEl.appendChild(chip);
  }
}

// ---------------------------------------------------------------------------
// List rendering
// ---------------------------------------------------------------------------
function getFilteredItems() {
  let filtered = items;
  if (activeTypes.size > 0) filtered = filtered.filter((i) => activeTypes.has(i.type));
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    filtered = filtered.filter((i) => i.url.toLowerCase().includes(term));
  }
  return [...filtered].sort((a, b) => b.timestamp - a.timestamp);
}

function renderList() {
  const filtered = getFilteredItems();
  listBody.innerHTML = '';
  listWrap.classList.toggle('is-empty', filtered.length === 0);
  countLabel.textContent = `${filtered.length} item${filtered.length === 1 ? '' : 's'}${filtered.length !== items.length ? ` (of ${items.length})` : ''}`;

  const frag = document.createDocumentFragment();
  for (const it of filtered) {
    const tr = document.createElement('tr');

    const tdType = document.createElement('td');
    tdType.className = 'col-type';
    const badge = document.createElement('span');
    badge.className = typeBadgeClass(it.type);
    badge.textContent = MEDIA_TYPE_LABELS[it.type] || it.type;
    tdType.appendChild(badge);

    const tdUrl = document.createElement('td');
    tdUrl.className = 'url-cell';
    tdUrl.textContent = it.url;
    if (scopeValue === SCOPE_ALL && it.tabTitle) {
      const tag = document.createElement('span');
      tag.className = 'tab-tag';
      tag.textContent = `via ${it.tabTitle}`;
      tdUrl.appendChild(tag);
    }

    const tdTime = document.createElement('td');
    tdTime.className = 'col-time';
    tdTime.textContent = fmtTime(it.timestamp);

    const tdActions = document.createElement('td');
    tdActions.className = 'col-actions';
    const copyBtn = document.createElement('button');
    copyBtn.className = 'icon-btn';
    copyBtn.textContent = 'Copy';
    copyBtn.title = 'Copy URL';
    copyBtn.addEventListener('click', async () => {
      await navigator.clipboard.writeText(it.url);
      toast('URL copied');
    });
    tdActions.appendChild(copyBtn);

    tr.appendChild(tdType);
    tr.appendChild(tdUrl);
    tr.appendChild(tdTime);
    tr.appendChild(tdActions);
    frag.appendChild(tr);
  }
  listBody.appendChild(frag);
}

// ---------------------------------------------------------------------------
// Event wiring
// ---------------------------------------------------------------------------
globalToggle.addEventListener('change', async () => {
  await chrome.runtime.sendMessage({ type: MESSAGE_TYPES.SET_GLOBAL_ENABLED, enabled: globalToggle.checked });
  await loadState();
});

segmentsToggle.addEventListener('change', async () => {
  await chrome.runtime.sendMessage({ type: MESSAGE_TYPES.SET_CAPTURE_SEGMENTS, enabled: segmentsToggle.checked });
});

scopeSelect.addEventListener('change', async () => {
  scopeValue = scopeSelect.value;
  activeTypes.clear();
  await loadItems();
});

let searchDebounce;
searchInput.addEventListener('input', () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    searchTerm = searchInput.value.trim();
    renderList();
  }, 120);
});

exportBtn.addEventListener('click', () => {
  const filtered = getFilteredItems();
  if (filtered.length === 0) {
    toast('Nothing to export');
    return;
  }
  const scopeLabel = scopeSelect.options[scopeSelect.selectedIndex]?.textContent || 'Export';
  const text = buildExportText(filtered, { scopeLabel });
  downloadText(text, `media-urls_${Date.now()}.txt`);
  toast(`Exported ${filtered.length} URLs`);
});

clearBtn.addEventListener('click', async () => {
  if (scopeValue === SCOPE_ALL) {
    await chrome.runtime.sendMessage({ type: MESSAGE_TYPES.CLEAR_CAPTURED, scope: 'all' });
  } else if (scopeValue === SCOPE_CURRENT) {
    await chrome.runtime.sendMessage({ type: MESSAGE_TYPES.CLEAR_CAPTURED, scope: 'tab', tabId: currentTabId });
  } else {
    await chrome.runtime.sendMessage({ type: MESSAGE_TYPES.CLEAR_CAPTURED, scope: 'tab', tabId: Number(scopeValue) });
  }
  toast('Cleared');
  await loadState();
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === MESSAGE_TYPES.CAPTURE_UPDATED) {
    loadState();
  }
});

chrome.tabs.onActivated.addListener(() => {
  if (scopeValue === SCOPE_CURRENT) loadState();
});

loadState();

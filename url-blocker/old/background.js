let isEnabled = true;
let blockList = [];
let disablePopups = true;

// Initialize extension
function initialize() {
  chrome.storage.local.get(['isEnabled', 'blockList', 'disablePopups'], (result) => {
    isEnabled = result.isEnabled !== undefined ? result.isEnabled : true;
    blockList = result.blockList || [];
    disablePopups = result.disablePopups !== undefined ? result.disablePopups : true;
    updateIcon();
    updateBlockingRules();
    if (disablePopups) injectPopupBlocker();
  });
}

// Update blocking rules based on current state
async function updateBlockingRules() {
  // First remove all existing rules
  const currentRules = await chrome.declarativeNetRequest.getDynamicRules();
  const currentRuleIds = currentRules.map(rule => rule.id);
  
  if (currentRuleIds.length > 0) {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: currentRuleIds
    });
  }

  // Only add new rules if extension is enabled
  if (isEnabled) {
    const rules = blockList.flatMap((word, index) => ({
      id: index + 1,
      priority: 1,
      action: { type: 'block' },
      condition: {
        urlFilter: word,
        resourceTypes: [
          'main_frame',
          'sub_frame',
          'stylesheet',
          'script',
          'image',
          'font',
          'object',
          'xmlhttprequest',
          'ping',
          'csp_report',
          'media',
          'websocket',
          'other'
        ]
      }
    }));

    if (rules.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        addRules: rules
      });
    }
  }
}

// Update extension icon based on enabled/disabled state
function updateIcon() {
  const iconPath = isEnabled ? "icons/icon1.png" : "icons/icon0.png";
  chrome.action.setIcon({ path: {
    "16": iconPath,
    "32": iconPath,
    "48": iconPath,
    "128": iconPath
  }});
}

// Inject popup blocker content script
function injectPopupBlocker() {
  if (!disablePopups) return;
  
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      if (tab.url?.startsWith('http')) {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['scripts/popup-blocker.js']
        }).catch(() => {});
      }
    });
  });
}

// Handle storage changes
chrome.storage.onChanged.addListener((changes) => {
  if (changes.isEnabled !== undefined) {
    isEnabled = changes.isEnabled.newValue;
    updateIcon();
    updateBlockingRules();
  }
  if (changes.blockList !== undefined) {
    blockList = changes.blockList.newValue;
    updateBlockingRules();
  }
  if (changes.disablePopups !== undefined) {
    disablePopups = changes.disablePopups.newValue;
    if (disablePopups) {
      injectPopupBlocker();
    }
    updateBlockingRules();
  }
});

// Initialize on install and startup
chrome.runtime.onInstalled.addListener(initialize);
chrome.runtime.onStartup.addListener(initialize);
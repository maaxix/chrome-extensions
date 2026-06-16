let isEnabled = true;
let blockList = [];
let disablePopups = true;

// Load settings from storage
async function loadSettings() {
  const data = await chrome.storage.local.get(["isEnabled", "blockList", "disablePopups"]);
  isEnabled = data.isEnabled ?? true;
  blockList = data.blockList ?? [];
  disablePopups = data.disablePopups ?? true;
  updateIcon();
  updateBlockingRules();
  if (disablePopups) injectPopupBlocker();
}

// Update blocking rules
async function updateBlockingRules() {
  // Clear existing rules
  const oldRules = await chrome.declarativeNetRequest.getDynamicRules();
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: oldRules.map(rule => rule.id),
  });

  // Add new rules if enabled
  if (isEnabled && blockList.length > 0) {
    const rules = blockList.map((word, index) => ({
      id: index + 1,
      priority: 1,
      action: { type: "block" },
      condition: {
        urlFilter: word,
        resourceTypes: [
          "main_frame",
          "sub_frame",
          "script",
          "xmlhttprequest",
          "other",
        ],
      },
    }));

    await chrome.declarativeNetRequest.updateDynamicRules({ addRules: rules });
  }
}

// Inject popup blocker script
function injectPopupBlocker() {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      if (tab.url?.startsWith("http")) {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["scripts/popup-blocker.js"],
        });
      }
    });
  });
}

// Update extension icon
function updateIcon() {
  const iconPath = isEnabled ? "icons/icon1.png" : "icons/icon0.png";
  chrome.action.setIcon({
    path: {
      "16": iconPath,
      "32": iconPath,
      "48": iconPath,
      "128": iconPath,
    },
  });
}

// Listen for storage changes
chrome.storage.onChanged.addListener((changes) => {
  if (changes.isEnabled) isEnabled = changes.isEnabled.newValue;
  if (changes.blockList) blockList = changes.blockList.newValue;
  if (changes.disablePopups) disablePopups = changes.disablePopups.newValue;
  updateIcon();
  updateBlockingRules();
  if (disablePopups) injectPopupBlocker();
});

// Initialize
chrome.runtime.onStartup.addListener(loadSettings);
chrome.runtime.onInstalled.addListener(loadSettings);


// Start block popups
chrome.tabs.onCreated.addListener(function(tab) 
{
	//alert("id=" + tab.id + ", " + "windowId=" + tab.windowId + ", " + "highlighted=" + tab.highlighted + ", " + "openerTabId=" + tab.openerTabId + ",  url=" + tab.url + ",  title=" + tab.title + ", pinned=" + tab.pinned+ ", status=" + tab.status);
	var url = tab.url;
	if(disablePopups)
	{
		//alert(JSON.stringify(tab));
		//if(tab.url && tab.url.indexOf("chrome-extension://") == 0) return;		
		if(url)
		{
			if(url.indexOf('chrome:') == 0 || url.indexOf('view-source')==0 )
				return;
		}
		if(tab.status=="complete") // !tab.title ||
		{
			//alert('title is empty');
			//if(confirm("Open :\n" + url)== false)
				chrome.tabs.remove(tab.id, function() {});	
		}		
	}
});
document.addEventListener("DOMContentLoaded", () => {
    const toggleEnabled = document.getElementById("toggleEnabled");
    const togglePopupBlocking = document.getElementById("togglePopupBlocking");
    const blockInput = document.getElementById("blockInput");
    const addButton = document.getElementById("addButton");
    const blockList = document.getElementById("blockList");
  
    // Load saved settings
    chrome.storage.local.get(["isEnabled", "blockList", "disablePopups"], (data) => {
      toggleEnabled.checked = data.isEnabled ?? true;
      togglePopupBlocking.checked = data.disablePopups ?? true;
      renderBlockList(data.blockList || []);
    });
  
    // Toggle blocker on/off
    toggleEnabled.addEventListener("change", () => {
      chrome.storage.local.set({ isEnabled: toggleEnabled.checked });
    });
  
    // Toggle popup blocking
    togglePopupBlocking.addEventListener("change", () => {
      chrome.storage.local.set({ disablePopups: togglePopupBlocking.checked });
    });
  
    // Add new items to blocklist
    addButton.addEventListener("click", () => {
      const items = blockInput.value
        .split("\n")
        .map(item => item.trim())
        .filter(item => item.length > 0);
  
      if (items.length === 0) return;
  
      chrome.storage.local.get(["blockList"], (data) => {
        const updatedList = [...(data.blockList || []), ...items];
        chrome.storage.local.set({ blockList: updatedList }, () => {
          renderBlockList(updatedList);
          blockInput.value = "";
        });
      });
    });
  
    // Render blocklist
    function renderBlockList(items) {
      blockList.innerHTML = items.length ? "" : "<li>No blocked items</li>";
      
      items.forEach((item, index) => {
        const li = document.createElement("li");
        li.innerHTML = `
          <span>${item}</span>
          <button data-index="${index}">×</button>
        `;
        blockList.appendChild(li);
  
        li.querySelector("button").addEventListener("click", (e) => {
          const index = parseInt(e.target.getAttribute("data-index"));
          const updatedList = items.filter((_, i) => i !== index);
          chrome.storage.local.set({ blockList: updatedList }, () => {
            renderBlockList(updatedList);
          });
        });
      });
    }
  });
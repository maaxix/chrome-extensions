document.addEventListener('DOMContentLoaded', () => {
  const toggleEnabled = document.getElementById('toggleEnabled');
  const statusText = document.getElementById('statusText');
  const togglePopupBlocking = document.getElementById('togglePopupBlocking');
  const blockWordsInput = document.getElementById('blockWordsInput');
  const addWordsBtn = document.getElementById('addWordsBtn');
  const blockedWordsList = document.getElementById('blockedWordsList');
  const searchBlocked = document.getElementById('searchBlocked');

  // Load saved state
  chrome.storage.local.get(['isEnabled', 'blockList', 'disablePopups'], (result) => {
    const isEnabled = result.isEnabled !== undefined ? result.isEnabled : true;
    const disablePopups = result.disablePopups !== undefined ? result.disablePopups : true;
    
    toggleEnabled.checked = isEnabled;
    statusText.textContent = isEnabled ? 'Enabled' : 'Disabled';
    togglePopupBlocking.checked = disablePopups;
    renderBlockList(result.blockList || []);
  });

  // Toggle extension state - FIXED THIS SECTION
  toggleEnabled.addEventListener('change', () => {
    const enabled = toggleEnabled.checked;
    statusText.textContent = enabled ? 'Enabled' : 'Disabled';
    chrome.storage.local.set({ isEnabled: enabled }, () => {
      // Update icon immediately
      chrome.action.setIcon({
        path: {
          "16": enabled ? "icons/icon1.png" : "icons/icon0.png",
          "32": enabled ? "icons/icon1.png" : "icons/icon0.png",
          "48": enabled ? "icons/icon1.png" : "icons/icon0.png",
          "128": enabled ? "icons/icon1.png" : "icons/icon0.png"
        }
      });
    });
  });

  // Toggle popup blocking
  togglePopupBlocking.addEventListener('change', () => {
    chrome.storage.local.set({ disablePopups: togglePopupBlocking.checked });
  });

  // Add new words to block list
  addWordsBtn.addEventListener('click', () => {
    const words = blockWordsInput.value
      .split('\n')
      .map(word => word.trim())
      .filter(word => word.length > 0);

    if (words.length === 0) return;

    chrome.storage.local.get(['blockList'], (result) => {
      const currentList = result.blockList || [];
      const newWords = words.filter(word => !currentList.includes(word));
      
      if (newWords.length > 0) {
        const updatedList = [...currentList, ...newWords];
        chrome.storage.local.set({ blockList: updatedList }, () => {
          renderBlockList(updatedList);
          blockWordsInput.value = '';
        });
      }
    });
  });

  // Search blocked words
  searchBlocked.addEventListener('input', () => {
    const searchTerm = searchBlocked.value.toLowerCase();
    const items = blockedWordsList.querySelectorAll('li');
    
    items.forEach(item => {
      const text = item.textContent.toLowerCase();
      item.style.display = text.includes(searchTerm) ? '' : 'none';
    });
  });

  // Render block list
  function renderBlockList(words) {
    blockedWordsList.innerHTML = '';
    
    if (!words || words.length === 0) {
      blockedWordsList.innerHTML = '<li class="empty">No words blocked</li>';
      return;
    }

    words.forEach((word, index) => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span>${word}</span>
        <button class="delete-btn" data-word="${word}">×</button>
      `;
      blockedWordsList.appendChild(li);
      
      li.querySelector('button').addEventListener('click', (e) => {
        const wordToRemove = e.target.getAttribute('data-word');
        const updatedList = words.filter(w => w !== wordToRemove);
        chrome.storage.local.set({ blockList: updatedList }, () => {
          renderBlockList(updatedList);
        });
      });
    });
  }
});
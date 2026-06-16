// Ensure this script runs only once per page
if (!window.__popupBlockerInjected) {
  window.__popupBlockerInjected = true;

  // ======================
  // 1. Block window.open()
  // ======================
  if (typeof window.__originalOpen === 'undefined') {
    window.__originalOpen = window.open;
  }

  window.open = function(url, name, specs, replace) {
    console.log('[Popup Blocker] Blocked window.open:', url);
    return null;
  };

  // ==================================
  // 2. Block click-triggered popups
  // ==================================
  function handlePotentialPopupClick(e) {
    const target = e.target.closest('a, button, [onclick]');
    if (!target) return;

    const isPopupLink = (target.tagName === 'A' && target.target === '_blank');
    const hasWindowOpen = target.hasAttribute('onclick') && 
                         /window\.open\(/i.test(target.getAttribute('onclick'));

    if (isPopupLink || hasWindowOpen) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      console.log('[Popup Blocker] Blocked popup click:', target.href || target.onclick);
    }
  }

  document.addEventListener('click', handlePotentialPopupClick, true);

  // ====================================
  // 3. Monitor dynamically added elements
  // ====================================
  function blockDynamicPopupClick(e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    console.log('[Popup Blocker] Blocked dynamic popup:', e.target);
  }

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // Check the node itself
          if (node.matches('a[target="_blank"], [onclick*="window.open"]')) {
            node.addEventListener('click', blockDynamicPopupClick, true);
          }
          
          // Check all children
          const popupElements = node.querySelectorAll ?
              node.querySelectorAll('a[target="_blank"], [onclick*="window.open"]') : [];
          
          popupElements.forEach(el => {
            el.addEventListener('click', blockDynamicPopupClick, true);
          });
        }
      });
    });
  });

  observer.observe(document, {
    childList: true,
    subtree: true
  });

  // ====================================
  // 4. Cleanup when page unloads
  // ====================================
  window.addEventListener('unload', () => {
    document.removeEventListener('click', handlePotentialPopupClick, true);
    observer.disconnect();
    window.open = window.__originalOpen;
    delete window.__popupBlockerInjected;
  });
}
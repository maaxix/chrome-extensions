// Block new window opens from links and buttons
document.addEventListener('click', (e) => {
  const target = e.target.closest('a, button, [onclick]');
  if (!target) return;

  const isPopup = (
    (target.tagName === 'A' && target.target === '_blank') ||
    (target.hasAttribute('onclick') && 
    target.getAttribute('onclick').includes('window.open')
  );

  if (isPopup) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    console.log('Popup blocked:', target);
  }
}, true);

// Override window.open
const originalOpen = window.open;
window.open = function(url, name, specs, replace) {
  console.log('Blocked window.open attempt:', url);
  return null;
};

// Monitor dynamically added elements
new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const elements = node.querySelectorAll ? 
          node.querySelectorAll('a[target="_blank"], [onclick*="window.open"]') : [];
        elements.forEach(el => {
          el.addEventListener('click', blockPopupClick, true);
        });
      }
    });
  });
}).observe(document, {
  childList: true,
  subtree: true
});

function blockPopupClick(e) {
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();
  console.log('Dynamically added popup blocked:', e.target);
}
// Listen for clicks on the page
document.addEventListener('click', function(event) {
    // Check if the click is on an element that would open a popup
    const target = event.target;
    const isPopupTrigger = 
      target.matches('[onclick*="window.open"]') ||
      target.matches('[target="_blank"]') ||
      target.matches('a[href*="popup"]') ||
      target.closest('[onclick*="window.open"]');
    
    if (isPopupTrigger) {
      event.preventDefault();
      event.stopPropagation();
      
      // Send message to background script to handle the URL
      chrome.runtime.sendMessage({
        action: "handlePopupClick",
        url: target.href || target.getAttribute('onclick').match(/'(.*?)'/)[1]
      });
    }
  }, true); // Use capture phase to catch events early
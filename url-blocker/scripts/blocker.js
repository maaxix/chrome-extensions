// document.addEventListener('click', function(e) 
// {
//     console.log(`mousedown ${window.location.href}`)
//     var target = e.target;
//   if(target && target.tagName)
//   console.log(`target ${target.tagName}`);
// 
//     while (target && target.tagName !== 'A') 
//     {
//         target = target.parentNode;
//         if (!target) { return; }
//     }
//     
//     //if(confirm ('open:'+ target.href) == false)
//     if(!target.href || target.href.length==0)
//     {
//         e.preventDefault();
//         return false;
//     }
//     return;
// });

//function findAboutBlankFrames() {
//    const frames = Array.from(document.querySelectorAll('iframe, frame'));
//    const aboutBlankFrames = frames.filter(frame => {
//      try {
//        return frame.contentWindow?.location.href === 'about:blank';
//      } catch (e) {
//        // Cross-origin frame - can't access location
//        return false;
//      }
//    });
//    
//    console.log('DOM-detected about:blank frames:', aboutBlankFrames);
//    return aboutBlankFrames;
//  }
//console.log(`injected url ${window.location.href}`)

//
//findAboutBlankFrames();
//
//// Function to check and remove about:blank iframes
//function processIframe(iframe) {
//    try {
//      // Skip if already processed
//      if (iframe.dataset.blankProcessed) return;
//      
//      // Check if about:blank (works for same-origin frames)
//      if (iframe.contentWindow?.location.href === 'about:blank') {
//        console.log('Removing about:blank iframe:', iframe);
//        iframe.remove();
//        return;
//      }
//      
//      // For cross-origin frames, check the src attribute
//      if (iframe.src === 'about:blank' || 
//          iframe.getAttribute('srcdoc') || 
//          iframe.hasAttribute('data-about-blank')) {
//        console.log('Removing suspected about:blank iframe:', iframe);
//        iframe.remove();
//        return;
//      }
//      
//      // Mark as processed
//      iframe.dataset.blankProcessed = 'true';
//    } catch (e) {
//      // Cross-origin error - use fallback detection
//      if (iframe.src === 'about:blank' || !iframe.src) {
//        iframe.remove();
//      }
//    }
//  }
//  
//  // Process existing iframes
//  document.querySelectorAll('iframe').forEach(processIframe);
//  

function processIframe(iframe) {
    console.log(`process ${iframe.src}`)
    console.log(iframe);

    if (iframe.src === 'about:blank' || 
        iframe.getAttribute('srcdoc1') 
    ) {
    console.log('Removing suspected about:blank iframe:', iframe);
    iframe.remove();
    return;
    }
}

// Function to remove absolutely positioned children
function removeAbsoluteElements() {
    const bodyChildren = document.body.children;
    const elementsToRemove = [];
    
    // First collect elements to avoid live collection issues
    for (let i = 0; i < bodyChildren.length; i++) {
      const element = bodyChildren[i];
      const computedStyle = window.getComputedStyle(element);
      
      if (computedStyle.position === 'absolute') {
        elementsToRemove.push(element);
      }
    }
    
    // Remove collected elements
    elementsToRemove.forEach(element => {
      console.log('Removing absolute element:', element);
      element.remove();
    });
    
    return elementsToRemove.length;
  }

//  // Set up MutationObserver to catch dynamically added iframes
const observer = new MutationObserver((mutations) => {
mutations.forEach((mutation) => {
    hideAbsoluteElements();
    
    mutation.addedNodes.forEach((node) => {
    // Check if node is an iframe
    if (node.nodeName === 'IFRAME') {
        processIframe(node);
    }
    // Check for iframes inside added nodes
    if (node.querySelectorAll) {
        node.querySelectorAll('iframe').forEach(processIframe);
    }
    });
});
});
  
// Start observing
observer.observe(document, {
childList: true,
subtree: true
});



  function hideAbsoluteElements() {
    //console.log("hideAbsoluteElements start ")
    if(!document.body || ! document.body.parentNode) return;

    const node = document.body.parentNode;
    try {
      //console.log("hideAbsoluteElements children ")

      let hiddenCount = 0;
      
      Array.from(node.children).forEach(child => {
        if (child === document.body) return;
        try {
          const style = window.getComputedStyle(child);
          if (style.position === 'absolute' && style.visibility !== 'hidden') {
            //console.log(child.className);
            child.style.visibility = 'hidden';
            child.style.zIndex = "-9999";
            child.style.display = 'none';
            hiddenCount++;
            if (child.hasAttribute('onclick')) {
                child.removeAttribute('onclick');
              }
          }
        } catch (e) {
          console.warn('Could not hide element:', e);
        }
      });
      
      return hiddenCount;
    } catch (error) {
      console.error('Error in hideAbsoluteElements:', error);
      return 0;
    }
  }

function initAbsoluteElementRemover() {
      // Body doesn't exist yet, try again shortly
      setTimeout(hideAbsoluteElements, 400);
}
  
  // Start the process when DOM is ready
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    initAbsoluteElementRemover();
  } else {
    document.addEventListener('DOMContentLoaded', initAbsoluteElementRemover);
    window.addEventListener('load', initAbsoluteElementRemover);
  }
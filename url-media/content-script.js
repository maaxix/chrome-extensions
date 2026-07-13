/**
 * Content script — complements network-level capture by scanning the DOM
 * for <video>/<audio>/<source>/<track> elements. This catches cases like
 * currentSrc being set dynamically by a player, or blob: object URLs used
 * with the MediaSource Extensions API (the underlying segments themselves
 * are still caught at the network level by the service worker).
 *
 * This script never decides whether to store anything — it just reports
 * candidate URLs to the background service worker, which applies the
 * global/per-tab enabled checks and classification.
 */
(() => {
  const REPORTED = new Set();
  const MESSAGE_TYPE = 'CONTENT_MEDIA_FOUND';

  function report(url) {
    if (!url || REPORTED.has(url)) return;
    REPORTED.add(url);
    try {
      chrome.runtime.sendMessage({ type: MESSAGE_TYPE, url });
    } catch {
      // extension context may be invalidated (e.g. after an update) — ignore
    }
  }

  function scanElement(el) {
    if (!el || !el.tagName) return;
    const tag = el.tagName.toLowerCase();

    if (tag === 'video' || tag === 'audio') {
      if (el.currentSrc) report(el.currentSrc);
      else if (el.src) report(el.src);
      if (el.poster) report(el.poster);
    } else if (tag === 'source') {
      if (el.src) report(el.src);
    } else if (tag === 'track') {
      if (el.src) report(el.src);
    }
  }

  function scanAll(root = document) {
    try {
      root.querySelectorAll('video, audio, source, track').forEach(scanElement);
    } catch {
      /* root might not support querySelectorAll (rare) */
    }
  }

  // Initial scan once DOM is ready enough
  function initialScan() {
    scanAll(document);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialScan, { once: true });
  } else {
    initialScan();
  }

  // Media elements often set currentSrc asynchronously once playback begins
  const mediaEvents = ['loadedmetadata', 'loadstart', 'durationchange', 'canplay'];
  mediaEvents.forEach((evt) => {
    document.addEventListener(
      evt,
      (e) => {
        scanElement(e.target);
      },
      { capture: true, passive: true }
    );
  });

  // Watch for dynamically added/changed media elements (SPA players, ads, etc.)
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === 'childList') {
        m.addedNodes.forEach((node) => {
          if (node.nodeType !== 1) return;
          scanElement(node);
          if (node.querySelectorAll) {
            node.querySelectorAll('video, audio, source, track').forEach(scanElement);
          }
        });
      } else if (m.type === 'attributes') {
        scanElement(m.target);
      }
    }
  });

  function startObserving() {
    observer.observe(document.documentElement || document, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src', 'currentSrc', 'poster']
    });
  }

  if (document.documentElement) {
    startObserving();
  } else {
    document.addEventListener('DOMContentLoaded', startObserving, { once: true });
  }
})();

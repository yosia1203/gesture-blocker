(() => {
  const state = { swipe: false, zoom: false };
  let styleEl = null;

  function findRule(sites, hostname) {
    let host = hostname.replace(/^www\./, "");
    while (host) {
      if (sites[host]) return sites[host];
      const dot = host.indexOf(".");
      if (dot === -1) break;
      host = host.slice(dot + 1);
    }
    return null;
  }

  function applyStyle() {
    if (state.swipe && !styleEl) {
      // Stops Chrome's swipe-to-navigate, which fires when the page overscrolls horizontally.
      styleEl = document.createElement("style");
      styleEl.textContent =
        "html, body { overscroll-behavior-x: none !important; }";
      (document.head || document.documentElement).appendChild(styleEl);
    } else if (!state.swipe && styleEl) {
      styleEl.remove();
      styleEl = null;
    }
  }

  function canScrollX(el, dx) {
    const style = getComputedStyle(el);
    const scrollable =
      /(auto|scroll|overlay)/.test(style.overflowX) ||
      el === document.scrollingElement;
    if (!scrollable || el.scrollWidth <= el.clientWidth) return false;
    const max = el.scrollWidth - el.clientWidth;
    return dx < 0 ? el.scrollLeft > 0 : el.scrollLeft < max - 1;
  }

  function onWheel(e) {
    // Pinch-zoom on a trackpad arrives as a wheel event with ctrlKey set.
    if (state.zoom && e.ctrlKey) {
      e.preventDefault();
      return;
    }
    // Fallback for swipe navigation: cancel horizontal swipes nothing can absorb.
    if (state.swipe && Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      const path = e.composedPath();
      const absorbed = path.some(
        (n) => n instanceof Element && canScrollX(n, e.deltaX)
      );
      if (!absorbed) e.preventDefault();
    }
  }

  // Safari-style gesture events (no-ops in most Chrome builds, harmless otherwise).
  function onGesture(e) {
    if (state.zoom) e.preventDefault();
  }

  window.addEventListener("wheel", onWheel, { passive: false, capture: true });
  for (const t of ["gesturestart", "gesturechange", "gestureend"]) {
    window.addEventListener(t, onGesture, { passive: false, capture: true });
  }

  function update(sites) {
    const rule = findRule(sites || {}, location.hostname) || {};
    state.swipe = !!rule.swipe;
    state.zoom = !!rule.zoom;
    if (document.documentElement) applyStyle();
    else document.addEventListener("DOMContentLoaded", applyStyle, { once: true });
  }

  chrome.storage.sync.get({ sites: {} }, ({ sites }) => update(sites));
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "sync" && changes.sites) update(changes.sites.newValue);
  });
})();

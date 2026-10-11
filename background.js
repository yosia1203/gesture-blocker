// Switches the toolbar icon per tab: red when the tab's site has any blocking on, grey otherwise.
importScripts("common.js");

const iconSet = (kind) => ({
  16: `icons/${kind}/icon16.png`,
  32: `icons/${kind}/icon32.png`,
  48: `icons/${kind}/icon48.png`,
  128: `icons/${kind}/icon128.png`,
});

async function getSites() {
  const { sites } = await chrome.storage.sync.get({ sites: {} });
  return sites;
}

function isActive(sites, url) {
  try {
    const u = new URL(url);
    if (!/^https?:$/.test(u.protocol)) return false;
    const match = findRule(sites, u.hostname);
    return !!(match && (match.rule.swipe || match.rule.zoom));
  } catch {
    return false;
  }
}

async function updateTab(tab, sites) {
  if (!tab?.id || !tab.url) return;
  const active = isActive(sites, tab.url);
  try {
    await chrome.action.setIcon({ tabId: tab.id, path: iconSet(active ? "active" : "inactive") });
    await chrome.action.setTitle({
      tabId: tab.id,
      title: active ? "Gesture Blocker: blocking on this site" : "Gesture Blocker",
    });
  } catch {
    // Tab closed mid-update.
  }
}

async function updateAllTabs() {
  const sites = await getSites();
  const tabs = await chrome.tabs.query({});
  await Promise.all(tabs.map((t) => updateTab(t, sites)));
}

// Chrome resets per-tab icons on navigation, so re-apply on every load step.
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.url || changeInfo.status) updateTab(tab, await getSites());
});
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  updateTab(await chrome.tabs.get(tabId), await getSites());
});
// Prerendered / back-forward-cached pages swap into the tab without a normal load.
chrome.tabs.onReplaced.addListener(async (tabId) => {
  updateTab(await chrome.tabs.get(tabId), await getSites());
});
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && changes.sites) updateAllTabs();
});
chrome.runtime.onInstalled.addListener(updateAllTabs);
chrome.runtime.onStartup.addListener(updateAllTabs);

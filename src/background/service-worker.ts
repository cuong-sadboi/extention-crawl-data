function getRootDomain(hostname: string): string {
  const parts = hostname.split(".");
  if (parts.length <= 2) return hostname;
  return parts.slice(-2).join(".");
}

function parseUrl(urlString: string) {
  try {
    const url = new URL(urlString);
    const params = url.searchParams;
    const arbLayoutID =
      params.get("arbLayoutID") ?? params.get("layout_id");
    return {
      rootdomain: getRootDomain(url.hostname),
      arb_campaign_id: params.get("arb_campaign_id"),
      arbLayoutID,
      click_id: params.get("click_id"),
      campaign_id: params.get("campaign_id"),
      network: params.get("network"),
      gclid: params.get("gclid"),
      gbraid: params.get("gbraid"),
      wbraid: params.get("wbraid"),
      ttclid: params.get("ttclid"),
      fbclid: params.get("fbclid"),
      rdt_cid: params.get("rdt_cid"),
      twclid: params.get("twclid"),
      ScCid: params.get("ScCid"),
      tblci: params.get("tblci"),
      dicbo: params.get("dicbo"),
      nb_cid: params.get("nb_cid"),
      epik: params.get("epik"),
    };
  } catch {
    return null;
  }
}

function hasTrackingParams(data: any): boolean {
  return (
    data &&
    (data.campaign_id ||
      data.click_id ||
      data.arb_campaign_id ||
      data.network ||
      data.gclid ||
      data.gbraid ||
      data.wbraid ||
      data.ttclid ||
      data.fbclid ||
      data.epik)
  );
}

// Capture URLs BEFORE redirect happens — this is the key fix
chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  if (details.frameId === 0) {
    const parsed = parseUrl(details.url);
    if (hasTrackingParams(parsed)) {
      chrome.storage.session.set({ [`tab_${details.tabId}`]: parsed });
    }
  }
});

// Also capture from content scripts (for pages that don't redirect)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "URL_DATA" && sender.tab?.id) {
    const tabId = sender.tab.id;
    const parsed = parseUrl(message.payload);
    if (parsed) {
      chrome.storage.session.get(`tab_${tabId}`, (result) => {
        const existing = result[`tab_${tabId}`] || {};
        chrome.storage.session.set({ [`tab_${tabId}`]: { ...existing, ...parsed } });
      });
    }
  }

  if (message.type === "PAGE_DATA" && sender.tab?.id) {
    const tabId = sender.tab.id;
    chrome.storage.session.get(`tab_${tabId}`, (result) => {
      const existing = result[`tab_${tabId}`] || {};
      chrome.storage.session.set({ [`tab_${tabId}`]: { ...existing, ...message.payload } });
    });
  }

  if (message.type === "COOKIE_DATA" && sender.tab?.id) {
    const tabId = sender.tab.id;
    chrome.storage.session.get(`tab_${tabId}`, (result) => {
      const existing = (result[`tab_${tabId}`] || {}) as Record<string, unknown>;
      const fromCookie = message.payload as Record<string, string | null>;
      const updates: Record<string, string | null> = {};
      if (fromCookie._epik != null && !existing.epik) updates.epik = fromCookie._epik;
      if (fromCookie._fbp != null) updates._fbp = fromCookie._fbp;
      if (fromCookie._fbc != null) updates._fbc = fromCookie._fbc;
      chrome.storage.session.set({ [`tab_${tabId}`]: { ...existing, ...updates } });
    });
  }

  if (message.type === "STORAGE_DATA" && sender.tab?.id) {
    const tabId = sender.tab.id;
    chrome.storage.session.get(`tab_${tabId}`, (result) => {
      const existing = (result[`tab_${tabId}`] || {}) as Record<string, unknown>;
      const fromStorage = message.payload as Record<string, string | null>;
      const updates: Record<string, string | null> = {};

      if (fromStorage.network != null) updates.network = fromStorage.network;
      if (fromStorage.campaign_id != null) updates.campaign_id = fromStorage.campaign_id;
      if (fromStorage.arb_campaign_id != null)
        updates.arb_campaign_id = fromStorage.arb_campaign_id;
      if (fromStorage.click_id != null) updates.click_id = fromStorage.click_id;
      if (fromStorage.arbLayoutID != null) updates.arbLayoutID = fromStorage.arbLayoutID;

      chrome.storage.session.set({ [`tab_${tabId}`]: { ...existing, ...updates } });
    });
  }

  if (message.type === "RELOAD_DATA") {
    const requestedTabId =
      typeof message.tabId === "number" ? (message.tabId as number) : undefined;

    const handleTab = (tabId: number) => {
      const finishReload = (merged: Record<string, unknown>) => {
        chrome.storage.session.set({ [`tab_${tabId}`]: merged });
        sendResponse(merged);
      };

      const fallbackToStorage = () => {
        chrome.storage.session.get(`tab_${tabId}`, (result) => {
          const stored = result[`tab_${tabId}`];
          sendResponse(stored || null);
        });
      };

      chrome.tabs.sendMessage(tabId, { type: "GET_PAGE_DATA" }, (pageData) => {
        if (chrome.runtime.lastError || !pageData) {
          fallbackToStorage();
          return;
        }
        chrome.storage.session.get(`tab_${tabId}`, (result) => {
          const existing = (result[`tab_${tabId}`] || {}) as Record<string, unknown>;
          let merged = { ...existing };

          if (pageData.url) {
            const parsed = parseUrl(pageData.url);
            if (parsed) merged = { ...merged, ...parsed };
          }

          if (pageData.cookies) {
            const c = pageData.cookies as Record<string, string | null>;
            if (c._epik != null && !merged.epik) merged.epik = c._epik;
            if (c._fbp != null) merged._fbp = c._fbp;
            if (c._fbc != null) merged._fbc = c._fbc;
          }

          if (pageData.storage) {
            const s = pageData.storage as Record<string, string | null>;
            if (s.network != null) merged.network = s.network;
            if (s.campaign_id != null) merged.campaign_id = s.campaign_id;
            if (s.arb_campaign_id != null) merged.arb_campaign_id = s.arb_campaign_id;
            if (s.click_id != null) merged.click_id = s.click_id;
            if (s.arbLayoutID != null) merged.arbLayoutID = s.arbLayoutID;
          }

          finishReload(merged);
        });
      });
    };

    if (requestedTabId !== undefined) {
      handleTab(requestedTabId);
    } else {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (!tab?.id) {
          sendResponse(null);
          return;
        }
        handleTab(tab.id);
      });
    }

    return true;
  }
});

// Open side panel when clicking the extension icon
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.sidePanel.open({ tabId: tab.id });
  }
});

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "sidepanel") {
    // Get data for the active tab from storage
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab?.id) {
        chrome.storage.session.get(`tab_${tab.id}`, (result) => {
          const data = result[`tab_${tab.id}`];
          port.postMessage(data || null);
        });
      } else {
        port.postMessage(null);
      }
    });
  }

  if (port.name === "vlitag-panel") {
    port.onDisconnect.addListener(() => {
      console.log("Disconnected from VLI DevTools panel.");
    });
  }
});
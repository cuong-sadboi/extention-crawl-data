"use strict";
function getRootDomain(hostname) {
    const parts = hostname.split(".");
    if (parts.length <= 2)
        return hostname;
    return parts.slice(-2).join(".");
}
function parseUrl(urlString) {
    try {
        const url = new URL(urlString);
        return {
            rootdomain: getRootDomain(url.hostname),
            arb_campaign_id: url.searchParams.get("arb_campaign_id"),
            arbLayoutID: url.searchParams.get("arbLayoutID"),
            click_id: url.searchParams.get("click_id"),
            campaign_id: url.searchParams.get("campaign_id"),
            network: url.searchParams.get("network"),
        };
    }
    catch {
        return null;
    }
}
function hasTrackingParams(data) {
    return data && (data.campaign_id || data.click_id || data.arb_campaign_id || data.network);
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
        // Only store if we don't already have tracking data for this tab
        chrome.storage.session.get(`tab_${tabId}`, (result) => {
            if (!hasTrackingParams(result[`tab_${tabId}`])) {
                chrome.storage.session.set({ [`tab_${tabId}`]: parsed });
            }
        });
    }
    if (message.type === "PAGE_DATA" && sender.tab?.id) {
        const tabId = sender.tab.id;
        // Merge page data (__dataV3) with existing URL data
        chrome.storage.session.get(`tab_${tabId}`, (result) => {
            const existing = result[`tab_${tabId}`] || {};
            const merged = { ...existing, ...message.payload };
            chrome.storage.session.set({ [`tab_${tabId}`]: merged });
        });
    }
    if (message.type === "RELOAD_DATA") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tab = tabs[0];
            if (tab?.id) {
                chrome.storage.session.get(`tab_${tab.id}`, (result) => {
                    const stored = result[`tab_${tab.id}`];
                    sendResponse(stored || null);
                });
            }
        });
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
            }
            else {
                port.postMessage(null);
            }
        });
    }
});
//# sourceMappingURL=service-worker.js.map
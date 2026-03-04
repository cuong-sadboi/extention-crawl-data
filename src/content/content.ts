function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp("(^| )" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "=([^;]+)"));
  return match?.[2] ? decodeURIComponent(match[2]) : null;
}

function getCookieData(): Record<string, string | null> {
  return {
    _epik: getCookie("_epik"),
    _fbp: getCookie("_fbp"),
    _fbc: getCookie("_fbc"),
  };
}

const STORAGE_KEYS = [
  "network",
  "campaign_id",
  "arb_campaign_id",
  "click_id",
  "arbLayoutID",
  "layout_id",
  "section_id",
  "gclid",
  "gbraid",
  "wbraid",
  "ttclid",
  "fbclid",
  "rdt_cid",
  "twclid",
  "ScCid",
  "tblci",
  "dicbo",
  "nb_cid",
  "epik",
  "utm_campaign",
  "utm_source",
  "arb_ad_id",
  "arb_creative_id",
];

function getStorageTracking(): Record<string, string | null> {
  const result: Record<string, string | null> = {};

  const readFrom = (storage: Storage | null) => {
    if (!storage) return;
    try {
      for (const key of STORAGE_KEYS) {
        const value = storage.getItem(key);
        if (value && !result[key]) {
          result[key] = value;
        }
      }
      
      // Map section_id/layout_id to arbLayoutID
      if (!result.arbLayoutID) {
        const layoutId = storage.getItem("section_id") ?? storage.getItem("layout_id");
        if (layoutId) result.arbLayoutID = layoutId;
      }
    } catch {
      // ignore storage access errors
    }
  };

  try {
    readFrom(window.sessionStorage);
  } catch { }
  try {
    readFrom(window.localStorage);
  } catch { }

  return result;
}

function sendCookieData() {
  chrome.runtime.sendMessage({ type: "COOKIE_DATA", payload: getCookieData() });
}

function sendStorageData() {
  chrome.runtime.sendMessage({
    type: "STORAGE_DATA",
    payload: getStorageTracking(),
  });
}

function collectPageData() {
  chrome.runtime.sendMessage({
    type: "URL_DATA",
    payload: window.location.href,
  });
  sendCookieData();
  sendStorageData();
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "GET_PAGE_DATA") {
    sendResponse({
      url: window.location.href,
      cookies: getCookieData(),
      storage: getStorageTracking(),
    });
    return true;
  }
});

collectPageData();
setTimeout(sendCookieData, 2000);
setTimeout(sendStorageData, 2000);

window.addEventListener("message", (event) => {
  if (event.source === window && event.data?.type === "__dataV3_EXTRACT") {
    chrome.runtime.sendMessage({
      type: "PAGE_DATA",
      payload: event.data.payload,
    });
  }
});
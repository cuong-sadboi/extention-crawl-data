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

function getStorageTracking(): Record<string, string | null> {
  const result: Record<string, string | null> = {
    network: null,
    campaign_id: null,
    arb_campaign_id: null,
    click_id: null,
    arbLayoutID: null,
  };

  const readFrom = (storage: Storage | null) => {
    if (!storage) return;
    try {
      const n = storage.getItem("network");
      if (n && !result.network) result.network = n;

      const cId = storage.getItem("campaign_id");
      if (cId && !result.campaign_id) result.campaign_id = cId;

      const arbId = storage.getItem("arb_campaign_id");
      if (arbId && !result.arb_campaign_id) result.arb_campaign_id = arbId;

      const click =
        storage.getItem("click_id") ?? "";
      if (click && !result.click_id) result.click_id = click;

      const layout =
        storage.getItem("layout_id") ?? "";
      if (layout && !result.arbLayoutID) result.arbLayoutID = layout;
    } catch {
      // ignore storage access errors
    }
  };

  try {
    readFrom(window.sessionStorage);
  } catch {}
  try {
    readFrom(window.localStorage);
  } catch {}

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
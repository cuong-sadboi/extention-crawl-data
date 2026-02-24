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

function sendCookieData() {
  chrome.runtime.sendMessage({ type: "COOKIE_DATA", payload: getCookieData() });
}

function collectPageData() {
  chrome.runtime.sendMessage({
    type: "URL_DATA",
    payload: window.location.href,
  });
  sendCookieData();
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "GET_PAGE_DATA") {
    sendResponse({
      url: window.location.href,
      cookies: getCookieData(),
    });
    return true;
  }
});

collectPageData();
setTimeout(sendCookieData, 2000);

window.addEventListener("message", (event) => {
  if (event.source === window && event.data?.type === "__dataV3_EXTRACT") {
    chrome.runtime.sendMessage({
      type: "PAGE_DATA",
      payload: event.data.payload,
    });
  }
});
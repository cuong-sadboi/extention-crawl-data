// Send the current page URL to the background service worker
chrome.runtime.sendMessage({
  type: "URL_DATA",
  payload: window.location.href,
});

// Listen for the extracted data from page context
window.addEventListener("message", (event) => {
  if (event.source === window && event.data?.type === "__dataV3_EXTRACT") {
    chrome.runtime.sendMessage({
      type: "PAGE_DATA",
      payload: event.data.payload,
    });
  }
});
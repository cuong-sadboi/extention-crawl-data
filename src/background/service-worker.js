let latestData = null;
chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "URL_PARSED") {
        latestData = message.payload;
    }
});
chrome.runtime.onConnect.addListener((port) => {
    if (port.name === "sidepanel") {
        port.postMessage(latestData);
    }
});
export {};
//# sourceMappingURL=service-worker.js.map
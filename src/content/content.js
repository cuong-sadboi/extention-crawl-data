import { parseUrl } from "../utils/urlParser";
const data = parseUrl(window.location.href);
chrome.runtime.sendMessage({
    type: "URL_PARSED",
    payload: data,
});
//# sourceMappingURL=content.js.map
// This runs in the MAIN world (page context) to access window.__dataV3
// and also read tracking data that has been moved into storage.
(function () {
  var attempts = 0;
  var maxAttempts = 50;

  // Parse URL params once
  var urlParams;
  try {
    urlParams = new URLSearchParams(window.location.search);
  } catch (e) {
    urlParams = null;
  }

  function extract() {
    var payload = {};

    // 1) Try to read from window.__dataV3 if available
    try {
      var d = window.__dataV3;
      var e = window.__data;
      if (d) {
        var keywords = d.campaign && d.campaign.keywords;
        var keywordsStr = Array.isArray(keywords) ? keywords.join(", ") : keywords || null;

        payload.pubId = d.pubId || null;
        payload.channelId = d.channelId || null;
        payload.styleId = d.styleId != null ? String(d.styleId) : null;
        payload.keywords = keywordsStr;
        payload.referrerAdCreative = d.campaign && d.campaign.fixedAdTitle;
        payload.landing_page_id = e.post && e.post.id || null;
      }
    } catch (e) { }

    // 2) Check refCreative from URL (override referrerAdCreative)
    try {
      var refCreative = urlParams && urlParams.get("refCreative");
      if (refCreative) {
        payload.referrerAdCreative = refCreative;
      }
    } catch (e) { }

    // If we already have any data, send it to the content script/background.
    if (Object.keys(payload).length > 0) {
      window.postMessage(
        {
          type: "__dataV3_EXTRACT",
          payload: payload,
        },
        "*"
      );
      return;
    }

    // Otherwise, retry a few times to wait for the page to populate storage/__dataV3.
    attempts++;
    if (attempts < maxAttempts) {
      setTimeout(extract, 200);
    }
  }

  extract();
})();

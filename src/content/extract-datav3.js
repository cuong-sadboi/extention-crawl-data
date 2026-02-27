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

  function readTrackingFromStorage() {
    var result = {};

    function readFrom(storage) {
      if (!storage) return;

      var v;

      v = storage.getItem("network");
      if (v && result.network == null) result.network = v;

      v = storage.getItem("campaign_id");
      if (v && result.campaign_id == null) result.campaign_id = v;

      v = storage.getItem("arb_campaign_id");
      if (v && result.arb_campaign_id == null) result.arb_campaign_id = v;

      v = storage.getItem("click_id") || storage.getItem("utm_uid");
      if (v && result.click_id == null) result.click_id = v;

      // Map section_id/layout id in session to arbLayoutID (Layout id)
      v = storage.getItem("section_id") || storage.getItem("layout_id");
      if (v && result.arbLayoutID == null) result.arbLayoutID = v;
    }

    try {
      readFrom(window.sessionStorage);
    } catch (e) { }
    try {
      readFrom(window.localStorage);
    } catch (e) { }

    return result;
  }

  function extract() {
    var payload = {};

    // 1) Try to read from window.__dataV3 if available
    try {
      var d = window.__dataV3;
      if (d) {
        var keywords = d.campaign && d.campaign.keywords;
        var keywordsStr = Array.isArray(keywords)
          ? keywords.join(", ")
          : keywords || null;

        payload.pubId = d.pubId || null;
        payload.channelId = d.channelId || null;
        payload.styleId = d.styleId != null ? String(d.styleId) : null;
        payload.keywords = keywordsStr;
        payload.referrerAdCreative = d.campaign && d.campaign.fixedAdTitle;
      }
    } catch (e) { }

    // 2) Check refCreative from URL (override referrerAdCreative)
    try {
      var refCreative = urlParams && urlParams.get("refCreative");
      if (refCreative) {
        payload.referrerAdCreative = refCreative;
      }
    } catch (e) { }

    // 3) Merge data that the site moved into storage (session/local)
    try {
      var storageData = readTrackingFromStorage();
      for (var k in storageData) {
        if (Object.prototype.hasOwnProperty.call(storageData, k)) {
          if (payload[k] == null && storageData[k] != null) {
            payload[k] = storageData[k];
          }
        }
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

// This runs in the MAIN world (page context) to access window.__dataV3
(function () {
  var attempts = 0;
  var maxAttempts = 50;

  function extract() {
    try {
      var d = window.__dataV3;
      if (d) {
        var keywords = (d.campaign && d.campaign.keywords);
        var keywordsStr = Array.isArray(keywords)
          ? keywords.join(", ")
          : keywords || null;
        window.postMessage(
          {
            type: "__dataV3_EXTRACT",
            payload: {
              pubId: d.pubId || null,
              channelId: d.channelId || null,
              styleId: d.styleId != null ? String(d.styleId) : null,
              keywords: keywordsStr,
            },
          },
          "*"
        );
        return;
      }
    } catch (e) {}

    attempts++;
    if (attempts < maxAttempts) {
      setTimeout(extract, 200);
    }
  }

  extract();
})();

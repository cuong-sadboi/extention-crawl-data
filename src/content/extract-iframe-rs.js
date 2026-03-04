/**
 * extract-iframe-rs.js
 * Content script injected into ALL frames (main page + iframes)
 * to extract Related Searches from Google CSE widgets.
 */
(function () {
  "use strict";

  const TAG = "[RS-extract]";
  const isIframe = window !== window.top;
  let alreadySent = false;

  function extractRelatedSearches() {
    const results = [];
    const seen = new Set();

    function add(text, href) {
      const t = (text || "").trim();
      if (!t || t.length < 2 || seen.has(t.toLowerCase())) return;
      // Skip generic/navigation text
      if (/^(search|related|related searches|more|next|prev|back|home|about|contact|subscribe|web search)$/i.test(t)) return;
      seen.add(t.toLowerCase());
      results.push({ text: t, href: href || "" });
    }

    // Strategy 1: Find "Related searches" heading and get sibling links
    const allElements = document.querySelectorAll("h1, h2, h3, h4, h5, h6, div, span, p, section, header");
    allElements.forEach((el) => {
      const txt = (el.textContent || "").trim().toLowerCase();
      // Only match elements whose DIRECT text is "related searches"
      if (el.children.length > 5) return; // Skip large containers
      if (txt === "related searches" || txt === "related search") {
        // Look at next siblings of this element
        let sibling = el.nextElementSibling;
        for (let j = 0; j < 15 && sibling; j++) {
          sibling.querySelectorAll("a").forEach((a) => {
            const linkText = (a.textContent || "").trim();
            if (linkText.length > 2 && linkText.toLowerCase() !== "related searches") {
              add(linkText, a.href || "");
            }
          });
          sibling = sibling.nextElementSibling;
        }
        // Also look at parent's next siblings
        let parentSibling = el.parentElement?.nextElementSibling;
        for (let j = 0; j < 10 && parentSibling; j++) {
          parentSibling.querySelectorAll("a").forEach((a) => {
            const linkText = (a.textContent || "").trim();
            if (linkText.length > 2 && linkText.toLowerCase() !== "related searches") {
              add(linkText, a.href || "");
            }
          });
          parentSibling = parentSibling.nextElementSibling;
        }
      }
    });

    // Strategy 2: Common CSS selectors for related search containers
    const containerSelectors = [
      ".related-search-container a",
      ".gcs-results-footer a",
      ".rscontainer a",
      ".gsc-refinementsArea a",
      '[class*="related-search"] a',
      '[class*="relatedsearch"] a',
      '[class*="RelatedSearch"] a',
      '[data-refinementlabel] a',
    ];
    containerSelectors.forEach((sel) => {
      try {
        document.querySelectorAll(sel).forEach((a) => {
          const text = (a.textContent || "").trim();
          if (text.length > 2) {
            add(text, a.href || "");
          }
        });
      } catch (_) {}
    });

    // Strategy 3: Links with q= param in search URLs
    document.querySelectorAll('a[href*="search?"], a[href*="&q="], a[href*="?q="]').forEach((a) => {
      const href = a.href || a.getAttribute("href") || "";
      const text = (a.textContent || "").trim();
      if (text.length > 2 && /[?&]q=/.test(href)) {
        try {
          const url = new URL(href, location.origin);
          const q = url.searchParams.get("q");
          if (q && q.length > 1) {
            add(text, href);
          }
        } catch (_) {
          add(text, href);
        }
      }
    });

    // Strategy 4: Iframe-specific - brute-force q= param links
    if (isIframe) {
      document.querySelectorAll("a").forEach((a) => {
        try {
          const url = new URL(a.href, location.origin);
          const q = url.searchParams.get("q");
          if (q && q.length > 1 && !q.startsWith("http")) {
            add(q, a.href);
          }
        } catch (_) {}
      });

      // Also check bold/strong elements in iframes
      document.querySelectorAll("b, strong").forEach((el) => {
        const parent = el.closest("a");
        if (parent) {
          add(parent.textContent, parent.href || "");
        }
      });
    }

    return results;
  }

  function sendResults(searches) {
    if (!searches || searches.length === 0) return;
    if (alreadySent) return;
    alreadySent = true;

    console.log(TAG, isIframe ? "(iframe)" : "(main)", "Found", searches.length, "related searches:", searches);

    try {
      chrome.runtime.sendMessage({
        type: "IFRAME_RELATED_SEARCHES",
        payload: { searches: searches },
      });
    } catch (err) {
      console.warn(TAG, "Failed to send message:", err);
    }
  }

  function tryExtract() {
    const results = extractRelatedSearches();
    if (results.length > 0) {
      sendResults(results);
      return true;
    }
    return false;
  }

  // Try immediately
  if (tryExtract()) return;

  // Observe DOM changes for dynamically loaded content
  const target = document.body || document.documentElement;
  let observer = null;
  if (target) {
    observer = new MutationObserver(() => {
      if (tryExtract()) {
        observer.disconnect();
      }
    });
    observer.observe(target, {
      childList: true,
      subtree: true,
    });
  }

  // Retry a few times with increasing delay
  const delays = [500, 1500, 3000, 5000, 8000];
  delays.forEach((ms) => {
    setTimeout(() => {
      if (!alreadySent && tryExtract() && observer) {
        observer.disconnect();
      }
    }, ms);
  });

  // Final cleanup – disconnect observer after 12s regardless
  setTimeout(() => {
    if (observer) observer.disconnect();
  }, 12000);
})();

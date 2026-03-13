/**
 * extract-iframe-rs.js
 * Content script injected into ALL frames (main page + iframes)
 * Extracts Related Searches using language-agnostic strategies (CSS classes, selectors, URL patterns, DOM structure).
 * No language-based heading detection — works universally regardless of page language.
 * Designed for arbitrage pages (tipssearch, typedeal, etc.) and Google AFS/CSE iframes.
 */
(function () {
  "use strict";

  var TAG = "[RS-extract]";
  var isIframe = window !== window.top;
  var hasSent = false;
  var retryCount = 0;
  var MAX_RETRIES = 20;
  var RETRY_INTERVAL = 1000;

  var host = (window.location.hostname || "").toLowerCase();
  var isGoogleFrame =
    host.includes("syndicatedsearch.goog") ||
    host.includes("google.com") ||
    host.includes("google.co.") ||
    host.includes("googleadservices.com") ||
    host.includes("googlesyndication.com") ||
    host.includes("cse.google");

  // Words to skip (navigation/UI text)
  var SKIP_TEXTS = new Set([
    "search", "related", "related searches", "more", "next", "prev", "previous",
    "back", "home", "about", "contact", "subscribe", "web search", "menu",
    "sign in", "sign up", "log in", "login", "register", "privacy", "terms",
    "cookie", "accept", "close", "ok", "cancel", "submit", "send", "read more",
    "learn more", "click here", "see more", "show more", "load more",
    "suche", "recherche", "buscar", "pesquisar", "cerca", "zoeken", "szukaj",
    "поиск", "検索", "搜索", "검색"
  ]);

  // Blacklist headings: sections that contain reference/source links, NOT RS
  var BLACKLIST_HEADING_PATTERNS = [
    /^sources?$/i, /^quellen?$/i, /^references?$/i, /^r[ée]f[ée]rences?$/i,
    /^fuentes?$/i, /^fonti?$/i, /^bronnen?$/i, /^ngu[ồo]n$/i,
    /^출처$/i, /^参考$/i, /^出典$/i, /^источники?$/i,
    /^bibliography$/i, /^bibliograf/i, /^citations?$/i,
    /^see\s*also$/i, /^weitere\s*informationen$/i,
    /^liens?\s*(utiles?|externes?)?$/i, /^external\s*links?$/i,
    /^sponsors?$/i, /^partners?$/i, /^advertisem?ents?$/i,
    /^footer$/i, /^navigation$/i, /^menu$/i, /^nav$/i,
    /^contact$/i, /^kontakt$/i, /^impressum$/i, /^legal$/i,
    /^datenschutz/i, /^privacy/i, /^disclaimer$/i,
    /^haftungsausschluss$/i,
  ];

  function isBlacklistedHeading(text) {
    var t = (text || "").trim();
    if (t.length > 60) return false;
    for (var i = 0; i < BLACKLIST_HEADING_PATTERNS.length; i++) {
      if (BLACKLIST_HEADING_PATTERNS[i].test(t)) return true;
    }
    return false;
  }

  // ============================================================
  // HELPERS
  // ============================================================
  function isSkipText(t) {
    return SKIP_TEXTS.has(t.toLowerCase());
  }

  function isValidRS(text) {
    var t = (text || "").trim();
    if (t.length < 3 || t.length > 300) return false;
    if (isSkipText(t)) return false;
    // Must have at least 2 words (or 4+ chars for CJK)
    var isCJK = /[\u3000-\u9fff\uac00-\ud7af\u3040-\u309f\u30a0-\u30ff]/.test(t);
    if (!isCJK && t.split(/\s+/).length < 2) return false;
    return true;
  }

  function dedupe(items) {
    var seen = new Set();
    var out = [];
    items.forEach(function (item) {
      var key = item.text.trim().toLowerCase();
      if (key && !seen.has(key)) {
        seen.add(key);
        out.push({ text: item.text.trim(), href: item.href || "" });
      }
    });
    return out;
  }

  // Check if an element is inside a blacklisted section
  function isInsideBlacklistedSection(el) {
    var node = el;
    for (var depth = 0; depth < 6 && node; depth++) {
      if (node.nodeType === 1) {
        var tag = (node.tagName || "").toLowerCase();
        // Check if this is a heading with blacklisted text
        if (/^h[1-6]$/.test(tag) || tag === "header" || tag === "label" || tag === "dt") {
          if (isBlacklistedHeading((node.textContent || "").trim())) return true;
        }
        // Check preceding sibling headings of this container
        var prev = node.previousElementSibling;
        for (var j = 0; j < 3 && prev; j++) {
          var prevTag = (prev.tagName || "").toLowerCase();
          if (/^h[1-6]$/.test(prevTag)) {
            if (isBlacklistedHeading((prev.textContent || "").trim())) return true;
          }
          prev = prev.previousElementSibling;
        }
      }
      node = node.parentElement;
    }
    return false;
  }

  // ============================================================
  // STRATEGY 1: Inside Google iframe → grab all meaningful links
  // Language agnostic: we know we're in Google's iframe
  // ============================================================
  function strategy1_googleIframe() {
    if (!isGoogleFrame || !isIframe) return null;

    var results = [];
    var links = document.querySelectorAll("a");
    links.forEach(function (a) {
      var text = (a.textContent || "").trim();
      if (text.length < 3 || text.length > 300) return;
      // Skip very short single-word items unless CJK
      var isCJK = /[\u3000-\u9fff\uac00-\ud7af]/.test(text);
      if (!isCJK && text.length < 5) return;
      results.push({ text: text, href: a.href || "" });
    });

    // Also extract from q= params
    links.forEach(function (a) {
      try {
        var url = new URL(a.href, location.origin);
        var q = url.searchParams.get("q");
        if (q && q.trim().length > 2 && !q.startsWith("http")) {
          results.push({ text: q.trim(), href: a.href });
        }
      } catch (_) {}
    });

    // Bold/strong elements inside links
    document.querySelectorAll("b, strong").forEach(function (el) {
      var parent = el.closest("a");
      if (parent) {
        var t = (parent.textContent || "").trim();
        if (t.length > 2) results.push({ text: t, href: parent.href || "" });
      }
    });

    return results.length >= 1 ? results : null;
  }

  // ============================================================
  // STRATEGY 2: Google AFS/CSE container selectors
  // Language agnostic: based on Google's fixed DOM IDs/classes
  // ============================================================
  function strategy2_googleContainers() {
    var selectors = [
      "#afscontainer1 a", "#afscontainer2 a", "#afscontainer3 a",
      '[id^="afs"] a',
      '[id^="rs-"] a', '[id^="rs_"] a',
      ".gsc-resultsbox-visible a",
      ".gsc-expansionArea a",
      ".gsc-webResult a.gs-title",
      ".gsc-refinementsArea a",
      ".gsc-refinementHeader + div a",
      ".related-search-container a",
      ".rscontainer a",
      ".related_searches a",
      ".relatedsearch a",
      '[class*="related-search"] a',
      '[class*="relatedsearch"] a',
      '[class*="RelatedSearch"] a',
      '[class*="related_search"] a',
      '[data-refinementlabel] a',
      '[data-related] a',
      '[data-rscount] a',
    ];

    var results = [];
    selectors.forEach(function (sel) {
      try {
        document.querySelectorAll(sel).forEach(function (a) {
          var text = (a.textContent || "").trim();
          if (isValidRS(text)) results.push({ text: text, href: a.href || "" });
        });
      } catch (_) {}
    });

    return results.length >= 1 ? results : null;
  }

  // ============================================================
  // STRATEGY 3: Links with ?q= parameter pointing to Google
  // Language agnostic: based on URL pattern
  // ============================================================
  function strategy3_googleSearchLinks() {
    var results = [];
    var links = document.querySelectorAll("a[href]");

    links.forEach(function (a) {
      try {
        var href = a.href || "";
        var isGoogle =
          href.includes("google.com/search") ||
          href.includes("google.com/afs") ||
          href.includes("google.co.") ||
          href.includes("syndicatedsearch.goog") ||
          href.includes("cse.google");

        if (!isGoogle) return;

        var url = new URL(href);
        var q = url.searchParams.get("q") ||
                url.searchParams.get("query") ||
                url.searchParams.get("search_query");

        var displayText = (a.textContent || "").trim();

        if (q && q.trim().length > 2) {
          results.push({
            text: displayText.length > 3 ? displayText : q.trim(),
            href: href
          });
        } else if (isValidRS(displayText)) {
          results.push({ text: displayText, href: href });
        }
      } catch (_) {}
    });

    return results.length >= 1 ? results : null;
  }

  // ============================================================
  // STRATEGY 4: Any links with ?q= or ?query= parameter
  // Broader than Strategy 3 (not limited to Google domains)
  // ============================================================
  function strategy4_anySearchLinks() {
    var results = [];
    document.querySelectorAll('a[href*="?q="], a[href*="&q="], a[href*="query="]').forEach(function (a) {
      try {
        var href = a.href || "";
        var url = new URL(href, location.origin);
        var q = url.searchParams.get("q") || url.searchParams.get("query");
        if (q && q.trim().length > 2 && !q.startsWith("http")) {
          var displayText = (a.textContent || "").trim();
          results.push({
            text: displayText.length > 3 ? displayText : q.trim(),
            href: href
          });
        }
      } catch (_) {}
    });

    return results.length >= 1 ? results : null;
  }

  // ============================================================
  // STRATEGY 5: Styled link blocks (colored bars / cards)
  // Language agnostic: detect by visual CSS properties
  // ============================================================
  function strategy5_styledBlocks() {
    if (isIframe) return null; // Only on main page

    var results = [];
    var links = document.querySelectorAll("a");

    function hasColorBg(color) {
      if (!color || color === "transparent" || color === "rgba(0, 0, 0, 0)") return false;
      if (color === "rgb(255, 255, 255)" || color === "rgba(255, 255, 255, 1)") return false;
      return true;
    }

    links.forEach(function (a) {
      var text = (a.textContent || "").trim();
      if (!isValidRS(text)) return;

      try {
        var rect = a.getBoundingClientRect();
        // Must be visible and bar-shaped (wide, not too tall)
        if (rect.width < 150 || rect.height < 25 || rect.height > 120) return;
        if (rect.width / rect.height < 2) return; // Should be wider than tall

        var style = window.getComputedStyle(a);
        var parentStyle = a.parentElement ? window.getComputedStyle(a.parentElement) : null;

        var bg = style.backgroundColor;
        var parentBg = parentStyle ? parentStyle.backgroundColor : "";
        var radius = parseFloat(style.borderRadius) || 0;

        if (hasColorBg(bg) || hasColorBg(parentBg) || radius > 4) {
          // Verify it's part of a group (at least 3 similar nearby links)
          var parent = a.closest("div, section, ul, ol, main, article");
          if (parent) {
            var sibs = parent.querySelectorAll("a");
            var similarCount = 0;
            sibs.forEach(function (s) {
              var sr = s.getBoundingClientRect();
              if (sr.width > 150 && sr.height > 25 && sr.height < 120) similarCount++;
            });
            if (similarCount >= 3) {
              results.push({ text: text, href: a.href || "" });
            }
          }
        }
      } catch (_) {}
    });

    return results.length >= 1 ? results : null;
  }

  // ============================================================
  // STRATEGY 6: Link clusters (groups of 5+ similar links in same container)
  // Language agnostic: based on DOM structure
  // ============================================================
  function strategy6_linkClusters() {
    if (isIframe) return null;

    var containers = document.querySelectorAll("div, section, ul, ol, main, article, aside");
    var bestGroup = null;
    var bestScore = 0;

    containers.forEach(function (container) {
      // Skip blacklisted sections (Sources, References, etc.)
      if (isInsideBlacklistedSection(container)) return;

      // Direct child links or links in direct child divs/li
      var directLinks = container.querySelectorAll(":scope > a, :scope > div > a, :scope > li > a, :scope > p > a");
      if (directLinks.length < 5 || directLinks.length > 30) return;

      var candidates = [];
      directLinks.forEach(function (a) {
        var text = (a.textContent || "").trim();
        if (isValidRS(text)) candidates.push({ text: text, href: a.href || "" });
      });

      // Score: number of quality links, must be majority, min 5
      if (candidates.length >= 5 && candidates.length >= directLinks.length * 0.4) {
        var score = candidates.length;
        // Bonus for links containing search params
        candidates.forEach(function (c) {
          if (c.href.includes("q=")) score += 0.5;
          if (c.href.includes("google")) score += 0.5;
        });
        if (score > bestScore) {
          bestScore = score;
          bestGroup = candidates;
        }
      }
    });

    return bestGroup;
  }

  // ============================================================
  // STRATEGY 7: Google top-frame (google.com search results page)
  // Capture RS from Google SERP directly
  // ============================================================
  function strategy7_googleSERP() {
    if (!isGoogleFrame || isIframe) return null;
    // Only on actual Google search pages
    if (!window.location.pathname.startsWith("/search")) return null;

    var results = [];

    // Google SERP related searches are in various containers
    var selectors = [
      "#brs a",                          // Classic related searches
      "#botstuff a",                     // Bottom stuff
      'div[data-hveid] a[href*="search"]', // Various result links
      ".k8XOCe a",                       // People also search for
      ".AJLUJb a",                       // Related searches cards
      '.s75CSd a, [data-ved] a[href*="q="]'
    ];

    selectors.forEach(function (sel) {
      try {
        document.querySelectorAll(sel).forEach(function (a) {
          var text = (a.textContent || "").trim();
          if (isValidRS(text)) results.push({ text: text, href: a.href || "" });
        });
      } catch (_) {}
    });

    return results.length >= 1 ? results : null;
  }

  // ============================================================
  // MAIN: Run all strategies in priority order
  // ============================================================
  function extractAll() {
    var r;

    // Priority 1: Inside Google iframe (highest confidence)
    r = strategy1_googleIframe();
    if (r && r.length > 0) return { name: "Google iframe", data: r };

    // Priority 2: Google SERP page
    r = strategy7_googleSERP();
    if (r && r.length > 0) return { name: "Google SERP", data: r };

    // Priority 3: Google AFS/CSE container selectors
    r = strategy2_googleContainers();
    if (r && r.length > 0) return { name: "Google containers", data: r };

    // Priority 4: Links pointing to Google search
    r = strategy3_googleSearchLinks();
    if (r && r.length > 0) return { name: "Google search links", data: r };

    // Priority 5: Any search query links (min 3 to avoid false positives)
    r = strategy4_anySearchLinks();
    if (r && r.length >= 3) return { name: "Search query links", data: r };

    // Priority 6: Styled colored bars (min 3 results to be credible)
    r = strategy5_styledBlocks();
    if (r && r.length >= 3) return { name: "Styled blocks", data: r };

    // Priority 7: Link clusters (min 5 results to avoid false positives)
    r = strategy6_linkClusters();
    if (r && r.length >= 5) return { name: "Link clusters", data: r };

    return null;
  }

  // ============================================================
  // SEND + RETRY LOGIC
  // ============================================================
  function sendResults(items) {
    if (!items || items.length === 0) return;
    if (hasSent) return;
    hasSent = true;

    var cleaned = dedupe(items);
    if (cleaned.length === 0) { hasSent = false; return; }

    console.log(TAG, isIframe ? "(iframe)" : "(main)", "Found", cleaned.length, "RS:", cleaned.map(function(c) { return c.text; }));

    try {
      chrome.runtime.sendMessage({
        type: "IFRAME_RELATED_SEARCHES",
        payload: { searches: cleaned },
      });
    } catch (err) {
      console.warn(TAG, "sendMessage error:", err);
    }
  }

  function tryExtract() {
    var result = extractAll();
    if (result && result.data.length > 0) {
      console.log(TAG, "Strategy:", result.name);
      sendResults(result.data);
      return true;
    }

    retryCount++;
    if (retryCount < MAX_RETRIES) {
      setTimeout(tryExtract, RETRY_INTERVAL);
    } else {
      console.log(TAG, "No RS found after", MAX_RETRIES, "retries on:", host);
      // Debug: list iframes
      document.querySelectorAll("iframe").forEach(function (f, i) {
        console.log(TAG, "  iframe[" + i + "]:", (f.src || "(no src)").substring(0, 120));
      });
    }
    return false;
  }

  // Start extraction with small delay for DOM to settle
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { setTimeout(tryExtract, 500); });
  } else {
    setTimeout(tryExtract, 500);
  }

  // Watch for dynamically injected content (Google AFS loads async)
  var observer = null;
  try {
    var target = document.documentElement || document.body;
    if (target) {
      observer = new MutationObserver(function () {
        if (hasSent) { observer.disconnect(); return; }
        var result = extractAll();
        if (result && result.data.length > 0) {
          console.log(TAG, "MutationObserver matched:", result.name);
          sendResults(result.data);
          observer.disconnect();
        }
      });
      observer.observe(target, { childList: true, subtree: true });
    }
  } catch (_) {}

  // Safety: disconnect observer after 25s
  setTimeout(function () { if (observer) observer.disconnect(); }, 25000);
})();

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

const STORAGE_KEYS = [
  "network",
  "campaign_id",
  "arb_campaign_id",
  "click_id",
  "arbLayoutID",
  "layout_id",
  "section_id",
  "gclid",
  "gbraid",
  "wbraid",
  "ttclid",
  "fbclid",
  "rdt_cid",
  "twclid",
  "ScCid",
  "tblci",
  "dicbo",
  "nb_cid",
  "epik",
  "utm_campaign",
  "utm_source",
  "arb_ad_id",
  "arb_creative_id",
];

function getStorageTracking(): Record<string, string | null> {
  const result: Record<string, string | null> = {};

  const readFrom = (storage: Storage | null) => {
    if (!storage) return;
    try {
      for (const key of STORAGE_KEYS) {
        const value = storage.getItem(key);
        if (value && !result[key]) {
          result[key] = value;
        }
      }
      
      // Map section_id/layout_id to arbLayoutID
      if (!result.arbLayoutID) {
        const layoutId = storage.getItem("section_id") ?? storage.getItem("layout_id");
        if (layoutId) result.arbLayoutID = layoutId;
      }
    } catch {
      // ignore storage access errors
    }
  };

  try {
    readFrom(window.sessionStorage);
  } catch { }
  try {
    readFrom(window.localStorage);
  } catch { }

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

const SCRIPT_PATTERNS = [
  { pattern: /https:\/\/(?:[^\/]+\/)+w\/([a-f0-9-]+)\.js/i, type: "Js Head" },
  { pattern: /https:\/\/(?:[^\/]+\/)+ata\/adv\/([a-f0-9-]+)\.js/i, type: "Auto Ad" },
];

interface DetectedScript {
  url: string;
  id: string;
  type: string;
}

function detectWScripts(): DetectedScript[] {
  const scripts = document.querySelectorAll<HTMLScriptElement>("script[src]");
  const detected: DetectedScript[] = [];
  const seenKeys = new Set<string>();

  scripts.forEach((script) => {
    const src = script.src;
    for (const { pattern, type } of SCRIPT_PATTERNS) {
      const match = src.match(pattern);
      if (match && match[1]) {
        const id = match[1];
        const key = `${type}:${id}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          detected.push({ url: src, id, type });
        }
        break;
      }
    }
  });

  return detected;
}

interface TcfConfig {
  brand?: string;
  className?: string;
  homePage?: string;
  tagApi?: string;
  tagName?: string;
  rootDomain?: string;
  serviceHost?: string;
}

interface ScriptConfig {
  sid?: string;
  tcf?: TcfConfig & Record<string, unknown>;
}

async function fetchScriptConfig(url: string): Promise<ScriptConfig | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    
    const content = await response.text();
    
    // Pattern to match: var A = {...} or var A={...}
    // Looking for object with "sid" and "tcf" properties
    const patterns = [
      /var\s+[A-Z]\s*=\s*(\{[\s\S]*?"sid"\s*:\s*"[^"]+[\s\S]*?"tcf"\s*:\s*\{[\s\S]*?\}\s*\})/,
      /var\s+[A-Z]\s*=\s*(\{[\s\S]*?"tcf"\s*:\s*\{[\s\S]*?\}[\s\S]*?"sid"\s*:\s*"[^"]+[\s\S]*?\})/,
    ];
    
    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        try {
          // Clean up the matched string and parse as JSON
          let jsonStr = match[1];
          // Handle trailing commas and convert to valid JSON
          jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1');
          const parsed = JSON.parse(jsonStr);
          if (parsed.sid || parsed.tcf) {
            return parsed as ScriptConfig;
          }
        } catch {
          // Try eval-based extraction as fallback
          try {
            const evalMatch = content.match(/var\s+([A-Z])\s*=\s*(\{[\s\S]*?\});?\s*(?:var|function|$)/);
            if (evalMatch && evalMatch[2]) {
              const fn = new Function(`return ${evalMatch[2]}`);
              const obj = fn();
              if (obj && (obj.sid || obj.tcf)) {
                return obj as ScriptConfig;
              }
            }
          } catch {
            // Ignore eval errors
          }
        }
      }
    }
    
    // Alternative: look for the object assignment more broadly
    const altMatch = content.match(/=\s*(\{"sid"\s*:\s*"[a-f0-9-]+",\s*"tcf"\s*:\s*\{[^}]+\}\s*\})/);
    if (altMatch && altMatch[1]) {
      try {
        return JSON.parse(altMatch[1]) as ScriptConfig;
      } catch {
        // Ignore parse errors
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

const AD_HIGHLIGHT_CLASSES = ["adsbypubpower", "adsbyvli", "futureads"];
const AD_HIGHLIGHT_STYLE_ID = "__ad_highlight_style__";

function applyAdHighlight(enabled: boolean) {
  let styleEl = document.getElementById(AD_HIGHLIGHT_STYLE_ID);
  
  if (enabled) {
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = AD_HIGHLIGHT_STYLE_ID;
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = `
      .adsbypubpower, .adsbyvli, .futureads {
        outline: 3px solid #f85149 !important;
        outline-offset: 2px !important;
      }
    `;
  } else {
    if (styleEl) {
      styleEl.remove();
    }
  }
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

  if (msg.type === "GET_W_SCRIPTS") {
    sendResponse(detectWScripts());
    return true;
  }

  if (msg.type === "FETCH_SCRIPT_CONFIG") {
    const url = msg.url as string;
    fetchScriptConfig(url).then((config) => {
      sendResponse(config);
    });
    return true;
  }

  if (msg.type === "TOGGLE_AD_HIGHLIGHT") {
    const enabled = msg.enabled as boolean;
    applyAdHighlight(enabled);
    sendResponse({ success: true });
    return true;
  }

  if (msg.type === "GET_AD_HIGHLIGHT_STATUS") {
    const styleEl = document.getElementById(AD_HIGHLIGHT_STYLE_ID);
    sendResponse({ enabled: !!styleEl });
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
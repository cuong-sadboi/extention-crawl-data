interface TrackingData {
  rootdomain?: string | null;
  arb_campaign_id?: string | null;
  arbLayoutID?: string | null;
  click_id?: string | null;
  campaign_id?: string | null;
  network?: string | null;
  gclid?: string | null;
  gbraid?: string | null;
  wbraid?: string | null;
  ttclid?: string | null;
  fbclid?: string | null;
  rdt_cid?: string | null;
  twclid?: string | null;
  ScCid?: string | null;
  tblci?: string | null;
  dicbo?: string | null;
  nb_cid?: string | null;
  epik?: string | null;
  utm_campaign?: string | null;
  arb_ad_id?: string | null;
  utm_source?: string | null;
  arb_creative_id?: string | null;
  _fbp?: string | null;
  _fbc?: string | null;
  __bt?: string | null;
  pubId?: string | null;
  channelId?: string | null;
  styleId?: string | null;
  keywords?: string | null;
  referrerAdCreative?: string | null;
  [key: string]: string | null | undefined;
}

const COPY_ICON = '<svg class="copy-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>';
const CHECK_ICON = '<svg class="check-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>';
const LOADING_ICON = '<svg class="loading-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"/><path d="M12 2a10 10 0 0110 10" stroke-linecap="round"/></svg>';

let prevData: TrackingData | null = null;

function getChangedFieldKeys(prev: TrackingData | null, next: TrackingData): string[] {
  if (!prev) return [];
  const changed: string[] = [];
  for (const f of fields) {
    const pv = prev[f.key];
    const nv = next[f.key];
    const pStr = pv == null ? "" : Array.isArray(pv) ? (pv as unknown[]).join(", ") : String(pv);
    const nStr = nv == null ? "" : Array.isArray(nv) ? (nv as unknown[]).join(", ") : String(nv);
    if (pStr !== nStr) changed.push(f.key);
  }
  return changed;
}

const fields = [
  { key: "rootdomain", label: "rootdomain" },
  { key: "network", label: "network" },
  { key: "arb_campaign_id", label: "arb_campaign_id" },
  { key: "campaign_id", label: "campaign_id" },
  { key: "utm_campaign", label: "utm_campaign" },
  { key: "utm_source", label: "utm_source" },
  { key: "arb_ad_id", label: "arb_ad_id" },
  { key: "arb_creative_id", label: "arb_creative_id" },
  { key: "arbLayoutID", label: "arbLayoutID" },
  { key: "pubId", label: "pubId" },
  { key: "channelId", label: "channelId" },
  { key: "styleId", label: "styleId" },
  { key: "keywords", label: "keywords" },
  { key: "referrerAdCreative", label: "referrerAdCreative" },
  { key: "click_id", label: "click_id" },
  { key: "gclid", label: "gclid (Google Click Identifier)" },
  { key: "gbraid", label: "gbraid (App iOS 14.5 and later)" },
  { key: "wbraid", label: "wbraid (Web-to-App iOS)" },
  { key: "ttclid", label: "ttclid (TikTok Click Identifier)" },
  { key: "fbclid", label: "fbclid (Facebook Click Identifier)" },
  { key: "rdt_cid", label: "rdt_cid (Reddit Click Identifier)" },
  { key: "twclid", label: "twclid (Twitter Click Identifier)" },
  { key: "ScCid", label: "ScCid (Snapchat Click Identifier)" },
  { key: "tblci", label: "tblci (Taboola Click Identifier)" },
  { key: "dicbo", label: "dicbo (Outbrain Click Identifier)" },
  { key: "nb_cid", label: "nb_cid (NewsBreak Click Identifier)" },
  { key: "epik", label: "epik (Pinterest Click Identifier)" },
  { key: "_fbp", label: "_fbp (Facebook Browser Pixel)" },
  { key: "_fbc", label: "_fbc (Facebook Click ID)" },
  { key: "__bt", label: "__bt (Bot)" },
];

function renderData(data: TrackingData | null) {
  const container = document.getElementById("data")!;
  const status = document.getElementById("status")!;

  if (!data) {
    container.innerHTML = '<div class="no-data">No data available</div>';
    status.textContent = "";
    return;
  }

  const fieldsWithData = fields.filter((f) => {
    const value = data[f.key];
    return value != null && value !== "" && (Array.isArray(value) ? value.length > 0 : true);
  });

  if (fieldsWithData.length === 0) {
    container.innerHTML = '<div class="no-data">No data available</div>';
    status.textContent = "";
    prevData = data;
    return;
  }

  const changedKeys = getChangedFieldKeys(prevData, data);

  container.innerHTML = fieldsWithData
    .map((f) => {
      const value = data[f.key];
      const formatted = Array.isArray(value) ? value.join(", ") : String(value);
      const safeDisplay = String(formatted)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
      const safeValue = formatted.replace(/"/g, "&quot;");
      return `
        <div class="field" data-field-key="${f.key}">
          <div class="field-info">
            <div class="field-label">${f.label}</div>
            <div class="field-value">${safeDisplay}</div>
          </div>
          <button class="copy-btn" data-value="${safeValue}" data-field-key="${f.key}" title="Copy">${COPY_ICON}</button>
        </div>
      `;
    })
    .join("");

  // Attach copy handlers and apply loading for changed fields
  container.querySelectorAll<HTMLButtonElement>(".copy-btn").forEach((btn) => {
    const fieldKey = btn.dataset.fieldKey;
    const copyIcon = btn.innerHTML;
    const isChanged = fieldKey && changedKeys.includes(fieldKey);

    if (isChanged) {
      btn.classList.add("loading");
      btn.disabled = true;
      btn.innerHTML = LOADING_ICON;
      setTimeout(() => {
        btn.innerHTML = copyIcon;
        btn.classList.remove("loading");
        btn.disabled = false;
      }, 1000);
    }

    btn.addEventListener("click", () => {
      if (btn.disabled || btn.classList.contains("loading")) return;
      const val = btn.dataset.value || "";
      navigator.clipboard.writeText(val).then(() => {
        btn.innerHTML = CHECK_ICON;
        btn.classList.add("copied");
        setTimeout(() => {
          btn.innerHTML = copyIcon;
          btn.classList.remove("copied");
        }, 1500);
      });
    });
  });

  prevData = data;
  const now = new Date().toLocaleTimeString();
  status.textContent = `Last synced at ${now}`;
}

const BACKGROUND_RELOAD_DELAY_MS = 2000;

function loadData(opts?: { silent?: boolean }) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTabId = tabs[0]?.id;

    chrome.runtime.sendMessage({ type: "RELOAD_DATA", tabId: activeTabId }, (response) => {
      if (response == null) {
        return;
      }

      renderData(response);
      if (!opts?.silent) {
        setTimeout(() => loadData({ silent: true }), BACKGROUND_RELOAD_DELAY_MS);
      }
    });
  });
}

// Initial load via port
const port = chrome.runtime.connect({ name: "sidepanel" });
port.onMessage.addListener(renderData);

// Listen for tab updates (auto-refresh when page navigates/reloads)
function onTabUpdated(tabId: number, changeInfo: { status?: string }) {
  if (changeInfo.status === "complete") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id === tabId) {
        setTimeout(loadData, 500);
      }
    });
  }
}

// When user switches active tab, reload data for the new tab
function onTabActivated() {
  loadData();
}

// Track visibility to optimize listeners
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    chrome.tabs.onUpdated.removeListener(onTabUpdated);
    chrome.tabs.onActivated.removeListener(onTabActivated);
  } else {
    chrome.tabs.onUpdated.addListener(onTabUpdated);
    chrome.tabs.onActivated.addListener(onTabActivated);
    loadData();
  }
});

chrome.tabs.onUpdated.addListener(onTabUpdated);
chrome.tabs.onActivated.addListener(onTabActivated);

const THEME_KEY = "url_inspector_theme";

function applyTheme(theme: "dark" | "light") {
  document.body.classList.toggle("light", theme === "light");
}

function initTheme() {
  chrome.storage.local.get(THEME_KEY, (result) => {
    const theme = (result[THEME_KEY] as "dark" | "light") || "light";
    applyTheme(theme);
  });
}

function toggleTheme() {
  const isLight = document.body.classList.contains("light");
  const nextTheme = isLight ? "dark" : "light";
  applyTheme(nextTheme);
  chrome.storage.local.set({ [THEME_KEY]: nextTheme });
}

// ==================== TAB NAVIGATION ====================

function initTabs() {
  const tabBtns = document.querySelectorAll<HTMLButtonElement>(".tab-btn");
  const tabContents = document.querySelectorAll<HTMLElement>(".tab-content");

  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tabName = btn.dataset.tab;
      tabBtns.forEach((b) => b.classList.remove("active"));
      tabContents.forEach((c) => c.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(`tab-${tabName}`)?.classList.add("active");
    });
  });
}

// ==================== TOOLS FUNCTIONALITY ====================

// --- VLI Cipher Maps ---
const VLI_ENCODE_MAP: Record<string, string> = {
  a:'q',b:'w',c:'e',d:'r',e:'t',f:'y',g:'u',h:'i',i:'o',j:'p',
  k:'0',l:'s',m:'d',n:'f',o:'g',p:'h',q:'j',r:'k',s:'l',t:'z',
  u:'x',v:'c',w:'v',x:'b',y:'n',z:'m',
  '0':'A','A':'1','1':'T','T':'2','2':'Y','Y':'3','3':'B','B':'4',
  '4':'P','P':'5','5':'Z','Z':'6','6':'U','U':'7','7':'K','K':'8',
  '8':'M','M':'9','9':'a',
  '&':'R','=':'N','.':'G'
};

const VLI_DECODE_MAP: Record<string, string> = {
  '0':'k','1':'A','2':'T','3':'Y','4':'B','5':'P','6':'Z','7':'U','8':'K','9':'M',
  'A':'0','T':'1','Y':'2','B':'3','P':'4','Z':'5','U':'6','K':'7','M':'8',
  'a':'9','q':'a','w':'b','e':'c','r':'d','t':'e','y':'f','u':'g','i':'h',
  'o':'i','p':'j','s':'l','d':'m','f':'n','g':'o','h':'p','j':'q','k':'r',
  'l':'s','z':'t','x':'u','c':'v','v':'w','b':'x','n':'y','m':'z',
  'R':'&','N':'=','G':'.'
};

function vliEncrypt(str: string): string {
  return str.toLowerCase().split('').map(c => VLI_ENCODE_MAP[c] ?? c).join('');
}

function vliDecrypt(str: string): string {
  return str.split('').map(c => VLI_DECODE_MAP[c] ?? c).join('');
}

// --- MD5 (pure JS implementation) ---
function md5(str: string): string {
  function safeAdd(x: number, y: number): number {
    const lsw = (x & 0xffff) + (y & 0xffff);
    return (((x >> 16) + (y >> 16) + (lsw >> 16)) << 16) | (lsw & 0xffff);
  }
  function bitRotateLeft(num: number, cnt: number): number {
    return (num << cnt) | (num >>> (32 - cnt));
  }
  function md5cmn(q: number, a: number, b: number, x: number, s: number, t: number): number {
    return safeAdd(bitRotateLeft(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b);
  }
  function md5ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return md5cmn((b & c) | (~b & d), a, b, x, s, t);
  }
  function md5gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return md5cmn((b & d) | (c & ~d), a, b, x, s, t);
  }
  function md5hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return md5cmn(b ^ c ^ d, a, b, x, s, t);
  }
  function md5ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return md5cmn(c ^ (b | ~d), a, b, x, s, t);
  }
  function binlMD5(x: number[], len: number): number[] {
    x[len >> 5] = (x[len >> 5] ?? 0) | (0x80 << (len % 32));
    x[((len + 64) >>> 9 << 4) + 14] = len;
    let a = 1732584193, b = -271733879, c = -1732584194, d = 271733878;
    for (let i = 0; i < x.length; i += 16) {
      const olda = a, oldb = b, oldc = c, oldd = d;
      a = md5ff(a,b,c,d,x[i]||0,7,-680876936); d = md5ff(d,a,b,c,x[i+1]||0,12,-389564586);
      c = md5ff(c,d,a,b,x[i+2]||0,17,606105819); b = md5ff(b,c,d,a,x[i+3]||0,22,-1044525330);
      a = md5ff(a,b,c,d,x[i+4]||0,7,-176418897); d = md5ff(d,a,b,c,x[i+5]||0,12,1200080426);
      c = md5ff(c,d,a,b,x[i+6]||0,17,-1473231341); b = md5ff(b,c,d,a,x[i+7]||0,22,-45705983);
      a = md5ff(a,b,c,d,x[i+8]||0,7,1770035416); d = md5ff(d,a,b,c,x[i+9]||0,12,-1958414417);
      c = md5ff(c,d,a,b,x[i+10]||0,17,-42063); b = md5ff(b,c,d,a,x[i+11]||0,22,-1990404162);
      a = md5ff(a,b,c,d,x[i+12]||0,7,1804603682); d = md5ff(d,a,b,c,x[i+13]||0,12,-40341101);
      c = md5ff(c,d,a,b,x[i+14]||0,17,-1502002290); b = md5ff(b,c,d,a,x[i+15]||0,22,1236535329);
      a = md5gg(a,b,c,d,x[i+1]||0,5,-165796510); d = md5gg(d,a,b,c,x[i+6]||0,9,-1069501632);
      c = md5gg(c,d,a,b,x[i+11]||0,14,643717713); b = md5gg(b,c,d,a,x[i]||0,20,-373897302);
      a = md5gg(a,b,c,d,x[i+5]||0,5,-701558691); d = md5gg(d,a,b,c,x[i+10]||0,9,38016083);
      c = md5gg(c,d,a,b,x[i+15]||0,14,-660478335); b = md5gg(b,c,d,a,x[i+4]||0,20,-405537848);
      a = md5gg(a,b,c,d,x[i+9]||0,5,568446438); d = md5gg(d,a,b,c,x[i+14]||0,9,-1019803690);
      c = md5gg(c,d,a,b,x[i+3]||0,14,-187363961); b = md5gg(b,c,d,a,x[i+8]||0,20,1163531501);
      a = md5gg(a,b,c,d,x[i+13]||0,5,-1444681467); d = md5gg(d,a,b,c,x[i+2]||0,9,-51403784);
      c = md5gg(c,d,a,b,x[i+7]||0,14,1735328473); b = md5gg(b,c,d,a,x[i+12]||0,20,-1926607734);
      a = md5hh(a,b,c,d,x[i+5]||0,4,-378558); d = md5hh(d,a,b,c,x[i+8]||0,11,-2022574463);
      c = md5hh(c,d,a,b,x[i+11]||0,16,1839030562); b = md5hh(b,c,d,a,x[i+14]||0,23,-35309556);
      a = md5hh(a,b,c,d,x[i+1]||0,4,-1530992060); d = md5hh(d,a,b,c,x[i+4]||0,11,1272893353);
      c = md5hh(c,d,a,b,x[i+7]||0,16,-155497632); b = md5hh(b,c,d,a,x[i+10]||0,23,-1094730640);
      a = md5hh(a,b,c,d,x[i+13]||0,4,681279174); d = md5hh(d,a,b,c,x[i]||0,11,-358537222);
      c = md5hh(c,d,a,b,x[i+3]||0,16,-722521979); b = md5hh(b,c,d,a,x[i+6]||0,23,76029189);
      a = md5hh(a,b,c,d,x[i+9]||0,4,-640364487); d = md5hh(d,a,b,c,x[i+12]||0,11,-421815835);
      c = md5hh(c,d,a,b,x[i+15]||0,16,530742520); b = md5hh(b,c,d,a,x[i+2]||0,23,-995338651);
      a = md5ii(a,b,c,d,x[i]||0,6,-198630844); d = md5ii(d,a,b,c,x[i+7]||0,10,1126891415);
      c = md5ii(c,d,a,b,x[i+14]||0,15,-1416354905); b = md5ii(b,c,d,a,x[i+5]||0,21,-57434055);
      a = md5ii(a,b,c,d,x[i+12]||0,6,1700485571); d = md5ii(d,a,b,c,x[i+3]||0,10,-1894986606);
      c = md5ii(c,d,a,b,x[i+10]||0,15,-1051523); b = md5ii(b,c,d,a,x[i+1]||0,21,-2054922799);
      a = md5ii(a,b,c,d,x[i+8]||0,6,1873313359); d = md5ii(d,a,b,c,x[i+15]||0,10,-30611744);
      c = md5ii(c,d,a,b,x[i+6]||0,15,-1560198380); b = md5ii(b,c,d,a,x[i+13]||0,21,1309151649);
      a = md5ii(a,b,c,d,x[i+4]||0,6,-145523070); d = md5ii(d,a,b,c,x[i+11]||0,10,-1120210379);
      c = md5ii(c,d,a,b,x[i+2]||0,15,718787259); b = md5ii(b,c,d,a,x[i+9]||0,21,-343485551);
      a = safeAdd(a, olda); b = safeAdd(b, oldb); c = safeAdd(c, oldc); d = safeAdd(d, oldd);
    }
    return [a, b, c, d];
  }
  function str2binl(str: string): number[] {
    const bin: number[] = [];
    const mask = (1 << 8) - 1;
    for (let i = 0; i < str.length * 8; i += 8) {
      bin[i >> 5] = (bin[i >> 5] ?? 0) | ((str.charCodeAt(i / 8) & mask) << (i % 32));
    }
    return bin;
  }
  function binl2hex(binarray: number[]): string {
    const hexTab = '0123456789abcdef';
    let str = '';
    for (let i = 0; i < binarray.length * 4; i++) {
      str += hexTab.charAt(((binarray[i >> 2] ?? 0) >> ((i % 4) * 8 + 4)) & 0xf) +
             hexTab.charAt(((binarray[i >> 2] ?? 0) >> ((i % 4) * 8)) & 0xf);
    }
    return str;
  }
  const x = str2binl(str);
  return binl2hex(binlMD5(x, str.length * 8));
}

// --- SHA-256 (Web Crypto API) ---
async function sha256(str: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// --- Tool Selector ---
function initToolSelector() {
  const select = document.getElementById("tool-select") as HTMLSelectElement;
  const panels = document.querySelectorAll<HTMLElement>(".tool-panel");

  select.addEventListener("change", () => {
    panels.forEach((p) => p.classList.remove("active"));
    document.getElementById(`tool-${select.value}`)?.classList.add("active");
  });
}

// --- Bind Tool Inputs ---
function initToolInputs() {
  // Base64 encode
  bindInput("base64-encode-input", "base64-encode-result", (v) => {
    try { return btoa(v); } catch (e: any) { return `Error: ${e.message}`; }
  });
  // Base64 decode
  bindInput("base64-decode-input", "base64-decode-result", (v) => {
    try { return atob(v); } catch (e: any) { return `Error: ${e.message}`; }
  });
  // URL encode
  bindInput("url-encode-input", "url-encode-result", (v) => {
    try { return encodeURIComponent(v); } catch (e: any) { return `Error: ${e.message}`; }
  });
  // URL decode
  bindInput("url-decode-input", "url-decode-result", (v) => {
    try { return decodeURIComponent(v); } catch (e: any) { return `Error: ${e.message}`; }
  });
  // MD5
  bindInput("md5-input", "md5-result", (v) => md5(v));
  // SHA-256 (async)
  const sha256Input = document.getElementById("sha256-input") as HTMLTextAreaElement;
  const sha256Result = document.getElementById("sha256-result") as HTMLTextAreaElement;
  sha256Input?.addEventListener("input", async () => {
    const val = sha256Input.value;
    if (!val) { sha256Result.value = ""; return; }
    try { sha256Result.value = await sha256(val); }
    catch (e: any) { sha256Result.value = `Error: ${e.message}`; }
  });
  // JSON Beautify
  bindInput("json-input", "json-result", (v) => {
    try { return JSON.stringify(JSON.parse(v), null, 2); }
    catch { return v; }
  });
  // VLI decode
  bindInput("vli-decode-input", "vli-decode-result", (v) => vliDecrypt(v));
  // VLI encode
  bindInput("vli-encode-input", "vli-encode-result", (v) => vliEncrypt(v));

  // Click on result to copy
  document.querySelectorAll<HTMLTextAreaElement>(".tool-result").forEach((el) => {
    el.addEventListener("focus", () => el.select());
  });
}

function bindInput(inputId: string, resultId: string, transform: (v: string) => string) {
  const input = document.getElementById(inputId) as HTMLTextAreaElement;
  const result = document.getElementById(resultId) as HTMLTextAreaElement;
  if (!input || !result) return;
  input.addEventListener("input", () => {
    const val = input.value;
    if (!val) { result.value = ""; return; }
    result.value = transform(val);
  });
}

// ==================== INIT ====================

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initTabs();
  initToolSelector();
  initToolInputs();
  loadData();
  document.getElementById("reload")!.addEventListener("click", () => loadData());
  document.getElementById("theme-toggle")!.addEventListener("click", toggleTheme);
});
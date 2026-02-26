const COPY_ICON = '<svg class="copy-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>';
const CHECK_ICON = '<svg class="check-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>';
const LOADING_ICON = '<svg class="loading-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"/><path d="M12 2a10 10 0 0110 10" stroke-linecap="round"/></svg>';

let prevData: Record<string, unknown> | null = null;

function getChangedFieldKeys(prev: Record<string, unknown> | null, next: Record<string, unknown>): string[] {
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
  { key: "arbLayoutID", label: "arbLayoutID" },
  { key: "pubId", label: "pubId" },
  { key: "channelId", label: "channelId" },
  { key: "styleId", label: "styleId" },
  { key: "keywords", label: "keywords" },
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
];

function renderData(data: any) {
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
  status.textContent = `Updated at ${now}`;
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
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "complete") {
    // Small delay to let data be captured
    setTimeout(loadData, 500);
  }
});

// When user switches active tab, reload data for the new tab
chrome.tabs.onActivated.addListener(() => {
  loadData();
});

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

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  loadData();
  document.getElementById("reload")!.addEventListener("click", () => loadData());
  document.getElementById("theme-toggle")!.addEventListener("click", toggleTheme);
});
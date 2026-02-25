const COPY_ICON = '<svg class="copy-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>';
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
  { key: "rootdomain", label: "Root domain" },
  { key: "network", label: "Network" },
  { key: "campaign_id", label: "Campaign id" },
  { key: "click_id", label: "Click id" },
  { key: "arb_campaign_id", label: "Arb campaign" },
  { key: "arbLayoutID", label: "Layout id" },
  { key: "pubId", label: "Pub id" },
  { key: "channelId", label: "Channel id" },
  { key: "styleId", label: "Style id" },
  { key: "keywords", label: "Keywords" },
  { key: "gclid", label: "gclid" },
  { key: "gbraid", label: "gbraid" },
  { key: "wbraid", label: "wbraid" },
  { key: "ttclid", label: "ttclid" },
  { key: "fbclid", label: "fbclid" },
  { key: "rdt_cid", label: "rdt_cid" },
  { key: "twclid", label: "twclid" },
  { key: "ScCid", label: "ScCid" },
  { key: "tblci", label: "tblci" },
  { key: "dicbo", label: "dicbo" },
  { key: "nb_cid", label: "nb_cid" },
  { key: "epik", label: "epik" },
  { key: "_fbp", label: "_fbp" },
  { key: "_fbc", label: "_fbc" },
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
  chrome.runtime.sendMessage({ type: "RELOAD_DATA" }, (response) => {
    renderData(response);
    if (!opts?.silent && response) {
      setTimeout(() => loadData({ silent: true }), BACKGROUND_RELOAD_DELAY_MS);
    }
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
const fields = [
  "rootdomain",
  "network",
  "campaign_id",
  "click_id",
  "arb_campaign_id",
  "arbLayoutID",
  "pubId",
  "channelId",
  "styleId",
  "keywords",
];

function renderData(data: any) {
  const container = document.getElementById("data")!;
  const status = document.getElementById("status")!;

  if (!data) {
    container.innerHTML = '<div class="no-data">No data available</div>';
    status.textContent = "";
    return;
  }

  container.innerHTML = fields
    .map((key) => {
      const value = data[key];
      const formatted =
        value == null || value === ""
          ? ""
          : Array.isArray(value)
            ? value.join(", ")
            : String(value);
      if (!formatted) return "";
      const safeDisplay = formatted
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
      const safeValue = formatted.replace(/"/g, "&quot;");
      return `
        <div class="field">
          <div class="field-info">
            <div class="field-label">${key}</div>
            <div class="field-value">${safeDisplay}</div>
          </div>
          <button class="copy-btn" data-value="${safeValue}" title="Copy">
            <svg class="icon-copy" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/>
            </svg>
            <svg class="icon-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
            </svg>
          </button>
        </div>
      `;
    })
    .join("");

  // Attach copy handlers
  container.querySelectorAll(".copy-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const val = (btn as HTMLElement).dataset.value || "";
      navigator.clipboard.writeText(val).then(() => {
        btn.classList.add("copied");
        setTimeout(() => {
          btn.classList.remove("copied");
        }, 1500);
      });
    });
  });

  const now = new Date().toLocaleTimeString();
  status.textContent = `Updated at ${now}`;
}

function loadData() {
  chrome.runtime.sendMessage({ type: "RELOAD_DATA" }, (response) => {
    renderData(response);
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
  document.getElementById("reload")!.addEventListener("click", loadData);
  document.getElementById("theme-toggle")!.addEventListener("click", toggleTheme);
});
"use strict";
const fields = [
    { key: "rootdomain", label: "Root Domain" },
    { key: "network", label: "Network" },
    { key: "campaign_id", label: "Campaign ID" },
    { key: "click_id", label: "Click ID" },
    { key: "arb_campaign_id", label: "Arb Campaign" },
    { key: "arbLayoutID", label: "Layout ID" },
    { key: "pubId", label: "Pub ID" },
    { key: "channelId", label: "Channel ID" },
    { key: "styleId", label: "Style ID" },
    { key: "keywords", label: "Keywords" },
];
function renderData(data) {
    const container = document.getElementById("data");
    const status = document.getElementById("status");
    if (!data) {
        container.innerHTML = '<div class="no-data">No data available</div>';
        status.textContent = "";
        return;
    }
    container.innerHTML = fields
        .map((f) => {
        const value = data[f.key];
        const formatted = value == null || value === ""
            ? ""
            : Array.isArray(value)
                ? value.join(", ")
                : String(value);
        const display = formatted || "—";
        const isEmpty = !formatted;
        const safeDisplay = String(display)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
        const safeValue = formatted.replace(/"/g, "&quot;");
        return `
        <div class="field">
          <div class="field-info">
            <div class="field-label">${f.label}</div>
            <div class="field-value${isEmpty ? " empty" : ""}">${safeDisplay}</div>
          </div>
          ${!isEmpty ? `<button class="copy-btn" data-value="${safeValue}">Copy</button>` : ""}
        </div>
      `;
    })
        .join("");
    // Attach copy handlers
    container.querySelectorAll(".copy-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            const val = btn.dataset.value || "";
            navigator.clipboard.writeText(val).then(() => {
                btn.textContent = "✓ Copied";
                btn.classList.add("copied");
                setTimeout(() => {
                    btn.textContent = "Copy";
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
function applyTheme(theme) {
    document.body.classList.toggle("light", theme === "light");
}
function initTheme() {
    chrome.storage.local.get(THEME_KEY, (result) => {
        const theme = result[THEME_KEY] || "dark";
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
    document.getElementById("reload").addEventListener("click", loadData);
    document.getElementById("theme-toggle").addEventListener("click", toggleTheme);
});
//# sourceMappingURL=panel.js.map
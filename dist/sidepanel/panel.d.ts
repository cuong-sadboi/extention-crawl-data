declare const fields: {
    key: string;
    label: string;
}[];
declare function renderData(data: any): void;
declare function loadData(): void;
declare const port: chrome.runtime.Port;
declare const THEME_KEY = "url_inspector_theme";
declare function applyTheme(theme: "dark" | "light"): void;
declare function initTheme(): void;
declare function toggleTheme(): void;
//# sourceMappingURL=panel.d.ts.map
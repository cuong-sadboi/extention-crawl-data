export function getRootDomain(hostname) {
    const parts = hostname.split(".");
    if (parts.length <= 2)
        return hostname;
    return parts.slice(-2).join(".");
}
export function parseUrl(urlString) {
    try {
        const url = new URL(urlString);
        return {
            rootdomain: getRootDomain(url.hostname),
            arb_campaign_id: url.searchParams.get("arb_campaign_id"),
            arbLayoutID: url.searchParams.get("arbLayoutID"),
            click_id: url.searchParams.get("click_id"),
            campaign_id: url.searchParams.get("campaign_id"),
            network: url.searchParams.get("network"),
        };
    }
    catch {
        return {
            rootdomain: null,
            arb_campaign_id: null,
            arbLayoutID: null,
            click_id: null,
            campaign_id: null,
            network: null,
        };
    }
}
//# sourceMappingURL=urlParser.js.map
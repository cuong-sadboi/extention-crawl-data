declare function getRootDomain(hostname: string): string;
declare function parseUrl(urlString: string): {
    rootdomain: string;
    arb_campaign_id: string | null;
    arbLayoutID: string | null;
    click_id: string | null;
    campaign_id: string | null;
    network: string | null;
} | null;
declare function hasTrackingParams(data: any): boolean;
//# sourceMappingURL=service-worker.d.ts.map
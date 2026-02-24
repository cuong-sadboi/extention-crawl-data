export interface ParsedUrlData {
    rootdomain: string | null;
    arb_campaign_id: string | null;
    arbLayoutID: string | null;
    click_id: string | null;
    campaign_id: string | null;
    network: string | null;
}
export declare function getRootDomain(hostname: string): string;
export declare function parseUrl(urlString: string): ParsedUrlData;
//# sourceMappingURL=urlParser.d.ts.map
/** The directive that refuses every frame. */
export declare const NO_FRAMES = "frame-ancestors 'none'";
/**
 * The page's own headers with the three a consent page needs set over them: its CSP keeps every other
 * directive and gets frame-ancestors 'none' in place of any it had (or as its only directive when it
 * had no CSP), X-Frame-Options DENY, and Cache-Control no-store. Header names come back in lower case,
 * one entry each, so a Response, a Headers or a Node response takes the result as it is.
 *
 *   return new Response(html, { headers: consentHeaders({ "content-type": "text/html; charset=utf-8", ...pageSecurityHeaders() }) });
 */
export declare function consentHeaders(init?: Readonly<Record<string, string>>): Record<string, string>;
/**
 * What a consent page's response lacks, in words (none: it is safe). `get` reads a header by its lower-case
 * name. It asks for the two that decide it: frame-ancestors 'none' (a page that its own origin may still
 * frame, 'self', is a gap too: a consent page is never shown inside another page) and no-store.
 * X-Frame-Options, which consentHeaders() also sets, is only for browsers older than frame-ancestors, so
 * its absence is not a gap.
 */
export declare function consentHeaderGaps(get: (name: string) => string | null | undefined): string[];

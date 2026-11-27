// The headers of a consent page (D-77): any page where one click gives an org's consent or chooses the
// org to sign in with (orgList's choice mode: orgPicker, chooseOrgPage, a product's own consent).
//
// - Never framed: frame-ancestors 'none' in the CSP, and X-Frame-Options: DENY for a browser that reads
//   only that. orgList's first second (D-75) stops a double-click trap on the page before; a page in
//   another's frame could ask for a click on its own button over the row, at any time, so framing is
//   refused outright.
// - Never stored: Cache-Control: no-store. The page carries a CSRF token and the person's orgs; a shared
//   or back-button cache must not keep either.
//
// Self-contained (no imports), so a worker or a server imports it from @forspring/ui/html and ui-audit
// holds a page to the same three answers.
/** The directive that refuses every frame. */
export const NO_FRAMES = "frame-ancestors 'none'";
/**
 * The page's own headers with the three a consent page needs set over them: its CSP keeps every other
 * directive and gets frame-ancestors 'none' in place of any it had (or as its only directive when it
 * had no CSP), X-Frame-Options DENY, and Cache-Control no-store. Header names come back in lower case,
 * one entry each, so a Response, a Headers or a Node response takes the result as it is.
 *
 *   return new Response(html, { headers: consentHeaders({ "content-type": "text/html; charset=utf-8", ...pageSecurityHeaders() }) });
 */
export function consentHeaders(init = {}) {
    const h = {};
    for (const [k, v] of Object.entries(init))
        h[k.toLowerCase()] = v;
    const kept = (h["content-security-policy"] ?? "")
        .split(";")
        .map((d) => d.trim())
        .filter((d) => d && !/^frame-ancestors(\s|$)/i.test(d));
    h["content-security-policy"] = [...kept, NO_FRAMES].join("; ");
    h["x-frame-options"] = "DENY";
    h["cache-control"] = "no-store";
    return h;
}
/**
 * What a consent page's response lacks, in words (none: it is safe). `get` reads a header by its lower-case
 * name. It asks for the two that decide it: frame-ancestors 'none' (a page that its own origin may still
 * frame, 'self', is a gap too: a consent page is never shown inside another page) and no-store.
 * X-Frame-Options, which consentHeaders() also sets, is only for browsers older than frame-ancestors, so
 * its absence is not a gap.
 */
export function consentHeaderGaps(get) {
    const gaps = [];
    const csp = get("content-security-policy") ?? "";
    const ancestors = csp
        .split(";")
        .map((d) => d.trim())
        .find((d) => /^frame-ancestors(\s|$)/i.test(d));
    if (!ancestors || ancestors.replace(/\s+/g, " ").toLowerCase() !== NO_FRAMES)
        gaps.push(ancestors ? `CSP ${ancestors}` : "no frame-ancestors in its CSP");
    const cache = (get("cache-control") ?? "").toLowerCase();
    if (!/(^|[\s,])no-store([\s,]|$)/.test(cache))
        gaps.push(`Cache-Control ${cache || "missing"}`);
    return gaps;
}

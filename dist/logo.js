// The one rule for a logo URL, shared by the theme check (theme.ts) and the bar (html.ts bar({ app })).
// A logo is an https: URL, a data:image/ URL of a raster or SVG type (an <img> runs no script from
// either), or a relative path in the app's bundle. Nothing that can leave an attribute or name
// another scheme: no javascript:, http:, protocol-relative //, backslash or .. segment.
export function safeLogo(v) {
    if (v.length === 0 || v.length > 2048 || v !== v.trim())
        return false;
    if (/^https:\/\//i.test(v)) {
        try {
            return new URL(v).protocol === "https:" && !/["'<>\s\\]/.test(v);
        }
        catch {
            return false;
        }
    }
    if (/^data:/i.test(v))
        return /^data:image\/(png|jpeg|gif|webp|avif|svg\+xml)[;,][^"'<>\s\\]*$/i.test(v);
    return /^(\.\/)?[A-Za-z0-9_][A-Za-z0-9._~\-/]*$/.test(v) && !v.split("/").includes("..") && !v.includes("//");
}

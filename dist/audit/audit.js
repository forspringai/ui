// The design audit (hub ui-standard §3, "Enforcement"): every page at desktop and phone width, light
// and dark, measured in Chromium against the tokens. Rules and severities are D-8; the script budget
// is D-9. Playwright is the consumer's (a peer dependency); axe-core is ours, injected from
// node_modules, never a CDN.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";
import { collect } from "./page.js";
export const DEFAULT_WIDTHS = [1280, 380];
export const DEFAULT_THEMES = ["light", "dark"];
/** Below this width the phone floors apply: primary controls 44 px tall (D-5's 560 px breakpoint). */
export const PHONE_WIDTH = 560;
export const FAMILIES = ["Archivo", "Archivo Condensed", "Space Mono"];
// Google's button sets its own Roboto, by Google's branding guidelines (D-7).
const GOOGLE_FAMILIES = ["Roboto GSI", "Roboto"];
/** The package root, from src/audit/ (tests) or dist/audit/ (the bin) alike. */
export function packageRoot() {
    let dir = dirname(fileURLToPath(import.meta.url));
    for (;;) {
        const pkg = join(dir, "package.json");
        if (existsSync(pkg) && JSON.parse(readFileSync(pkg, "utf8")).name === "@forspring/ui")
            return dir;
        const up = dirname(dir);
        if (up === dir)
            throw new Error("@forspring/ui: package.json not found above the audit");
        dir = up;
    }
}
export async function loadTokens(root = packageRoot()) {
    return (await import(pathToFileURL(join(root, "dist/tokens.js")).href));
}
const hexRgb = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const toHex = ([r, g, b]) => "#" + [r, g, b].map((c) => Math.round(c).toString(16).padStart(2, "0")).join("");
// Chromium serialises computed colours as rgb(), rgba() or color(srgb ...); the probe page only
// produces those.
function parseComputed(s) {
    let m = /^rgba?\(([^)]+)\)$/.exec(s);
    if (m) {
        const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
        return [p[0], p[1], p[2]];
    }
    m = /^color\(srgb ([^)]+)\)$/.exec(s);
    if (m) {
        const p = m[1].split(/[\s/]+/).filter(Boolean).map(Number);
        return [p[0] * 255, p[1] * 255, p[2] * 255];
    }
    return null;
}
// Every color-mix() and light-dark() in the component layer, so the shades it derives from the
// roles (links, hover, notice tints, shadows) count as the palette too.
function derivedExpressions(css) {
    const out = new Set();
    for (const start of ["color-mix(", "light-dark("]) {
        for (let i = css.indexOf(start); i !== -1; i = css.indexOf(start, i + 1)) {
            let depth = 0;
            for (let j = i + start.length - 1; j < css.length; j++) {
                if (css[j] === "(")
                    depth++;
                else if (css[j] === ")" && --depth === 0) {
                    out.add(css.slice(i, j + 1));
                    break;
                }
            }
        }
    }
    return [...out];
}
/** The colours a page may use: every token value, and the shades components.css mixes from roles. */
export async function palette(browser, tokens, root, product) {
    const hexes = new Set();
    for (const f of readdirSync(join(root, "tokens"))) {
        if (!f.endsWith(".json") || f === "accent.json")
            continue;
        for (const m of readFileSync(join(root, "tokens", f), "utf8").matchAll(/"hex":\s*"(#[0-9a-f]{6})"/gi))
            hexes.add(m[1].toLowerCase());
    }
    const products = product ? [product] : [...tokens.products];
    for (const p of products)
        for (const h of Object.values(tokens.accents[p]))
            hexes.add(h);
    const css = readFileSync(join(root, "dist/tokens.css"), "utf8") + "\n" + readFileSync(join(root, "dist/components.css"), "utf8");
    const exprs = [...Object.keys(tokens.roles.light).map((r) => `var(--${r})`), "var(--_link)", "var(--_hover)", "var(--_shadow)", ...derivedExpressions(readFileSync(join(root, "dist/components.css"), "utf8"))];
    const context = await browser.newContext();
    try {
        const page = await context.newPage();
        await page.setContent(`<!doctype html><style>${css}</style><body></body>`);
        const computed = await page.evaluate(({ products, exprs }) => {
            const out = [];
            for (const p of products)
                for (const t of ["light", "dark"]) {
                    const box = document.createElement("div");
                    box.dataset.product = p;
                    box.dataset.theme = t;
                    const span = document.createElement("span");
                    box.append(span);
                    document.body.append(box);
                    for (const e of exprs) {
                        span.style.color = "";
                        span.style.color = e;
                        if (span.style.color)
                            out.push(getComputedStyle(span).color);
                    }
                    box.remove();
                }
            return out;
        }, { products, exprs });
        const colours = [...hexes].map(hexRgb);
        for (const c of computed) {
            const rgb = parseComputed(c);
            if (rgb)
                colours.push(rgb);
        }
        return colours;
    }
    finally {
        await context.close();
    }
}
export async function scale(browser, opts, root = packageRoot()) {
    const tokens = await loadTokens(root);
    const { chrome, content } = tokens.text;
    return {
        sizes: [...new Set([...Object.values(chrome), ...Object.values(content)])].sort((a, b) => a - b),
        // h1 is fluid between its two steps (clamp() in components.css).
        h1: [content["h1-min"], content["h1"]],
        radii: [0, ...Object.values(tokens.radius)],
        palette: await palette(browser, tokens, root, opts.product),
        allowSpacing: opts.allowSpacing,
    };
}
// --- Rules ---------------------------------------------------------------------------------------
const lin = (c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
export const ratio = (a, b) => {
    const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
};
const near = (a, b, tol = 0.05) => Math.abs(a - b) < tol;
const px = (n) => `${Math.round(n * 100) / 100}px`;
const colourText = (c) => toHex(c) + (c[3] < 1 ? ` at ${Math.round(c[3] * 100)}%` : "");
export function findings(obs, sc, width) {
    const out = [];
    const sizesText = sc.sizes.join(", ") + " px";
    for (const t of obs.texts) {
        // Contrast. Disabled controls are exempt (WCAG 1.4.3).
        if (!t.disabled) {
            if (t.bg === null) {
                out.push({ rule: "contrast", severity: "review", selector: t.imageOn, value: "background-image", expected: "text on a plain background", note: "needs review: text over a background image or gradient; the audit cannot measure it" });
            }
            else {
                const a = t.fg[3];
                const fg = [0, 1, 2].map((i) => t.fg[i] * a + t.bg[i] * (1 - a));
                const large = t.size >= 24 || (t.size >= 18.66 && t.weight >= 700);
                const min = large ? 3 : 4.5;
                const r = ratio(fg, t.bg);
                if (r < min)
                    out.push({ rule: "contrast", severity: "error", selector: t.selector, value: `${r.toFixed(2)}:1 (${toHex(fg)} on ${toHex(t.bg)})`, expected: `at least ${min}:1${large ? " (large text)" : ""}`, note: "WCAG 2.2 AA, 1.4.3" });
            }
        }
        // Type size.
        if (t.size < 11 - 0.05)
            out.push({ rule: "text-min", severity: "error", selector: t.selector, value: px(t.size), expected: "at least 11px", note: "no text under 11px (ui-standard §3)" });
        else if (!(t.gsi || sc.sizes.some((s) => near(s, t.size)) || (t.h1 && t.size >= sc.h1[0] - 0.05 && t.size <= sc.h1[1] + 0.05)))
            out.push({ rule: "font-size", severity: "error", selector: t.selector, value: px(t.size), expected: sizesText, note: "a size on neither type ladder (tokens/geometry.json text.chrome, text.content)" });
        // Family.
        const families = t.gsi ? [...FAMILIES, ...GOOGLE_FAMILIES] : FAMILIES;
        if (!families.includes(t.family))
            out.push({ rule: "font-family", severity: "error", selector: t.selector, value: t.family, expected: FAMILIES.join(", "), note: t.family.startsWith("Roboto") ? "Roboto belongs inside Google's button (.gsi) only" : "the family's fonts only, self-hosted" });
    }
    for (const f of obs.fonts)
        if (![...FAMILIES, ...GOOGLE_FAMILIES].includes(f))
            out.push({ rule: "font-family", severity: "error", selector: "document.fonts", value: f, expected: FAMILIES.join(", "), note: "the page loaded a font face outside the family" });
    for (const b of obs.boxes) {
        if (!b.gsi) {
            const bad = new Set();
            for (const corner of b.radii)
                for (const part of corner.split(" ")) {
                    const n = parseFloat(part);
                    const ok = part.endsWith("%") ? n === 0 || n === 50 : n === 0 || n >= 999 || sc.radii.some((r) => near(r, n));
                    if (!ok)
                        bad.add(part);
                }
            if (bad.size)
                out.push({ rule: "radius", severity: "error", selector: b.selector, value: [...bad].join(" "), expected: `${sc.radii.join(", ")} px, 50% or a pill (999px)`, note: "radii are fixed geometry (tokens radius.*)" });
            const off = new Map();
            for (const s of b.spacing) {
                const v = Math.round(Math.abs(s.px) * 100) / 100;
                if (near(v % 4, 0, 0.01) || near(v % 4, 4, 0.01) || sc.allowSpacing.some((a) => near(a, v, 0.01)))
                    continue;
                const key = px(v);
                off.set(key, [...(off.get(key) ?? []), s.prop]);
            }
            for (const [v, props] of off)
                out.push({ rule: "spacing", severity: "error", selector: b.selector, value: v, expected: "a multiple of 4px" + (sc.allowSpacing.length ? ` or ${sc.allowSpacing.join(", ")} (--allow-spacing)` : ""), note: props.join(", ") });
            for (const c of b.colours) {
                if (sc.palette.some((p) => Math.abs(p[0] - c.rgba[0]) <= 2 && Math.abs(p[1] - c.rgba[1]) <= 2 && Math.abs(p[2] - c.rgba[2]) <= 2))
                    continue;
                out.push({ rule: "palette", severity: "warning", selector: b.selector, value: colourText(c.rgba), expected: "a token colour (any alpha)", note: c.prop });
            }
        }
    }
    for (const t of obs.smallTargets)
        out.push({ rule: "target-size", severity: "error", selector: t.selector, value: `${t.width}x${t.height}px`, expected: "at least 24x24px, or 24px clear of other targets", note: "WCAG 2.2 AA, 2.5.8" });
    if (width < PHONE_WIDTH)
        for (const t of obs.primaries)
            if (t.height < 43.5)
                out.push({ rule: "target-primary", severity: "error", selector: t.selector, value: `${t.height}px tall`, expected: "at least 44px tall on a phone", note: "primary controls on phones (ui-standard §3)" });
    return out;
}
/** One finding per distinct (rule, selector, value), with a count, errors first. */
export function dedupe(list) {
    const seen = new Map();
    for (const f of list) {
        const key = JSON.stringify([f.rule, f.severity, f.selector, f.value, f.expected, f.note]);
        const had = seen.get(key);
        if (had)
            had.count = (had.count ?? 1) + 1;
        else
            seen.set(key, { ...f });
    }
    const order = { error: 0, warning: 1, review: 2 };
    return [...seen.values()].sort((a, b) => order[a.severity] - order[b.severity]);
}
/** --format text: one line per page, one per finding. */
export function formatText(result) {
    const lines = [];
    for (const p of result.pages) {
        const errors = p.findings.filter((f) => f.severity === "error").length;
        lines.push(`${p.url}  ${p.width}px ${p.theme}  ${errors ? `${errors} error${errors === 1 ? "" : "s"}` : "ok"}`);
        for (const f of p.findings)
            lines.push(`  ${f.severity.padEnd(7)} ${f.rule.padEnd(14)} ${f.selector}  ${f.value}  (expected ${f.expected})${f.count ? ` x${f.count}` : ""}${f.note ? `  ${f.note}` : ""}`);
    }
    lines.push(result.ok ? "ok: no errors" : "failed: see the errors above");
    return lines.join("\n");
}
// --- Running pages ---------------------------------------------------------------------------------
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
function axeSource() {
    return readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
}
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
async function auditPage(browser, url, width, theme, sc, opts, axe) {
    const origin = new URL(url).origin;
    // bypassCSP lets the audit inject axe into a page whose strict CSP (as it should be) forbids it.
    const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme, bypassCSP: true, serviceWorkers: "block" });
    const found = [];
    const offOrigin = new Map();
    const scripts = [];
    try {
        // Off-origin requests are recorded and answered empty, never fetched: the run stays offline
        // and the same in CI as on a laptop, and the finding does not depend on the third party.
        await context.route("**/*", (route) => {
            const req = route.request();
            const u = new URL(req.url());
            if (/^https?:$/.test(u.protocol) && u.origin !== origin) {
                offOrigin.set(req.url(), req.resourceType());
                return route.fulfill({ status: 204, body: "" });
            }
            return route.continue();
        });
        const page = await context.newPage();
        page.on("response", (res) => {
            if (res.request().resourceType() !== "script" || new URL(res.url()).origin !== origin)
                return;
            scripts.push((async () => {
                try {
                    const body = await res.body();
                    if (res.headers()["content-encoding"])
                        return (await res.request().sizes()).responseBodySize;
                    // Served uncompressed (a local dev server): count what it gzips to, since production
                    // serves it compressed and the budget is in gzipped bytes (ui-standard §3, D-9).
                    return gzipSync(body).length;
                }
                catch {
                    return 0;
                }
            })());
        });
        let res;
        try {
            res = await page.goto(url, { waitUntil: "load", timeout: 30_000 });
        }
        catch (e) {
            found.push({ rule: "page-load", severity: "error", selector: "document", value: e.message.split("\n")[0], expected: "the page loads", note: "check the URL and that the server is running" });
            return { url, width, theme, findings: found };
        }
        if (!res || res.status() >= 400) {
            found.push({ rule: "page-load", severity: "error", selector: "document", value: `HTTP ${res?.status() ?? "no response"}`, expected: "HTTP 200", note: "the audit measures the page the server returns" });
            return { url, width, theme, findings: found };
        }
        await page.evaluate(() => document.fonts.ready.then(() => undefined));
        const obs = await page.evaluate(collect);
        found.push(...findings(obs, sc, width));
        await page.addScriptTag({ content: axe });
        const violations = await page.evaluate(async (tags) => {
            const r = await window.axe.run(document, { runOnly: { type: "tag", values: tags }, resultTypes: ["violations"] });
            // Experimental rules stay off, as in axe's own default run (label-content-name-mismatch flagged
            // the demo's "Log ud" button, whose label starts with its visible text, as 2.5.3 allows).
            return r.violations.filter((v) => !v.tags.includes("experimental")).map((v) => ({ id: v.id, help: v.help, impact: v.impact, targets: v.nodes.map((n) => n.target.map(String).join(" ")) }));
        }, AXE_TAGS);
        for (const v of violations)
            for (const target of v.targets)
                found.push({ rule: "axe", severity: "error", selector: target, value: v.id, expected: "no violation", note: `${v.help} (${v.impact})` });
        for (const [u, type] of offOrigin)
            found.push({ rule: "third-party", severity: "error", selector: type, value: u, expected: `same origin as the page (${origin})`, note: "no fonts, analytics or CDN requests (ui-standard §3); the audit answered it empty" });
        const bytes = (await Promise.all(scripts)).reduce((a, b) => a + b, 0);
        if (bytes > opts.budgetJs)
            found.push({ rule: "js-budget", severity: "error", selector: "script", value: `${kb(bytes)} gzipped in ${scripts.length} file${scripts.length === 1 ? "" : "s"}`, expected: `at most ${kb(opts.budgetJs)} (--budget-js)`, note: "console pages ship no script files by default; htmx pages about 20 KB" });
    }
    finally {
        await context.close();
    }
    return { url, width, theme, findings: dedupe(found) };
}
export async function audit(opts, browser) {
    const sc = await scale(browser, opts);
    const axe = axeSource();
    const pages = [];
    for (const url of opts.urls)
        for (const width of opts.widths)
            for (const theme of opts.themes)
                pages.push(await auditPage(browser, url, width, theme, sc, opts, axe));
    return { ok: pages.every((p) => p.findings.every((f) => f.severity !== "error")), pages };
}

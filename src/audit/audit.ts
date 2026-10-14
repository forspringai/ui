// The design audit (hub ui-standard §3, "Enforcement"): every page at desktop and phone width, light
// and dark, measured in Chromium against the tokens. Rules and severities are D-8; the script budget
// is D-9. Playwright is the consumer's (a peer dependency); axe-core is ours, injected from
// node_modules, never a CDN.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";
import type { Browser, BrowserContext, Page, Request } from "playwright";
import { collect, type Observations, type Rgba } from "./page.js";
import type { AuditOptions, AuditResult, Finding, PageResult, Theme } from "./types.js";

export type { AuditOptions, AuditResult, Finding, PageResult } from "./types.js";

export const DEFAULT_WIDTHS = [1280, 380];
export const DEFAULT_THEMES: Theme[] = ["light", "dark"];
/** Below this width the phone floors apply: primary controls 44 px tall (D-5's 560 px breakpoint). */
export const PHONE_WIDTH = 560;

export const FAMILIES = ["Archivo", "Archivo Condensed", "Space Mono"];
// Google's button sets its own Roboto, by Google's branding guidelines (D-7).
const GOOGLE_FAMILIES = ["Roboto GSI", "Roboto"];

/** The package root, from src/audit/ (tests) or dist/audit/ (the bin) alike. */
export function packageRoot(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (;;) {
    const pkg = join(dir, "package.json");
    if (existsSync(pkg) && JSON.parse(readFileSync(pkg, "utf8")).name === "@forspring/ui") return dir;
    const up = dirname(dir);
    if (up === dir) throw new Error("@forspring/ui: package.json not found above the audit");
    dir = up;
  }
}

type Tokens = {
  products: readonly string[];
  accents: Record<string, { light: string; dark: string }>;
  roles: { light: Record<string, string> };
  radius: Record<string, number>;
  text: { chrome: Record<string, number>; content: Record<string, number> };
};

export async function loadTokens(root = packageRoot()): Promise<Tokens> {
  return (await import(pathToFileURL(join(root, "dist/tokens.js")).href)) as Tokens;
}

type Scale = {
  sizes: number[];
  h1: [number, number];
  radii: number[];
  palette: [number, number, number][];
  allowSpacing: number[];
};

const hexRgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const toHex = ([r, g, b]: readonly number[]) => "#" + [r!, g!, b!].map((c) => Math.round(c).toString(16).padStart(2, "0")).join("");

// Chromium serialises computed colours as rgb(), rgba() or color(srgb ...); the probe page only
// produces those.
function parseComputed(s: string): [number, number, number] | null {
  let m = /^rgba?\(([^)]+)\)$/.exec(s);
  if (m) {
    const p = m[1]!.split(/[\s,/]+/).filter(Boolean).map(Number);
    return [p[0]!, p[1]!, p[2]!];
  }
  m = /^color\(srgb ([^)]+)\)$/.exec(s);
  if (m) {
    const p = m[1]!.split(/[\s/]+/).filter(Boolean).map(Number);
    return [p[0]! * 255, p[1]! * 255, p[2]! * 255];
  }
  return null;
}

// Every color-mix() and light-dark() in the component layer, so the shades it derives from the
// roles (links, hover, notice tints, shadows) count as the palette too.
function derivedExpressions(css: string): string[] {
  const out = new Set<string>();
  for (const start of ["color-mix(", "light-dark("]) {
    for (let i = css.indexOf(start); i !== -1; i = css.indexOf(start, i + 1)) {
      let depth = 0;
      for (let j = i + start.length - 1; j < css.length; j++) {
        if (css[j] === "(") depth++;
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
export async function palette(browser: Browser, tokens: Tokens, root: string, product?: string): Promise<[number, number, number][]> {
  const hexes = new Set<string>();
  for (const f of readdirSync(join(root, "tokens"))) {
    if (!f.endsWith(".json") || f === "accent.json") continue;
    for (const m of readFileSync(join(root, "tokens", f), "utf8").matchAll(/"hex":\s*"(#[0-9a-f]{6})"/gi)) hexes.add(m[1]!.toLowerCase());
  }
  const products = product ? [product] : [...tokens.products];
  for (const p of products) for (const h of Object.values(tokens.accents[p]!)) hexes.add(h);

  const css = readFileSync(join(root, "dist/tokens.css"), "utf8") + "\n" + readFileSync(join(root, "dist/components.css"), "utf8");
  const exprs = [...Object.keys(tokens.roles.light).map((r) => `var(--${r})`), "var(--_link)", "var(--_hover)", "var(--_shadow)", ...derivedExpressions(readFileSync(join(root, "dist/components.css"), "utf8"))];
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    await page.setContent(`<!doctype html><style>${css}</style><body></body>`);
    const computed = await page.evaluate(
      ({ products, exprs }) => {
        const out: string[] = [];
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
              if (span.style.color) out.push(getComputedStyle(span).color);
            }
            box.remove();
          }
        return out;
      },
      { products, exprs },
    );
    const colours = [...hexes].map(hexRgb);
    for (const c of computed) {
      const rgb = parseComputed(c);
      if (rgb) colours.push(rgb);
    }
    return colours;
  } finally {
    await context.close();
  }
}

export async function scale(browser: Browser, opts: AuditOptions, root = packageRoot()): Promise<Scale> {
  const tokens = await loadTokens(root);
  const { chrome, content } = tokens.text;
  return {
    sizes: [...new Set([...Object.values(chrome), ...Object.values(content)])].sort((a, b) => a - b),
    // h1 is fluid between its two steps (clamp() in components.css).
    h1: [content["h1-min"]!, content["h1"]!],
    radii: [0, ...Object.values(tokens.radius)],
    palette: await palette(browser, tokens, root, opts.product),
    allowSpacing: opts.allowSpacing,
  };
}

// --- Rules ---------------------------------------------------------------------------------------

const lin = (c: number) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const lum = ([r, g, b]: readonly number[]) => 0.2126 * lin(r!) + 0.7152 * lin(g!) + 0.0722 * lin(b!);
export const ratio = (a: readonly number[], b: readonly number[]) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
};
const near = (a: number, b: number, tol = 0.05) => Math.abs(a - b) < tol;
const px = (n: number) => `${Math.round(n * 100) / 100}px`;
const colourText = (c: Rgba) => toHex(c) + (c[3] < 1 ? ` at ${Math.round(c[3] * 100)}%` : "");

export function findings(obs: Observations, sc: Scale, width: number): Finding[] {
  const out: Finding[] = [];
  const sizesText = sc.sizes.join(", ") + " px";

  for (const t of obs.texts) {
    // Contrast. Disabled controls are exempt (WCAG 1.4.3).
    if (!t.disabled) {
      if (t.bg === null) {
        out.push({ rule: "contrast", severity: "review", selector: t.imageOn!, value: "background-image", expected: "text on a plain background", note: "needs review: text over a background image or gradient; the audit cannot measure it" });
      } else {
        const a = t.fg[3];
        const fg = [0, 1, 2].map((i) => t.fg[i]! * a + t.bg![i]! * (1 - a));
        const large = t.size >= 24 || (t.size >= 18.66 && t.weight >= 700);
        const min = large ? 3 : 4.5;
        const r = ratio(fg, t.bg);
        if (r < min) out.push({ rule: "contrast", severity: "error", selector: t.selector, value: `${r.toFixed(2)}:1 (${toHex(fg)} on ${toHex(t.bg)})`, expected: `at least ${min}:1${large ? " (large text)" : ""}`, note: "WCAG 2.2 AA, 1.4.3" });
      }
    }
    // Type size.
    if (t.size < 11 - 0.05) out.push({ rule: "text-min", severity: "error", selector: t.selector, value: px(t.size), expected: "at least 11px", note: "no text under 11px (ui-standard §3)" });
    else if (!(t.gsi || sc.sizes.some((s) => near(s, t.size)) || (t.h1 && t.size >= sc.h1[0] - 0.05 && t.size <= sc.h1[1] + 0.05)))
      out.push({ rule: "font-size", severity: "error", selector: t.selector, value: px(t.size), expected: sizesText, note: "a size on neither type ladder (tokens/geometry.json text.chrome, text.content)" });
    // Family.
    const families = t.gsi ? [...FAMILIES, ...GOOGLE_FAMILIES] : FAMILIES;
    if (!families.includes(t.family)) out.push({ rule: "font-family", severity: "error", selector: t.selector, value: t.family, expected: FAMILIES.join(", "), note: t.family.startsWith("Roboto") ? "Roboto belongs inside Google's button (.gsi) only" : "the family's fonts only, self-hosted" });
  }

  for (const f of obs.fonts)
    if (![...FAMILIES, ...GOOGLE_FAMILIES].includes(f)) out.push({ rule: "font-family", severity: "error", selector: "document.fonts", value: f, expected: FAMILIES.join(", "), note: "the page loaded a font face outside the family" });

  for (const b of obs.boxes) {
    if (!b.gsi) {
      const bad = new Set<string>();
      for (const corner of b.radii)
        for (const part of corner.split(" ")) {
          const n = parseFloat(part);
          const ok = part.endsWith("%") ? n === 0 || n === 50 : n === 0 || n >= 999 || sc.radii.some((r) => near(r, n));
          if (!ok) bad.add(part);
        }
      if (bad.size) out.push({ rule: "radius", severity: "error", selector: b.selector, value: [...bad].join(" "), expected: `${sc.radii.join(", ")} px, 50% or a pill (999px)`, note: "radii are fixed geometry (tokens radius.*)" });

      const off = new Map<string, string[]>();
      for (const s of b.spacing) {
        const v = Math.round(Math.abs(s.px) * 100) / 100;
        if (near(v % 4, 0, 0.01) || near(v % 4, 4, 0.01) || sc.allowSpacing.some((a) => near(a, v, 0.01))) continue;
        const key = px(v);
        off.set(key, [...(off.get(key) ?? []), s.prop]);
      }
      for (const [v, props] of off) out.push({ rule: "spacing", severity: "error", selector: b.selector, value: v, expected: "a multiple of 4px" + (sc.allowSpacing.length ? ` or ${sc.allowSpacing.join(", ")} (--allow-spacing)` : ""), note: props.join(", ") });

      for (const c of b.colours) {
        if (sc.palette.some((p) => Math.abs(p[0] - c.rgba[0]) <= 2 && Math.abs(p[1] - c.rgba[1]) <= 2 && Math.abs(p[2] - c.rgba[2]) <= 2)) continue;
        out.push({ rule: "palette", severity: "warning", selector: b.selector, value: colourText(c.rgba), expected: "a token colour (any alpha)", note: c.prop });
      }
    }
  }

  for (const t of obs.smallTargets) out.push({ rule: "target-size", severity: "error", selector: t.selector, value: `${t.width}x${t.height}px`, expected: "at least 24x24px, or 24px clear of other targets", note: "WCAG 2.2 AA, 2.5.8" });
  if (width < PHONE_WIDTH)
    for (const t of obs.primaries)
      if (t.height < 43.5) out.push({ rule: "target-primary", severity: "error", selector: t.selector, value: `${t.height}px tall`, expected: "at least 44px tall on a phone", note: "primary controls on phones (ui-standard §3)" });
  return out;
}

/** One finding per distinct (rule, selector, value), with a count, errors first. */
export function dedupe(list: Finding[]): Finding[] {
  const seen = new Map<string, Finding>();
  for (const f of list) {
    const key = JSON.stringify([f.rule, f.severity, f.selector, f.value, f.expected, f.note]);
    const had = seen.get(key);
    if (had) had.count = (had.count ?? 1) + 1;
    else seen.set(key, { ...f });
  }
  const order = { error: 0, warning: 1, review: 2 };
  return [...seen.values()].sort((a, b) => order[a.severity] - order[b.severity]);
}

/** --format text: one line per page, one per finding. */
export function formatText(result: AuditResult): string {
  const lines: string[] = [];
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

function axeSource(): string {
  return readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
}

const kb = (n: number) => `${(n / 1024).toFixed(1)} KB`;

/** A page is settled when no request is open and neither the network nor the DOM has changed for this long (D-16). */
export const SETTLE_QUIET = 300;
/** The most the audit waits for a page to settle after load before measuring it anyway. */
export const SETTLE_MAX = 10_000;
/** How long --wait-for waits by default. */
export const WAIT_TIMEOUT = 30_000;

/**
 * Waits for the page to go quiet: a single-page app draws after load, from lazy chunks and API
 * calls, so the load event alone measures an empty shell. A static page is quiet at once and costs
 * SETTLE_QUIET. Returns false when the page was still busy at SETTLE_MAX (a poll, an animation).
 */
async function settled(page: Page, open: Set<Request>, lastNet: () => number): Promise<boolean> {
  // The observer only notes the time of the last change; it is the audit's, set after load.
  await page.evaluate(() => {
    const w = window as unknown as { __forspringAuditQuiet: number };
    w.__forspringAuditQuiet = performance.now();
    new MutationObserver(() => (w.__forspringAuditQuiet = performance.now())).observe(document, { subtree: true, childList: true, attributes: true, characterData: true });
  });
  const start = Date.now();
  for (;;) {
    const domQuiet = await page.evaluate(() => performance.now() - (window as unknown as { __forspringAuditQuiet: number }).__forspringAuditQuiet);
    if (open.size === 0 && Date.now() - lastNet() >= SETTLE_QUIET && domQuiet >= SETTLE_QUIET) return true;
    if (Date.now() - start >= SETTLE_MAX) return false;
    await page.waitForTimeout(50);
  }
}

async function auditPage(browser: Browser, url: string, width: number, theme: Theme, sc: Scale, opts: AuditOptions, axe: string): Promise<PageResult> {
  const origin = new URL(url).origin;
  // The page's own origin and the ones the run allows (its API on another port): requests to these
  // go through, and are not third-party (D-16).
  const own = new Set([origin, ...(opts.allowOrigins ?? []).map((o) => new URL(o).origin)]);
  // bypassCSP lets the audit inject axe into a page whose strict CSP (as it should be) forbids it.
  const context: BrowserContext = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme, bypassCSP: true, serviceWorkers: "block" });
  const found: Finding[] = [];
  // url -> resource type, and whether Chromium fetched it (a redirect hop) or the audit answered it.
  const offOrigin = new Map<string, { type: string; fetched: boolean }>();
  const scripts: Promise<number>[] = [];
  try {
    // Off-origin requests are recorded and answered empty, never fetched: the run stays offline
    // and the same in CI as on a laptop, and the finding does not depend on the third party.
    await context.route("**/*", (route) => {
      const req = route.request();
      const u = new URL(req.url());
      if (/^https?:$/.test(u.protocol) && !own.has(u.origin)) {
        offOrigin.set(req.url(), { type: req.resourceType(), fetched: false });
        return route.fulfill({ status: 204, body: "" });
      }
      return route.continue();
    });
    if (opts.cookie) {
      // The session goes as a header on the context's requests rather than a cookie in the jar: no
      // Domain, Secure or __Host- rules to get right over local http, and nothing a page's script
      // can read. (route.continue cannot set Cookie; Chromium drops it.) It reaches the audited
      // origin and the allowed ones only: every other HTTP request is answered above without leaving
      // the browser, and a WebSocket to anywhere else is closed unopened (D-10, D-16).
      await context.setExtraHTTPHeaders({ cookie: opts.cookie });
      const hosts = new Set([...own].map((o) => new URL(o).host));
      await context.routeWebSocket((u) => !hosts.has(u.host), (ws) => ws.close());
    }
    const page = await context.newPage();
    // Open requests and the time of the last network event, for settled().
    const open = new Set<Request>();
    let lastNet = Date.now();
    page.on("request", (req) => (open.add(req), (lastNet = Date.now())));
    const done = (req: Request) => (open.delete(req), (lastNet = Date.now()));
    page.on("requestfinished", done);
    page.on("requestfailed", done);
    // Playwright routes only the first URL of a redirect chain, so a same-origin URL that redirects
    // off-origin is followed by Chromium itself, past the route above (checked with Playwright 1.64,
    // 2026-10-10). Hosts are not resolved (cli.ts), but an IP literal needs no resolving. The hop
    // cannot be stopped from here; it is recorded and fails like any other third-party request (D-12).
    page.on("request", (req) => {
      if (!req.redirectedFrom()) return;
      const u = new URL(req.url());
      if (/^https?:$/.test(u.protocol) && !own.has(u.origin)) offOrigin.set(req.url(), { type: req.resourceType(), fetched: true });
    });
    page.on("response", (res) => {
      if (res.request().resourceType() !== "script" || !own.has(new URL(res.url()).origin)) return;
      scripts.push(
        (async () => {
          try {
            const body = await res.body();
            if (res.headers()["content-encoding"]) return (await res.request().sizes()).responseBodySize;
            // Served uncompressed (a local dev server): count what it gzips to, since production
            // serves it compressed and the budget is in gzipped bytes (ui-standard §3, D-9).
            return gzipSync(body).length;
          } catch {
            return 0;
          }
        })(),
      );
    });
    let res;
    try {
      res = await page.goto(url, { waitUntil: "load", timeout: 30_000 });
    } catch (e) {
      found.push({ rule: "page-load", severity: "error", selector: "document", value: (e as Error).message.split("\n")[0]!, expected: "the page loads", note: "check the URL and that the server is running" });
      return { url, width, theme, findings: found };
    }
    // A refusal page (403, 503) is a page people see and is audited like any other, when the run
    // says that status is expected (--allow-status, D-10).
    if (!res || (res.status() >= 400 && !(opts.allowStatus ?? []).includes(res.status()))) {
      found.push({ rule: "page-load", severity: "error", selector: "document", value: `HTTP ${res?.status() ?? "no response"}`, expected: `HTTP 200${opts.allowStatus?.length ? ` or ${opts.allowStatus.join(", ")} (--allow-status)` : ""}`, note: "the audit measures the page the server returns" });
      return { url, width, theme, findings: found };
    }
    // A redirected page is not the page asked for, and Chromium sends --cookie-env's header on the
    // first request only, so a signed-in URL that redirects would be audited signed out and could
    // pass as someone else's page. Give the audit the final URL instead (D-12).
    if (res.request().redirectedFrom()) {
      found.push({ rule: "page-load", severity: "error", selector: "document", value: `redirected to ${res.url()}`, expected: "the page itself, not a redirect", note: "audit the URL the redirect leads to; a redirect drops the --cookie-env session" });
      return { url, width, theme, findings: found };
    }
    // A single-page app draws after load: wait for the element the run names, then for the page to
    // go quiet, then for any fixed --settle (D-16).
    if (opts.waitFor) {
      const timeout = opts.waitTimeout ?? WAIT_TIMEOUT;
      try {
        await page.waitForSelector(opts.waitFor, { state: "visible", timeout });
      } catch (e) {
        const timedOut = (e as Error).name === "TimeoutError";
        found.push({ rule: "page-load", severity: "error", selector: opts.waitFor, value: timedOut ? `${opts.waitFor} not visible on ${url} after ${timeout} ms` : `${opts.waitFor} on ${url}: ${(e as Error).message.split("\n")[0]}`, expected: "the --wait-for element, visible", note: timedOut ? "check the selector, and that the page draws it (its API answered, it is signed in)" : "--wait-for takes a CSS selector" });
        return { url, width, theme, findings: found };
      }
    }
    if (!(await settled(page, open, () => lastNet)))
      found.push({ rule: "page-load", severity: "review", selector: "document", value: `still changing ${SETTLE_MAX / 1000} s after load`, expected: `no requests or DOM changes for ${SETTLE_QUIET} ms`, note: "measured anyway; give --wait-for the element that shows the page is drawn" });
    if (opts.settle) await page.waitForTimeout(opts.settle);
    await page.evaluate(() => document.fonts.ready.then(() => undefined));

    const obs = await page.evaluate(collect);
    found.push(...findings(obs, sc, width));

    await page.addScriptTag({ content: axe });
    const violations = await page.evaluate(async (tags) => {
      const r = await (window as unknown as { axe: { run: (c: unknown, o: unknown) => Promise<{ violations: { id: string; help: string; impact: string; tags: string[]; nodes: { target: unknown[] }[] }[] }> } }).axe.run(document, { runOnly: { type: "tag", values: tags }, resultTypes: ["violations"] });
      // Experimental rules stay off, as in axe's own default run (label-content-name-mismatch flagged
      // the demo's "Log ud" button, whose label starts with its visible text, as 2.5.3 allows).
      return r.violations.filter((v) => !v.tags.includes("experimental")).map((v) => ({ id: v.id, help: v.help, impact: v.impact, targets: v.nodes.map((n) => n.target.map(String).join(" ")) }));
    }, AXE_TAGS);
    for (const v of violations)
      for (const target of v.targets) found.push({ rule: "axe", severity: "error", selector: target, value: v.id, expected: "no violation", note: `${v.help} (${v.impact})` });

    for (const [u, { type, fetched }] of offOrigin) found.push({ rule: "third-party", severity: "error", selector: type, value: u, expected: `same origin as the page (${origin})${own.size > 1 ? ` or ${[...own].filter((o) => o !== origin).join(", ")} (--allow-origin)` : ""}`, note: `no fonts, analytics or CDN requests (ui-standard §3); ${fetched ? "reached through a same-origin redirect, which the browser followed" : "the audit answered it empty"}` });

    const bytes = (await Promise.all(scripts)).reduce((a, b) => a + b, 0);
    if (bytes > opts.budgetJs)
      found.push({ rule: "js-budget", severity: "error", selector: "script", value: `${kb(bytes)} gzipped in ${scripts.length} file${scripts.length === 1 ? "" : "s"}`, expected: `at most ${kb(opts.budgetJs)} (--budget-js)`, note: "console pages ship no script files by default; htmx pages about 20 KB" });
  } finally {
    await context.close();
  }
  return { url, width, theme, findings: dedupe(found) };
}

export async function audit(opts: AuditOptions, browser: Browser): Promise<AuditResult> {
  const sc = await scale(browser, opts);
  const axe = axeSource();
  const pages: PageResult[] = [];
  for (const url of opts.urls) for (const width of opts.widths) for (const theme of opts.themes) pages.push(await auditPage(browser, url, width, theme, sc, opts, axe));
  return { ok: pages.every((p) => p.findings.every((f) => f.severity !== "error")), pages };
}

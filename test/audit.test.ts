// The design audit on two pages: the built demo, which must pass, and a fixture broken on purpose,
// which must fail with every rule it breaks. The pages come from a server this test starts; the
// browser resolves no other host, and the audit answers every off-origin request itself, so nothing
// here reaches the internet. Something on the dev host probes new localhost ports (hub learnings),
// so nothing below counts the server's requests.

import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createReadStream, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { extname, join, normalize } from "node:path";
import { promisify } from "node:util";
import { chromium, type Browser } from "playwright";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { parseArgs, parseSize, redactor } from "../src/audit/args.ts";
import { audit, DEFAULT_THEMES, DEFAULT_WIDTHS, dedupe, findings, layoutFindings, layoutScale, marketingLadder, oklabL, popoverFindings, primitives, rowInsetFindings, NO_ANCHOR, RICH_SLOTS, withoutAnchorPositioning } from "../src/audit/audit.ts";
import { collectLayout, type LayoutObservations } from "../src/audit/page.ts";
import { consentHeaders, fontFaces, orgList } from "../src/html.ts";
import type { AuditOptions, AuditResult, Finding } from "../src/audit/types.ts";
import * as tokens from "../dist/tokens.js";

const root = join(import.meta.dirname, "..");
const TYPES: Record<string, string> = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".woff2": "font/woff2" };
// Every product the demo can show (?product=), each audited with its own accent (--product).
const PRODUCTS = tokens.products as readonly string[];

let server: Server;
let base: string;
// The single-page app's API, on a port of its own (D-16).
let apiServer: Server;
let api: string;
let browser: Browser;

// A session only this run knows: /private/... answers 401 without it, so a pass proves the audit
// sent it on the page and every subresource.
const SESSION = `audit_session=${randomUUID()}; theme=x`;

beforeAll(async () => {
  server = createServer((req, res) => {
    let path = decodeURIComponent(new URL(req.url ?? "/", "http://x").pathname);
    let status = 200;
    if (path.startsWith("/private/")) {
      if (req.headers.cookie !== SESSION) return void res.writeHead(401).end();
      path = path.slice("/private".length);
    } else if (path.startsWith("/redirect/")) {
      return void res.writeHead(302, { location: path.slice("/redirect".length) }).end();
    } else if (path === "/hop") {
      // An IP literal on a port nothing listens on: needs no resolving, so only the audit's own
      // record of the hop can catch it.
      return void res.writeHead(302, { location: "http://127.0.0.1:1/hop.png" }).end();
    } else if (path === "/hop-page") {
      res.writeHead(200, { "content-type": TYPES[".html"] });
      return void res.end(`<!doctype html><html lang="en"><head><title>hop</title></head><body><main><img alt="" src="/hop"></main></body></html>`);
    } else if (path.startsWith("/no-anchor/")) {
      // The same files, with the stylesheet as a browser without anchor positioning applies it (D-41).
      path = path.slice("/no-anchor".length);
      if (path.endsWith(".css")) {
        const file = normalize(join(root, path));
        if (!file.startsWith(root)) return void res.writeHead(403).end();
        res.writeHead(200, { "content-type": TYPES[".css"] });
        return void res.end(withoutAnchorPositioning(readFileSync(file, "utf8")));
      }
    } else if (path.startsWith("/consent/")) {
      // D-77: a consent page whose rows post somewhere, answered three ways; and the demo's sample, whose
      // rows post to "#".
      const kind = path.slice("/consent/".length);
      const rows = String(orgList({ lang: "en", action: kind === "sample" ? "#" : "/approve", fields: { csrf: "t" }, orgs: [{ name: "Acme", role: "admin", value: "v1" }] }));
      const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Consent</title></head><body><main><h1>Allow</h1>${rows}</main></body></html>`;
      const own = { "content-type": TYPES[".html"]!, "content-security-policy": "default-src 'self'; frame-ancestors 'self'" };
      res.writeHead(200, kind === "safe" ? consentHeaders(own) : kind === "framed" ? { ...own, "cache-control": "no-store" } : own);
      return void res.end(page);
    } else if (path.startsWith("/status/403/")) {
      // The document only: a stylesheet answered 403 would not apply.
      if (path.endsWith("/")) status = 403;
      path = path.slice("/status/403".length);
    }
    let file = normalize(join(root, path));
    if (!file.startsWith(root)) return void res.writeHead(403).end();
    try {
      if (statSync(file).isDirectory()) file = join(file, "index.html");
      statSync(file);
    } catch {
      return void res.writeHead(404).end();
    }
    res.writeHead(status, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
    createReadStream(file).pipe(res);
  });
  await new Promise<void>((ok) => server.listen(0, "127.0.0.1", ok));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  // Answers /api/me after 600 ms, like an API a page waits on, and only with the session.
  apiServer = createServer((req, res) => {
    const cors = { "access-control-allow-origin": base, "access-control-allow-credentials": "true" };
    if (new URL(req.url ?? "/", "http://x").pathname !== "/api/me") return void res.writeHead(404, cors).end();
    setTimeout(() => {
      if (req.headers.cookie !== SESSION) return void res.writeHead(401, cors).end();
      res.writeHead(200, { ...cors, "content-type": "application/json" }).end(JSON.stringify({ name: "DataSpring" }));
    }, 600);
  });
  await new Promise<void>((ok) => apiServer.listen(0, "127.0.0.1", ok));
  api = `http://127.0.0.1:${(apiServer.address() as AddressInfo).port}`;
  // Every other host fails to resolve, so a request the audit failed to intercept would fail loudly
  // instead of fetching from the internet.
  browser = await chromium.launch({ args: ["--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1"] });
}, 60_000);

afterAll(async () => {
  await browser?.close();
  await new Promise((ok) => server?.close(ok));
  await new Promise((ok) => apiServer?.close(ok));
});

const options = (urls: string[], o: Partial<AuditOptions> = {}): AuditOptions => ({ urls, budgetJs: 0, allowSpacing: [], widths: DEFAULT_WIDTHS, themes: DEFAULT_THEMES, ...o });
const all = (r: AuditResult) => r.pages.flatMap((p) => p.findings.map((f) => ({ ...f, width: p.width, theme: p.theme })));

describe("the demo page", () => {
  test("passes at 1280 and 380 px, light and dark, with no --allow-spacing (D-14)", async () => {
    const r = await audit(options([`${base}/dist/demo/`]), browser);
    expect(r.pages.map((p) => `${p.width} ${p.theme}`)).toEqual(["1280 light", "1280 dark", "380 light", "380 dark"]);
    // No warnings either: every colour on the demo is a token or a shade components.css mixes.
    expect(all(r).filter((f) => f.severity !== "review")).toEqual([]);
    expect(r.ok).toBe(true);
    // The tables' edge shadows are a background image: their text is reported for review, not failed.
    expect(all(r).every((f) => f.rule === "contrast" && f.value === "background-image")).toBe(true);
  }, 120_000);

  test.each(PRODUCTS)("passes as %s, both widths and themes, with only that product's accent", async (product) => {
    const r = await audit(options([`${base}/dist/demo/?product=${product}`], { product }), browser);
    expect(r.pages).toHaveLength(4);
    expect(all(r).filter((f) => f.severity !== "review")).toEqual([]);
    expect(r.ok).toBe(true);
  }, 120_000);

  // The standard pages around signing in (D-17), in DataSpring's bar with its org, products and person.
  test("the standard pages pass: choose an org, and a refusal with who can fix it", async () => {
    const r = await audit(options([`${base}/dist/demo/pages/choose-org.da.html`, `${base}/dist/demo/pages/refused-product_off.en.html`], { product: "dataspring" }), browser);
    expect(r.pages).toHaveLength(8);
    expect(all(r)).toEqual([]);
    expect(r.ok).toBe(true);
  }, 120_000);

  // The record (D-41, D-69): one form, its actions in one row from actions(). No finding at all, the
  // five layout rules' warnings included.
  test("the regression page passes, layout rules too, both widths and themes", async () => {
    const r = await audit(options([`${base}/dist/demo/pages/lead.en.html`], { product: "appspring" }), browser);
    expect(r.pages).toHaveLength(4);
    expect(all(r)).toEqual([]);
  }, 120_000);

  // Without anchor positioning (Firefox today) the menus take the fallback; the probe opens each one
  // and popover-anchor still finds nothing: next to its trigger, inside the window (D-41).
  // The rewrite must really drop the anchored block: in the browser the replacement is unsupported, and
  // an opened menu has no position-area (0.27.1's custom-property condition was true, so this measured
  // the anchored menus; lead-bench found it). The served page is checked against the plain one.
  test("the forced fallback is in force: the condition is unsupported and an open menu has no position-area", async () => {
    const page = await browser.newPage({ viewport: { width: 380, height: 800 } });
    try {
      const area = async (url: string) => {
        await page.goto(url);
        return page.evaluate(() => {
          const d = document.querySelector<HTMLDetailsElement>("details.product-switcher")!;
          d.open = true;
          return getComputedStyle(d.querySelector(".bar-panel")!).getPropertyValue("position-area");
        });
      };
      expect(await page.evaluate((c) => CSS.supports(c), NO_ANCHOR)).toBe(false);
      expect(await area(`${base}/dist/demo/pages/lead.en.html`)).not.toBe("none");
      expect(await area(`${base}/no-anchor/dist/demo/pages/lead.en.html`)).toBe("none");
    } finally {
      await page.close();
    }
  });

  test("without anchor positioning the menus still open at their trigger", async () => {
    const r = await audit(options([`${base}/no-anchor/dist/demo/pages/lead.en.html`, `${base}/no-anchor/dist/demo/?product=appspring`], { product: "appspring" }), browser);
    expect(r.pages).toHaveLength(8);
    // As on the demo test: only the tables' edge shadows, for review. No layout finding, popover-anchor included.
    expect(all(r).filter((f) => f.severity !== "review")).toEqual([]);
    expect(r.ok).toBe(true);
  }, 180_000);

  // The confirm page with no script (D-23), and the dialog open over the demo.
  test("the confirm page and the open dialog pass", async () => {
    const r = await audit(options([`${base}/dist/demo/pages/delete-site.en.html`, `${base}/dist/demo/?product=sitespring&open=delete-site`], { product: "sitespring", themes: ["light"] }), browser);
    expect(all(r).filter((f) => f.severity !== "review")).toEqual([]);
  }, 120_000);

  // Connect an agent (D-19), in SiteSpring's bar, with the copy buttons' script run.
  test("the connect panel passes, in Danish and English", async () => {
    const r = await audit(options([`${base}/dist/demo/pages/connect.da.html`, `${base}/dist/demo/pages/connect.en.html`], { product: "sitespring" }), browser);
    expect(r.pages).toHaveLength(8);
    expect(all(r)).toEqual([]);
    expect(r.ok).toBe(true);
  }, 120_000);
});

describe("signed-in and refusal pages", () => {
  const one = { widths: [1280], themes: ["light" as const] };

  test("--cookie-env's session reaches the page and its stylesheets and fonts; without it the page is a 401", async () => {
    const ok = await audit(options([`${base}/private/dist/demo/`], { ...one, cookie: SESSION }), browser);
    expect(all(ok).filter((f) => f.severity !== "review")).toEqual([]);
    const without = await audit(options([`${base}/private/dist/demo/`], one), browser);
    expect(all(without).map((f) => [f.rule, f.value])).toEqual([["page-load", "HTTP 401"]]);
  }, 60_000);

  test("a 403 fails unless --allow-status names it", async () => {
    const r = await audit(options([`${base}/status/403/dist/demo/`], one), browser);
    expect(all(r).map((f) => [f.rule, f.value])).toEqual([["page-load", "HTTP 403"]]);
    const allowed = await audit(options([`${base}/status/403/dist/demo/`], { ...one, allowStatus: [403] }), browser);
    expect(allowed.ok).toBe(true);
  }, 60_000);
});

describe("redirects", () => {
  const one = { widths: [1280], themes: ["light" as const] };

  test("a page that redirects is a page-load error, not an audit of wherever it led", async () => {
    const r = await audit(options([`${base}/redirect/dist/demo/`], { ...one, cookie: SESSION }), browser);
    expect(all(r).map((f) => [f.rule, f.value])).toEqual([["page-load", `redirected to ${base}/dist/demo/`]]);
  }, 60_000);

  test("a same-origin request redirected off-origin is a third-party error, though the route never saw it", async () => {
    const r = await audit(options([`${base}/hop-page`], one), browser);
    const hop = all(r).filter((f) => f.rule === "third-party");
    expect(hop.map((f) => [f.severity, f.value])).toEqual([["error", "http://127.0.0.1:1/hop.png"]]);
    expect(hop[0]!.note).toContain("redirect");
  }, 60_000);
});

describe("single-page apps (D-16)", () => {
  const one = { widths: [1280], themes: ["light" as const] };
  const spa = (q: string) => `${base}/test/fixtures/spa.html?${q}`;
  const errors = (r: AuditResult) => all(r).filter((f) => f.severity !== "review");

  test("by default the audit waits for the API call and the drawing it leads to, not just the load event", async () => {
    const r = await audit(options([spa(`api=${api}&tiny=1`)], { ...one, cookie: SESSION, allowOrigins: [api] }), browser);
    // The 10px paragraph is drawn only after the API answered, 600 ms after load.
    expect(errors(r).map((f) => [f.rule, f.selector])).toEqual([["text-min", "main#main > p.tiny"]]);
  }, 60_000);

  test("--wait-for and --allow-origin: the drawn page passes, and its API is not a third party", async () => {
    const r = await audit(options([spa(`api=${api}`)], { ...one, cookie: SESSION, allowOrigins: [api + "/"], waitFor: "#ready" }), browser);
    expect(errors(r)).toEqual([]);
    expect(r.ok).toBe(true);
  }, 60_000);

  test("without --allow-origin the API call is a third-party error, answered by the audit", async () => {
    const r = await audit(options([spa(`api=${api}`)], { ...one, cookie: SESSION }), browser);
    expect(errors(r).map((f) => [f.rule, f.value])).toEqual([["third-party", `${api}/api/me`]]);
  }, 60_000);

  test("the cookie reaches the allowed origin: without it the API refuses and --wait-for fails, naming the selector and page", async () => {
    const r = await audit(options([spa(`api=${api}`)], { ...one, allowOrigins: [api], waitFor: "#ready", waitTimeout: 2000 }), browser);
    expect(errors(r).map((f) => [f.rule, f.selector, f.value])).toEqual([["page-load", "#ready", `#ready not visible on ${spa(`api=${api}`)} after 2000 ms`]]);
    const bad = await audit(options([spa("late=0")], { ...one, waitFor: "!!" }), browser);
    expect(errors(bad).map((f) => [f.rule, f.selector])).toEqual([["page-load", "!!"]]);
  }, 60_000);

  test("--settle waits for a page that draws on a timer, with nothing in flight before it", async () => {
    const quick = await audit(options([spa("late=1200&tiny=1")], one), browser);
    expect(errors(quick)).toEqual([]);
    const settled = await audit(options([spa("late=1200&tiny=1")], { ...one, settle: 1500 }), browser);
    expect(errors(settled).map((f) => [f.rule, f.selector])).toEqual([["text-min", "main#main > p.tiny"]]);
  }, 60_000);

  test("a page that never goes quiet is measured after 10 s, with a review note", async () => {
    const start = Date.now();
    const r = await audit(options([spa("busy=1")], one), browser);
    expect(Date.now() - start).toBeLessThan(15_000);
    expect(r.ok).toBe(true);
    expect(all(r).filter((f) => f.rule === "page-load").map((f) => [f.severity, f.value])).toEqual([["review", "still changing 10 s after load"]]);
  }, 60_000);

  test("a static page settles quickly", async () => {
    const start = Date.now();
    await audit(options([`${base}/dist/demo/`], one), browser);
    // Well under the 10 s settle cap. The alignment measurer (D-66) takes about 2.5 s of it on the demo's
    // index as it is now; each closed menu's own pass (D-74) adds about 15 ms.
    expect(Date.now() - start).toBeLessThan(7_000);
  }, 60_000);
});

describe("the broken fixture", () => {
  let r: AuditResult;
  let found: (Finding & { width: number; theme: string })[];
  beforeAll(async () => {
    r = await audit(options([`${base}/test/fixtures/broken.html`]), browser);
    found = all(r);
  }, 120_000);
  const has = (rule: string, match: Partial<Finding> & { width?: number } = {}) =>
    expect(found.filter((f) => f.rule === rule && Object.entries(match).every(([k, v]) => (typeof v === "string" ? String(f[k as keyof Finding]).includes(v) : f[k as keyof typeof f] === v)))).not.toEqual([]);

  test("fails", () => {
    expect(r.ok).toBe(false);
    expect(r.pages).toHaveLength(4);
  });

  test("off-scale and tiny type", () => {
    has("font-size", { selector: "p.off-scale", value: "17px", severity: "error" });
    has("text-min", { selector: "p.tiny", value: "10px", severity: "error" });
  });

  test("low contrast, in both themes", () => {
    has("contrast", { selector: "p.faint", severity: "error", theme: "light" } as Partial<Finding>);
    has("contrast", { selector: "p.faint", severity: "error", theme: "dark" } as Partial<Finding>);
  });

  test("an odd radius and off-grid padding", () => {
    has("radius", { selector: "div.card.odd-radius", value: "5px" });
    has("spacing", { selector: "div.off-grid", value: "7px", note: "padding-top" });
  });

  test("a 16 px button: under 24 px everywhere, under 44 px on a phone", () => {
    has("target-size", { selector: "button.mini", value: "16x16px", width: 1280 });
    has("target-primary", { selector: "button.mini", width: 380 });
    expect(found.filter((f) => f.rule === "target-primary" && f.width === 1280)).toEqual([]);
  });

  test("third-party requests: the font CSS and the script, answered by the audit, never fetched", () => {
    has("third-party", { value: "https://fonts.googleapis.com/css2?family=Inter" });
    has("third-party", { value: "https://cdn.example.com/analytics.js", selector: "script" });
  });

  test("a script file over the default budget of 0", () => {
    has("js-budget", { severity: "error", value: "in 1 file" });
  });

  test("a font outside the family, and a colour outside the palette", () => {
    has("font-family", { selector: "p.inter", value: "Inter", severity: "error" });
    has("palette", { selector: "p.faint", value: "#bbbbbb", severity: "warning" });
    has("palette", { selector: "p.faint", value: "#444444", severity: "warning" });
  });

  test("axe: an image with no text alternative", () => {
    has("axe", { value: "image-alt", severity: "error" });
  });
});

// The label's ink (D-42). Peter found day chips with the words 2 px high that the old line-box measure
// passed. The measure (cap top to baseline, from the DOM) must be what a screenshot shows, and ui's
// fonts must centre it.
// own-org-list (D-59): an org list the page draws itself, outside the package's data-forspring-org-list.
describe("own-org-list", () => {
  test("a hand-drawn list of org links, a select of orgs and radios named org are errors; the package's list and one org's pages are not", async () => {
    const r = await audit(options([`${base}/test/fixtures/own-org-list.html`], { widths: [1280], themes: ["light"] }), browser);
    const own = all(r).filter((f) => f.rule === "own-org-list");
    expect(own.map((f) => [f.selector, f.value, f.severity]).sort()).toEqual([
      ["fieldset#radios", "2 organisations as choices, drawn by the page", "error"],
      ["section#links > ul", "2 organisations as links, drawn by the page", "error"],
      ["form#sel > select", "2 organisations as a select, drawn by the page", "error"],
    ].sort());
  }, 60_000);

  test("the package's org lists pass: the picker in both modes' demo, choose an org", async () => {
    const r = await audit(options([`${base}/dist/demo/pages/org-picker.en.html`, `${base}/dist/demo/pages/choose-org.en.html`], { widths: [1280], themes: ["light"] }), browser);
    expect(all(r).filter((f) => f.rule === "own-org-list")).toEqual([]);
  }, 60_000);
});

describe("the label's ink (D-42)", () => {
  test("control-text-centre's band is the screenshot's ink rows, within a pixel, and ui's controls pass", async () => {
    const page = await browser.newPage({ viewport: { width: 800, height: 600 }, deviceScaleFactor: 1 });
    try {
      await page.goto(`${base}/test/fixtures/ink.html`);
      await page.evaluate(() => document.fonts.ready.then(() => undefined));
      const { texts } = await page.evaluate(collectLayout);
      // Each label's text span across, so a chevron or an icon beside it is not counted.
      const spans = await page.evaluate(() =>
        [...document.querySelectorAll("main button, main a.button, main a.chip, main summary")].map((el) => {
          const n = [...el.childNodes].find((c) => c.nodeType === 3 && (c.textContent ?? "").trim())!;
          const r = document.createRange();
          r.selectNodeContents(n);
          const q = r.getBoundingClientRect();
          return { x0: Math.ceil(q.left), x1: Math.floor(q.right), y0: Math.floor(el.getBoundingClientRect().top), y1: Math.ceil(el.getBoundingClientRect().bottom) };
        }),
      );
      expect(texts).toHaveLength(spans.length);
      // Ink is what changes when the words go transparent.
      const shot = async () => (await page.screenshot()).toString("base64");
      const before = await shot();
      await page.addStyleTag({ content: "main * { color: transparent !important; }" });
      const after = await shot();
      const rows = await page.evaluate(
        async ({ before, after, spans }) => {
          const load = async (b64: string) => {
            const img = new Image();
            img.src = `data:image/png;base64,${b64}`;
            await img.decode();
            const c = document.createElement("canvas");
            [c.width, c.height] = [img.width, img.height];
            const g = c.getContext("2d")!;
            g.drawImage(img, 0, 0);
            return g.getImageData(0, 0, img.width, img.height);
          };
          const [a, b] = [await load(before), await load(after)];
          return spans.map(({ x0, x1, y0, y1 }) => {
            let [top, bottom] = [-1, -1];
            for (let y = y0; y < y1; y++)
              for (let x = x0; x < x1; x++) {
                const o = (y * a.width + x) * 4;
                if (Math.abs(a.data[o]! - b.data[o]!) + Math.abs(a.data[o + 1]! - b.data[o + 1]!) + Math.abs(a.data[o + 2]! - b.data[o + 2]!) > 96) {
                  if (top < 0) top = y;
                  bottom = y + 1;
                  break;
                }
              }
            return { top, bottom };
          });
        },
        { before, after, spans },
      );
      texts.forEach((t, i) => {
        expect(Math.abs(rows[i]!.top - t.inkTop), `${t.selector} top`).toBeLessThanOrEqual(1);
        expect(Math.abs(rows[i]!.bottom - t.inkBottom), `${t.selector} baseline`).toBeLessThanOrEqual(1);
      });
      expect(layoutFindings({ controls: [], composite: [], texts, stacks: [], regions: [], clips: [] }, layoutScale(tokens.rhythm, tokens.space))).toEqual([]);
    } finally {
      await page.close();
    }
  });

  // 0.28.1: the account's pages on 0.28.0 found two in ui's own CSS: the org switcher's two-line
  // summary 1.2px nearer its top, and a back link over a section 72px apart (inline-block margins add).
  test("ui's org switcher and a back link over a section pass the basics, light and dark", async () => {
    const r = await audit(options([`${base}/test/fixtures/basics.html`], { widths: [1280] }), browser);
    expect(all(r).filter((f) => ["control-text-centre", "off-scale", "clip"].includes(f.rule))).toEqual([]);
  }, 60_000);

  test("with fontFaces' metrics Archivo's cap band sits within half a pixel of a centred line, 11 to 24 px on lines of 1 to 1.7", async () => {
    const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
    try {
      await page.goto(`${base}/test/fixtures/ink.html`);
      const offs = await page.evaluate(async (faces) => {
        document.head.innerHTML = `<style>${faces} body { margin: 0; } div { display: inline-flex; align-items: center; padding: 8px 6px; border: 1px solid; margin: 2px; font-family: Archivo; font-weight: 600; }</style>`;
        const cases: [number, number][] = [];
        for (let s = 11; s <= 24; s++) for (let l = s; l <= Math.ceil(s * 1.7); l++) cases.push([s, l]);
        document.body.innerHTML = cases.map(([s, l]) => `<div style="font-size: ${s}px; line-height: ${l}px">Hb ${s}/${l}</div>`).join("");
        await document.fonts.load("600 14px Archivo");
        await document.fonts.ready;
        const g = document.createElement("canvas").getContext("2d")!;
        return [...document.querySelectorAll("div")].map((d, i) => {
          g.font = `600 ${cases[i]![0]}px Archivo`;
          const m = g.measureText("H");
          const r = document.createRange();
          r.selectNodeContents(d.firstChild!);
          const base = r.getClientRects()[0]!.top + m.fontBoundingBoxAscent;
          const box = d.getBoundingClientRect();
          return { c: cases[i]!.join("/"), off: base - m.actualBoundingBoxAscent / 2 - (box.top + box.bottom) / 2 };
        });
      }, fontFaces("/fonts/"));
      expect(offs).toHaveLength(192);
      expect(offs.filter((o) => Math.abs(o.off) > 0.51)).toEqual([]);
    } finally {
      await page.close();
    }
  });
});

// D-66: the vendored alignment measurer. Only a shared edge or a single-line shared baseline 2 px or
// more off fails the run; text inside a control is not measured against a wordmark; the red-line
// report holds a 2x crop of each finding.
describe("alignment red-lines (D-66)", () => {
  let r: AuditResult;
  let dir: string;
  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), "ui-redlines-"));
    r = await audit(options([`${base}/test/fixtures/alignment.html`], { widths: [1280], themes: ["light"], redlines: dir }), browser);
  }, 60_000);
  afterAll(() => rmSync(dir, { recursive: true, force: true }));
  test("without --redlines a run carries only the errors", async () => {
    const plain = await audit(options([`${base}/test/fixtures/alignment.html`], { widths: [1280], themes: ["light"] }), browser);
    expect(all(plain).filter((f) => f.rule.startsWith("alignment-")).every((f) => f.severity === "error")).toBe(true);
  }, 60_000);
  const of = (sev: string) => all(r).filter((f) => f.rule.startsWith("alignment-") && f.severity === sev).map((f) => `${f.rule} ${f.selector}`).sort();

  test("a 3 px edge and a 4 px baseline between plain texts fail the run", () => {
    expect(of("error").filter((s) => !s.includes("details#menu"))).toEqual(['alignment-shared-baseline div#baseline "Wordmarksub"', 'alignment-shared-edge div#edge > p "Off by three"', "alignment-symbol-line div#symbol-off.row > span.signal-mark"]);
    expect(all(r).some((f) => f.rule === "alignment-symbol-line" && f.selector.includes("symbol-ok"))).toBe(false);
    expect(r.ok).toBe(false);
  });

  test("a 1 px edge and a control's label beside a wordmark are for a person to look at; a row on one baseline is not reported", () => {
    expect(of("review")).toEqual(expect.arrayContaining(['alignment-shared-baseline div#baseline-control "WordmarkSwitch"', 'alignment-shared-edge div#edge-small > p "Off by one"']));
    expect(all(r).some((f) => f.rule === "alignment-shared-baseline" && f.selector.startsWith("div#baseline-ok"))).toBe(false);
  });

  // D-74: what a sighted reader sees is what is measured.
  test("a label only a screen reader reads is not ink, and a divider's section is not a box", () => {
    expect(all(r).some((f) => f.rule.startsWith("alignment-") && f.selector.includes("sr-close"))).toBe(false);
    expect(all(r).some((f) => f.rule.startsWith("alignment-") && f.selector.includes("p#foot"))).toBe(false);
    expect(of("review")).toContain('alignment-ink-centre div.row > span#ink-off "Badge"');
  });

  test("a fault in a closed menu is measured, once, with the menu open, and its crop shows it", async () => {
    expect(of("error").filter((s) => s.includes("details#menu"))).toEqual(['alignment-shared-edge details#menu > div.card > p "Off by three"']);
    const html = readFileSync(join(dir, "index.html"), "utf8");
    const name = new RegExp(`details#menu[^<]*</code><br>[^<]*</figcaption><img src="(\\d+\\.png)"`).exec(html.replace(/&gt;/g, ">").replace(/&quot;/g, '"'))![1]!;
    // The crop shows the menu's words, not a blank: dark text pixels on it.
    const page = await browser.newPage();
    const dark = await page.evaluate(async (src) => {
      const img = new Image();
      img.src = src;
      await img.decode();
      const c = document.createElement("canvas");
      [c.width, c.height] = [img.width, img.height];
      const g = c.getContext("2d")!;
      g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height).data;
      let n = 0;
      for (let i = 0; i < d.length; i += 4) if (d[i]! < 80 && d[i + 1]! < 80 && d[i + 2]! < 80) n++;
      return n;
    }, `data:image/png;base64,${readFileSync(join(dir, name)).toString("base64")}`);
    await page.close();
    expect(dark).toBeGreaterThan(200);
  });

  test("the red-line report: a page naming each finding and a 2x crop beside it", () => {
    const html = readFileSync(join(dir, "index.html"), "utf8");
    expect(html).toContain("<title>Alignment red-lines</title>");
    expect(html).toContain("raphaelsalaja/skill aa9f452");
    expect(html).toContain("Fails the run");
    const png = readFileSync(join(dir, "1.png"));
    expect(png.subarray(1, 4).toString()).toBe("PNG");
    // 2x: the crop's pixel width is twice the width the page shows it at.
    const shown = Number(/<img src="1\.png"[^>]* width="(\d+)"/.exec(html)![1]);
    expect(png.readUInt32BE(16)).toBe(shown * 2);
    // D-79: the page as audited, light, at each width: the picture for a finding with no crop of its own.
    expect(html).toContain("The pages as audited");
    const jpeg = readFileSync(join(dir, "page-1.jpg"));
    expect([jpeg[0], jpeg[1]]).toEqual([0xff, 0xd8]);
  });
});

// D-78: every button that draws a box is one of the inventory's shapes; and a page that leaves by script ends its own
// audit, not the run.
describe("button-shape and a script redirect (D-78)", () => {
  test("ui's buttons pass; a size of its own and the default box with 16px type are warnings, naming what is off", async () => {
    const r = await audit(options([`${base}/test/fixtures/button-shapes.html`]), browser);
    const at = (w: number) => [...new Set(all(r).filter((f) => f.rule === "button-shape" && f.width === w).map((f) => `${f.severity} ${f.selector} | ${f.value}`))].sort();
    expect(at(1280)).toEqual(["warning a#bigtype | nearest the default size: type 16px (14)", "warning button#odd | nearest the default size: padding x 10px (20), padding y 6px (12)"]);
    expect(at(380).map((x) => x.split(" | ")[0])).toEqual(["warning a#bigtype", "warning button#odd"]);
  }, 120_000);
  test("the button inventory is the table: none of its buttons is off a shape, at either width, in either theme", async () => {
    const r = await audit(options([`${base}/dist/demo/buttons.html`], { budgetJs: 20 * 1024 }), browser);
    expect(all(r).filter((f) => f.rule === "button-shape").map((f) => `${f.width} ${f.selector} ${f.value}`)).toEqual([]);
  }, 120_000);
  test("with a session, two pages in a row that bounce away stop the run (D-79): no sign-in started for each page left", async () => {
    const r = await audit(options([`${base}/redirect/test/fixtures/alignment.html`, `${base}/redirect/test/fixtures/layout.html`, `${base}/test/fixtures/alignment.html`], { widths: [1280], themes: ["light"], cookie: "session=abcdefgh" }), browser);
    expect(r.pages).toHaveLength(2);
    expect(r.pages[1]!.findings.map((f) => f.value)).toContain("stopped: two pages in a row bounced away");
  }, 120_000);
  test("a page that leaves by script after load is a page-load error for it; the other pages are still audited", async () => {
    const r = await audit(options([`${base}/test/fixtures/script-redirect.html`, `${base}/test/fixtures/button-shapes.html`], { widths: [1280], themes: ["light"] }), browser);
    expect(r.pages).toHaveLength(2);
    expect(r.pages[0]!.findings.map((f) => [f.rule, f.value])).toContainEqual(["page-load", `left for ${base}/test/fixtures/alignment.html after load`]);
    expect(r.pages[1]!.findings.some((f) => f.rule === "button-shape")).toBe(true);
  }, 120_000);
});

// D-77: a page where one click gives consent is never framed and never stored.
describe("consent-headers (D-77)", () => {
  const run = async (kind: string) => all(await audit(options([`${base}/consent/${kind}`], { widths: [1280], themes: ["light"] }), browser)).filter((f) => f.rule === "consent-headers");
  test("a choice list answered without them fails, naming what is missing; with consentHeaders() it passes", async () => {
    expect((await run("open")).map((f) => [f.severity, f.value])).toEqual([["error", "CSP frame-ancestors 'self'; Cache-Control missing"]]);
    expect((await run("framed")).map((f) => f.value)).toEqual(["CSP frame-ancestors 'self'"]);
    expect(await run("safe")).toEqual([]);
  }, 60_000);
  test("a sample whose rows post to # gives nothing and is not held", async () => {
    expect(await run("sample")).toEqual([]);
  }, 60_000);
});

// A marketing page on text.marketing (D-22): on scale only when the run asks for that ladder (D-29).
describe("the layout rules in a browser (D-41, D-42)", () => {
  let found: Finding[];
  beforeAll(async () => {
    const r = await audit(options([`${base}/test/fixtures/layout.html`], { widths: [1280], themes: ["light"] }), browser);
    found = all(r).filter((f) => ["control-gap", "control-text-centre", "stack-rhythm", "popover-anchor", "surface-distinct", "off-scale", "clip", "menu-row-inset"].includes(f.rule));
  }, 60_000);
  const of = (rule: string) => found.filter((f) => f.rule === rule).map((f) => f.selector);

  test("D-41's taste rules are warnings; D-42's basics (centred labels, the space scale, nothing cut) are errors", () => {
    const by = (rules: string[]) => found.filter((f) => rules.includes(f.rule));
    expect(by(["control-gap", "stack-rhythm", "popover-anchor", "surface-distinct"]).every((f) => f.severity === "warning")).toBe(true);
    expect(by(["control-text-centre", "off-scale", "clip"]).length).toBeGreaterThan(0);
    expect(by(["control-text-centre", "off-scale", "clip"]).every((f) => f.severity === "error")).toBe(true);
  });

  test("off-scale: 36px between two siblings; a browser's own heading margin (18.7px) in a section; not space shared out", () => {
    expect(of("off-scale").sort()).toEqual(["div#offscale", "section#divided", "section#painted", "section#plain"]);
  });

  test("clip: cut across and down, out of a painted box, past the window, a scroller with more below and no cue; not an ellipsis, a line clamp, a scroller with a local shadow or one sideways", () => {
    expect(found.filter((f) => f.rule === "clip").map((f) => [f.selector, f.value]).sort()).toEqual([
      ["div#cut", expect.stringMatching(/^"A label far too long for its box" cut by [\d.]+px at the end$/)],
      ["div#cutdown", expect.stringMatching(/cut by [\d.]+px at the bottom$/)],
      ["div#scrolly", expect.stringMatching(/^[\d.]+px more below, and nothing shows it$/)],
      ["div#wide", expect.stringMatching(/^1\d\d(\.\d)?px past the window's end$/)],
      ["span#spill", expect.stringMatching(/^"Overflowing chip" out of its box by [\d.]+px at the end$/)],
    ]);
  });

  test("control-gap: Save on Remove in different containers", () => {
    expect(of("control-gap")).toEqual(["button#save | button#remove"]);
  });

  test("control-text-centre: a label at the top of its box; an icon with a hidden label is measured by its glyph; descenders do not count", () => {
    expect(of("control-text-centre")).toEqual(["a#offcentre"]);
  });

  test("stack-rhythm: the odd gap of three", () => {
    expect(found.filter((f) => f.rule === "stack-rhythm").map((f) => [f.selector, f.value])).toEqual([["div#stack", "12px between div#stack > p and div#stack > p"]]);
  });

  test("surface-distinct: (1) the nearest painted ground, (2) four sides or nothing, (3) a pane paints, (4) nested cards skipped; a plain section is no region", () => {
    expect(of("surface-distinct").sort()).toEqual(["aside#divider", "div#clear", "div#flat", "section#painted"]);
  });

  test("popover-anchor: the probe opens each menu, a script-driven one found by aria-controls, and reports a popover with no trigger", () => {
    expect(found.filter((f) => f.rule === "popover-anchor").map((f) => [f.selector, f.value.split(";")[0]]).sort()).toEqual([
      ["details#far > div (trigger details#far > summary)", expect.stringMatching(/^\d+(\.\d)?px below its trigger$/)],
      ["div#menu2 (trigger button#ctrl)", expect.stringMatching(/px (below|above) its trigger|outside its trigger's inline span/)],
      ["div#orphan", "no trigger found"],
    ]);
  });

  test("menu-row-inset (D-76): in an open menu, a button 4px further in than the rows fails; one inset, or a content disclosure, passes", () => {
    expect(found.filter((f) => f.rule === "menu-row-inset").map((f) => [f.selector, f.severity, f.value])).toEqual([
      ["div > form > button (in details#inset-bad > div)", "error", "inset 8px at the start and 8px at the end; the menu's other rows 4px and 4px"],
    ]);
  });

  test("composites: a clear button in an input's box, an icon button in a combobox's wrapper, a framed segmented group", () => {
    expect(found.filter((f) => f.rule === "control-gap" && /#(q|clearq|combo|comboopen)\b|#seg/.test(f.selector))).toEqual([]);
  });
});

describe("the marketing ladder", () => {
  const url = () => `${base}/test/fixtures/marketing.html`;

  test("a page on the marketing ladder passes with --marketing, fluid steps between their tokens", async () => {
    const r = await audit(options([url()], { marketing: true, product: "sitespring" }), browser);
    expect(r.pages).toHaveLength(4);
    expect(all(r)).toEqual([]);
    expect(r.ok).toBe(true);
  }, 120_000);

  test("without it, the same page fails on every marketing size off the other two ladders", async () => {
    const r = await audit(options([url()], { product: "sitespring" }), browser);
    expect(r.ok).toBe(false);
    const sizes = all(r).filter((f) => f.rule === "font-size");
    expect(sizes.every((f) => f.severity === "error")).toBe(true);
    // At 1280: the hero at 5vw is 64 px, the h2 at 2.6vw 33.28 px; at 380 they sit at their minimums.
    const at = (width: number) => [...new Set(sizes.filter((f) => f.width === width).map((f) => `${f.selector} ${f.value}`))].sort();
    expect(at(1280)).toEqual(["main#main > h1.hero 64px", "main#main > h2.section 33.28px", "main#main > h3.feature 24px", "main#main > p.lede 20px"]);
    expect(at(380)).toEqual(["main#main > h1.hero 48px", "main#main > h3.feature 24px", "main#main > p.lede 20px"]);
  }, 120_000);
});

// A rich React app on shadcn (D-33): the stock components on @forspring/ui/shadcn.css pass; the same
// app with its copies restyled fails, under --rich-app, on each part, though every value is a token.
describe("a rich app's primitives (--rich-app)", () => {
  const slotOf = (f: Finding) => /data-slot="([^"]+)"\]$/.exec(f.selector)?.[1];

  test("shadcn's markup with its stock utilities, on theme.css and shadcn.css, passes at both widths and themes", async () => {
    const r = await audit(options([`${base}/test/fixtures/shadcn.html`], { richApp: true, product: "dataspring" }), browser);
    expect(r.pages).toHaveLength(4);
    expect(all(r)).toEqual([]);
    expect(r.ok).toBe(true);
  }, 120_000);

  test("restyled copies fail on every off-family radius, height and size, naming the slot; without the flag they pass", async () => {
    const desk = { widths: [1280], themes: ["light" as const] };
    const without = await audit(options([`${base}/test/fixtures/shadcn-drift.html`], desk), browser);
    expect(all(without).filter((f) => f.severity !== "review")).toEqual([]);

    const r = await audit(options([`${base}/test/fixtures/shadcn-drift.html`], { ...desk, richApp: true }), browser);
    expect(r.ok).toBe(false);
    const found = all(r);
    expect(found.every((f) => f.rule === "primitive" && f.severity === "error")).toBe(true);
    expect(found.map((f) => `${slotOf(f)}: ${f.value} (expected ${f.expected})`).sort()).toEqual([
      "badge: border-radius 6px (expected a pill (999px))",
      "button: border-radius 8px (expected 3px (--radius-button))",
      "button: font-size 14px (expected 15px (--text-content-body))",
      "button: min-height 36px, 36px tall (expected min-height 44px (--control-height))",
      "card: border-radius 10px (expected 6px (--radius-card))",
      "dialog-content: border-radius 6px (expected 10px (--radius-panel))",
      "dialog-title: font-size 18px (expected 21px (--text-content-h2))",
      "input: border-radius 3px (expected 8px (--radius-input))",
      "table-cell: font-size 12px (expected 14px (--text-chrome-body))",
    ]);
  }, 120_000);
});

describe("rules on measurements", () => {
  const sc = { sizes: [11, 12, 13, 14, 15, 16, 18, 21, 30, 40], h1: [30, 40] as [number, number], radii: [0, 3, 6, 8, 10], palette: [[252, 252, 250]] as [number, number, number][], allowSpacing: [6] };
  const box = (o: object) => ({ selector: "div", gsi: false, radii: ["0px", "0px", "0px", "0px"], spacing: [], colours: [], ...o });
  const run = (o: object, scale: Parameters<typeof findings>[1] = sc) => findings({ texts: [], boxes: [], smallTargets: [], primaries: [], fonts: [], slots: [], ...o }, scale, 1280);

  test("radius: pills, 50% and the four tokens pass; anything else fails", () => {
    expect(run({ boxes: [box({ radii: ["999px", "50%", "3px", "10px 6px"] })] })).toEqual([]);
    expect(run({ boxes: [box({ radii: ["4px", "0px", "25%", "0px"] })] }).map((f) => f.value)).toEqual(["4px 25%"]);
  });

  test("spacing: multiples of 4 (negative too) and the allowlist pass", () => {
    expect(run({ boxes: [box({ spacing: [{ prop: "margin-top", px: -4 }, { prop: "gap", px: 6 }, { prop: "padding-left", px: 64 }] })] })).toEqual([]);
    expect(run({ boxes: [box({ spacing: [{ prop: "padding-left", px: 7.5 }] })] }).map((f) => f.value)).toEqual(["7.5px"]);
  });

  test("type: h1 is fluid between its steps, other text is not; Google's button keeps Roboto", () => {
    const text = (o: object) => ({ selector: "p", size: 15, weight: 400, family: "Archivo", h1: false, gsi: false, disabled: false, fg: [20, 21, 26, 1], bg: [252, 252, 250], ...o });
    expect(run({ texts: [text({ h1: true, size: 34.5 })] })).toEqual([]);
    expect(run({ texts: [text({ size: 34.5 })] }).map((f) => f.rule)).toEqual(["font-size"]);
    expect(run({ texts: [text({ gsi: true, family: "Roboto GSI", size: 14 })] })).toEqual([]);
    expect(run({ texts: [text({ family: "Roboto" })] }).map((f) => f.note)).toEqual(["Roboto belongs inside Google's button (.gsi) only"]);
  });

  test("type: the marketing ladder is on scale only when asked for, its fluid steps as ranges (D-29)", () => {
    const text = (o: object) => ({ selector: "p", size: 15, weight: 400, family: "Archivo", h1: false, gsi: false, disabled: false, fg: [20, 21, 26, 1], bg: [252, 252, 250], ...o });
    const ladder = marketingLadder(tokens.text.marketing);
    expect(ladder.ranges).toEqual([[30, 36], [48, 72]]);
    const marketing = { ...sc, sizes: [...new Set([...sc.sizes, ...ladder.sizes])].sort((x, y) => x - y), ranges: ladder.ranges, marketing: true };
    const texts = [20, 24, 33.28, 60].map((size) => text({ size }));
    expect(run({ texts }, marketing)).toEqual([]);
    expect(run({ texts }).map((f) => f.value)).toEqual(["20px", "24px", "33.28px", "60px"]);
    // Between the ranges is still off scale.
    expect(run({ texts: [text({ size: 42 })] }, marketing).map((f) => f.expected)).toEqual(["11, 12, 13, 14, 15, 16, 18, 20, 21, 24, 30, 36, 40, 48, 72 px, 30 to 36 px, 48 to 72 px"]);
  });

  test("primitives: a slot's own token, the small size, the touch floor on a phone, a pill (D-33)", () => {
    const rich = { radius: tokens.radius, control: tokens.control, space: tokens.space, text: tokens.text };
    const slot = (o: object) => ({ selector: "button", slot: "button", size: "default", radii: ["3px", "3px", "3px", "3px"], minHeight: 44, height: 44, fontSize: 15, ...o });
    const check = (o: object, width = 1280) => primitives([slot(o)], rich, width).map((f) => `${f.value} / ${f.expected}`);
    expect(check({})).toEqual([]);
    // A 6px radius is a token, so the generic rule passes it; on a button it is the card's.
    expect(check({ radii: ["6px", "6px", "6px", "6px"] })).toEqual(["border-radius 6px / 3px (--radius-button)"]);
    expect(check({ size: "sm", minHeight: 32, height: 32, fontSize: 13 })).toEqual([]);
    expect(check({ size: "icon-sm", minHeight: 32, height: 32, fontSize: 13 })).toEqual([]);
    expect(check({ size: "sm", minHeight: 32, height: 32, fontSize: 13 }, 380)).toEqual(["min-height 32px, 32px tall / min-height 44px (--control-touch, on a phone)"]);
    // A min-height can be right while a fixed height under it is not, and the other way round.
    expect(check({ height: 36 })).toEqual(["min-height 44px, 36px tall / min-height 44px (--control-height)"]);
    expect(check({ minHeight: 48, height: 48 })).toEqual(["min-height 48px, 48px tall / min-height 44px (--control-height)"]);
    expect(check({ slot: "badge", size: null, radii: ["33554400px", "33554400px", "33554400px", "33554400px"], minHeight: 20, height: 20, fontSize: 11 })).toEqual([]);
    expect(check({ slot: "badge", size: null, radii: ["50%", "50%", "50%", "50%"], minHeight: 20, height: 20, fontSize: 11 })).toEqual(["border-radius 50% / a pill (999px)"]);
    // A slot the family does not fix is the app's.
    expect(check({ slot: "card-header", radii: ["4px", "0px", "0px", "0px"], fontSize: 17 })).toEqual([]);
    expect(Object.keys(RICH_SLOTS)).toContain("dialog-content");
  });

  test("primitives are checked only under --rich-app", () => {
    const slots = [{ selector: "button", slot: "button", size: null, radii: ["8px", "8px", "8px", "8px"], minHeight: 36, height: 36, fontSize: 14 }];
    expect(run({ slots })).toEqual([]);
    const rich = { ...sc, rich: { radius: tokens.radius, control: tokens.control, space: tokens.space, text: tokens.text } };
    expect(run({ slots }, rich).map((f) => f.rule)).toEqual(["primitive", "primitive", "primitive"]);
  });

  test("contrast: large text needs 3:1, alpha is composited, disabled text is exempt", () => {
    const text = (o: object) => ({ selector: "p", size: 15, weight: 400, family: "Archivo", h1: false, gsi: false, disabled: false, bg: [255, 255, 255], ...o });
    // #949494 on white is 3.03:1.
    expect(run({ texts: [text({ fg: [148, 148, 148, 1], size: 30 })] })).toEqual([]);
    expect(run({ texts: [text({ fg: [148, 148, 148, 1] })] }).map((f) => f.rule)).toEqual(["contrast"]);
    expect(run({ texts: [text({ fg: [0, 0, 0, 0.3] })] }).map((f) => f.rule)).toEqual(["contrast"]);
    expect(run({ texts: [text({ fg: [148, 148, 148, 1], disabled: true })] })).toEqual([]);
  });

  test("dedupe counts repeats and puts errors first", () => {
    const f = (severity: Finding["severity"]): Finding => ({ rule: "spacing", severity, selector: "li", value: "6px", expected: "", note: "" });
    expect(dedupe([f("review"), f("error"), f("error")])).toEqual([{ ...f("error"), count: 2 }, f("review")]);
  });
});

describe("layout rules on measurements (D-41, D-42)", () => {
  const t = layoutScale(tokens.rhythm, tokens.space);
  const none: LayoutObservations = { controls: [], composite: [], texts: [], stacks: [], regions: [], clips: [] };
  const run = (o: Partial<LayoutObservations>) => layoutFindings({ ...none, ...o }, t);
  const b = (x: number, y: number, w: number, h: number) => ({ x, y, w, h });

  test("the thresholds come from the rhythm and space tokens", () => {
    expect(t.rhythm).toEqual([4, 8, 16, 24, 48]);
    expect(t.space).toEqual([4, 8, 12, 16, 20, 24, 28, 32, 40, 44, 48, 64]);
    expect(t.minGap).toBe(8);
    expect([t.anchorGap, t.fillStep, t.borderStep]).toEqual([8, 0.02, 0.04]);
  });

  test("control-gap: 8px apart passes, side by side or stacked; touching, overlapping and 4px fail, one finding per pair", () => {
    const pair = (second: ReturnType<typeof b>) => run({ controls: [{ selector: "button.a", box: b(0, 0, 80, 44) }, { selector: "button.b", box: second }] });
    expect(pair(b(88, 0, 80, 44))).toEqual([]);
    expect(pair(b(0, 52, 80, 44))).toEqual([]);
    // Saves in different containers count too: only the boxes matter.
    expect(pair(b(0, 44, 120, 44)).map((f) => [f.rule, f.selector, f.value])).toEqual([["control-gap", "button.a | button.b", "touching (0px, one above the other)"]]);
    expect(pair(b(84, 0, 80, 44)).map((f) => f.value)).toEqual(["4px apart, side by side"]);
    expect(pair(b(70, 10, 80, 44)).map((f) => f.value)).toEqual(["overlapping (-10px, overlapping)"]);
    // Diagonal neighbours overlap on neither axis.
    expect(pair(b(82, 46, 80, 44))).toEqual([]);
  });

  test("control-gap: a composite's parts are one control", () => {
    const controls = [{ selector: "input", box: b(0, 0, 200, 44) }, { selector: "button.clear", box: b(160, 6, 32, 32) }];
    expect(run({ controls }).length).toBe(1);
    expect(run({ controls, composite: [[0, 1]] })).toEqual([]);
  });

  test("control-text-centre: the ink (cap top to baseline) in the middle of the padding box; above and below within 1px; several lines use their union; an error", () => {
    const text = (top: number, bottom: number, lines = 1) => ({ selector: "summary", inkTop: top, inkBottom: bottom, lines, boxTop: 1, boxBottom: 31 });
    // 11 above, 10 below: half a pixel off, the closest whole pixels allow.
    expect(run({ texts: [text(12, 21)] })).toEqual([]);
    expect(run({ texts: [text(11, 21)] })).toEqual([]);
    // Peter's day chip (D-42): 8 above, 12 below in a 31px box.
    const chip = run({ texts: [{ selector: "a.chip", inkTop: 8, inkBottom: 19, lines: 1, boxTop: 0, boxBottom: 31 }] });
    expect(chip.map((f) => [f.severity, f.value])).toEqual([["error", "8px above the label, 12px below"]]);
    expect(run({ texts: [text(10, 20)] }).map((f) => f.value)).toEqual(["9px above the label, 11px below"]);
    expect(run({ texts: [text(4, 22, 2)] }).map((f) => f.value)).toEqual(["3px above the label, 9px below (2 lines)"]);
  });

  test("off-scale: a gap on the space scale (within 1px) or none passes; 36px fails; a grid's or shared-out gaps are not measured; an error", () => {
    const pair = (gap: number, laidOut = false, axis: "block" | "inline" = "block") => run({ stacks: [{ selector: "div.s", axis, laidOut, children: [{ selector: "a", box: b(0, 0, 100, 20), autoBefore: false, autoAfter: false }, axis === "block" ? { selector: "b", box: b(0, 20 + gap, 100, 20), autoBefore: false, autoAfter: false } : { selector: "b", box: b(100 + gap, 0, 100, 20), autoBefore: false, autoAfter: false }] }] }).filter((f) => f.rule === "off-scale");
    expect(pair(0)).toEqual([]);
    expect(pair(16)).toEqual([]);
    expect(pair(16.8)).toEqual([]);
    expect(pair(17.2, false, "inline").map((f) => [f.severity, f.value])).toEqual([["error", "17.2px between a and b"]]);
    expect(pair(36).map((f) => f.value)).toEqual(["36px between a and b"]);
    expect(pair(36, true)).toEqual([]);
  });

  test("clip: cut, spill and viewport findings say what and where; errors", () => {
    const f = run({ clips: [
      { selector: "div.name", kind: "cut", by: 12.5, sides: ["end"], text: "Bager Hansen ApS" },
      { selector: "a.chip", kind: "spill", by: 3, sides: ["bottom"], text: "Mon 17" },
      { selector: "div.table", kind: "viewport", by: 40, sides: ["end"], text: "" },
      { selector: "div.day-grid", kind: "scroll", by: 212, sides: ["bottom"], text: "" },
    ] });
    expect(f.map((x) => [x.rule, x.severity, x.selector, x.value])).toEqual([
      ["clip", "error", "div.name", '"Bager Hansen ApS" cut by 12.5px at the end'],
      ["clip", "error", "a.chip", '"Mon 17" out of its box by 3px at the bottom'],
      ["clip", "error", "div.table", "40px past the window's end"],
      ["clip", "error", "div.day-grid", "212px more below, and nothing shows it"],
    ]);
  });

  test("stack-rhythm: equal gaps pass, rhythm tokens pass, one odd gap fails naming both neighbours", () => {
    const stack = (...ys: [number, number][]) => ({ selector: "main", axis: "block" as const, laidOut: false, children: ys.map(([y, h], i) => ({ selector: `p${i}`, box: b(0, y, 300, h), autoBefore: false, autoAfter: false })) });
    expect(run({ stacks: [stack([0, 20], [32, 20], [64, 20])] })).toEqual([]);
    expect(run({ stacks: [stack([0, 40], [56, 20], [100, 20], [144, 30])] })).toEqual([]);
    expect(run({ stacks: [stack([0, 40], [56, 20], [88, 20])] }).map((f) => f.value)).toEqual(["12px between p1 and p2"]);
  });

  test("stack-rhythm: an auto margin's far end and another line of a wrapped row are not rhythm gaps", () => {
    const row = { selector: "div.actions", axis: "inline" as const, laidOut: false, children: [
      { selector: "a", box: b(0, 0, 80, 44), autoBefore: false, autoAfter: false },
      { selector: "b", box: b(88, 0, 80, 44), autoBefore: false, autoAfter: false },
      { selector: "c", box: b(600, 0, 80, 44), autoBefore: true, autoAfter: false },
      { selector: "d", box: b(0, 52, 80, 44), autoBefore: false, autoAfter: false },
    ] };
    expect(run({ stacks: [row] })).toEqual([]);
  });

  describe("surface-distinct", () => {
    const paper: [number, number, number] = [246, 246, 244];
    const region = (o: object) => ({ selector: "div.card", fill: null, behind: paper, border: null, ...o });

    test("a fill 0.02 L from the surface behind passes; today's white on the old paper fails without its border", () => {
      expect(oklabL([255, 255, 255]) - oklabL(paper)).toBeGreaterThan(0.025);
      expect(run({ regions: [region({ fill: [255, 255, 255] })] })).toEqual([]);
      const old: [number, number, number] = [252, 252, 250];
      expect(run({ regions: [region({ fill: [255, 255, 255], behind: old })] }).map((f) => f.rule)).toEqual(["surface-distinct"]);
    });

    test("(1) the surface behind is what the page measured: a card on a card's ground is measured against it", () => {
      expect(run({ regions: [region({ fill: [255, 255, 255], behind: [255, 255, 255] })] }).map((f) => f.value)).toEqual(["fill 0.000 L, no four-sided border from the surface behind (#ffffff)"]);
    });

    test("(2) a border counts when all four sides show at 0.04 L; the page reports none for a single side", () => {
      expect(run({ regions: [region({ fill: [252, 252, 250], border: [210, 212, 206] })] })).toEqual([]);
      expect(run({ regions: [region({ fill: [252, 252, 250], border: [236, 236, 234] })] }).length).toBe(1);
      expect(run({ regions: [region({ fill: [247, 247, 245], border: null })] }).length).toBe(1);
    });

    test("(3) a region that paints nothing fails", () => {
      expect(run({ regions: [region({})] }).map((f) => f.value)).toEqual(["no fill, no four-sided border from the surface behind (#f6f6f4)"]);
    });
  });

  test("popover-anchor: next to its trigger, across its span, inside the window; flipped up is fine", () => {
    const pop = (box: ReturnType<typeof b>, trigger = b(16, 100, 100, 32)) => popoverFindings([{ selector: "div.bar-panel", trigger: "summary", box, triggerBox: trigger, viewport: { w: 390, h: 800 }, rows: [] }], t);
    expect(pop(b(16, 136, 288, 200))).toEqual([]);
    expect(pop(b(16, 300, 288, 200), b(16, 504, 100, 32))).toEqual([]);
    expect(pop(b(16, 700, 288, 200)).map((f) => f.value)).toEqual(["568px below its trigger; past the window's bottom"]);
    expect(pop(b(200, 136, 288, 200)).map((f) => f.value)).toEqual(["outside its trigger's inline span; past the window's end"]);
    // An open popover with nothing that names it is a finding, not nothing.
    const orphan = popoverFindings([{ selector: "div#menu", trigger: null, box: b(16, 136, 288, 200), triggerBox: null, viewport: { w: 390, h: 800 }, rows: [] }], t);
    expect(orphan.map((f) => [f.rule, f.selector, f.value])).toEqual([["popover-anchor", "div#menu", "no trigger found"]]);
  });

  test("menu-row-inset (D-76): the inset most rows share is the menu's; a row more than 1px off it is an error", () => {
    const menu = (rows: [number, number][]) =>
      rowInsetFindings({ selector: "div.bar-panel", trigger: "summary", box: b(16, 136, 288, 200), triggerBox: b(16, 100, 100, 32), viewport: { w: 390, h: 800 }, rows: rows.map(([start, end], i) => ({ selector: `a#r${i}`, start, end })) });
    expect(menu([[4, 4], [4, 4], [4.8, 3.2]])).toEqual([]);
    expect(menu([[4, 4], [4, 4], [8, 8]]).map((f) => [f.rule, f.severity, f.selector, f.value])).toEqual([["menu-row-inset", "error", "a#r2 (in div.bar-panel)", "inset 8px at the start and 8px at the end; the menu's other rows 4px and 4px"]]);
    // Only the end off (a toggle that stops short) is a finding too; one row alone has nothing to share.
    expect(menu([[4, 4], [4, 4], [4, 10]]).map((f) => f.selector)).toEqual(["a#r2 (in div.bar-panel)"]);
    expect(menu([[8, 8]])).toEqual([]);
    // A tie goes to the smaller inset: the panel's own padding, before anything added.
    expect(menu([[4, 4], [8, 8]]).map((f) => f.selector)).toEqual(["a#r1 (in div.bar-panel)"]);
  });
});

describe("arguments", () => {
  const p = (...a: string[]) => parseArgs(a, tokens.products);

  test("sizes", () => {
    expect(parseSize("20kb")).toBe(20480);
    expect(parseSize("0")).toBe(0);
    expect(parseSize("1.5MB")).toBe(1572864);
    expect(parseSize("lots")).toBeNull();
  });

  test("flags", () => {
    const r = p("http://127.0.0.1:8787/", "--budget-js=20kb", "--product", "sitespring", "--allow-spacing", "2,6px,10", "--format", "text");
    expect(r).toMatchObject({ format: "text", opts: { urls: ["http://127.0.0.1:8787/"], budgetJs: 20480, product: "sitespring", allowSpacing: [2, 6, 10] } });
  });

  test("refusals: usage is 64, a bad value is 2", () => {
    expect(p()).toMatchObject({ exit: 64, refusal: { ok: false, reason: "usage" } });
    expect(p("http://x/", "--nope")).toMatchObject({ exit: 64, refusal: { reason: "usage" } });
    expect(p("file:///tmp/a.html")).toMatchObject({ exit: 2, refusal: { reason: "invalid_url" } });
    expect(p("http://x/", "--budget-js", "big")).toMatchObject({ exit: 2, refusal: { reason: "invalid_budget" } });
    expect(p("http://x/", "--product", "acme")).toMatchObject({ exit: 2, refusal: { reason: "unknown_product" } });
    expect(p("http://x/", "--allow-spacing", "2,,x")).toMatchObject({ exit: 2, refusal: { reason: "invalid_spacing" } });
    expect(p("http://x/", "--allow-status", "200")).toMatchObject({ exit: 2, refusal: { reason: "invalid_status" } });
    expect(p("http://x/", "--allow-status", "403,5o3")).toMatchObject({ exit: 2, refusal: { reason: "invalid_status" } });
    expect(p("http://x/", "--allow-status", "403, 503")).toMatchObject({ opts: { allowStatus: [403, 503] } });
  });

  test("--marketing is a switch, off unless given (D-29)", () => {
    expect(p("http://x/")).toMatchObject({ opts: { marketing: false } });
    expect(p("http://x/", "--marketing", "--product", "sitespring")).toMatchObject({ opts: { marketing: true, product: "sitespring" } });
    expect(p("http://x/", "--marketing=yes")).toMatchObject({ exit: 64, refusal: { reason: "usage" } });
  });

  test("--rich-app is a switch, off unless given (D-33)", () => {
    expect(p("http://x/")).toMatchObject({ opts: { richApp: false } });
    expect(p("http://x/", "--rich-app", "--product", "dataspring")).toMatchObject({ opts: { richApp: true, product: "dataspring" } });
    expect(p("http://x/", "--rich-app=yes")).toMatchObject({ exit: 64, refusal: { reason: "usage" } });
  });

  test("single-page app flags (D-16)", () => {
    const r = p("http://x/", "--allow-origin", "http://127.0.0.1:8788/", "--allow-origin=https://api.example.com", "--wait-for", "main h1", "--wait-timeout", "5000", "--settle", "250");
    expect(r).toMatchObject({ opts: { allowOrigins: ["http://127.0.0.1:8788", "https://api.example.com"], waitFor: "main h1", waitTimeout: 5000, settle: 250 } });
    expect(p("http://x/")).toMatchObject({ opts: { allowOrigins: [], waitFor: undefined, waitTimeout: undefined, settle: undefined } });
    expect(p("http://x/", "--allow-origin", "http://127.0.0.1:8788/api")).toMatchObject({ exit: 2, refusal: { reason: "invalid_origin" } });
    expect(p("http://x/", "--allow-origin", "127.0.0.1:8788")).toMatchObject({ exit: 2, refusal: { reason: "invalid_origin" } });
    expect(p("http://x/", "--settle", "1s")).toMatchObject({ exit: 2, refusal: { reason: "invalid_settle" } });
    expect(p("http://x/", "--wait-timeout", "0")).toMatchObject({ exit: 2, refusal: { reason: "invalid_wait_timeout" } });
    expect(p("http://x/", "--wait-for", " ")).toMatchObject({ exit: 2, refusal: { reason: "invalid_wait_for" } });
  });

  test("--cookie-env reads the cookie from the environment and never repeats it", () => {
    const env = { AUDIT_COOKIE: "sid=s3cr3t-value" };
    expect(parseArgs(["http://x/", "--cookie-env", "AUDIT_COOKIE"], tokens.products, env)).toMatchObject({ opts: { cookie: "sid=s3cr3t-value" } });
    const unset = parseArgs(["http://x/", "--cookie-env", "NOT_SET"], tokens.products, env);
    expect(unset).toMatchObject({ exit: 2, refusal: { reason: "cookie_env_unset" } });
    // Someone passing the cookie itself instead of a variable name gets a refusal that does not echo it.
    const pasted = parseArgs(["http://x/", "--cookie-env", "sid=s3cr3t-value"], tokens.products, env);
    expect(pasted).toMatchObject({ exit: 2, refusal: { reason: "invalid_cookie_env" } });
    expect(JSON.stringify(pasted)).not.toContain("s3cr3t");
    expect(parseArgs(["http://x/", "--cookie-env", "AUDIT_COOKIE"], tokens.products, { AUDIT_COOKIE: "a=b\r\nX-Evil: 1" })).toMatchObject({ exit: 2, refusal: { reason: "invalid_cookie" } });
  });

  test("the redactor takes out the cookie and each value, raw and URL-encoded", () => {
    const r = redactor("sid=a%2Bb.c; lang=da-dk");
    expect(r("Cookie: sid=a%2Bb.c; lang=da-dk")).toBe("Cookie: [redacted]");
    expect(r("token a+b.c and a%2Bb.c, lang da-dk")).toBe("token [redacted] and [redacted], lang [redacted]");
    expect(redactor(undefined)("sid=x")).toBe("sid=x");
  });
});

describe("the bin", () => {
  const run = (...args: string[]) =>
    promisify(execFile)(process.execPath, [join(root, "dist/audit/cli.js"), ...args]).then(
      (r) => ({ code: 0, stdout: r.stdout }),
      (e: { code: number; stdout: string }) => ({ code: e.code, stdout: e.stdout }),
    );

  test("exit codes and the refusal shape", async () => {
    const usage = await run();
    expect(usage.code).toBe(64);
    expect(JSON.parse(usage.stdout)).toMatchObject({ ok: false, reason: "usage" });
    expect((await run("ftp://example.com/")).code).toBe(2);
    expect((await run("--help")).stdout).toContain("ui-audit <url...>");
  });

  test("--cookie-env: audits a signed-in page, and the cookie is in neither output", async () => {
    const env = { ...process.env, AUDIT_COOKIE: SESSION };
    const out = await promisify(execFile)(process.execPath, [join(root, "dist/audit/cli.js"), `${base}/private/dist/demo/`, "--cookie-env", "AUDIT_COOKIE", "--format", "text"], { env }).then(
      (r) => ({ code: 0, stdout: r.stdout, stderr: r.stderr }),
      (e: { code: number; stdout: string; stderr: string }) => e,
    );
    expect(out.stdout).toMatch(/private\/dist\/demo\/ {2}1280px light {2}ok/);
    expect(out.code).toBe(0);
    expect(out.stdout + out.stderr).not.toContain(SESSION.split(";")[0]!.split("=")[1]!);
  }, 180_000);

  test("a single-page app with its API on another port: --allow-origin, --cookie-env and --wait-for", async () => {
    const env = { ...process.env, AUDIT_COOKIE: SESSION };
    const url = `${base}/test/fixtures/spa.html?api=${api}`;
    const out = await promisify(execFile)(process.execPath, [join(root, "dist/audit/cli.js"), url, "--allow-origin", api, "--cookie-env", "AUDIT_COOKIE", "--wait-for", "#ready", "--format", "text"], { env }).then(
      (r) => ({ code: 0, stdout: r.stdout, stderr: r.stderr }),
      (e: { code: number; stdout: string; stderr: string }) => e,
    );
    expect(out.stdout).toContain("ok: no errors");
    expect(out.code).toBe(0);
    expect(out.stdout + out.stderr).not.toContain(SESSION.split(";")[0]!.split("=")[1]!);
  }, 180_000);

  test("audits the demo from dist/ and exits 0; the fixture exits 1", async () => {
    const ok = await run(`${base}/dist/demo/`);
    expect(ok.code).toBe(0);
    expect(JSON.parse(ok.stdout)).toMatchObject({ ok: true });
    const bad = await run(`${base}/test/fixtures/broken.html`, "--format", "text");
    expect(bad.code).toBe(1);
    expect(bad.stdout).toContain("failed: see the errors above");
  }, 180_000);
});

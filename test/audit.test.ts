// The design audit on two pages: the built demo, which must pass, and a fixture broken on purpose,
// which must fail with every rule it breaks. The pages come from a server this test starts; the
// browser resolves no other host, and the audit answers every off-origin request itself, so nothing
// here reaches the internet. Something on the dev host probes new localhost ports (hub learnings),
// so nothing below counts the server's requests.

import { execFile } from "node:child_process";
import { createReadStream, statSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { extname, join, normalize } from "node:path";
import { promisify } from "node:util";
import { chromium, type Browser } from "playwright";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { parseArgs, parseSize } from "../src/audit/args.ts";
import { audit, DEFAULT_THEMES, DEFAULT_WIDTHS, dedupe, findings } from "../src/audit/audit.ts";
import type { AuditOptions, AuditResult, Finding } from "../src/audit/types.ts";
import * as tokens from "../dist/tokens.js";

const root = join(import.meta.dirname, "..");
const TYPES: Record<string, string> = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".woff2": "font/woff2" };
// The component layer's own off-grid spacings, kept for parity with the account (D-5, D-8).
const PARITY = [2, 6, 9, 10, 14, 18, 22];

let server: Server;
let base: string;
let browser: Browser;

beforeAll(async () => {
  server = createServer((req, res) => {
    let file = normalize(join(root, decodeURIComponent(new URL(req.url ?? "/", "http://x").pathname)));
    if (!file.startsWith(root)) return void res.writeHead(403).end();
    try {
      if (statSync(file).isDirectory()) file = join(file, "index.html");
      statSync(file);
    } catch {
      return void res.writeHead(404).end();
    }
    res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
    createReadStream(file).pipe(res);
  });
  await new Promise<void>((ok) => server.listen(0, "127.0.0.1", ok));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  // Every other host fails to resolve, so a request the audit failed to intercept would fail loudly
  // instead of fetching from the internet.
  browser = await chromium.launch({ args: ["--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1"] });
}, 60_000);

afterAll(async () => {
  await browser?.close();
  await new Promise((ok) => server?.close(ok));
});

const options = (urls: string[], o: Partial<AuditOptions> = {}): AuditOptions => ({ urls, budgetJs: 0, allowSpacing: [], widths: DEFAULT_WIDTHS, themes: DEFAULT_THEMES, ...o });
const all = (r: AuditResult) => r.pages.flatMap((p) => p.findings.map((f) => ({ ...f, width: p.width, theme: p.theme })));

describe("the demo page", () => {
  test("passes at 1280 and 380 px, light and dark, with the component layer's parity spacings", async () => {
    const r = await audit(options([`${base}/dist/demo/`], { allowSpacing: PARITY }), browser);
    expect(r.pages.map((p) => `${p.width} ${p.theme}`)).toEqual(["1280 light", "1280 dark", "380 light", "380 dark"]);
    // No warnings either: every colour on the demo is a token or a shade components.css mixes.
    expect(all(r).filter((f) => f.severity !== "review")).toEqual([]);
    expect(r.ok).toBe(true);
    // The tables' edge shadows are a background image: their text is reported for review, not failed.
    expect(all(r).every((f) => f.rule === "contrast" && f.value === "background-image")).toBe(true);
  }, 120_000);

  test("without --allow-spacing, the parity spacings are the only errors", async () => {
    const r = await audit(options([`${base}/dist/demo/`], { widths: [380], themes: ["light"] }), browser);
    const errors = all(r).filter((f) => f.severity === "error");
    expect(errors.length).toBeGreaterThan(0);
    expect(new Set(errors.map((f) => f.rule))).toEqual(new Set(["spacing"]));
    expect(new Set(errors.map((f) => parseFloat(f.value)))).toEqual(new Set(PARITY));
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

describe("rules on measurements", () => {
  const sc = { sizes: [11, 12, 13, 14, 15, 16, 18, 21, 30, 40], h1: [30, 40] as [number, number], radii: [0, 3, 6, 8, 10], palette: [[252, 252, 250]] as [number, number, number][], allowSpacing: [6] };
  const box = (o: object) => ({ selector: "div", gsi: false, radii: ["0px", "0px", "0px", "0px"], spacing: [], colours: [], ...o });
  const run = (o: object) => findings({ texts: [], boxes: [], smallTargets: [], primaries: [], fonts: [], ...o }, sc, 1280);

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

  test("audits the demo from dist/ and exits 0; the fixture exits 1", async () => {
    const ok = await run(`${base}/dist/demo/`, "--allow-spacing", PARITY.join(","));
    expect(ok.code).toBe(0);
    expect(JSON.parse(ok.stdout)).toMatchObject({ ok: true });
    const bad = await run(`${base}/test/fixtures/broken.html`, "--format", "text");
    expect(bad.code).toBe(1);
    expect(bad.stdout).toContain("failed: see the errors above");
  }, 180_000);
});

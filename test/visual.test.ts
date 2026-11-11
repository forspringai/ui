// Visual regression (ui D-32, hub tick 860): the audit checks every value against the tokens, but
// not whether a layout broke. This test screenshots each section of the built demo, the bar, the
// open dialog and the open explain fold, at 1280 and 380 px, light and dark, for Forspring and
// SiteSpring (the ink mark and a coloured accent), and compares each with its baseline in
// test/visual/<shot>-<product>-<width>-<theme>.png.
//
// The demo is served the way test/audit.test.ts serves it, and Chromium resolves no host but
// 127.0.0.1, so nothing leaves the machine. The baselines are made on the dev host with the pinned
// Playwright Chromium (test/visual/meta.json); on another Chromium or OS the pixels differ, so the
// test skips there and says why.
//
// UPDATE_VISUAL=1 (pnpm test:visual:update) rewrites the baselines. That is a deliberate step: look
// at the diff of every PNG it changes before committing it.

import { createReadStream, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { extname, join, normalize, relative } from "node:path";
import { crc32, deflateSync, inflateSync } from "node:zlib";
import { chromium, type Browser, type Page } from "playwright";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

const root = join(import.meta.dirname, "..");
const dir = join(root, "test/visual");
const diffDir = join(dir, "__diff__");
const UPDATE = process.env.UPDATE_VISUAL === "1";
const TYPES: Record<string, string> = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".woff2": "font/woff2", ".svg": "image/svg+xml", ".png": "image/png" };

// A pixel differs when any channel moves by more than PIXEL_TOLERANCE of 255, which absorbs
// antialiasing jitter; a shot fails when more than MAX_DIFF_SHARE of its pixels differ. On the
// baselines' own Chromium the render is deterministic, so both are margins, not budgets (D-32).
const PIXEL_TOLERANCE = 16;
const MAX_DIFF_SHARE = 0.001;

const PRODUCTS = ["forspring", "sitespring"] as const;
const WIDTHS = [1280, 380] as const;
const THEMES = ["light", "dark"] as const;

// The demo's top-level sections, by their heading, and the name each shot takes. A section the demo
// gains without a name here fails the test, so a new component cannot go unwatched.
const SECTIONS: Record<string, string> = {
  "Beskeder": "notices",
  "Signaler": "signals",
  "Knapper og mærker": "buttons",
  "Værktøjslinje": "toolbar",
  "Lister": "lists",
  "Tabeller": "tables",
  "Tabel med mange rækker": "table-at-scale",
  "Formular": "form",
  "Tomt, henter og fejl": "states",
  "Dialog og bekræftelse før sletning": "dialog",
  "Toast, værktøjstip og ikoner": "toast",
  "Agentgodkendelse": "approval",
  "Forbind en agent": "connect",
  "Sider omkring log ind": "standard-pages",
  "Log ind": "sign-in",
};

type Meta = { chromium: string; playwright: string; platform: string };
const metaFile = join(dir, "meta.json");
const playwrightVersion = (JSON.parse(readFileSync(join(root, "node_modules/playwright/package.json"), "utf8")) as { version: string }).version;
const platform = `${process.platform}-${process.arch}`;

let server: Server;
let base: string;
let browser: Browser;
let meta: Meta;
let skipReason = "";
const written = new Set<string>();

beforeAll(async () => {
  server = createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url ?? "/", "http://x").pathname);
    let file = normalize(join(root, path));
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
  // Every other host fails to resolve, so a request off the machine fails loudly instead.
  browser = await chromium.launch({ args: ["--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1"] });
  meta = { chromium: browser.version(), playwright: playwrightVersion, platform };
  rmSync(diffDir, { recursive: true, force: true });
  if (UPDATE) return;
  if (!existsSync(metaFile)) throw new Error("test/visual/meta.json is missing: make the baselines with pnpm test:visual:update");
  const made = JSON.parse(readFileSync(metaFile, "utf8")) as Meta;
  if (made.chromium !== meta.chromium || made.platform !== meta.platform)
    skipReason = `the baselines were made with Chromium ${made.chromium} on ${made.platform}; this is Chromium ${meta.chromium} on ${meta.platform}, which renders other pixels. Run on the dev host, or make new baselines on purpose (pnpm test:visual:update, D-32)`;
  if (skipReason) console.warn(`test/visual.test.ts skipped: ${skipReason}`);
}, 60_000);

afterAll(async () => {
  await browser?.close();
  await new Promise((ok) => server?.close(ok));
  // A full update run owns the folder: drop baselines for shots that no longer exist.
  if (UPDATE && written.size === PRODUCTS.length * WIDTHS.length * THEMES.length * (Object.keys(SECTIONS).length + 3)) {
    for (const f of readdirSync(dir)) if (f.endsWith(".png") && !written.has(f)) rmSync(join(dir, f));
    writeFileSync(metaFile, JSON.stringify(meta, null, 2) + "\n");
  }
});

async function open(product: string, width: number, theme: string, extra = ""): Promise<Page> {
  const context = await browser.newContext({
    viewport: { width, height: 800 },
    deviceScaleFactor: 1,
    colorScheme: theme as "light" | "dark",
    reducedMotion: "reduce",
    locale: "da-DK",
    timezoneId: "Europe/Copenhagen",
  });
  const page = await context.newPage();
  await page.goto(`${base}/dist/demo/?product=${product}${extra}`, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  return page;
}

const SHOT = { animations: "disabled", caret: "hide", scale: "css" } as const;

type Result = { name: string; share: number; pixels: number; files?: string[] };

describe.each(PRODUCTS)("the demo as %s", (product) => {
  describe.each(WIDTHS)("at %i px", (width) => {
    test.for(THEMES)("%s: every section, the bar, the open dialog and the open explain fold match their baselines", { timeout: 180_000 }, async (theme, ctx) => {
      ctx.skip(skipReason !== "", skipReason);
      const shots: [string, Buffer][] = [];
      const name = (shot: string) => `${shot}-${product}-${width}-${theme}.png`;

      const page = await open(product, width, theme);
      const headings = await page.locator("main > section").evaluateAll((els) => els.map((e) => e.querySelector(":scope > h2")?.textContent?.trim() ?? ""));
      const unnamed = headings.filter((h) => !(h in SECTIONS));
      expect(unnamed, "demo sections with no name in SECTIONS (test/visual.test.ts)").toEqual([]);
      expect(headings.length, "a section in SECTIONS is missing from the demo").toBe(Object.keys(SECTIONS).length);
      shots.push([name("bar"), await page.locator("header.bar").screenshot(SHOT)]);
      for (const [i, h] of headings.entries()) shots.push([name(SECTIONS[h]!), await page.locator("main > section").nth(i).screenshot(SHOT)]);
      await page.context().close();

      // The open fold is part of the approval card; the dialog is shot as the window shows it, over
      // its backdrop.
      const explain = await open(product, width, theme, "&open=explain");
      expect(await explain.locator("details.explain").getAttribute("open")).not.toBeNull();
      shots.push([name("explain-open"), await explain.locator("#approve-reminders").screenshot(SHOT)]);
      await explain.context().close();
      const dialog = await open(product, width, theme, "&open=delete-site");
      expect(await dialog.locator("#delete-site").evaluate((d) => (d as HTMLDialogElement).open)).toBe(true);
      shots.push([name("dialog-open"), await dialog.screenshot(SHOT)]);
      await dialog.context().close();

      if (UPDATE) {
        mkdirSync(dir, { recursive: true });
        for (const [file, png] of shots) {
          writeFileSync(join(dir, file), png);
          written.add(file);
        }
        return;
      }
      const failed: Result[] = [];
      for (const [file, png] of shots) {
        const r = compare(file, png);
        if (r.share > MAX_DIFF_SHARE) failed.push(r);
      }
      const report = failed.map((r) => `${r.name}: ${(r.share * 100).toFixed(2)}% of pixels differ (${r.pixels}); ${r.files!.join(", ")}`);
      expect(report, `shots that differ from their baselines by more than ${MAX_DIFF_SHARE * 100}%. If the change is meant, run pnpm test:visual:update and look at every PNG it changes`).toEqual([]);
    });
  });
});

// Compares a shot with its baseline. On a difference over the threshold, writes the actual shot and
// a diff image (the baseline faded, differing pixels red) to test/visual/__diff__/.
function compare(file: string, png: Buffer): Result {
  const shot = file.replace(/\.png$/, "");
  const baseline = join(dir, file);
  if (!existsSync(baseline)) {
    mkdirSync(diffDir, { recursive: true });
    writeFileSync(join(diffDir, `${shot}.actual.png`), png);
    return { name: `${shot} (no baseline)`, share: 1, pixels: 0, files: [rel(join(diffDir, `${shot}.actual.png`))] };
  }
  const a = readPng(readFileSync(baseline));
  const b = readPng(png);
  const width = Math.max(a.width, b.width), height = Math.max(a.height, b.height);
  const out = Buffer.alloc(width * height * 4);
  let pixels = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4;
      const inA = x < a.width && y < a.height, inB = x < b.width && y < b.height;
      const ia = (y * a.width + x) * 4, ib = (y * b.width + x) * 4;
      let differs = !inA || !inB;
      if (!differs) for (let k = 0; k < 4; k++) if (Math.abs(a.data[ia + k]! - b.data[ib + k]!) > PIXEL_TOLERANCE) differs = true;
      if (differs) {
        pixels++;
        out.set([255, 0, 0, 255], o);
      } else {
        // The baseline, faded towards white, so the red reads against it.
        for (let k = 0; k < 3; k++) out[o + k] = 255 - ((255 - a.data[ia + k]!) >> 2);
        out[o + 3] = 255;
      }
    }
  }
  const share = pixels / (width * height);
  const sized = a.width !== b.width || a.height !== b.height ? ` (size ${a.width}x${a.height} -> ${b.width}x${b.height})` : "";
  if (share <= MAX_DIFF_SHARE) return { name: shot, share, pixels };
  mkdirSync(diffDir, { recursive: true });
  const actual = join(diffDir, `${shot}.actual.png`), diff = join(diffDir, `${shot}.diff.png`);
  writeFileSync(actual, png);
  writeFileSync(diff, writePng(width, height, out));
  return { name: shot + sized, share, pixels, files: [rel(actual), rel(diff)] };
}

const rel = (p: string) => relative(root, p);

// A small PNG reader for what Chromium writes: 8-bit RGB or RGBA, not interlaced. Returns RGBA.
function readPng(buf: Buffer) {
  if (buf.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") throw new Error("not a PNG");
  let o = 8, width = 0, height = 0, type = 0;
  const idat: Buffer[] = [];
  while (o < buf.length) {
    const len = buf.readUInt32BE(o);
    const kind = buf.toString("ascii", o + 4, o + 8);
    const data = buf.subarray(o + 8, o + 8 + len);
    if (kind === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      type = data[9]!;
      if (data[8] !== 8 || data[12] !== 0) throw new Error("only 8-bit, non-interlaced PNGs");
    } else if (kind === "IDAT") idat.push(data);
    o += 12 + len;
  }
  const bpp = type === 6 ? 4 : type === 2 ? 3 : 0;
  if (!bpp) throw new Error(`PNG colour type ${type} is not read here`);
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * bpp;
  const px = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const f = raw[y * (stride + 1)]!;
    for (let x = 0; x < stride; x++) {
      const v = raw[y * (stride + 1) + 1 + x]!;
      const a = x >= bpp ? px[y * stride + x - bpp]! : 0;
      const b = y > 0 ? px[(y - 1) * stride + x]! : 0;
      const c = x >= bpp && y > 0 ? px[(y - 1) * stride + x - bpp]! : 0;
      const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
      const pred = [0, a, b, (a + b) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? b : c][f]!;
      px[y * stride + x] = (v + pred) & 255;
    }
  }
  if (bpp === 4) return { width, height, data: px };
  const data = Buffer.alloc(width * height * 4);
  for (let i = 0, j = 0; i < px.length; i += 3, j += 4) data.set([px[i]!, px[i + 1]!, px[i + 2]!, 255], j);
  return { width, height, data };
}

// A minimal RGBA PNG writer, for the diff image.
function writePng(width: number, height: number, rgba: Buffer): Buffer {
  const rows = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) rgba.copy(rows, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  const chunk = (kind: string, data: Buffer) => {
    const head = Buffer.alloc(8);
    head.writeUInt32BE(data.length, 0);
    head.write(kind, 4, "ascii");
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
    return Buffer.concat([head, data, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.set([8, 6, 0, 0, 0], 8);
  return Buffer.concat([Buffer.from("89504e470d0a1a0a", "hex"), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(rows)), chunk("IEND", Buffer.alloc(0))]);
}

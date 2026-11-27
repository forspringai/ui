// The theme preview's frame in a browser (D-65, D-68): after every control change, and after the window
// changes width, the frame is as tall as the screen in it, no taller (no blank below the footer) and no
// shorter (no scroll inside the frame). cos found 36,000 px of blank frame on 0.47.0 after a phone-width
// window went back to desktop: the frame grew and could not shrink.
import { createReadStream, statSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { extname, join, normalize } from "node:path";
import { chromium, type Browser, type Page } from "playwright";
import { afterAll, beforeAll, expect, test } from "vitest";

const root = join(import.meta.dirname, "..");
const TYPES: Record<string, string> = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".woff2": "font/woff2", ".svg": "image/svg+xml", ".png": "image/png", ".webmanifest": "application/manifest+json" };

let server: Server;
let base: string;
let browser: Browser;

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
  browser = await chromium.launch({ args: ["--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1"] });
}, 60_000);

afterAll(async () => {
  await browser?.close();
  await new Promise((ok) => server?.close(ok));
});

// The frame's height and its screen's, once the frame has loaded and stopped changing.
async function sized(page: Page) {
  let last = "";
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(150);
    const now = await page.evaluate(() => {
      const f = document.getElementById("tp-frame") as HTMLIFrameElement;
      const d = f.contentDocument;
      if (!d?.body || d.readyState !== "complete") return "";
      const content = Math.max(...[...d.body.querySelectorAll("*")].map((e) => e.getBoundingClientRect().bottom + d.defaultView!.scrollY), 0);
      return JSON.stringify({ frame: f.getBoundingClientRect().height, content, scroll: d.documentElement.scrollHeight - f.clientHeight });
    });
    if (now && now === last) return JSON.parse(now) as { frame: number; content: number; scroll: number };
    last = now;
  }
  throw new Error("the frame did not settle");
}

async function fits(page: Page, step: string) {
  const s = await sized(page);
  expect(s.scroll, `${step}: no scroll inside the frame`).toBeLessThanOrEqual(1);
  // As tall as the screen (or the 480 px floor), to a few px: no blank below the footer.
  expect(s.frame, `${step}: frame ${s.frame} for content ${s.content}`).toBeLessThanOrEqual(Math.max(s.content, 480) + 4);
  expect(s.frame, `${step}: frame ${s.frame} for content ${s.content}`).toBeGreaterThanOrEqual(Math.min(s.content, 480) - 1);
}

for (const scheme of ["light", "dark"] as const)
  test(`${scheme}: the frame fits its screen after every control change and window width`, async () => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: scheme });
    const page = await context.newPage();
    try {
      await page.goto(`${base}/dist/demo/theme-preview.html`);
      await fits(page, "load");
      await page.click("#tp-form button[type=submit]");
      await fits(page, "empty check");
      await page.click("#tp-example");
      await fits(page, "example");
      await page.setViewportSize({ width: 390, height: 844 });
      await fits(page, "phone window");
      await page.setViewportSize({ width: 1440, height: 900 });
      await fits(page, "back to a desktop window");
      for (const width of ["phone", "full"]) {
        await page.selectOption("#tp-width", width);
        await fits(page, `width ${width}`);
      }
      for (const mode of ["dark", "light", "system"]) {
        await page.selectOption("#tp-mode", mode);
        await fits(page, `mode ${mode}`);
      }
      for (const product of ["dataspring", "appspring"]) {
        await page.selectOption("#tp-product", product);
        await fits(page, `product ${product}`);
      }
      for (const screen of await page.$$eval("#tp-screen option", (os) => os.map((o) => (o as HTMLOptionElement).value))) {
        await page.selectOption("#tp-screen", screen);
        await fits(page, `screen ${screen}`);
      }
      // A long screen after a short one, then the short one again: it shrinks back.
      await page.selectOption("#tp-screen", "index.html");
      await fits(page, "the long screen again");
      await page.selectOption("#tp-screen", "pages/org-picker.en.html");
      await fits(page, "a short screen after the long one");
    } finally {
      await context.close();
    }
  }, 180_000);

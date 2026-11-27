// The button inventory in a browser (D-69): every button the package draws matches its size's tokens and
// carries the same focus ring, in every product and theme; a button variant in components.css that is
// not on the inventory fails, so a new one cannot drift unseen. Also the focus behaviour cos set out
// (keyboard only, a dialog opened by mouse shows no ring on its autofocused button) and the action row.
import { createReadStream, readFileSync, statSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { extname, join, normalize } from "node:path";
import { chromium, type Browser } from "playwright";
import { afterAll, beforeAll, expect, test } from "vitest";
import { ROWS } from "../demo/buttons.ts";

const root = join(import.meta.dirname, "..");
const TYPES: Record<string, string> = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".woff2": "font/woff2", ".svg": "image/svg+xml", ".png": "image/png" };
const PRODUCTS = ["forspring", "spring", "sitespring", "dataspring", "appspring", "pulsespring", "flowspring"];

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

test("every button matches its size's tokens and has the one focus ring, in every product and theme", async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  try {
    for (const product of PRODUCTS)
      for (const theme of ["light", "dark"]) {
        await page.goto(`${base}/dist/demo/buttons.html?product=${product}&theme=${theme}`);
        await page.waitForSelector("#inv-table[data-measured]");
        const off = await page.evaluate(() => [...document.querySelectorAll("tr[data-row]")].flatMap((tr) => [...tr.querySelectorAll(".bad")].map((s) => `${(tr as HTMLElement).dataset.row}: ${s.textContent} (${(s as HTMLElement).title})`)));
        expect(off, `${product} ${theme}`).toEqual([]);
      }
  } finally {
    await context.close();
  }
}, 180_000);

test("every button variant in components.css is on the inventory", () => {
  const css = readFileSync(join(root, "css/components.css"), "utf8");
  const variants = new Set([...css.matchAll(/:is\(button, \.button\)\.([a-z-]+)/g)].map((m) => m[1]!));
  // .wide is a width, not a look; it is a button's other variants at full width.
  variants.delete("wide");
  const page = readFileSync(join(root, "dist/demo/buttons.html"), "utf8");
  for (const v of variants) expect(page, `.${v} is a button variant with no row on dist/demo/buttons.html`).toMatch(new RegExp(`class="[^"]*\\b${v}\\b`));
  expect(ROWS.flatMap((g) => g.rows).length).toBeGreaterThan(20);
});

test("focus: a ring for the keyboard only; a dialog opened by mouse shows none on its autofocused button, by keyboard it does", async () => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  try {
    await page.goto(`${base}/dist/demo/pages/lead.en.html`);
    const trigger = page.locator('a[href="#remove"]');
    await trigger.click();
    await page.waitForSelector("dialog#remove[open]");
    expect(await page.evaluate(() => document.activeElement?.matches(":focus-visible"))).toBe(false);
    await page.keyboard.press("Escape");
    await trigger.focus();
    await page.keyboard.press("Enter");
    await page.waitForSelector("dialog#remove[open]");
    const ring = await page.evaluate(() => {
      const a = document.activeElement!;
      const s = getComputedStyle(a);
      return { visible: a.matches(":focus-visible"), outline: `${s.outlineStyle} ${s.outlineWidth} ${s.outlineOffset}` };
    });
    expect(ring).toEqual({ visible: true, outline: "solid 2px 2px" });
    // The fallback page sets no autofocus, so nothing wears a ring on load.
    await page.goto(`${base}/dist/demo/pages/delete-site.en.html`);
    expect(await page.evaluate(() => document.querySelector(":focus-visible"))).toBeNull();
  } finally {
    await context.close();
  }
}, 60_000);

test("a form's actions are one row, primary first and destructive at the end, at a phone's width too", async () => {
  for (const width of [1280, 380]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    try {
      await page.goto(`${base}/dist/demo/pages/lead.en.html`);
      const row = await page.evaluate(() => [...document.querySelectorAll("form .actions :is(button, .button)")].map((b) => ({ text: b.textContent!.trim(), top: Math.round(b.getBoundingClientRect().top), left: Math.round(b.getBoundingClientRect().left) })));
      expect(row.map((b) => b.text), String(width)).toEqual(["Save", "Cancel", "Remove lead"]);
      expect(new Set(row.map((b) => b.top)).size, `${width}: one row`).toBe(1);
      expect(row[0]!.left < row[1]!.left && row[1]!.left < row[2]!.left).toBe(true);
    } finally {
      await context.close();
    }
  }
}, 60_000);

test("the inventory marks a drift: a ghost button with its own padding", async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  try {
    await page.goto(`${base}/dist/demo/buttons.html?product=appspring&theme=light`);
    await page.waitForSelector("#inv-table[data-measured]");
    await page.addStyleTag({ content: ":is(button, .button).ghost:not(.small) { padding-inline: 7px; }" });
    await page.evaluate(() => document.getElementById("inv-table")!.removeAttribute("data-measured"));
    await page.selectOption("#inv-theme", "dark");
    await page.waitForSelector("#inv-table[data-measured]");
    const off = await page.evaluate(() => [...document.querySelectorAll("tr[data-row] .bad")].map((s) => (s.closest("tr") as HTMLElement).dataset.row));
    expect(off).toEqual(expect.arrayContaining(["ghost", "ghost-link"]));
    expect(Number(await page.getAttribute("#inv-table", "data-drift"))).toBeGreaterThan(0);
  } finally {
    await context.close();
  }
}, 60_000);

// The micro-interactions' scripts in a real browser (D-53): working then done, the changed tint, the undo
// toast's timer, drag-select with a mouse, with Shift and from the keyboard, a touch drag that starts
// only in the checkbox column, hold to confirm on a phone, the cut-off countdown, and every one of them
// with the script off. The page is the built demo with ?live, served the way test/visual.test.ts serves
// it; the clock is Playwright's, so no test waits for real time.
//
// Needs Chromium (pnpm test:browser, which the pre-push gate runs); ui-ci excludes it.

import { createReadStream, statSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { extname, join, normalize } from "node:path";
import { chromium, type Browser, type BrowserContext, type CDPSession, type Page } from "playwright";
import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";

const root = join(import.meta.dirname, "..");
const TYPES: Record<string, string> = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".woff2": "font/woff2", ".svg": "image/svg+xml" };

let server: Server;
let base: string;
let browser: Browser;
const contexts: BrowserContext[] = [];

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

afterEach(async () => {
  for (const c of contexts.splice(0)) await c.close();
});

afterAll(async () => {
  await browser?.close();
  await new Promise((ok) => server?.close(ok));
});

type Opts = { live?: boolean; width?: number; touch?: boolean; reduce?: boolean; script?: boolean; clock?: string };

async function open(o: Opts = {}): Promise<Page> {
  const context = await browser.newContext({
    viewport: { width: o.width ?? 1280, height: 900 },
    deviceScaleFactor: 1,
    colorScheme: "light",
    reducedMotion: o.reduce ? "reduce" : "no-preference",
    locale: "da-DK",
    timezoneId: "Europe/Copenhagen",
    javaScriptEnabled: o.script !== false,
    ...(o.touch ? { hasTouch: true, isMobile: true } : {}),
  });
  contexts.push(context);
  const page = await context.newPage();
  if (o.clock) await page.clock.install({ time: new Date(o.clock) });
  await page.goto(`${base}/dist/demo/?product=forspring${o.live === false ? "" : "&live"}`, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  return page;
}

const text = (page: Page, sel: string) => page.locator(sel).first().innerText();

describe("1. working, then a tick", () => {
  test("a submit says working, ignores a second press, says done, then goes back to its label, announced once each", async () => {
    const page = await open({ clock: "2026-11-22T08:00:00Z" });
    const button = page.locator("#micro .button-progress button").first();
    const status = page.locator("#micro .button-progress [role=status]").first();
    await page.evaluate(() => {
      (window as unknown as { submits: number }).submits = 0;
      document.addEventListener("submit", () => ((window as unknown as { submits: number }).submits += 1));
    });
    await button.click();
    expect(await button.getAttribute("aria-busy")).toBe("true");
    expect(await button.innerText()).toBe("Arbejder…");
    expect(await status.textContent()).toBe("Arbejder…");
    // Still focusable, and a second press does not submit again.
    await button.focus();
    expect(await page.evaluate(() => document.activeElement?.hasAttribute("data-working"))).toBe(true);
    await button.press("Enter");
    await button.click();
    expect(await page.evaluate(() => (window as unknown as { submits: number }).submits)).toBe(1);
    await page.clock.runFor(1600);
    expect(await button.getAttribute("data-state")).toBe("done");
    expect(await button.getAttribute("aria-busy")).toBeNull();
    expect(await button.innerText()).toBe("Færdig");
    expect(await button.locator("svg").count()).toBe(1);
    expect(await status.textContent()).toBe("Færdig");
    await page.clock.runFor(2100);
    expect(await button.innerText()).toBe("Udgiv");
    expect(await button.getAttribute("data-state")).toBeNull();
    expect(await status.textContent()).toBe("");
    // The button itself is never a live region: one announcement, from the status element.
    expect(await button.getAttribute("aria-live")).toBeNull();
    expect(await button.getAttribute("role")).toBeNull();
  });

  test("with the script off the server's own working and done are drawn, and the idle button still submits", async () => {
    const page = await open({ script: false });
    const buttons = page.locator("#micro .button-progress button");
    expect(await buttons.nth(0).innerText()).toBe("Udgiv");
    expect(await buttons.nth(1).innerText()).toBe("Arbejder…");
    expect(await buttons.nth(1).getAttribute("aria-busy")).toBe("true");
    expect(await buttons.nth(1).evaluate((b) => (b as HTMLButtonElement).disabled)).toBe(false);
    expect(await buttons.nth(2).innerText()).toBe("Færdig");
    expect(await buttons.nth(2).locator("svg").count()).toBe(1);
    // The spinner is drawn: a box with a border.
    expect(await buttons.nth(1).locator(".spinner").evaluate((s) => getComputedStyle(s).borderTopWidth)).toBe("2px");
    // A native submit goes out (an unreachable action here would navigate; watch for the request).
    const sent = page.waitForRequest((r) => r.method() === "POST");
    await buttons.nth(0).click();
    expect((await sent).method()).toBe("POST");
  });

  test("the spinner turns, and stands still under reduced motion", async () => {
    const live = await open();
    expect(await live.locator("#micro .spinner").first().evaluate((s) => getComputedStyle(s).animationName)).toBe("forspring-spin");
    const still = await open({ reduce: true });
    expect(await still.locator("#micro .spinner").first().evaluate((s) => getComputedStyle(s).animationName)).toBe("none");
  });
});

describe("2. the changed-value tint", () => {
  // The wash is a layer behind the text: its opacity is the tint (0.16 at rest, fading to 0).
  const tint = (page: Page) => page.locator("#micro-visits .changed-value").evaluate((e) => Number(getComputedStyle(e, "::after").opacity));

  test("a node marked changed is tinted, and the mark goes after the same time with or without motion", async () => {
    for (const reduce of [false, true]) {
      const page = await open({ reduce, clock: "2026-11-22T08:00:00Z" });
      const v = page.locator("#micro-visits .changed-value");
      // The server drew it changed; the script clears it after 1.6 s.
      expect(await v.getAttribute("data-changed")).toBe("true");
      await page.clock.runFor(1700);
      expect(await v.getAttribute("data-changed")).toBeNull();
      await page.locator("[name=micro-refresh]").click();
      expect(await v.getAttribute("data-changed")).toBe("true");
      if (reduce) {
        // A static tint: not transparent, and no animation to fade it.
        expect(await tint(page)).toBeCloseTo(0.16, 2);
        expect(await v.evaluate((e) => getComputedStyle(e, "::after").animationName)).toBe("none");
      } else {
        expect(await v.evaluate((e) => getComputedStyle(e, "::after").animationName)).toBe("forspring-changed");
      }
      await page.clock.runFor(1000);
      expect(await v.getAttribute("data-changed")).toBe("true");
      await page.clock.runFor(900);
      expect(await v.getAttribute("data-changed")).toBeNull();
      expect(await v.evaluate((e) => getComputedStyle(e, "::after").content)).toBe("none");
    }
  });

  test("with the script off the server's mark shows the tint", async () => {
    const page = await open({ script: false, reduce: true });
    expect(await page.locator("#micro-visits .changed-value").getAttribute("data-changed")).toBe("true");
    expect(await tint(page)).toBeCloseTo(0.16, 2);
  });
});

describe("3. the undo toast", () => {
  const toast = (page: Page) => page.locator("#toast-undo");

  test("it counts the time left, pauses on hover and focus, and goes when the time is out", async () => {
    const page = await open({ clock: "2026-11-22T08:00:00Z" });
    expect(await text(page, "#toast-undo .toast-time-text")).toBe("10 s");
    expect(await toast(page).locator(".toast-time").getAttribute("aria-hidden")).toBe("true");
    await page.clock.runFor(3000);
    expect(await text(page, "#toast-undo .toast-time-text")).toBe("7 s");
    expect(await toast(page).locator("progress").evaluate((p) => (p as HTMLProgressElement).position)).toBeCloseTo(0.7, 1);
    // Pointed at, it waits.
    await toast(page).hover();
    await page.clock.runFor(8000);
    expect(await text(page, "#toast-undo .toast-time-text")).toBe("7 s");
    expect(await toast(page).getAttribute("data-paused")).not.toBeNull();
    await page.mouse.move(2, 2);
    // Focused, it waits.
    await toast(page).locator(".toast-undo-form button").focus();
    await page.clock.runFor(8000);
    expect(await text(page, "#toast-undo .toast-time-text")).toBe("7 s");
    await page.evaluate(() => (document.activeElement as HTMLElement).blur());
    await page.clock.runFor(5000);
    expect(await toast(page).count()).toBe(1);
    await page.clock.runFor(2500);
    expect(await toast(page).count()).toBe(0);
  });

  test("under reduced motion the seconds step each second, and the time still runs out", async () => {
    const page = await open({ reduce: true, clock: "2026-11-22T08:00:00Z" });
    await page.clock.runFor(2500);
    expect(await text(page, "#toast-undo .toast-time-text")).toBe("8 s");
    await page.clock.runFor(8000);
    expect(await toast(page).count()).toBe(0);
  });

  test("Escape dismisses it, but not when a dialog is open", async () => {
    const page = await open({ clock: "2026-11-22T08:00:00Z" });
    await page.keyboard.press("Escape");
    expect(await toast(page).count()).toBe(0);
    const again = await open({ clock: "2026-11-22T08:00:00Z" });
    await again.evaluate(() => (document.getElementById("delete-site") as HTMLDialogElement).showModal());
    await again.keyboard.press("Escape");
    expect(await toast(again).count()).toBe(1);
  });

  test("Undo sends a cancelable event the product can take, and the toast goes", async () => {
    const page = await open({ clock: "2026-11-22T08:00:00Z" });
    const heard = page.evaluate(() => new Promise<boolean>((ok) => document.addEventListener("ui:undo", () => ok(true), { once: true })));
    await toast(page).locator(".toast-undo-form button").click();
    expect(await heard).toBe(true);
    expect(await toast(page).count()).toBe(0);
  });

  test("with the script off Undo is a POST and the toast shows no counter", async () => {
    const page = await open({ script: false });
    expect(await toast(page).locator(".toast-time").count()).toBe(0);
    const sent = page.waitForRequest((r) => r.method() === "POST");
    await toast(page).locator(".toast-undo-form button").click();
    expect((await sent).postData()).toContain("csrf=demo");
  });
});

describe("4. drag-select rows", () => {
  const boxes = (page: Page) => page.locator("#micro form.table-select tbody td.select input");
  const ticked = async (page: Page) => (await boxes(page).evaluateAll((bs) => bs.map((b) => (b as HTMLInputElement).checked))).map((c, i) => (c ? i : -1)).filter((i) => i >= 0);
  const visible = (page: Page) => text(page, "#micro .table-select-count");
  const live = (page: Page) => page.locator("#micro [data-select-live]").textContent();
  const centre = async (page: Page, row: number) => {
    const b = (await boxes(page).nth(row).boundingBox())!;
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  };

  test("a mouse drag selects the range, going back shrinks it, and the count is said once at the end", async () => {
    const page = await open();
    await boxes(page).first().scrollIntoViewIfNeeded();
    const a = await centre(page, 0);
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    const c = await centre(page, 2);
    await page.mouse.move(c.x, c.y, { steps: 6 });
    expect(await ticked(page)).toEqual([0, 1, 2]);
    expect(await visible(page)).toBe("3 valgt");
    // Mid-drag the live region says nothing: it would read every step.
    expect(await live(page)).toBe("");
    const b = await centre(page, 1);
    await page.mouse.move(b.x, b.y, { steps: 3 });
    expect(await ticked(page)).toEqual([0, 1]);
    await page.mouse.up();
    expect(await ticked(page)).toEqual([0, 1]);
    expect(await visible(page)).toBe("2 valgt");
    expect(await live(page)).toBe("2 valgt");
  });

  test("a drag that starts on a ticked box unticks the rows it crosses", async () => {
    const page = await open();
    await boxes(page).nth(0).check();
    await boxes(page).nth(1).check();
    await boxes(page).nth(2).check();
    const a = await centre(page, 0);
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    const c = await centre(page, 1);
    await page.mouse.move(c.x, c.y, { steps: 4 });
    await page.mouse.up();
    expect(await ticked(page)).toEqual([2]);
  });

  test("Shift+click ticks the range from the last row touched", async () => {
    const page = await open();
    await boxes(page).nth(0).click();
    await boxes(page).nth(3).click({ modifiers: ["Shift"] });
    expect(await ticked(page)).toEqual([0, 1, 2, 3]);
    expect(await live(page)).toBe("4 valgt");
  });

  test("from the keyboard: arrows move between boxes, Shift+Arrow extends, Space toggles, Shift+Space ranges", async () => {
    const page = await open();
    await boxes(page).nth(0).focus();
    await page.keyboard.press("ArrowDown");
    expect(await page.evaluate(() => [...document.querySelectorAll("#micro td.select input")].indexOf(document.activeElement as Element))).toBe(1);
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("Space");
    expect(await ticked(page)).toEqual([0]);
    await page.keyboard.press("Shift+ArrowDown");
    await page.keyboard.press("Shift+ArrowDown");
    expect(await ticked(page)).toEqual([0, 1, 2]);
    expect(await live(page)).toBe("3 valgt");
    await page.keyboard.press("Shift+ArrowUp");
    expect(await ticked(page)).toEqual([0, 1]);
    await page.keyboard.press("Shift+ArrowDown");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Shift+Space");
    expect(await ticked(page)).toEqual([0, 1, 2, 3]);
  });

  test("on a touch screen the checkbox column is the only place a drag starts: it pans sideways only, the rest scrolls", async () => {
    const page = await open({ touch: true, width: 390 });
    const sel = await page.locator("#micro td.select").first().evaluate((e) => getComputedStyle(e).touchAction);
    const other = await page.locator("#micro tbody tr:first-child td:not(.select)").first().evaluate((e) => getComputedStyle(e).touchAction);
    expect(sel).toBe("pan-x");
    expect(other).toBe("auto");
    await boxes(page).first().scrollIntoViewIfNeeded();
    const cdp = await page.context().newCDPSession(page);
    const y0 = await page.evaluate(() => scrollY);
    const a = await centre(page, 0);
    const c = await centre(page, 2);
    await touchDrag(cdp, a, c);
    expect(await ticked(page)).toEqual([0, 1, 2]);
    expect(await page.evaluate(() => scrollY)).toBe(y0);
    expect(await live(page)).toBe("3 valgt");
    // A finger that starts in the first text column scrolls the page instead and selects nothing more.
    const row = (await page.locator("#micro tbody tr:first-child td:not(.select)").first().boundingBox())!;
    await touchDrag(cdp, { x: row.x + 10, y: row.y + row.height / 2 }, { x: row.x + 10, y: row.y + row.height / 2 - 200 });
    expect(await ticked(page)).toEqual([0, 1, 2]);
    expect(await page.evaluate(() => scrollY)).toBeGreaterThan(y0);
  });

  test("with the script off the checkboxes are a form: tick, press the action, the ids go out", async () => {
    const page = await open({ script: false });
    await boxes(page).nth(1).check();
    await boxes(page).nth(3).check();
    const sent = page.waitForRequest((r) => r.method() === "POST");
    await page.locator("#micro .table-select-actions button").click();
    const body = (await sent).postData()!;
    expect(body.match(/site=/g)).toHaveLength(2);
    expect(body).toContain("csrf=demo");
    expect(await visible(page)).toBe("0 valgt");
  });
});

async function touchDrag(cdp: CDPSession, from: { x: number; y: number }, to: { x: number; y: number }, steps = 8) {
  const point = (x: number, y: number) => ({ x, y, id: 1 });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [point(from.x, from.y)] });
  for (let i = 1; i <= steps; i++) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [point(from.x + ((to.x - from.x) * i) / steps, from.y + ((to.y - from.y) * i) / steps)] });
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}

describe("5. hold to confirm", () => {
  // A finger on the button, for `ms` of the page's (fake) clock, then up.
  async function hold(page: Page, cdp: CDPSession, ms: number, sample: number[] = []) {
    const b = (await page.locator("#micro .hold-button").boundingBox())!;
    const at = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ ...at, id: 1 }] });
    // Anchor the hold before any fake time passes: under load the page may handle the touch after the clock
    // moved, so the hold would start late and the samples read low (hub tick bsu). Polled from Node in real
    // time, because the page's own timers are the fake clock's.
    for (let i = 0; i < 200 && (await page.locator("#micro .hold-button").getAttribute("data-holding")) !== "true"; i++) await new Promise((r) => setTimeout(r, 10));
    const seen: number[] = [];
    let t = 0;
    for (const s of sample) {
      await page.clock.runFor(s - t);
      t = s;
      seen.push(Number(await page.locator("#micro .hold-button").evaluate((e) => getComputedStyle(e).getPropertyValue("--_hold") || "0")));
    }
    await page.clock.runFor(ms - t);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    return seen;
  }
  async function arm(page: Page) {
    await page.evaluate(() => {
      const w = window as unknown as { posted: number };
      w.posted = 0;
      document.getElementById("micro-hold")!.addEventListener("submit", (e) => {
        e.preventDefault();
        w.posted += 1;
      });
    });
  }
  const posted = (page: Page) => page.evaluate(() => (window as unknown as { posted: number }).posted);
  const dialogOpen = (page: Page) => page.evaluate(() => (document.getElementById("delete-site") as HTMLDialogElement).open);

  test("on a phone the hint says hold, the fill grows, and the full second posts the form without the dialog", async () => {
    const page = await open({ touch: true, width: 390, clock: "2026-11-22T08:00:00Z" });
    await page.locator("#micro .hold-button").scrollIntoViewIfNeeded();
    expect(await text(page, "#micro .hold-button")).toContain("Hold for at slette hjemmesiden");
    const cdp = await page.context().newCDPSession(page);
    await arm(page);
    const seen = await hold(page, cdp, 1100, [250, 500, 750]);
    expect(seen[0]).toBeGreaterThan(0.15);
    expect(seen[0]).toBeLessThan(0.35);
    expect(seen[1]).toBeGreaterThan(0.4);
    expect(seen[1]).toBeLessThan(0.6);
    expect(seen[2]).toBeGreaterThan(0.65);
    expect(await posted(page)).toBe(1);
    expect(await dialogOpen(page)).toBe(false);
  });

  test("letting go early cancels: nothing posted, the fill empties, and the click does not open the dialog", async () => {
    const page = await open({ touch: true, width: 390, clock: "2026-11-22T08:00:00Z" });
    await page.locator("#micro .hold-button").scrollIntoViewIfNeeded();
    const cdp = await page.context().newCDPSession(page);
    await arm(page);
    await hold(page, cdp, 700);
    await page.clock.runFor(500);
    expect(await posted(page)).toBe(0);
    expect(await dialogOpen(page)).toBe(false);
    expect(await page.locator("#micro .hold-button").evaluate((e) => getComputedStyle(e).getPropertyValue("--_hold"))).toBe("0");
  });

  test("a quick tap is not a hold: it goes to the confirm and never posts", async () => {
    const page = await open({ touch: true, width: 390, clock: "2026-11-22T08:00:00Z" });
    await page.locator("#micro .hold-button").scrollIntoViewIfNeeded();
    await arm(page);
    // A real tap: touch start and end back to back. Chrome tells a tap from a long press by REAL time, so a
    // tap built from two CDP touches with fake time between them turns into a long press under load (bsu).
    // The page's fake clock does not move, so the hold sees 0 ms: well under the 200 ms "early" line.
    await page.locator("#micro .hold-button").tap();
    await page.clock.runFor(100);
    expect(await posted(page)).toBe(0);
    expect(await dialogOpen(page)).toBe(true);
  });

  test("the keyboard, a mouse click and a screen reader's activation get the confirm and never post", async () => {
    const page = await open({ clock: "2026-11-22T08:00:00Z" });
    await arm(page);
    expect(await text(page, "#micro .hold-button")).not.toContain("Hold for at");
    await page.locator("#micro .hold-button").focus();
    await page.keyboard.press("Enter");
    expect(await dialogOpen(page)).toBe(true);
    await page.keyboard.press("Escape");
    await page.locator("#micro .hold-button").click();
    expect(await dialogOpen(page)).toBe(true);
    await page.keyboard.press("Escape");
    // A long mouse press is only a press.
    const b = (await page.locator("#micro .hold-button").boundingBox())!;
    await page.mouse.move(b.x + 5, b.y + 5);
    await page.mouse.down();
    await page.clock.runFor(1500);
    await page.mouse.up();
    expect(await posted(page)).toBe(0);
    expect(await page.evaluate(() => (document.querySelector("#micro .hold-button") as HTMLElement).getAttribute("data-holding"))).toBeNull();
  });

  test("the accessible name is the plain action on every pointer", async () => {
    const page = await open({ touch: true, width: 390 });
    const name = await page.locator("#micro .hold-button").evaluate((e) => (e as HTMLElement).innerText);
    expect(name).toContain("Hold for at slette hjemmesiden");
    const aria = await page.locator("#micro .hold-label").evaluate((e) => e.textContent);
    expect(aria).toBe("Slet hjemmesiden");
  });

  test("under reduced motion the fill steps by quarters, and the hold still needs the full second", async () => {
    const page = await open({ touch: true, width: 390, reduce: true, clock: "2026-11-22T08:00:00Z" });
    await page.locator("#micro .hold-button").scrollIntoViewIfNeeded();
    const cdp = await page.context().newCDPSession(page);
    await arm(page);
    const seen = await hold(page, cdp, 1100, [100, 300, 520, 780, 900]);
    expect(seen.every((v) => [0, 0.25, 0.5, 0.75, 1].includes(v))).toBe(true);
    expect(seen[1]).toBe(0.25);
    expect(seen[4]).toBeLessThan(1);
    expect(await posted(page)).toBe(1);
  });

  test("with the script off the link is the confirm page", async () => {
    const page = await open({ script: false });
    expect(await page.locator("#micro .hold-button").getAttribute("href")).toBe("pages/delete-site.da.html");
    expect(await page.locator("#micro .hold-form").evaluate((f) => (f as HTMLElement).hidden)).toBe(true);
  });
});

describe("6. the cut-off countdown", () => {
  const chips = (page: Page) => page.locator("#micro table time.cutoff");

  test("it counts down each minute, turns to the warning hue under the threshold and to danger after the cut-off", async () => {
    // Start the clock before the page, then stop it at exactly 08:00:00, so "40 min" is 40 min to the second.
    const page = await open({ clock: "2026-11-22T07:59:50Z" });
    await page.clock.pauseAt(new Date("2026-11-22T08:00:00Z"));
    await page.clock.runFor(100);
    // Rows are sorted nearest first: 07:30 passed is after the two to come.
    const texts = () => chips(page).evaluateAll((cs) => cs.map((c) => c.querySelector(".cutoff-text")!.textContent));
    expect(await texts()).toEqual(["Frist om 40 min", "Frist om 1 t 20 min", "Frist om 3 d 4 t", "Frist overskredet"]);
    await page.clock.runFor(10 * 60_000);
    const t = await texts();
    expect(t).toContain("Frist om 30 min");
    expect(t).toContain("Frist om 1 t 10 min");
    await page.clock.runFor(30 * 60_000);
    const states = await chips(page).evaluateAll((cs) => cs.map((c) => `${c.getAttribute("data-state")}:${c.className}`));
    expect(states.some((s) => s.startsWith("warning:") && s.includes("warning"))).toBe(true);
    await page.clock.runFor(60 * 60_000);
    const passed = await chips(page).evaluateAll((cs) => cs.filter((c) => c.getAttribute("data-state") === "passed").map((c) => `${c.className}|${c.querySelector(".cutoff-text")!.textContent}`));
    expect(passed.length).toBeGreaterThanOrEqual(3);
    expect(passed.every((p) => p.includes("danger") && p.endsWith("Frist overskredet"))).toBe(true);
  });

  test("each state shows its own icon, so the change is not colour alone", async () => {
    const page = await open({ script: false });
    const shown = await page.locator("#micro .demo-row time.cutoff").evaluateAll((cs) =>
      cs.map((c) => [...c.querySelectorAll(".cutoff-icon")].filter((i) => getComputedStyle(i).display !== "none").map((i) => i.className.replace("cutoff-icon ", ""))),
    );
    expect(shown).toEqual([["cutoff-icon-soon"], ["cutoff-icon-warning"], ["cutoff-icon-passed"]]);
  });

  test("with the script off the chip keeps the server's words", async () => {
    const page = await open({ script: false });
    expect(await text(page, "#micro .demo-row time.cutoff")).toBe("Frist om 3 d 4 t");
  });
});

describe("7. the progress bar", () => {
  test("0 of 10 is an empty track, only 10 of 10 reaches the end", async () => {
    const page = await open({ script: false });
    const pos = await page.locator("#micro progress.progress").evaluateAll((ps) => ps.map((p) => (p as HTMLProgressElement).position));
    expect(pos).toEqual([0, 0.4, 1]);
    const names = await page.locator("#micro progress.progress").evaluateAll((ps) => ps.map((p) => document.getElementById(p.getAttribute("aria-labelledby")!)!.textContent));
    expect(names).toEqual(["0 af 10 låst", "4 af 10 låst", "10 af 10 låst"]);
    // The fill is drawn only as long as the value: the empty one has no coloured pixel inside the track.
    const track = page.locator("#micro progress.progress").first();
    const shot = await track.screenshot();
    expect(shot.length).toBeGreaterThan(0);
  });
});

// ui-sdk-trial runner: serves trial/out, then for ours.html and sdk.html: axe (light, dark), the page with no
// script (what shows, what submits), the keyboard walk per component, and the agent bridge's probes on sdk.html.
// Prints one JSON report. Run: node trial/run.ts (after node trial/pages.ts and the client bundle).
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { chromium, type Page } from "playwright";

const require = createRequire(import.meta.url);
const axeSource = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
const dir = new URL("./out/", import.meta.url);
const hits: string[] = [];
const server = createServer((req, res) => {
  const path = (req.url ?? "/").split("?")[0]!;
  hits.push(req.url ?? "");
  try {
    const body = readFileSync(new URL(`.${path}`, dir));
    res.writeHead(200, { "content-type": path.endsWith(".js") ? "text/javascript" : "text/html" });
    res.end(body);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
const browser = await chromium.launch();
const report: Record<string, unknown> = {};

async function axe(page: Page): Promise<{ violations: number; ids: string[] }> {
  await page.addScriptTag({ content: axeSource });
  const r = (await page.evaluate(() =>
    (window as unknown as { axe: { run: (c?: unknown) => Promise<{ violations: { id: string; nodes: unknown[] }[] }> } }).axe.run(document, {
      runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"],
    }),
  )) as { violations: { id: string; nodes: unknown[] }[] };
  return { violations: r.violations.reduce((n, v) => n + v.nodes.length, 0), ids: r.violations.map((v) => v.id) };
}

const focused = (page: Page) =>
  page.evaluate(() => {
    const e = document.activeElement as HTMLElement | null;
    return e ? `${e.tagName.toLowerCase()}${e.getAttribute("role") ? `[${e.getAttribute("role")}]` : ""}:${(e.textContent ?? "").trim().slice(0, 24)}` : "none";
  });

for (const name of ["ours", "sdk"] as const) {
  const r: Record<string, unknown> = {};
  for (const scheme of ["light", "dark"] as const) {
    const ctx = await browser.newContext({ colorScheme: scheme });
    const page = await ctx.newPage();
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    await page.goto(`${base}/${name}.html`);
    await page.waitForTimeout(300);
    r[`axe_${scheme}`] = await axe(page);
    if (scheme === "light") r.errors = errors;
    await ctx.close();
  }
  // No script: what a reader gets.
  {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto(`${base}/${name}.html`);
    const menuTrigger = name === "ours" ? page.locator("summary", { hasText: "Products" }) : page.locator(".sdk-menu-trigger");
    await menuTrigger.click();
    const linkShown = await page.locator("a", { hasText: "SiteSpring" }).isVisible();
    const panelsShown = name === "sdk" ? await page.locator("ui-tabs-panel").evaluateAll((ps) => ps.filter((p) => (p as HTMLElement).offsetParent !== null).length) : null;
    const before = hits.length;
    await page.locator('button[type="submit"]', { hasText: "Save" }).click();
    await page.waitForTimeout(300);
    r.noScript = { menuLinksReachable: linkShown, tabPanelsShown: panelsShown, submitted: hits.slice(before).find((h) => h.includes("?")) ?? "(no field submitted)" };
    await ctx.close();
  }
  // The keyboard walk, one component at a time.
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(`${base}/${name}.html`);
    await page.waitForTimeout(300);
    const walk: Record<string, unknown> = {};
    // menu
    const trig = name === "ours" ? page.locator("summary", { hasText: "Products" }) : page.locator(".sdk-menu-trigger");
    await trig.focus();
    await page.keyboard.press("Enter");
    const m: string[] = [`Enter -> ${await focused(page)}`];
    await page.keyboard.press("ArrowDown");
    m.push(`ArrowDown -> ${await focused(page)}`);
    await page.keyboard.press("End");
    m.push(`End -> ${await focused(page)}`);
    await page.keyboard.press("Home");
    m.push(`Home -> ${await focused(page)}`);
    await page.keyboard.press("d");
    m.push(`type d -> ${await focused(page)}`);
    await page.keyboard.press("Escape");
    const open = name === "ours" ? await page.locator("details.product-switcher").evaluate((d) => (d as HTMLDetailsElement).open) : await page.locator(".sdk-menu-content").isVisible();
    m.push(`Escape -> ${await focused(page)}, open=${open}`);
    walk.menu = m;
    // tabs (sdk only: the package has no tabs helper but connect()'s radio tabs)
    if (name === "sdk") {
      const t: string[] = [];
      await page.locator('[role="tab"]').first().focus();
      for (const k of ["ArrowRight", "ArrowRight", "ArrowRight", "ArrowLeft", "End", "Home"]) {
        await page.keyboard.press(k);
        const sel = await page.locator('[role="tab"][aria-selected="true"]').textContent();
        const shown = await page.locator("ui-tabs-panel:visible").count();
        t.push(`${k} -> ${await focused(page)} selected=${sel} panelsShown=${shown}`);
      }
      await page.keyboard.press("Tab");
      t.push(`Tab -> ${await focused(page)}`);
      walk.tabs = t;
    }
    // select
    const sel = page.locator("#stage");
    await sel.focus();
    const s: string[] = [];
    for (const k of ["ArrowDown", "ArrowDown", "Enter", "Space", "End", "Home", "l", "Enter"]) {
      await page.keyboard.press(k);
      await page.waitForTimeout(50);
      const v = name === "ours" ? await sel.inputValue() : await page.evaluate(() => (document.querySelector("ui-select") as unknown as { value: unknown }).value);
      s.push(`${k} -> ${await focused(page)} value=${JSON.stringify(v)}`);
    }
    await page.keyboard.press("Escape");
    s.push(`Escape -> ${await focused(page)}`);
    walk.select = s;
    // dialog
    const d: string[] = [];
    const dt = name === "ours" ? page.locator("[data-dialog-open]") : page.locator(".sdk-dialog a.button");
    await dt.focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(100);
    d.push(`Enter on trigger -> ${await focused(page)} url=${new URL(page.url()).pathname}`);
    await page.keyboard.press("Tab");
    d.push(`Tab -> ${await focused(page)}`);
    await page.keyboard.press("Tab");
    d.push(`Tab -> ${await focused(page)}`);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(100);
    d.push(`Escape -> ${await focused(page)}`);
    walk.dialog = d;
    r.keyboard = walk;
    await ctx.close();
  }
  report[name] = r;
}

// The agent bridge on sdk.html: what it exposes, and the probes against ADR 0079's conditions.
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`${base}/sdk.html?agent`);
  await page.waitForTimeout(400);
  type A = { snapshot: () => unknown[]; act: (s: unknown) => Promise<unknown>; query: (q: unknown) => Promise<unknown> };
  const probe: Record<string, unknown> = {};
  probe.globals = await page.evaluate(() => Object.keys(window).filter((k) => /agent|ui.?sdk/i.test(k)));
  probe.snapshot = await page.evaluate(() => (window as unknown as { agent: A }).agent.snapshot());
  // a field that leaves the page (a re-render that no longer draws it: the reader lost the right to see it)
  await page.evaluate(() => document.getElementById("gone")!.remove());
  await page.waitForTimeout(100);
  probe.afterRemove = await page.evaluate(() => (window as unknown as { agent: A }).agent.snapshot().filter((c) => JSON.stringify(c).includes("Salary")));
  probe.queryRemoved = await page.evaluate(() => (window as unknown as { agent: A }).agent.query({ text: "Salary" }));
  probe.queryClosedTab = await page.evaluate(() => (window as unknown as { agent: A }).agent.query({ within: "Kind in a closed tab" }));
  probe.queryHidden = await page.evaluate(() => (window as unknown as { agent: A }).agent.query({ text: "Hidden region" }));
  probe.actDisabled = await page.evaluate(() => (window as unknown as { agent: A }).agent.act({ steps: [{ ref: "Owner", action: "setValue", args: ["b"] }] }));
  probe.actReadOnly = await page.evaluate(() => (window as unknown as { agent: A }).agent.act({ steps: [{ ref: "Reference (read-only)", action: "setValue", args: ["HACKED"] }] }));
  probe.readOnlyValueAfter = await page.locator("#ro").inputValue();
  probe.actConfirm = await page.evaluate(() =>
    (window as unknown as { agent: A }).agent.act({ steps: [{ ref: "Remove lead", action: "press" }, { ref: "Remove the lead?", action: "press", args: ["Remove"] }] }),
  );
  probe.dialogOpenAfter = await page.locator(".sdk-dialog-content").isVisible();
  report.agent = probe;
  await ctx.close();
}

await browser.close();
server.close();
console.log(JSON.stringify(report, null, 1));

// dist/demo/theme-preview.html: a customer's theme file on the family's screens (hub tick gj2, ui D-62).
//
// A customer, or their agent, loads or pastes a theme file (schema/customer-theme.schema.json). The page
// checks it with validateTheme() and draws it with customerTheme(), both imported from ../theme.js and run
// in the browser: nothing is sent anywhere. The screens are the demo's own pages in a frame, so the
// preview is the package's real CSS, not a picture of it. #theme=<base64url JSON> carries a file in the
// link, so an agent can hand a person a preview to look at. Served by `pnpm demo`, or any static host of dist/.

import { html, raw, shell } from "../src/html.ts";

/** An invented bakery's theme that passes, with one warning to show what a warning looks like. */
export const EXAMPLE_THEME = {
  $schema: "https://raw.githubusercontent.com/forspringai/ui/main/schema/customer-theme.schema.json",
  $description: "Example Bakery (invented)",
  level: "brand",
  brand: {
    accent: { light: "#6c3012", dark: "#e08a5c" },
    tint: { light: "#f1ebe4", dark: "#26211d" },
    charts: [
      { light: "#6c3012", dark: "#e08a5c" },
      { light: "#2f6690", dark: "#6fa8d6" },
      { light: "#6b7f2a", dark: "#a3b85c" },
    ],
    states: { proofing: { light: "#5b4aa8", dark: "#9d8fe0" }, baked: { light: "#00707a", dark: "#4fb3bd" } },
  },
} as const;

// The screens, relative to dist/demo/. The components page reads ?product= and ?theme= itself.
const SCREENS = [
  ["index.html", "All components (Danish)"],
  ["pages/lead.en.html", "A record with a form and a dialog"],
  ["pages/org-picker.en.html", "Choose an organization"],
  ["pages/connect.en.html", "Connect an agent"],
  ["pages/refused-role_too_low.en.html", "A page that says no"],
  ["pages/delete-site.en.html", "Confirm a deletion"],
] as const;

const PRODUCTS = [
  ["appspring", "AppSpring"],
  ["forspring", "Forspring"],
  ["spring", "Spring"],
  ["sitespring", "SiteSpring"],
  ["dataspring", "DataSpring"],
  ["pulsespring", "PulseSpring"],
  ["flowspring", "FlowSpring"],
] as const;

const options = (items: readonly (readonly [string, string])[], selected: string) =>
  items.map(([v, l]) => html`<option value="${v}"${raw(v === selected ? " selected" : "")}>${l}</option>`);

// D-65: the preview takes the page's width (the desktop layout, or a phone's 390 px when asked) and
// its full height, so the page scrolls and the frame never does. The file and its result stay in view
// beside it. The page keeps its own look: only the frame, and the result's swatches, wear the theme.
const STYLE = raw(`<style>
.wrap { max-width: 100rem; }
#tp-view { margin: 0; }
#tp { display: grid; gap: var(--space-6); grid-template-columns: minmax(18rem, 26rem) minmax(0, 1fr); align-items: start; }
@media (max-width: 60rem) { #tp { grid-template-columns: minmax(0, 1fr); } }
#tp > * { min-inline-size: 0; }
#tp-form { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--space-4); padding: var(--space-5); margin: 0; }
@media (min-width: 60.01rem) { #tp-form { position: sticky; top: var(--space-4); max-block-size: calc(100dvh - 2 * var(--space-4)); overflow: auto; } }
#tp-form > * { margin: 0; }
#tp-form label { font-weight: 600; }
#tp-form input[type="file"] { inline-size: 100%; }
#tp-form textarea { font-family: var(--font-mono, ui-monospace, monospace); font-size: 0.8125rem; inline-size: 100%; max-inline-size: 100%; block-size: 12rem; resize: vertical; }
#tp-buttons { display: flex; flex-wrap: wrap; gap: var(--space-3); }
#tp-result:empty { display: none; }
#tp-result > * { margin-block: 0 var(--space-3); }
#tp-result > :last-child { margin-block-end: 0; }
#tp-result h3 { font-size: var(--text-content-body); margin-block-end: var(--space-2); }
#tp-result ul { padding-inline-start: var(--space-5); }
#tp-result li { margin-block-end: var(--space-3); }
#tp-result li > button { margin-block-start: var(--space-2); }
#tp-result code { overflow-wrap: anywhere; }
#tp-swatches { display: grid; grid-template-columns: repeat(auto-fill, minmax(7.5rem, 1fr)); gap: var(--space-2); padding: 0 !important; list-style: none; }
#tp-swatches li { display: flex; align-items: center; gap: var(--space-2); margin: 0; padding: var(--space-1) var(--space-3); border-radius: var(--radius-button); font-size: 0.875rem; }
#tp-swatches span { flex: none; inline-size: 1rem; block-size: 1rem; border-radius: var(--radius-input); }
#tp-logo img { max-block-size: 3rem; max-inline-size: 100%; }
#tp-view { display: grid; gap: var(--space-3); }
#tp-controls { display: flex; flex-wrap: wrap; gap: var(--space-3); align-items: end; }
#tp-controls p { display: grid; gap: var(--space-1); margin: 0; flex: 1 1 9rem; }
#tp-controls label { font-weight: 600; font-size: var(--text-content-small); }
#tp-controls select { inline-size: 100%; }
#tp-stage { display: grid; justify-items: center; padding: 0; overflow: hidden; }
#tp-frame { display: block; inline-size: 100%; block-size: 40rem; border: 0; background: var(--background); }
#tp-stage[data-width="phone"] { background: var(--muted); padding: var(--space-4) 0; }
#tp-stage[data-width="phone"] #tp-frame { inline-size: min(390px, 100%); border: 1px solid var(--border); border-radius: var(--radius-card); }
</style>`);

const SCRIPT = raw(`<script type="module">
import { validateTheme, customerTheme } from "../theme.js";
const EXAMPLE = ${JSON.stringify(JSON.stringify(EXAMPLE_THEME, null, 2))};
const SELECTOR = "html[data-customer-theme]";
const $ = (id) => document.getElementById(id);
const form = $("tp-form"), controls = $("tp-controls"), text = $("tp-text"), frame = $("tp-frame"), stage = $("tp-stage"), result = $("tp-result");
let css = "", swatchCss = "";

const el = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids); return e; };
const code = (s) => el("code", { textContent: s });
const notice = (tone, words) => el("div", { className: "notice " + tone, role: tone === "error" ? "alert" : "status" }, el("div", { className: "notice-body" }, el("p", { textContent: words })));

// Only the screen in the frame wears the customer's values; this page keeps the family's look (D-65).
// The frame's own product and theme switchers are hidden: the controls above the frame set both.
function wear() {
  const doc = frame.contentDocument;
  if (!doc?.head) return;
  doc.getElementById("customer-theme")?.remove();
  doc.documentElement.toggleAttribute("data-customer-theme", !!css);
  const mode = controls.mode.value;
  if (mode === "system") delete doc.documentElement.dataset.theme; else doc.documentElement.dataset.theme = mode;
  doc.documentElement.dataset.product = controls.product.value;
  if (css) doc.head.append(el("style", { id: "customer-theme", textContent: css }));
  if (!doc.getElementById("tp-host")) doc.head.append(el("style", { id: "tp-host", textContent: ".demo-controls { display: none; } body { min-height: 0; }" }));
  fit();
}

// The frame is as tall as its screen, so the page scrolls and the frame never does. Measured on the body
// (its min-height is taken off above), not the document: a document is never shorter than its window, so
// a frame grown for a taller state (a phone width, a longer screen) could never shrink back (D-68).
function fit() {
  const doc = frame.contentDocument;
  if (!doc?.body) return;
  const body = doc.body, m = getComputedStyle(body);
  const content = Math.max(body.getBoundingClientRect().bottom + doc.defaultView.scrollY, body.scrollHeight) + parseFloat(m.marginBottom);
  const want = Math.max(Math.ceil(content), 480) + "px";
  if (frame.style.blockSize !== want) frame.style.blockSize = want;
}

function problems(title, list) {
  if (!list.length) return [];
  return [el("h3", { textContent: title }), el("ul", {}, ...list.map((p) => el("li", {},
    p.message.replace(/;?\\s*$/, ".") + " ",
    el("span", { className: "meta" }, "(", code(p.path || "the file"), ")"),
    ...(p.fix ? [el("br"), "Suggested: ", code(p.fix), ...(p.path ? [" ", el("button", { type: "button", className: "ghost small", textContent: "Use " + p.fix, onclick: () => use(p.path, p.fix) })] : [])] : []),
  )))];
}

// "Use this value": the suggested value goes into the file at its path, and the file is checked again.
function use(path, value) {
  try {
    const file = JSON.parse(text.value);
    const keys = path.split(".");
    let o = file;
    for (const k of keys.slice(0, -1)) o = o[k];
    o[keys.at(-1)] = value;
    text.value = JSON.stringify(file, null, 2);
    run();
  } catch {}
}

function run(asked) {
  let file;
  result.replaceChildren();
  css = swatchCss = "";
  const src = text.value.trim();
  if (!src && asked) result.append(notice("error", "There is no theme to check yet. Choose a file, paste one, or load the example."));
  if (src) {
    try { file = JSON.parse(src); }
    catch (e) { result.append(notice("error", "This is not a theme file: it is not valid JSON (" + e.message + ").")); }
  }
  if (file !== undefined) {
    const product = controls.product.value;
    const v = validateTheme(file, { product });
    result.append(notice(v.ok ? "success" : "error", v.ok
      ? "The theme passes" + (v.warnings.length ? ", with " + v.warnings.length + " warning" + (v.warnings.length === 1 ? "" : "s") + ". A warning never stops a theme." : ".")
      : "The theme can't be used yet: " + v.errors.length + " error" + (v.errors.length === 1 ? "" : "s") + ". The preview shows the standard look until it passes."));
    result.append(...problems("Errors", v.errors), ...problems("Warnings", v.warnings));
    if (v.ok) {
      const t = customerTheme(file, { product, selector: SELECTOR });
      css = t.css;
      swatchCss = customerTheme(file, { product, selector: "#tp-swatches" }).css;
      const chips = [
        ...Object.keys(t.states).map((k) => el("li", { style: "background: var(--state-" + k + "-soft); color: var(--state-" + k + ")" }, "state " + k)),
        // A chart slot is a mark (3:1), not a text background: a swatch beside its name.
        ...(file.brand?.charts ?? []).map((_, i) => el("li", {}, el("span", { style: "background: var(--chart-" + (i + 1) + ")" }), "chart " + (i + 1))),
      ];
      if (chips.length) result.append(el("h3", { textContent: "States and chart colours" }), el("ul", { id: "tp-swatches" }, ...chips));
      // An https: or data:image/ logo shows here; a path in the app's bundle cannot be read from this page.
      const logo = t.logo && (controls.mode.value === "dark" || (controls.mode.value === "system" && matchMedia("(prefers-color-scheme: dark)").matches) ? t.logo.dark : t.logo?.light);
      if (logo) result.append(el("h3", { textContent: "Logo" }), /^(https:|data:image\\/)/.test(logo) ? el("p", { id: "tp-logo" }, el("img", { src: logo, alt: t.logo.alt })) : el("p", { textContent: "A path in the app's bundle (" + logo + "): AppSpring shows it; this page cannot read it." }));
    }
    try { history.replaceState(null, "", "#theme=" + btoa(String.fromCharCode(...new TextEncoder().encode(src))).replace(/\\+/g, "-").replace(/\\//g, "_").replace(/=+$/, "")); } catch {}
  }
  $("tp-swatch-theme").textContent = swatchCss;
  const scheme = controls.mode.value;
  $("tp-swatches")?.style.setProperty("color-scheme", scheme === "system" ? "light dark" : scheme);
  wear();
}

function show() {
  const screen = controls.screen.value, mode = controls.mode.value;
  frame.style.blockSize = "";
  frame.src = screen === "index.html" ? "index.html?product=" + controls.product.value + (mode === "system" ? "" : "&theme=" + mode) : screen;
}

// A dialog opened in the frame is drawn in the middle of the frame's full height: bring it into view.
function followDialogs() {
  frame.contentDocument?.addEventListener("click", () => requestAnimationFrame(() => {
    const d = frame.contentDocument?.querySelector("dialog[open]");
    if (d) scrollTo({ top: frame.getBoundingClientRect().top + scrollY + d.getBoundingClientRect().top - 24, behavior: "smooth" });
  }));
  new ResizeObserver(fit).observe(frame.contentDocument.body);
}

frame.addEventListener("load", () => { wear(); followDialogs(); });
form.addEventListener("submit", (e) => { e.preventDefault(); run(true); });
controls.screen.addEventListener("change", show);
controls.product.addEventListener("change", () => { run(); show(); });
controls.mode.addEventListener("change", () => { run(); show(); });
controls.width.addEventListener("change", () => { stage.dataset.width = controls.width.value; requestAnimationFrame(fit); });
$("tp-example").addEventListener("click", () => { text.value = EXAMPLE; run(); });
// A file is shown laid out, as the example is, so its lines can be read and edited.
$("tp-file").addEventListener("change", async (e) => {
  const f = e.target.files?.[0];
  if (!f) return;
  const t = await f.text();
  try { text.value = JSON.stringify(JSON.parse(t), null, 2); } catch { text.value = t; }
  run(true);
});

const m = /^#theme=([A-Za-z0-9_-]+)$/.exec(location.hash);
if (m) {
  try {
    const b = atob(m[1].replace(/-/g, "+").replace(/_/g, "/"));
    text.value = new TextDecoder().decode(Uint8Array.from(b, (c) => c.charCodeAt(0)));
  } catch {}
}
show();
run();
</script>`);

/** The theme preview page, written to dist/demo/theme-preview.html. */
export function themePreviewPage(): string {
  const body = html`<h1>Preview a theme</h1>
<p class="lede">Choose or paste your theme file to see your colours on Forspring's screens. The page checks the file and says what to change if a colour is hard to read. It all happens in your browser: nothing is sent anywhere. To share a preview, copy the page's address. It carries the file.</p>
<div id="tp">
<form id="tp-form" class="card" aria-label="Your theme file">
<p><label for="tp-file">Theme file</label><br><input id="tp-file" type="file" accept=".json,application/json"></p>
<p><label for="tp-text">Or paste it</label><br><textarea id="tp-text" name="text" spellcheck="false" autocomplete="off"></textarea></p>
<div id="tp-buttons"><button type="submit">Check and preview</button><button type="button" class="ghost" id="tp-example">Load an example</button></div>
<div id="tp-result" aria-live="polite"></div>
</form>
<section id="tp-view" aria-label="Preview">
<form id="tp-controls" aria-label="What the preview shows">
<p><label for="tp-product">Product</label><select id="tp-product" name="product">${options(PRODUCTS, "appspring")}</select></p>
<p><label for="tp-mode">Light or dark</label><select id="tp-mode" name="mode">${options([["system", "As your system"], ["light", "Light"], ["dark", "Dark"]], "system")}</select></p>
<p><label for="tp-screen">Screen</label><select id="tp-screen" name="screen">${options(SCREENS, "index.html")}</select></p>
<p><label for="tp-width">Width</label><select id="tp-width" name="width">${options([["full", "Desktop"], ["phone", "Phone"]], "full")}</select></p>
</form>
<div id="tp-stage" class="card" data-width="full"><iframe id="tp-frame" title="The screen in your theme"></iframe></div>
</section>
</div>
<style id="tp-swatch-theme"></style>`;
  return (
    String(
      shell({
        lang: "en",
        title: "Theme preview",
        productLabel: "ui",
        homeLabel: "Forspring ui, all components",
        brandBase: "../brand/",
        head: raw(`<link rel="stylesheet" href="../tokens.css"><link rel="stylesheet" href="../fonts.css"><link rel="stylesheet" href="../components.css">${STYLE}`),
        footer: [{ label: "All components", href: "index.html" }],
        body: html`${body}${SCRIPT}`,
      }),
    ) + "\n"
  );
}

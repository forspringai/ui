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
  ["pages/lead.en.html", "An AppSpring record with a form and a dialog"],
  ["pages/org-picker.en.html", "Org picker"],
  ["pages/connect.en.html", "Connect an agent"],
  ["pages/refused-role_too_low.en.html", "A refusal page"],
  ["pages/delete-site.en.html", "A destructive confirmation"],
] as const;

const PRODUCTS = ["appspring", "forspring", "spring", "sitespring", "dataspring", "pulsespring", "flowspring"] as const;

const options = (items: readonly (readonly [string, string])[], selected: string) =>
  items.map(([v, l]) => html`<option value="${v}"${raw(v === selected ? " selected" : "")}>${l}</option>`);

const STYLE = raw(`<style>
#tp { display: grid; gap: var(--space-6); grid-template-columns: minmax(18rem, 26rem) 1fr; align-items: start; }
@media (max-width: 60rem) { #tp { grid-template-columns: 1fr; } }
#tp > * { min-inline-size: 0; }
#tp-form { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--space-4); padding: var(--space-5); }
#tp-form > * { margin: 0; }
#tp-form textarea { font-family: var(--font-mono, ui-monospace, monospace); font-size: 0.8125rem; min-block-size: 14rem; field-sizing: content; inline-size: 100%; max-inline-size: 100%; }
#tp-buttons { display: flex; flex-wrap: wrap; gap: var(--space-3); }
#tp-result > * { margin-block: 0 var(--space-3); }
#tp-result li { margin-block-end: var(--space-2); }
#tp-result code { overflow-wrap: anywhere; }
#tp-swatches { display: flex; flex-wrap: wrap; gap: var(--space-2); padding: 0; margin: 0; list-style: none; }
#tp-swatches li { display: inline-flex; align-items: center; gap: var(--space-2); padding: var(--space-1) var(--space-3); border-radius: var(--radius-button); font-size: 0.875rem; }
#tp-swatches span { inline-size: 1rem; block-size: 1rem; border-radius: var(--radius-input); }
#tp-logo img { max-block-size: 3rem; max-inline-size: 100%; }
#tp-frame { inline-size: 100%; block-size: 80vh; border: 1px solid var(--border); border-radius: var(--radius-card); background: var(--background); }
</style>`);

const SCRIPT = raw(`<script type="module">
import { validateTheme, customerTheme } from "../theme.js";
const EXAMPLE = ${JSON.stringify(JSON.stringify(EXAMPLE_THEME, null, 2))};
const SELECTOR = "html[data-customer-theme]";
const $ = (id) => document.getElementById(id);
const form = $("tp-form"), text = $("tp-text"), frame = $("tp-frame"), result = $("tp-result");
let css = "";

const el = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids); return e; };
const code = (s) => el("code", { textContent: s });

// The customer's values go on this page and on the screen in the frame, under one selector.
function wear(doc) {
  if (!doc) return;
  doc.getElementById("customer-theme")?.remove();
  doc.documentElement.toggleAttribute("data-customer-theme", !!css);
  const mode = form.mode.value;
  if (mode === "system") delete doc.documentElement.dataset.theme; else doc.documentElement.dataset.theme = mode;
  if (doc !== document) doc.documentElement.dataset.product = form.product.value;
  if (css) doc.head.append(el("style", { id: "customer-theme", textContent: css }));
}

function problems(title, list) {
  if (!list.length) return [];
  return [el("h3", { textContent: title }), el("ul", {}, ...list.map((p) => el("li", {}, code(p.code), " at ", code(p.path || "(file)"), ": " + p.message + (p.fix ? " " : ""), ...(p.fix ? [el("b", { textContent: "Suggested: " }), code(p.fix)] : []))))];
}

function run() {
  let file;
  result.replaceChildren();
  css = "";
  const src = text.value.trim();
  if (src) {
    try { file = JSON.parse(src); }
    catch (e) { result.append(el("div", { className: "notice error", role: "alert" }, el("p", { textContent: "Not JSON: " + e.message }))); }
  }
  if (file !== undefined) {
    const product = form.product.value;
    const v = validateTheme(file, { product });
    result.append(el("div", { className: v.ok ? "notice success" : "notice error" }, el("p", { textContent: v.ok
      ? "The theme passes" + (v.warnings.length ? ", with " + v.warnings.length + " warning" + (v.warnings.length === 1 ? "" : "s") + " (warnings never refuse)." : ".")
      : "The theme is refused: " + v.errors.length + " error" + (v.errors.length === 1 ? "" : "s") + ". The screens show the family's own look until it passes." })));
    result.append(...problems("Errors", v.errors), ...problems("Warnings", v.warnings));
    if (v.ok) {
      const t = customerTheme(file, { product, selector: SELECTOR });
      css = t.css;
      const chips = [
        ...Object.keys(t.states).map((k) => el("li", { style: "background: var(--state-" + k + "-soft); color: var(--state-" + k + ")" }, "state " + k)),
        // A chart slot is a mark (3:1), not a text background: a swatch beside its name.
        ...(file.brand?.charts ?? []).map((_, i) => el("li", {}, el("span", { style: "background: var(--chart-" + (i + 1) + ")" }), "chart-" + (i + 1))),
      ];
      if (chips.length) result.append(el("h3", { textContent: "States and chart slots" }), el("ul", { id: "tp-swatches" }, ...chips));
      // An https: or data:image/ logo shows here; a path in the app's bundle cannot be read from this page.
      const logo = t.logo && (document.documentElement.dataset.theme === "dark" || (form.mode.value === "system" && matchMedia("(prefers-color-scheme: dark)").matches) ? t.logo.dark : t.logo?.light);
      if (logo) result.append(el("h3", { textContent: "Logo" }), /^(https:|data:image\\/)/.test(logo) ? el("p", { id: "tp-logo" }, el("img", { src: logo, alt: t.logo.alt })) : el("p", { textContent: "A path in the app's bundle (" + logo + "): AppSpring shows it; this page cannot read it." }));
    }
    try { history.replaceState(null, "", "#theme=" + btoa(String.fromCharCode(...new TextEncoder().encode(src))).replace(/\\+/g, "-").replace(/\\//g, "_").replace(/=+$/, "")); } catch {}
  }
  wear(document);
  wear(frame.contentDocument);
}

function show() {
  const screen = form.screen.value;
  frame.src = screen === "index.html" ? "index.html?product=" + form.product.value + (form.mode.value === "system" ? "" : "&theme=" + form.mode.value) : screen;
}

frame.addEventListener("load", () => wear(frame.contentDocument));
form.addEventListener("submit", (e) => { e.preventDefault(); run(); });
form.screen.addEventListener("change", show);
form.product.addEventListener("change", () => { run(); show(); });
form.mode.addEventListener("change", () => { run(); show(); });
$("tp-example").addEventListener("click", () => { text.value = EXAMPLE; run(); });
$("tp-file").addEventListener("change", async (e) => { const f = e.target.files?.[0]; if (f) { text.value = await f.text(); run(); } });

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
  const body = html`<h1>Preview a customer theme</h1>
<p class="lede">Load or paste a theme file (<a href="https://github.com/forspringai/ui/blob/main/schema/customer-theme.schema.json">customer-theme.schema.json</a>). This page checks it with <code>validateTheme()</code> and puts it on the family's own screens with <code>customerTheme()</code>, in your browser. Nothing is sent anywhere. Copy the address to share a preview: it carries the file.</p>
<div id="tp">
<form id="tp-form" class="card" aria-label="Theme file">
<p><label for="tp-file">Theme file</label><br><input id="tp-file" type="file" accept=".json,application/json"></p>
<p><label for="tp-text">Or paste it</label><br><textarea id="tp-text" name="text" spellcheck="false" autocomplete="off"></textarea></p>
<p><label for="tp-product">Product the theme is checked against</label><br><select id="tp-product" name="product">${options(PRODUCTS.map((p) => [p, p] as const), "appspring")}</select></p>
<p><label for="tp-mode">Light or dark</label><br><select id="tp-mode" name="mode">${options([["system", "As the system"], ["light", "Light"], ["dark", "Dark"]], "system")}</select></p>
<p><label for="tp-screen">Screen</label><br><select id="tp-screen" name="screen">${options(SCREENS, "index.html")}</select></p>
<div id="tp-buttons"><button type="submit">Check and preview</button><button type="button" class="ghost" id="tp-example">Load an example</button></div>
<div id="tp-result" aria-live="polite"></div>
</form>
<iframe id="tp-frame" title="The screen in your theme"></iframe>
</div>`;
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

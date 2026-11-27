// dist/demo/buttons.html: every button @forspring/ui draws, side by side, measured (D-69).
//
// Peter's question on the theme preview's review: "Overall are _all_ button styles consistent?" This page
// is the answer with evidence. Each row is one variant or state as the package draws it (the helper's own
// markup where there is a helper), at rest and with the focus ring, and the page measures it in the browser:
// height, padding, radius, type, border, colours and the ring. Each row names the size it belongs to (the
// default 44px control, the small 32px one, an icon-only square, the tag's 24px x, or a shape of its own
// with the reason), and a value off that size's tokens is marked. test/buttons-browser.test.ts loads it in
// every product and theme and fails on any mark, and on a button variant in components.css that is not on
// the page, so a new variant cannot drift unseen.

import { actions, button, dialogTrigger, googleButton, holdToConfirm, html, icon, notice, raw, removableTag, shell, strip, toast, type Html } from "../src/html.ts";

/** The sizes a button can be: what the tokens say each measures. */
export const SIZES = {
  default: "the default control: --control-height tall, 12px by 20px of padding, --radius-button, 600 at 14px, a 1px border",
  small: "the small control: --control-height-small tall, 4px by 12px of padding, --radius-button, 600 at 13px, a 1px border",
  "icon-small": "an icon-only small control: a --control-height-small square, --radius-button, a 1px border",
  "tag-x": "a removable tag's x: a 24px circle with no border (D-52); a phone's touch box overhangs (D-65)",
  filter: "a filter chip: the small control's height, a pill (999px), 500 at 14px; a filter, not an action",
  google: "Google's own button (D-35): Google's sizes and colours, not ours",
} as const;
export type Size = keyof typeof SIZES;

type Row = { id: string; name: string; size: Size; sample: Html; note?: string; /** The element measured, when not the first button. */ target?: string };

// Buttons that do things to a page are inert here: no form posts, no link leaves.
const b = (o: Parameters<typeof button>[0]) => button({ type: "button", ...o });

export const ROWS: readonly { group: string; rows: Row[] }[] = [
  {
    group: "Actions, default size",
    rows: [
      { id: "primary", name: "Primary", size: "default", sample: b({ label: "Save" }) },
      { id: "primary-link", name: "Primary, a link", size: "default", sample: button({ label: "Open SiteSpring", href: "#" }) },
      { id: "ghost", name: "Secondary (ghost)", size: "default", sample: b({ label: "Cancel", variant: "ghost" }) },
      { id: "ghost-link", name: "Secondary, a link", size: "default", sample: button({ label: "See the changes", variant: "ghost", href: "#" }) },
      { id: "danger", name: "Destructive", size: "default", sample: b({ label: "Delete site", variant: "danger" }) },
      { id: "success", name: "Success", size: "default", sample: b({ label: "Approve", variant: "success" }) },
      { id: "warning", name: "Warning", size: "default", sample: b({ label: "Choose a plan", variant: "warning" }) },
      { id: "critical", name: "Critical", size: "default", sample: b({ label: "Stop the run", variant: "critical" }) },
      { id: "icon-label", name: "With an icon", size: "default", sample: b({ label: "New customer", icon: "plus" }) },
      { id: "icon-label-ghost", name: "Ghost with an icon", size: "default", sample: b({ label: "Download CSV", icon: "download", variant: "ghost" }) },
      { id: "hold", name: "Hold to confirm", size: "default", sample: holdToConfirm({ lang: "en", id: "inv-hold", label: "Delete site", holdLabel: "Hold to delete the site", dialog: "inv-none", href: "#", action: "#", fields: {} }) },
    ],
  },
  {
    group: "Actions, small size",
    rows: [
      { id: "small-primary", name: "Primary, small", size: "small", sample: b({ label: "Accept", small: true }) },
      { id: "small-ghost", name: "Ghost, small (the theme preview's Use)", size: "small", sample: b({ label: "Use #6e6e00", variant: "ghost", small: true }) },
      { id: "small-danger", name: "Destructive, small", size: "small", sample: b({ label: "Remove", variant: "danger", small: true }) },
      { id: "small-icon", name: "Icon only, small", size: "icon-small", sample: b({ label: "", icon: "trash", variant: "danger", small: true, ariaLabel: "Delete the customer" }) },
      { id: "notice-action", name: "A notice's action", size: "small", sample: notice({ tone: "warning", text: "Your trial ends in 3 days.", action: { label: "Choose a plan", href: "#" } }) },
      { id: "dialog-trigger", name: "A dialog's trigger, small", size: "small", sample: dialogTrigger({ dialog: "inv-none", href: "#", label: "Rename", variant: "ghost", small: true }) },
      { id: "bar-menu", name: "A bar menu (org, products)", size: "small", sample: raw('<details class="switcher bar-menu"><summary>Products</summary></details>') },
      { id: "file", name: "A file input's button", size: "small", sample: raw('<input type="file" aria-label="Theme file">') },
      { id: "toast-undo", name: "A toast's Undo", size: "small", sample: toast({ lang: "en", id: "inv-toast-undo", tone: "success", text: "The page is archived.", dismissHref: "#", undo: { action: "#", fields: {} } }), target: ".toast-undo-form button" },
      { id: "toast-close", name: "A toast's close", size: "icon-small", sample: toast({ lang: "en", id: "inv-toast-close", tone: "info", text: "The export has started.", dismissHref: "#" }), target: ".toast-dismiss" },
      { id: "strip-action", name: "The strip's way out (D-48)", size: "small", sample: strip({ text: "You are viewing as a viewer.", action: { label: "Stop viewing as", href: "#" } }), target: ".strip-action" },
      { id: "copy", name: "Copy (the connect panel)", size: "small", sample: raw('<button type="button" class="ghost small connect-copy"><span class="copy-label">Copy<span class="visually-hidden"> the command</span></span><span class="copy-done">Copied</span></button>') },
    ],
  },
  {
    group: "States",
    rows: [
      { id: "working", name: "Working (D-53)", size: "default", sample: button({ label: "Publish", progress: { lang: "en", state: "working" } }) },
      { id: "done", name: "Done (D-53)", size: "default", sample: button({ label: "Publish", progress: { lang: "en", state: "done" } }) },
      { id: "unavailable", name: "Unavailable until the name is typed (D-23)", size: "default", sample: raw('<form class="dialog-form" onsubmit="return false"><input required aria-label="Type the name" hidden><div class="dialog-actions"><button type="button" class="danger">Delete site</button></div></form>'), note: "a live button in muted words: pressing it says what is missing" },
    ],
  },
  {
    group: "Shapes of their own",
    rows: [
      { id: "tag-x", name: "A removable tag's x", size: "tag-x", sample: removableTag({ text: "Chef", remove: { label: "Remove Chef from Carla", name: "role", value: "chef" } }) },
      { id: "chip", name: "A filter chip", size: "filter", sample: raw('<a class="chip" href="#">Overdue <span class="chip-count">3</span></a>') },
      { id: "google", name: "Continue with Google", size: "google", sample: googleButton("Continue with Google") },
    ],
  },
];

const rowHtml = (r: Row) =>
  html`<tr data-row="${r.id}" data-size="${r.size}"${raw(r.target ? ` data-target="${r.target}"` : "")}><th scope="row">${r.name}${r.note ? html`<br><span class="meta">${r.note}</span>` : ""}<br><span class="meta">${r.size}</span></th><td class="inv-sample">${r.sample}</td><td class="inv-sample inv-focus">${r.sample}</td><td class="inv-m" data-m="box"></td><td class="inv-m" data-m="type"></td><td class="inv-m" data-m="paint"></td><td class="inv-m" data-m="ring"></td></tr>`;

const STYLE = raw(`<style>
.wrap { max-width: 100rem; }
#inv-controls { display: flex; flex-wrap: wrap; gap: var(--space-3); align-items: end; margin-block-end: var(--space-6); }
#inv-controls p { display: grid; gap: var(--space-1); margin: 0; }
#inv-controls label { font-weight: 600; font-size: var(--text-content-small); }
.inv-table td, .inv-table th { vertical-align: middle; }
.inv-table th[scope=row] { white-space: normal; min-inline-size: 12rem; }
.inv-sample { min-inline-size: 12rem; }
.inv-sample .notice { margin: 0; }
.inv-sample .toast { position: static; inset: auto; inline-size: auto; max-inline-size: 22rem; box-shadow: none; }
.inv-sample .strip { border-radius: var(--radius-card); }
.inv-m { font: 400 var(--text-chrome-meta)/1.5 var(--font-mono, ui-monospace, monospace); white-space: pre; }
.inv-m .bad { color: var(--danger); font-weight: 700; }
.inv-m .bad::before { content: "≠ "; }
#inv-summary .notice { margin: 0 0 var(--space-6); }
</style>`);

// Measures every sample against its size's tokens, and writes what it found beside it. data-drift on the
// table is the count of values off their tokens; the browser test reads it.
const SCRIPT = raw(`<script type="module">
const root = document.documentElement, q = new URLSearchParams(location.search);
const form = document.getElementById("inv-controls");
const px = (v) => { const p = document.createElement("div"); p.style.cssText = "position:absolute;visibility:hidden;inline-size:" + v; document.body.append(p); const w = p.getBoundingClientRect().width; p.remove(); return Math.round(w * 100) / 100; };
const T = () => ({ h: px("var(--control-height)"), hs: px("var(--control-height-small)"), r: px("var(--radius-button)"), s1: px("var(--space-1)"), s3: px("var(--space-3)"), s5: px("var(--space-5)"), s6: px("var(--space-6)"), body: px("var(--text-chrome-body)"), small: px("var(--text-content-small)") });
// The control a row measures: the first button-like element in its sample.
const target = (td) => (td.closest("tr").dataset.target && td.querySelector(td.closest("tr").dataset.target)) || td.querySelector("input[type=file]") || td.querySelector(".tag-remove") || td.querySelector("summary") || td.querySelector(".gsi") || td.querySelector(".notice .button") || td.querySelector("button, .button, .chip");
const r1 = (n) => Math.round(n * 10) / 10;
function spec(size, t) {
  switch (size) {
    case "default": return { height: t.h, padY: t.s3, padX: t.s5, radius: t.r, weight: "600", font: t.body, border: 1 };
    case "small": return { height: t.hs, padY: t.s1, padX: t.s3, radius: t.r, weight: "600", font: t.small, border: 1 };
    case "icon-small": return { height: t.hs, width: t.hs, radius: t.r, border: 1 };
    case "tag-x": return { height: t.s6, width: t.s6, radius: 999, border: 0 };
    case "filter": return { height: t.hs, radius: 999, weight: "500", font: t.body, border: 1 };
    default: return {};
  }
}
function measure() {
  const t = T();
  let drift = 0;
  for (const tr of document.querySelectorAll("tr[data-row]")) {
    const [rest, focus] = tr.querySelectorAll(".inv-sample");
    let el = target(rest), fel = target(focus);
    const file = el?.matches("input[type=file]");
    // A file input's button is its ::file-selector-button: measured from its computed style.
    const cs = file ? getComputedStyle(el, "::file-selector-button") : getComputedStyle(el);
    const box = el.getBoundingClientRect();
    const height = file ? r1(parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom) + parseFloat(cs.borderTopWidth) * 2 + parseFloat(cs.lineHeight)) : r1(box.height);
    const width = r1(box.width);
    const m = { height, width, padY: r1(parseFloat(cs.paddingTop)), padX: r1(parseFloat(cs.paddingLeft)), radius: r1(Math.min(parseFloat(cs.borderTopLeftRadius), 999)), weight: cs.fontWeight, font: r1(parseFloat(cs.fontSize)), border: r1(parseFloat(cs.borderTopWidth)) };
    const want = spec(tr.dataset.size, t);
    const cell = (k, label, v, unit = "px") => { const w = want[k]; const off = w !== undefined && (typeof w === "string" ? String(v) !== w : (k === "radius" && w === 999 ? v < Math.min(m.height, m.width) / 2 - 0.5 : Math.abs(v - w) > 0.5)); if (off) drift++; return "<span" + (off ? " class=bad title='expected " + w + "'" : "") + ">" + label + " " + v + (unit && typeof v === "number" ? unit : "") + "</span>"; };
    tr.querySelector('[data-m="box"]').innerHTML = [cell("height", "height", m.height), cell("width", "width", m.width), cell("padY", "pad y", m.padY), cell("padX", "pad x", m.padX), cell("radius", "radius", m.radius)].join("\\n");
    tr.querySelector('[data-m="type"]').innerHTML = [cell("weight", "weight", m.weight, ""), cell("font", "size", m.font), "<span>" + cs.fontFamily.split(",")[0].replace(/"/g, "") + "</span>"].join("\\n");
    tr.querySelector('[data-m="paint"]').innerHTML = [cell("border", "border", m.border), "<span>" + cs.borderTopColor + "</span>", "<span>bg " + cs.backgroundColor + "</span>", "<span>ink " + cs.color + "</span>"].join("\\n");
    // The ring, on the copy that carries data-focus-ring: the same rule as :focus-visible.
    fel?.setAttribute("data-focus-ring", "");
    const fs = fel && getComputedStyle(fel);
    const ring = fs ? fs.outlineWidth + " " + fs.outlineStyle + " offset " + fs.outlineOffset : "";
    const ringOk = fs && fs.outlineStyle === "solid" && fs.outlineWidth === "2px" && fs.outlineOffset === "2px" && fs.outlineColor === getComputedStyle(root).getPropertyValue("--ring").trim().replace(/^$/, fs.outlineColor);
    const ringOff = tr.dataset.size !== "google" && !(fs && fs.outlineStyle === "solid" && fs.outlineWidth === "2px" && fs.outlineOffset === "2px");
    if (ringOff) drift++;
    tr.querySelector('[data-m="ring"]').innerHTML = (ringOff ? "<span class=bad>" : "<span>") + ring + "</span>\\n<span>" + (fs ? fs.outlineColor : "") + "</span>";
  }
  const table = document.getElementById("inv-table");
  table.dataset.drift = String(drift);
  document.getElementById("inv-summary").innerHTML = drift
    ? '<div class="notice error" role="status"><div class="notice-body"><p>' + drift + " value" + (drift === 1 ? " is" : "s are") + " off their size's tokens (marked ≠ below).</p></div></div>"
    : '<div class="notice success" role="status"><div class="notice-body"><p>Every button matches its size\\'s tokens, and every one has the same focus ring.</p></div></div>';
  table.dataset.measured = "1";
}
const apply = () => {
  root.dataset.product = form.product.value;
  if (form.theme.value === "system") delete root.dataset.theme; else root.dataset.theme = form.theme.value;
  requestAnimationFrame(() => requestAnimationFrame(measure));
};
if (q.get("product")) form.product.value = q.get("product");
if (q.get("theme")) form.theme.value = q.get("theme");
form.addEventListener("change", apply);
document.fonts.ready.then(apply);
</script>`);

const PRODUCTS = ["forspring", "spring", "sitespring", "dataspring", "appspring", "pulsespring", "flowspring"];

/** The button inventory, written to dist/demo/buttons.html. */
export function buttonsPage(): string {
  const body = html`<h1>Buttons</h1>
<p class="lede">Every button the package draws, at rest and with the keyboard's focus ring, measured in your browser against the tokens for its size. A value off its size is marked ≠. Hover any of them to see its hover.</p>
<form id="inv-controls" aria-label="Product and theme">
<p><label for="inv-product">Product</label><select id="inv-product" name="product">${PRODUCTS.map((p) => html`<option value="${p}">${p}</option>`)}</select></p>
<p><label for="inv-theme">Light or dark</label><select id="inv-theme" name="theme"><option value="system">As your system</option><option value="light">Light</option><option value="dark">Dark</option></select></p>
</form>
<div id="inv-summary" aria-live="polite"></div>
<h2>The sizes</h2>
<ul>${Object.entries(SIZES).map(([k, v]) => html`<li><b>${k}</b>: ${v}</li>`)}</ul>
<div class="table-wrap" tabindex="0"><table id="inv-table" class="inv-table"><caption>Every variant and state</caption>
<thead><tr><th scope="col">Variant</th><th scope="col">At rest</th><th scope="col">Focus ring</th><th scope="col">Box</th><th scope="col">Type</th><th scope="col">Paint</th><th scope="col">Ring</th></tr></thead>
${ROWS.map((g) => html`<tbody><tr><th colspan="7" scope="rowgroup">${g.group}</th></tr>${g.rows.map(rowHtml)}</tbody>`)}
</table></div>
<h2>In a row</h2>
<p>A form's actions (D-69): one row, the primary first, the destructive one at the end, wrapping only when there is no room.</p>
${actions({ primary: b({ label: "Save" }), secondary: b({ label: "Cancel", variant: "ghost" }), destructive: b({ label: "Remove lead", variant: "danger" }) })}
<p>${icon("info")} Products draw these with @forspring/ui's classes and helpers; a product's own button is held to the same sizes by ui-audit's control rules.</p>`;
  return (
    String(
      shell({
        lang: "en",
        title: "Buttons",
        productLabel: "ui",
        homeLabel: "Forspring ui, all components",
        brandBase: "../brand/",
        head: raw(`<link rel="stylesheet" href="../tokens.css"><link rel="stylesheet" href="../fonts.css"><link rel="stylesheet" href="../components.css"><link rel="stylesheet" href="../google-button.css">${STYLE}`),
        footer: [{ label: "All components", href: "index.html" }, { label: "Theme preview", href: "theme-preview.html" }],
        body: html`${body}${SCRIPT}`,
      }),
    ) + "\n"
  );
}

// ui-sdk-trial: writes trial/out/{ours,sdk}.html, the same three pieces drawn by this package's helpers today
// (ours) and by src/sdk.ts (sdk), on dist/tokens.css and the trial's css/components.css.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dialog, dialogScript, dialogTrigger, field, html, raw, type Html } from "../src/html.ts";
import { sdkDialog, sdkProductMenu, sdkSelectField, sdkTabs } from "../src/sdk.ts";

const out = new URL("./out/", import.meta.url);
mkdirSync(out, { recursive: true });
const css = `<style>${readFileSync(new URL("../dist/tokens.css", import.meta.url), "utf8")}</style><style>${readFileSync(new URL("../css/components.css", import.meta.url), "utf8")}</style>`;

const products = [
  { name: "AppSpring", href: "/o/noon/", current: true },
  { name: "SiteSpring", href: "https://sitespring.example/o/noon/" },
  { name: "DataSpring", href: "https://dataspring.example/o/noon/" },
];
const options = [
  { value: "open", label: "Open" },
  { value: "won", label: "Won", selected: true },
  { value: "lost", label: "Lost" },
];

const page = (title: string, body: Html, tail: Html | string = "") =>
  html`<!doctype html><html lang="en" data-product="appspring"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title>${raw(css)}</head><body><main id="main" class="wrap"><h1>${title}</h1>${body}</main>${raw(String(tail))}</body></html>`.toString();

// Ours: bar()'s <details> product switcher (its own markup), field()'s native select, dialog() + its script.
const ours = html`<nav aria-label="Products"><details class="switcher bar-menu product-switcher"><summary>Products</summary><div class="bar-panel"><p class="bar-panel-label">Noon has</p><ul>${products.map(
  (p) => html`<li><a href="${p.href}"${raw(p.current ? ' aria-current="true"' : "")}><span class="bar-item-name">${p.name}</span></a></li>`,
)}</ul></div></details></nav>
<form>${field({ name: "stage", label: "Stage", control: "select", options, lang: "en", hint: "Where the lead stands." })}
${field({ name: "owner", label: "Owner", control: "select", options: [{ value: "a", label: "Anna", selected: true }], lang: "en" })}<button type="submit" class="ghost">Save</button></form>
<p>${dialogTrigger({ dialog: "remove", href: "/confirm/remove", label: "Remove lead", variant: "ghost" })}</p>
${dialog({ id: "remove", title: "Remove the lead?", body: "This removes the lead and its notes.", close: "Keep", alert: true, actions: html`<button type="submit" class="danger">Remove</button>`, form: { action: "/remove" } })}`;
writeFileSync(new URL("ours.html", out), page("Ours", ours, dialogScript()));

// SDK: the same pieces on @ui-sdk/web, plus the probes the window.agent check reads.
const sdk = html`<nav aria-label="Products">${sdkProductMenu({ label: "Products", heading: "Noon has", items: products })}</nav>
${sdkTabs({ id: "rec", label: "Lead", tabs: [
  { value: "overview", label: "Overview", panel: html`<p>Anna's lead, opened 3 November.</p>` },
  { value: "items", label: "Items", count: "2", panel: html`<p>Two items.</p>` },
  { value: "history", label: "History", panel: sdkSelectField({ id: "in-tab", name: "in_tab", label: "Kind in a closed tab", options }) },
] })}
<form id="f">${sdkSelectField({ id: "stage", name: "stage", label: "Stage", options, hint: "Where the lead stands." })}
${sdkSelectField({ id: "owner", name: "owner", label: "Owner", options: [{ value: "a", label: "Anna", selected: true }, { value: "b", label: "Bo" }], disabled: true })}
<div class="field"><label for="ro">Reference (read-only)</label><ui-input><input id="ro" name="ro" value="REF-1" readonly></ui-input></div>
<div id="gone">${sdkSelectField({ id: "gone-sel", name: "gone", label: "Salary band", options: [{ value: "b7", label: "Band 7", selected: true }] })}</div>
<button type="submit" class="ghost">Save</button><section data-agent-hidden>${sdkSelectField({ id: "hid", name: "hid", label: "Hidden region field", options: [{ value: "x", label: "X", selected: true }] })}</section></form>
<p>${sdkDialog({ id: "remove", trigger: "Remove lead", href: "/confirm/remove", title: "Remove the lead?", body: "This removes the lead and its notes.", close: "Keep", actions: html`<ui-alert-dialog-close value="confirm"><button type="button" class="danger" id="do-remove">Remove</button></ui-alert-dialog-close>` })}</p>`;
writeFileSync(new URL("sdk.html", out), page("SDK", sdk, `<script type="module" src="client.js"></script>`));
console.log("wrote", new URL("ours.html", out).pathname, new URL("sdk.html", out).pathname);

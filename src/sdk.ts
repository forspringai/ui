// ui-sdk-trial (never lands): three of this package's pieces drawn as @ui-sdk/web custom-element markup, so the
// library's behaviours (keyboard, focus, ARIA) attach to the string the server writes when the page imports
// trial/client.ts. The look stays this package's: the classes below are styled in css/components.css's
// "ui-sdk trial" section on the roles only. Compare: connect.ts' radio tabs, bar()'s <details> menus,
// field()'s native <select> and dialog()'s native <dialog>, which need no script.
import { html, raw, safeHref, type Content, type Html } from "./html.ts";

type Attr = string | boolean | undefined;
const a = (o: Record<string, Attr>): Html =>
  raw(
    Object.entries(o)
      .filter(([, v]) => v !== undefined && v !== false)
      .map(([k, v]) => (v === true ? ` ${k}` : ` ${k}="${String(v).replace(/&/g, "&amp;").replace(/"/g, "&quot;")}"`))
      .join(""),
  );

export type SdkTab = { value: string; label: Content; panel: Content; count?: Content };

/** Tabs: `<ui-tabs>`. Before the script, every panel shows (no `hidden`), so the content is readable with no
 *  script; the library hides the others on upgrade. The server writes the ARIA the upgrade would. */
export function sdkTabs(o: { id: string; label: string; tabs: SdkTab[]; selected?: string }): Html {
  const sel = o.selected ?? o.tabs[0]?.value;
  const tabs = o.tabs.map(
    (t) =>
      html`<ui-tabs-tab${a({ value: t.value })}><button${a({ type: "button", role: "tab", "aria-selected": String(t.value === sel), tabindex: t.value === sel ? "0" : "-1" })}>${t.label}${t.count === undefined ? "" : html`<span class="menu-badge">${t.count}</span>`}</button></ui-tabs-tab>`,
  );
  const panels = o.tabs.map((t) => html`<ui-tabs-panel${a({ value: t.value, class: "sdk-tabs-panel" })}>${t.panel}</ui-tabs-panel>`);
  return html`<ui-tabs${a({ id: o.id, class: "sdk-tabs", "default-value": sel })}><ui-tabs-list${a({ class: "sdk-tablist", "aria-label": o.label })}>${tabs}</ui-tabs-list>${panels}</ui-tabs>`;
}

/** The bar's product switcher as a `<ui-menu>` of links (as-child), in place of bar()'s <details>. Before the
 *  script the content is `hidden`: the links are not reachable with no script (a <details> menu's are). */
export function sdkProductMenu(o: { label: string; heading: string; items: { name: Content; href: string; current?: boolean }[] }): Html {
  const items = o.items.map(
    (i) =>
      html`<ui-menu-item as-child><a${a({ href: safeHref(i.href), class: "sdk-menu-item", "aria-current": i.current ? "true" : undefined })}><span class="bar-item-name">${i.name}</span></a></ui-menu-item>`,
  );
  return html`<ui-menu class="sdk-menu"><ui-menu-trigger><button type="button" class="sdk-menu-trigger">${o.label}</button></ui-menu-trigger><ui-menu-content class="bar-panel sdk-menu-content" hidden><p class="bar-panel-label" aria-hidden="true">${o.heading}</p>${items}</ui-menu-content></ui-menu>`;
}

/** dialog() as a `<ui-alert-dialog>`: the trigger is the link to the no-script confirm page (as dialogTrigger()),
 *  the content is `hidden` until upgrade. */
export function sdkDialog(o: { id: string; trigger: Content; href: string; title: Content; body: Content; close: Content; actions?: Content }): Html {
  return html`<ui-alert-dialog${a({ id: o.id, class: "sdk-dialog" })}><ui-alert-dialog-trigger><a${a({ class: "button ghost", href: safeHref(o.href) })}>${o.trigger}</a></ui-alert-dialog-trigger><ui-alert-dialog-backdrop class="sdk-dialog-backdrop" hidden></ui-alert-dialog-backdrop><ui-alert-dialog-content class="dialog sdk-dialog-content" hidden><ui-alert-dialog-title class="dialog-title">${o.title}</ui-alert-dialog-title><ui-alert-dialog-description class="dialog-body">${o.body}</ui-alert-dialog-description><div class="dialog-actions"><ui-alert-dialog-close><button type="button" class="ghost" autofocus>${o.close}</button></ui-alert-dialog-close>${o.actions}</div></ui-alert-dialog-content></ui-alert-dialog>`;
}

/** field()'s select as a `<ui-select>` (a button and a listbox). The library's form-associated element submits the
 *  value once upgraded; with no script nothing submits, so a native <select> would still be needed as a fallback. */
export function sdkSelectField(o: {
  id: string;
  name: string;
  label: Content;
  options: { value: string; label: string; selected?: boolean }[];
  required?: boolean;
  disabled?: boolean;
  hint?: Content;
}): Html {
  const sel = o.options.find((x) => x.selected)?.value;
  const items = o.options.map(
    (op) => html`<ui-select-item${a({ value: op.value, class: "sdk-select-item" })}>${op.label}</ui-select-item>`,
  );
  const hintId = o.hint ? `${o.id}-hint` : undefined;
  return html`<div class="field"><ui-select${a({ name: o.name, "default-value": sel, required: o.required, disabled: o.disabled })}><ui-select-label${a({ id: `${o.id}-label` })}>${o.label}</ui-select-label><ui-select-trigger><button${a({ type: "button", id: o.id, class: "sdk-select-trigger", "aria-describedby": hintId, disabled: o.disabled })}><ui-select-value>${o.options.find((x) => x.value === sel)?.label ?? ""}</ui-select-value></button></ui-select-trigger><ui-select-content class="sdk-select-content" hidden>${items}</ui-select-content></ui-select>${o.hint ? html`<p class="hint" id="${hintId!}">${o.hint}</p>` : ""}</div>`;
}

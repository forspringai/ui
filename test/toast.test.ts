// Toast, tooltip and the icon set (D-26): the markup a browser needs to do the work with no script (a
// dismiss link, a popover with its button), the live regions per tone, the optional script never
// hiding a danger toast, every icon drawn in currentColor on the 24 grid with nothing to fetch,
// escaping, and the React wrappers drawing the same bytes.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { button, field, html, icon, ICON_NAMES, TOAST_SCRIPT, toast, toastRegion, toastScript, tooltip, type IconName, type ToastOptions, type ToastTone } from "../src/html.ts";
import { Icon, Toast, ToastRegion, Tooltip } from "../src/react.ts";

const evil = `x" onfocus="alert(1)<script>`;
const clean = (out: string) => {
  expect(out).not.toContain("<script>");
  expect(out).not.toContain('" onfocus="');
  expect(out).not.toMatch(/="[^"]*"[^ >\/]/);
};
// Anything in markup that would make a browser fetch: a URL in CSS, an image, a use reference, a source.
const FETCHES = /url\(|<image|<use|<img|<link|<script[^>]*\ssrc=|\ssrc=|xlink:href|\shref="(?:https?:)?\/\//i;

const SAVED: ToastOptions = { lang: "da", tone: "success", text: "Ændringerne er gemt.", dismissHref: "/o/bager-hansen/sites" };

describe("toast()", () => {
  test("a status region with the tone's icon, its word for a screen reader, the text and Dismiss", () => {
    expect(String(toast(SAVED))).toBe(
      '<div class="toast toast-success" id="toast" role="status" aria-live="polite" data-toast-autohide="true">' +
        String(icon("check")) +
        '<p class="toast-text" id="toast-text"><span class="visually-hidden">Udført: </span>Ændringerne er gemt.</p>' +
        '<span class="toast-actions"><a class="button ghost small toast-dismiss" href="/o/bager-hansen/sites" data-toast-dismiss="toast" aria-describedby="toast-text">' +
        String(icon("x")) +
        '<span class="visually-hidden">Luk</span></a></span></div>',
    );
  });

  test.each([
    ["success", "status", "check", "Udført", "Done"],
    ["info", "status", "info", "Bemærk", "Note"],
    ["warning", "status", "alert-triangle", "Advarsel", "Warning"],
    ["danger", "alert", "alert-octagon", "Fejl", "Error"],
  ] as const)("%s: role %s, the %s icon, its word in both languages", (tone, role, name, da, en) => {
    const h = String(toast({ ...SAVED, tone }));
    expect(h).toMatch(new RegExp(`^<div class="toast toast-${tone}" id="toast" role="${role}"`));
    // A danger toast is an alert, assertive by its role; the rest are polite status messages.
    if (role === "alert") expect(h).not.toContain("aria-live");
    else expect(h).toContain(' aria-live="polite"');
    expect(h).toContain(String(icon(name)));
    expect(h).toContain(`<span class="visually-hidden">${da}: </span>`);
    const e = String(toast({ ...SAVED, lang: "en", tone }));
    expect(e).toContain(`<span class="visually-hidden">${en}: </span>`);
    expect(e).toContain('<span class="visually-hidden">Dismiss</span>');
  });

  test("the default tone is info, and every tone has a different icon (never colour alone)", () => {
    expect(String(toast({ ...SAVED, tone: undefined }))).toMatch(/^<div class="toast toast-info" id="toast" role="status"/);
    const shapes = (["success", "info", "warning", "danger"] as ToastTone[]).map((tone) => /<svg[^]*?<\/svg>/.exec(String(toast({ ...SAVED, tone })))![0]);
    expect(new Set(shapes).size).toBe(4);
  });

  test("dismiss works with no script: a link to the page without the flash, named and described", () => {
    const h = String(toast({ ...SAVED, id: "saved", dismissHref: "/o/bager-hansen/sites?q=bager" }));
    const dismiss = /<a [^>]*data-toast-dismiss[^>]*>/.exec(h)![0];
    expect(dismiss).toBe('<a class="button ghost small toast-dismiss" href="/o/bager-hansen/sites?q=bager" data-toast-dismiss="saved" aria-describedby="saved-text">');
    expect(h).toContain('<p class="toast-text" id="saved-text">');
    expect(h).not.toMatch(/<button|<form|onclick/);
  });

  test("an action is a link after the text; a toast with one, a warning or a danger never auto-hides", () => {
    const h = String(toast({ ...SAVED, action: { label: "Fortryd", href: "/undo" } }));
    expect(h).toContain('<span class="toast-actions"><a class="button ghost small" href="/undo" aria-describedby="toast-text">Fortryd</a><a class="button ghost small toast-dismiss"');
    expect(h).not.toContain("data-toast-autohide");
    for (const tone of ["warning", "danger"] as const) expect(String(toast({ ...SAVED, tone }))).not.toContain("data-toast-autohide");
    expect(String(toast({ ...SAVED, tone: "info" }))).toContain('data-toast-autohide="true"');
  });

  test("the region stacks toasts in a named section", () => {
    const two = [toast({ ...SAVED, id: "a" }), toast({ ...SAVED, id: "b", tone: "danger" })];
    expect(String(toastRegion({ lang: "da", toasts: two }))).toBe(`<section class="toast-region" aria-label="Beskeder">${two.join("")}</section>`);
    expect(String(toastRegion({ lang: "en", toasts: two }))).toMatch(/^<section class="toast-region" aria-label="Messages">/);
  });

  test("escapes what it is given, and a javascript: href becomes #", () => {
    const h = String(toast({ lang: "en", id: evil, tone: "danger", text: evil, dismissHref: "javascript:alert(1)", action: { label: evil, href: "java\nscript:alert(1)" } }));
    clean(h);
    expect(h).not.toContain("javascript:");
    expect(h.match(/href="#"/g)).toHaveLength(2);
    clean(String(toastRegion({ lang: "en", label: evil, toasts: evil })));
  });
});

// The script run against a small stand-in for the page: elements with classes, attributes and
// listeners, a clock that runs when told, and the reduced-motion preference.
function page(toasts: { cls: string; role: string; autohide: boolean }[], reduce = false) {
  const timers: (() => void)[] = [];
  const listeners: Record<string, (e: unknown) => void> = {};
  const replaced: string[] = [];
  const region = { classList: { contains: (c: string) => c === "toast-region" }, querySelector: () => (els.some((e) => !e.removed) ? {} : null), remove() {} };
  const els = toasts.map((t, i) => {
    const el = {
      removed: false,
      classList: { contains: (c: string) => t.cls.split(" ").includes(c) },
      getAttribute: (a: string) => (a === "role" ? t.role : null),
      matches: () => false,
      addEventListener() {},
      parentElement: region,
      querySelector: () => ({ getAttribute: () => `/page?toast=${i}` }),
      remove() {
        this.removed = true;
      },
    };
    return el;
  });
  const document = {
    addEventListener: (type: string, f: (e: unknown) => void) => (listeners[type] = f),
    // Every toast, whatever the selector: the script must refuse a danger toast by itself.
    querySelectorAll: () => els,
  };
  class Element {}
  const run = new Function("document", "matchMedia", "setTimeout", "clearTimeout", "history", "Element", TOAST_SCRIPT);
  run(document, () => ({ matches: reduce }), (f: () => void) => timers.push(f), () => {}, { state: null, replaceState: (_: unknown, __: string, u: string) => replaced.push(u) }, Element);
  return { els, timers, listeners, replaced, tick: () => timers.splice(0).forEach((f) => f()) };
}

describe("toastScript()", () => {
  test("never hides a danger or warning toast, even one marked to auto-hide; hides success", () => {
    const p = page([
      { cls: "toast toast-danger", role: "alert", autohide: true },
      { cls: "toast toast-warning", role: "status", autohide: true },
      { cls: "toast toast-success", role: "status", autohide: true },
    ]);
    expect(p.timers).toHaveLength(1);
    p.tick();
    expect(p.els.map((e) => e.removed)).toEqual([false, false, true]);
    expect(p.replaced).toEqual(["/page?toast=2"]);
  });

  test("under prefers-reduced-motion nothing hides by itself, and Dismiss still works", () => {
    const p = page([{ cls: "toast toast-success", role: "status", autohide: true }], true);
    expect(p.timers).toHaveLength(0);
    expect(p.listeners.click).toBeTypeOf("function");
  });

  test("the tag carries only a clean nonce, and the script fetches nothing", () => {
    const s = String(toastScript('abc"><x'));
    expect(s).toMatch(/^<script nonce="abcx">/);
    expect(s).not.toMatch(/fetch\(|XMLHttpRequest|import\(|src=/);
    expect(TOAST_SCRIPT).toContain('matchMedia("(prefers-reduced-motion: reduce)")');
  });
});

describe("tooltip()", () => {
  const h = String(tooltip({ id: "cvr-tip", label: "Mere om CVR-nummer", trigger: icon("help-circle"), text: "Vi slår firmaets navn op." }));

  test("a button that shows a native popover, described by it, the text in the DOM throughout", () => {
    expect(h).toBe(
      '<span class="tooltip-wrap"><button type="button" class="tooltip-trigger" popovertarget="cvr-tip" popovertargetaction="show" interestfor="cvr-tip" aria-describedby="cvr-tip" aria-label="Mere om CVR-nummer">' +
        String(icon("help-circle")) +
        '</button><span class="tooltip" id="cvr-tip" popover="auto" role="tooltip">Vi slår firmaets navn op.</span></span>',
    );
    // The content is markup, not a title attribute a touch screen never shows.
    expect(h).not.toContain("title=");
  });

  test("beside a field's label, outside it, so the label names only the field", () => {
    const f = String(field({ label: "CVR-nummer", name: "cvr", hint: "Otte cifre.", help: tooltip({ id: "t", trigger: "?", text: "Mere" }) }));
    expect(f).toMatch(/^<div class="field"><div class="field-head"><label for="cvr">CVR-nummer<\/label><span class="tooltip-wrap">/);
    expect(String(field({ label: "A", name: "a" }))).toBe('<div class="field"><label for="a">A</label><input id="a" name="a" type="text"></div>');
  });

  test("escapes what it is given", () => {
    clean(String(tooltip({ id: evil, label: evil, trigger: evil, text: evil })));
  });
});

describe("icon()", () => {
  test("decoration by default: aria-hidden; with a label an image with that name", () => {
    expect(String(icon("check"))).toBe('<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M20 6 9 17l-5-5"/></svg>');
    const l = String(icon("trash", { label: "Slet" }));
    expect(l).toMatch(/^<svg class="icon" viewBox="0 0 24 24" [^>]* role="img" aria-label="Slet" focusable="false">/);
    expect(l).not.toContain("aria-hidden");
    clean(String(icon("trash", { label: evil })));
  });

  test("an unknown name throws rather than drawing nothing", () => {
    expect(() => icon("nope" as IconName)).toThrow(/no icon named "nope"/);
    expect(() => icon("constructor" as IconName)).toThrow();
  });

  test("the set covers the suite's screens, about 30 icons", () => {
    for (const n of ["check", "x", "alert-triangle", "info", "chevron-left", "chevron-right", "chevron-down", "chevron-up", "arrow-up", "arrow-down", "search", "filter", "plus", "minus", "edit", "trash", "external-link", "copy", "download", "upload", "settings", "user", "users", "log-out", "eye", "eye-off", "clock", "calendar", "mail", "more-horizontal"])
      expect(ICON_NAMES).toContain(n);
    expect(ICON_NAMES.length).toBeGreaterThanOrEqual(24);
    expect(ICON_NAMES.length).toBeLessThanOrEqual(32);
    expect(new Set(ICON_NAMES).size).toBe(ICON_NAMES.length);
  });

  test.each([...ICON_NAMES])("%s: an svg on the 24 grid in currentColor, one stroke, nothing fetched", (name) => {
    const s = String(icon(name));
    expect(s).toMatch(/^<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"/);
    expect(s).toMatch(/<\/svg>$/);
    const inner = s.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
    // Only shapes, no colour, stroke or fill of their own, so the one stroke weight and currentColor hold.
    expect(inner).toMatch(/^(<(path|circle|rect|line|polyline|polygon|ellipse)( [a-z]+="[^"]*")+\/>)+$/);
    expect(inner).not.toMatch(/stroke|fill|style|#/);
    expect(s).not.toMatch(FETCHES);
  });

  test("the licence ships beside the vendored icons", () => {
    const lic = readFileSync(join(import.meta.dirname, "../src/icons/LICENSE"), "utf8");
    expect(lic).toContain("ISC License");
    expect(lic).toContain("Lucide Icons and Contributors");
    expect(lic).toContain("Cole Bemis");
    expect(readFileSync(join(import.meta.dirname, "../src/icons/lucide.ts"), "utf8")).toContain("/*! @license\nISC License");
  });
});

describe("button() with an icon", () => {
  test("the icon before the label, hidden; nothing else changes, and no icon draws what it drew before", () => {
    expect(String(button({ label: "Hent CSV", icon: "download", variant: "ghost", type: "button" }))).toBe(`<button class="ghost" type="button">${icon("download")}Hent CSV</button>`);
    expect(String(button({ label: "Åbn", icon: "external-link", href: "/x" }))).toBe(`<a class="button" href="/x">${icon("external-link")}Åbn</a>`);
    expect(String(button({ label: "Gem" }))).toBe('<button type="submit">Gem</button>');
    expect(String(button({ label: "", icon: "trash", ariaLabel: "Slet kunden", variant: "danger", small: true }))).toBe(`<button class="danger small" type="submit" aria-label="Slet kunden">${icon("trash")}</button>`);
  });
});

test("no template fetches anything", () => {
  const all = [
    toast(SAVED),
    toast({ ...SAVED, tone: "danger", action: { label: "Prøv igen", href: "/retry" } }),
    toastRegion({ lang: "en", toasts: toast(SAVED) }),
    toastScript("n"),
    tooltip({ id: "t", trigger: icon("help-circle"), text: "x" }),
    html`${ICON_NAMES.map((n) => icon(n, { label: n }))}`,
  ].map(String);
  for (const s of all) expect(s).not.toMatch(FETCHES);
});

describe("React wrappers draw the helpers' bytes", () => {
  test.each([SAVED, { ...SAVED, lang: "en" as const, tone: "danger" as const, id: "x", text: `a"<b>'c`, action: { label: "Retry", href: "/r" } }])("Toast %#", (o) => {
    expect(renderToStaticMarkup(createElement(Toast, o))).toBe(String(toast(o)));
  });

  test("ToastRegion, Tooltip and Icon", () => {
    const toasts = [toast(SAVED), toast({ ...SAVED, id: "b" })];
    expect(renderToStaticMarkup(createElement(ToastRegion, { lang: "da", toasts }))).toBe(String(toastRegion({ lang: "da", toasts })));
    const t = { id: "tip", label: "Mere", trigger: icon("help-circle"), text: "<b>" };
    expect(renderToStaticMarkup(createElement(Tooltip, t))).toBe(String(tooltip(t)));
    for (const name of ICON_NAMES) expect(renderToStaticMarkup(createElement(Icon, { name }))).toBe(String(icon(name)));
    expect(renderToStaticMarkup(createElement(Icon, { name: "trash", label: `S"<` }))).toBe(String(icon("trash", { label: `S"<` })));
  });
});

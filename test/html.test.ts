import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import * as tokens from "../dist/tokens.js";
import type { Product } from "../src/html.ts";
import { button, confirmDestructive, crumbs, errorRef, errorSummary, esc, field, html, list, notice, raw, safeHref, shell, signal, state, switchButton, table, tag, type Menu } from "../src/html.ts";
import { ErrorSummary } from "../src/react.ts";

const evil = `<script>alert("x")</script>&'`;
const escaped = "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;&amp;&#39;";

describe("escaping", () => {
  test("esc covers the five characters", () => {
    expect(esc(evil)).toBe(escaped);
  });

  test("html`` escapes strings and numbers, passes Html, flattens arrays, drops nothing-values", () => {
    const h = html`<p title="${evil}">${evil}${raw("<b>ok</b>")}${[evil, html`<i>${"a&b"}</i>`]}${null}${undefined}${false}${3}</p>`;
    expect(String(h)).toBe(`<p title="${escaped}">${escaped}<b>ok</b>${escaped}<i>a&amp;b</i>3</p>`);
  });

  test("Html is not escaped twice when nested", () => {
    expect(String(html`${html`${html`${"<"}`}`}`)).toBe("&lt;");
  });

  test("an object that looks like Html is still escaped", () => {
    const fake = { value: "<b>", toString: () => "<b>" } as unknown as string;
    expect(String(html`${fake}`)).toBe("&lt;b&gt;");
  });

  test("every helper escapes what it is given", () => {
    const parts = [
      button({ label: evil, ariaLabel: evil, name: evil, value: evil }),
      button({ label: evil, href: `/x?a=${evil}` }),
      field({ label: evil, name: "n", value: evil, hint: evil, error: evil, placeholder: evil }),
      field({ label: evil, name: "s", control: "select", options: [{ value: evil, label: evil }] }),
      field({ label: evil, name: "t", control: "textarea", value: evil }),
      notice({ tone: "error", title: evil, text: evil }),
      tag(evil),
      list([{ name: evil, meta: evil, action: evil }]),
      table({ label: evil, caption: evil, columns: [{ label: evil }], rows: [[evil]] }),
      switchButton({ checked: true, label: evil, on: evil }),
      state({ kind: "failed", title: evil, text: evil, action: evil }),
      state({ kind: "loading", title: evil }),
      shell({ lang: "da", title: evil, productLabel: evil, homeLabel: evil, user: { email: evil }, switcher: { label: evil, items: [{ label: evil, href: evil }] }, footer: [{ label: evil, href: evil }], body: evil }),
    ].map(String);
    for (const p of parts) {
      expect(p).not.toContain("<script>");
      expect(p).not.toMatch(/="[^"]*"[^ >\/]/); // no attribute broken out of its quotes
    }
  });
});

describe("safeHref", () => {
  test.each(["/admin", "?product=sitespring", "#main", "https://forspring.ai", "mailto:hej@forspring.ai", "relative/path"])("keeps %s", (h) => {
    expect(safeHref(h)).toBe(h);
  });
  test.each(["javascript:alert(1)", " JavaScript:alert(1)", "java\nscript:alert(1)", "data:text/html,x", "vbscript:x"])("drops %j", (h) => {
    expect(safeHref(h)).toBe("#");
  });
  test("helpers use it", () => {
    expect(String(button({ label: "x", href: "javascript:alert(1)" }))).toContain('href="#"');
  });
});

describe("blocks", () => {
  test("a field with an error is wired for assistive tech", () => {
    const f = String(field({ label: "Mail", name: "email", type: "email", hint: "Din arbejdsmail", error: "Skriv en hel mailadresse" }));
    expect(f).toContain('<label for="email">Mail</label>');
    expect(f).toContain('aria-invalid="true"');
    expect(f).toContain('aria-describedby="email-hint email-error"');
    expect(f).toContain('<p class="field-error" id="email-error">');
  });

  test("the switch is a button with role and state", () => {
    const s = String(switchButton({ checked: false, label: "SiteSpring for Mette" }));
    expect(s).toMatch(/^<button type="submit" class="switch" role="switch" aria-checked="false" aria-label="SiteSpring for Mette">/);
    expect(s).toContain(">Fra</span>");
  });

  test("notices: errors alert, the rest are status", () => {
    expect(String(notice({ tone: "error", text: "x" }))).toBe('<div class="notice error" role="alert">x</div>');
    expect(String(notice({ tone: "success", text: "x" }))).toBe('<div class="notice success" role="status">x</div>');
    expect(String(notice({ text: "x" }))).toBe('<div class="notice" role="status">x</div>');
  });

  test("a table's frame is a labelled region a keyboard can reach", () => {
    expect(String(table({ label: "Folk", columns: [{ label: "A", num: true }], rows: [["1"]] }))).toContain('<div class="table-wrap" role="region" aria-label="Folk" tabindex="0">');
  });

  test("the shell sets lang, product and theme, and has a skip link to main", () => {
    const s = String(shell({ lang: "en", title: "Keys", product: "dataspring", theme: "dark", productLabel: "DataSpring", body: "" }));
    expect(s).toContain('<html lang="en" data-product="dataspring" data-theme="dark">');
    expect(s).toContain('<a class="skip" href="#main">Skip to content</a>');
    expect(s).toContain('<main id="main" class="wrap">');
    expect(s).toContain("<title>Keys · DataSpring</title>");
  });

  test("a product's bar carries its own doll and name, no Forspring; Forspring's own pages the doll, Forspring and the label (D-18)", () => {
    const p = String(shell({ lang: "en", title: "t", product: "sitespring", productLabel: "SiteSpring", body: "" }));
    expect(p).toMatch(/aria-label="SiteSpring"><svg class="mark" [^>]*>.*<\/svg><span class="word">SiteSpring<\/span><\/a>/);
    expect(p).not.toContain("Forspring");
    expect(p).not.toContain("forspring");
    const own = String(shell({ lang: "da", title: "Forside", productLabel: "konto", body: "" }));
    expect(own).toContain('<span class="word">Forspring</span> <span class="sub">konto</span>');
    expect(own).toContain('class="mark"');
    expect(own).toContain("<title>Forside · Forspring</title>");
  });

  test("the shell puts its controls in the bar, after the switcher and before the spacer", () => {
    const s = String(shell({ lang: "en", title: "t", productLabel: "P", switcher: { label: "Switch", items: [] }, controls: html`<select aria-label="Org"><option>A</option></select>`, body: "" }));
    expect(s).toMatch(/<\/details><select aria-label="Org"><option>A<\/option><\/select><span class="spacer"><\/span>/);
    expect(String(shell({ lang: "en", title: "t", productLabel: "P", controls: "<b>", body: "" }))).toContain("&lt;b&gt;<span class=\"spacer\">");
  });
});

test("the Product type lists the same products as the tokens", () => {
  const all: Record<Product, true> = { forspring: true, spring: true, sitespring: true, dataspring: true, appspring: true, pulsespring: true };
  expect(Object.keys(all).sort()).toEqual([...tokens.products].sort());
});

describe("menu, crumbs and signals (D-13)", () => {
  const menu: Menu = {
    label: "Main menu",
    toggle: "Menu",
    context: { label: "Organization", name: "Ops", items: [{ label: "Ops", href: "/o/ops", current: true }, { label: "Shop", href: "/o/shop" }] },
    groups: [
      { items: [{ label: "Overview", href: "/o/ops/", badge: { text: "2", signal: "down", label: "down" } }, { label: "Alerts", href: "/o/ops/alerts" }] },
      { label: "Projects", items: [{ label: "Hub", href: "/o/ops/projects/hub", current: "parent" }] },
    ],
  };
  const page = String(shell({ lang: "en", title: "t", productLabel: "PulseSpring", menu, body: html`<h1>x</h1>` }));

  test("a menu widens the frame and puts the sidebar and the phone's fold beside main", () => {
    expect(page).toContain('<body class="has-menu">');
    expect(page).toMatch(/<div class="wrap app"><details class="menu-fold"><summary><span>Menu<\/span><span class="menu-fold-current">Hub<\/span><\/summary><nav class="menu" aria-label="Main menu">/);
    expect(page).toContain('<nav class="menu menu-side" aria-label="Main menu">');
    expect(page).toContain('<main id="main"><h1>x</h1></main></div>');
  });

  test("the context is a switcher with more than one org, and plain text with one", () => {
    expect(page).toContain('<details class="menu-context"><summary><span class="menu-label">Organization</span><span class="menu-context-name">Ops</span></summary>');
    expect(page).toContain('<a href="/o/ops" aria-current="true">Ops</a>');
    const one = String(shell({ lang: "en", title: "t", productLabel: "P", menu: { ...menu, context: { label: "Organization", name: "Ops" } }, body: "" }));
    expect(one).toContain('<div class="menu-context"><span class="menu-label">Organization</span><span class="menu-context-name">Ops</span></div>');
  });

  test("items mark the page or its parent, and a badge has words for a screen reader", () => {
    expect(page).toContain('<a href="/o/ops/projects/hub" aria-current="true"><span class="menu-text">Hub</span></a>');
    expect(page).toContain('<span class="menu-badge"><span class="signal-mark down" aria-hidden="true"></span>2<span class="visually-hidden"> down</span></span>');
    expect(page).toContain('<p class="menu-label">Projects</p>');
  });

  test("no menu, no change: main is the wrap as before", () => {
    expect(String(shell({ lang: "en", title: "t", productLabel: "P", body: "" }))).toContain('<main id="main" class="wrap"></main>');
  });

  test("signal, crumbs and a signal notice", () => {
    expect(String(signal("Down", "down"))).toBe('<span class="signal down"><span class="signal-mark down" aria-hidden="true"></span>Down</span>');
    expect(String(crumbs("Breadcrumb", [{ label: "Home", href: "/" }]))).toBe('<nav class="crumbs" aria-label="Breadcrumb"><ol><li><a href="/">Home</a></li></ol></nav>');
    expect(String(notice({ signal: "down", title: "1 check is down", text: "x" }))).toBe(
      '<div class="notice signal-down" role="alert"><strong class="notice-title"><span class="signal-mark down" aria-hidden="true"></span>1 check is down</strong>x</div>',
    );
    expect(String(notice({ signal: "ok", text: "fine" }))).toContain('role="status"');
  });

  test("menu, crumbs and signals escape what they are given", () => {
    const evilMenu: Menu = { label: evil, toggle: evil, context: { label: evil, name: evil }, groups: [{ label: evil, items: [{ label: evil, href: "/", current: true, badge: { text: evil, label: evil } }] }] };
    const out = String(shell({ lang: "en", title: "t", productLabel: "P", menu: evilMenu, body: "" })) + String(signal(evil, "ok")) + String(crumbs(evil, [{ label: evil, href: "/" }]));
    expect(out).not.toContain("<script>");
  });
});

describe("forms and errors match the usage guidance (D-30)", () => {
  const ERRORS = [
    { field: "email", message: "Mail: skriv en hel mailadresse" },
    { field: "role", message: "Rolle: vælg en rolle" },
  ];

  test("the error summary: an alert that takes focus, a heading, a link to each field", () => {
    const h = String(errorSummary({ lang: "da", errors: ERRORS }));
    expect(h).toMatch(/^<div class="notice error error-summary" id="error-summary" role="alert" tabindex="-1" autofocus="" aria-labelledby="error-summary-title">/);
    expect(h).toContain('<h2 class="notice-title" id="error-summary-title">Ret disse felter</h2>');
    expect(h).toContain('<ul class="error-summary-list"><li><a href="#email">Mail: skriv en hel mailadresse</a></li><li><a href="#role">Rolle: vælg en rolle</a></li></ul>');
    expect(h.match(/autofocus/g)).toHaveLength(1);
  });

  test("the error summary in English, with its own title and id", () => {
    expect(String(errorSummary({ lang: "en", errors: ERRORS }))).toContain(">Fix these fields</h2>");
    const own = String(errorSummary({ lang: "en", errors: ERRORS, title: "Check the invitation", id: "invite-errors" }));
    expect(own).toContain('id="invite-errors"');
    expect(own).toContain('aria-labelledby="invite-errors-title"><h2 class="notice-title" id="invite-errors-title">Check the invitation</h2>');
  });

  test("no errors, no summary", () => {
    expect(String(errorSummary({ lang: "da", errors: [] }))).toBe("");
  });

  test("the error summary escapes the field, the message, the title and the id", () => {
    const h = String(errorSummary({ lang: "en", errors: [{ field: evil, message: evil }], title: evil, id: evil }));
    expect(h).not.toContain("<script>");
    expect(h).not.toMatch(/="[^"]*"[^ >\/]/);
    expect(h).toContain(`<a href="#${escaped}">${escaped}</a>`);
  });

  test("required and optional are words in the label, so in the accessible name", () => {
    const req = String(field({ label: "Mail", name: "email", required: true }));
    expect(req).toContain('<label for="email">Mail <span class="field-mark">(påkrævet)</span></label>');
    expect(req).toContain(' required ');
    expect(String(field({ label: "Mail", name: "email", required: true, lang: "en" }))).toContain('<label for="email">Mail <span class="field-mark">(required)</span></label>');
    const opt = String(field({ label: "Besked", name: "note", control: "textarea", optional: true }));
    expect(opt).toContain('<label for="note">Besked <span class="field-mark">(valgfri)</span></label>');
    expect(opt).not.toContain("required");
    expect(String(field({ label: "Note", name: "note", optional: true, lang: "en" }))).toContain("Note <span class=\"field-mark\">(optional)</span></label>");
  });

  test("neither, or required with requiredWord: false, writes no word; the confirm's name field has none", () => {
    expect(String(field({ label: "Navn", name: "name" }))).toContain('<label for="name">Navn</label>');
    const quiet = String(field({ label: "Navn", name: "name", required: true, requiredWord: false }));
    expect(quiet).toContain('<label for="name">Navn</label>');
    expect(quiet).toContain(" required ");
    const confirm = String(confirmDestructive({ lang: "en", id: "d", title: "Delete x?", action: "/d", confirmName: "x", confirmLabel: "Delete" }));
    expect(confirm).toContain('<label for="d-name">Type <b>x</b> to confirm</label>');
  });

  test("a notice and a failed state show the ref, escaped, with the hint to quote it", () => {
    expect(String(notice({ tone: "error", text: "Noget gik galt.", ref: "4bf92f35" }))).toBe(
      '<div class="notice error" role="alert">Noget gik galt.<p class="error-ref">Fejlkode: <code>4bf92f35</code><br>Nævn den, hvis du skriver til os.</p></div>',
    );
    expect(String(notice({ tone: "error", text: "x", ref: "4bf92f35", lang: "en" }))).toContain('<p class="error-ref">Reference: <code>4bf92f35</code><br>Quote it if you contact us.</p>');
    expect(String(notice({ tone: "error", text: "x", ref: evil }))).toContain(`<code>${escaped}</code>`);
    expect(String(notice({ tone: "error", text: "x", ref: evil }))).not.toContain("<script>");
    expect(String(state({ kind: "failed", title: "t", ref: "abc", lang: "en", action: "A" }))).toContain('<p class="error-ref">Reference: <code>abc</code><br>Quote it if you contact us.</p><div class="data-state-actions">A</div>');
    expect(String(errorRef({ lang: "da", ref: evil }))).not.toContain("<script>");
  });

  test("the React ErrorSummary draws the same markup, and nothing with no errors", () => {
    for (const lang of ["da", "en"] as const) expect(renderToStaticMarkup(createElement(ErrorSummary, { lang, errors: ERRORS }))).toBe(String(errorSummary({ lang, errors: ERRORS })));
    expect(renderToStaticMarkup(createElement(ErrorSummary, { lang: "en", errors: [{ field: evil, message: evil }], title: evil }))).toBe(String(errorSummary({ lang: "en", errors: [{ field: evil, message: evil }], title: evil })));
    expect(renderToStaticMarkup(createElement(ErrorSummary, { lang: "da", errors: [] }))).toBe("");
  });
});

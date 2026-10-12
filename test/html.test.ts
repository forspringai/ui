import { describe, expect, test } from "vitest";
import * as tokens from "../dist/tokens.js";
import type { Product } from "../src/html.ts";
import { button, crumbs, esc, field, html, list, notice, raw, safeHref, shell, signal, state, switchButton, table, tag, type Menu } from "../src/html.ts";

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
    expect(s).toContain("<title>Keys · Forspring</title>");
  });
});

test("the Product type lists the same products as the tokens", () => {
  const all: Record<Product, true> = { forspring: true, sitespring: true, dataspring: true, appspring: true, pulsespring: true };
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

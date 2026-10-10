import { describe, expect, test } from "vitest";
import * as tokens from "../dist/tokens.js";
import type { Product } from "../src/html.ts";
import { button, esc, field, html, list, notice, raw, safeHref, shell, state, switchButton, table, tag } from "../src/html.ts";

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

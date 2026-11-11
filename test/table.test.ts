// A table at scale (D-25): table() without controls draws exactly what it drew before, and with them
// a GET form, filter links and the paging, so the URL holds the state and nothing needs script; the
// paging arithmetic, the words in both languages, escaping, and the React wrappers' bytes.

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { html, pageOf, pagination, table, type PaginationOptions, type TableOptions } from "../src/html.ts";
import { Pagination, Table } from "../src/react.ts";

const evil = `x" onfocus="alert(1)<script>`;
const clean = (out: string) => {
  expect(out).not.toContain("<script>");
  expect(out).not.toContain('" onfocus="');
  expect(out).not.toMatch(/="[^"]*"[^ >\/]/);
};

const CHECKS: TableOptions = {
  id: "checks",
  label: "Checks",
  columns: [{ label: "Check" }, { label: "State", sort: { href: "?sort=state", dir: "desc" } }, { label: "Uptime 30d", num: true, sort: { href: "?sort=uptime" } }, { label: "Response", num: true, phoneHide: true }],
  rows: [["Nightly backup", "Down", "97.21%", "No answer"]],
  controls: {
    lang: "en",
    search: { placeholder: "Search 248 checks", value: "back" },
    filters: [
      { label: "Needs attention", count: 2, href: "?filter=attention" },
      { label: "All", count: 248, href: "?", current: true },
    ],
    sort: { label: "worst first" },
    keep: { filter: "all", sort: "worst" },
    paging: { ...pageOf(248, 1, 6), nextHref: "?page=2" },
  },
};

describe("table() without controls", () => {
  test("draws exactly what it drew before (the API, D-5)", () => {
    expect(String(table({ label: "Folk", caption: "Fakturaer", columns: [{ label: "A" }, { label: "B", num: true }, { label: "C", phoneHide: true }], rows: [["1", "2", "3"]] }))).toBe(
      '<div class="table-wrap" role="region" aria-label="Folk" tabindex="0"><table><caption>Fakturaer</caption><thead><tr><th scope="col">A</th><th scope="col" class="num">B</th><th scope="col" class="phone-hide">C</th></tr></thead><tbody><tr><td>1</td><td class="num">2</td><td class="phone-hide">3</td></tr></tbody></table></div>',
    );
    expect(String(table({ label: "L", columns: [{ label: "A", num: true, phoneHide: true }], rows: [] }))).toBe(
      '<div class="table-wrap" role="region" aria-label="L" tabindex="0"><table><thead><tr><th scope="col" class="num phone-hide">A</th></tr></thead><tbody></tbody></table></div>',
    );
  });
});

describe("table() with controls", () => {
  const h = String(table(CHECKS));

  test("one wrapper: the controls row, the frame, the footer", () => {
    expect(h).toMatch(/^<div class="data-table"><div class="table-controls"><form class="table-search"[^]*<\/div><div class="table-wrap" role="region" aria-label="Checks" tabindex="0">[^]*<\/table><\/div><div class="table-foot"><nav class="pagination"[^]*<\/nav><\/div><\/div>$/);
  });

  test("the search is a GET form to this page, the other params kept as hidden inputs, the label hidden when the placeholder says it", () => {
    expect(h).toContain(
      '<form class="table-search" method="get" role="search" aria-label="Search 248 checks"><input type="hidden" name="filter" value="all"><input type="hidden" name="sort" value="worst"><label class="visually-hidden" for="checks-search">Search 248 checks</label><input class="small" type="search" id="checks-search" name="q" value="back" placeholder="Search 248 checks"><button class="ghost small" type="submit">Search</button></form>',
    );
    const own = String(table({ ...CHECKS, id: undefined, controls: { lang: "da", search: { name: "s", label: "Find et tjek", placeholder: "fx backup", action: "/o/ops/checks" } } }));
    expect(own).toContain('<form class="table-search" method="get" action="/o/ops/checks" role="search" aria-label="Find et tjek"><label for="table-search">Find et tjek</label><input class="small" type="search" id="table-search" name="s" placeholder="fx backup"><button class="ghost small" type="submit">Søg</button></form>');
    expect(String(table({ ...CHECKS, controls: { lang: "da", search: {} } }))).toContain('<label for="checks-search">Søg</label>');
    expect(h).not.toContain('method="post"');
  });

  test("filters are links drawn as chips with their counts, the current one aria-current", () => {
    expect(h).toContain(
      '<nav class="table-filters" aria-label="Filters for Checks"><ul><li><a class="chip" href="?filter=attention">Needs attention <span class="chip-count">2</span></a></li><li><a class="chip" href="?" aria-current="true">All <span class="chip-count">248</span></a></li></ul></nav>',
    );
    expect(h.match(/aria-current/g)).toHaveLength(1);
    expect(String(table({ ...CHECKS, controls: { lang: "en", filters: [{ label: "Paused", href: "?f=p" }] } }))).toContain('<a class="chip" href="?f=p">Paused</a>');
  });

  test("a sortable header is a link; the one in force has aria-sort and an arrow hidden from a screen reader", () => {
    expect(h).toContain('<th scope="col" aria-sort="descending"><a class="sort" href="?sort=state">State<span class="sort-dir" aria-hidden="true">↓</span></a></th>');
    expect(h).toContain('<th scope="col" class="num"><a class="sort" href="?sort=uptime">Uptime 30d</a></th>');
    expect(h.match(/aria-sort=/g)).toHaveLength(1);
    const up = String(table({ label: "T", columns: [{ label: "Name", sort: { href: "javascript:alert(1)", dir: "asc" } }], rows: [] }));
    expect(up).toContain('<th scope="col" aria-sort="ascending"><a class="sort" href="#">Name<span class="sort-dir" aria-hidden="true">↑</span></a></th>');
  });

  test("the footer states the order after the range, and Previous is unavailable on the first page", () => {
    expect(h).toContain('<nav class="pagination" aria-label="Pages of Checks"><p class="pagination-range">1–6 of 248<span class="pagination-order">, worst first</span></p><span class="pagination-steps"><span class="button ghost small" aria-disabled="true">Previous</span><a class="button ghost small" href="?page=2" rel="next">Next</a></span></nav>');
  });

  test("without a stated order, the sorted column is said; without paging, the order stands alone", () => {
    const o = String(table({ ...CHECKS, controls: { lang: "da" } }));
    expect(o).toBe(`<div class="data-table">${String(table({ ...CHECKS, controls: undefined }))}<div class="table-foot"><p class="table-order">sorteret efter State, faldende</p></div></div>`);
    const plain = String(table({ label: "T", columns: [{ label: "A" }], rows: [], controls: { lang: "en" } }));
    expect(plain).toBe('<div class="data-table"><div class="table-wrap" role="region" aria-label="T" tabindex="0"><table><thead><tr><th scope="col">A</th></tr></thead><tbody></tbody></table></div></div>');
  });

  test("paging can be a pagination() result; the order is then its own line before it", () => {
    const nav = pagination({ lang: "en", from: 7, to: 12, total: 248, prevHref: "?page=1", nextHref: "?page=3", label: "Pages" });
    const o = String(table({ ...CHECKS, controls: { lang: "en", sort: { label: "worst first" }, paging: nav } }));
    expect(o).toContain(`<div class="table-foot"><p class="table-order">worst first</p>${String(nav)}</div>`);
  });

  test("no rows and an empty state: the state stands in for the table", () => {
    const o = String(table({ ...CHECKS, rows: [], controls: { ...CHECKS.controls!, empty: html`<div class="data-state">None match</div>` } }));
    expect(o).toContain('</form><nav class="table-filters"');
    expect(o).toContain('<div class="data-state">None match</div><div class="table-foot">');
    expect(o).not.toContain("<table>");
  });
});

describe("pagination()", () => {
  test("both ends are spans marked aria-disabled; the middle has two links with rel", () => {
    const first = String(pagination({ lang: "en", from: 1, to: 6, total: 12, nextHref: "?page=2" }));
    expect(first).toBe('<nav class="pagination" aria-label="Pages"><p class="pagination-range">1–6 of 12</p><span class="pagination-steps"><span class="button ghost small" aria-disabled="true">Previous</span><a class="button ghost small" href="?page=2" rel="next">Next</a></span></nav>');
    const last = String(pagination({ lang: "en", from: 7, to: 12, total: 12, prevHref: "?page=1" }));
    expect(last).toContain('<a class="button ghost small" href="?page=1" rel="prev">Previous</a><span class="button ghost small" aria-disabled="true">Next</span>');
    const mid = String(pagination({ lang: "en", from: 7, to: 12, total: 18, prevHref: "?page=1", nextHref: "?page=3" }));
    expect(mid).not.toContain("aria-disabled");
    const only = String(pagination({ lang: "en", from: 1, to: 3, total: 3 }));
    expect(only.match(/aria-disabled="true"/g)).toHaveLength(2);
  });

  test("Danish words and numbers: af, Forrige, Næste, a dot for thousands", () => {
    const da = String(pagination({ lang: "da", from: 1201, to: 1248, total: 1248, prevHref: "?side=25", order: "værst først" }));
    expect(da).toBe('<nav class="pagination" aria-label="Sider"><p class="pagination-range">1.201–1.248 af 1.248<span class="pagination-order">, værst først</span></p><span class="pagination-steps"><a class="button ghost small" href="?side=25" rel="prev">Forrige</a><span class="button ghost small" aria-disabled="true">Næste</span></span></nav>');
    expect(String(pagination({ lang: "en", from: 1, to: 50, total: 12480 }))).toContain("1–50 of 12,480");
    expect(String(table({ ...CHECKS, controls: { lang: "da", filters: [{ label: "Alle", count: 1248, href: "?" }] } }))).toContain('<span class="chip-count">1.248</span>');
  });

  test("no rows is 0 of 0", () => {
    expect(String(pagination({ lang: "da", ...pageOf(0, 1, 6) }))).toContain('<p class="pagination-range">0 af 0</p>');
  });
});

describe("pageOf()", () => {
  test("the first, a middle and the last page", () => {
    expect(pageOf(248, 1, 6)).toEqual({ page: 1, from: 1, to: 6, total: 248, pages: 42, next: 2 });
    expect(pageOf(248, 2, 6)).toEqual({ page: 2, from: 7, to: 12, total: 248, pages: 42, prev: 1, next: 3 });
    expect(pageOf(248, 42, 6)).toEqual({ page: 42, from: 247, to: 248, total: 248, pages: 42, prev: 41 });
  });

  test("clamps: page 0 and negative are the first, past the end is the last, no rows is one empty page", () => {
    expect(pageOf(248, 0, 6)).toEqual(pageOf(248, 1, 6));
    expect(pageOf(248, -3, 6)).toEqual(pageOf(248, 1, 6));
    expect(pageOf(248, 999, 6)).toEqual(pageOf(248, 42, 6));
    expect(pageOf(0, 1, 6)).toEqual({ page: 1, from: 0, to: 0, total: 0, pages: 1 });
    expect(pageOf(0, 5, 6)).toEqual({ page: 1, from: 0, to: 0, total: 0, pages: 1 });
  });

  test("a hand-typed or broken value does not break the arithmetic", () => {
    expect(pageOf(248, Number.NaN, 6)).toEqual(pageOf(248, 1, 6));
    expect(pageOf(248, 2.7, 6)).toEqual(pageOf(248, 2, 6));
    expect(pageOf(10, 1, 0)).toEqual({ page: 1, from: 1, to: 1, total: 10, pages: 10, next: 2 });
    expect(pageOf(6, 1, 6)).toEqual({ page: 1, from: 1, to: 6, total: 6, pages: 1 });
  });
});

describe("escaping", () => {
  test("every string a caller passes is text, and hrefs lose their script", () => {
    const o = String(
      table({
        id: evil,
        label: evil,
        columns: [{ label: evil, sort: { href: evil, dir: "asc" } }],
        rows: [[evil]],
        controls: {
          lang: "en",
          search: { name: evil, value: evil, placeholder: evil, label: evil, action: "javascript:alert(1)" },
          filters: [{ label: evil, count: 1, href: "javascript:alert(1)", current: true }],
          sort: { label: evil },
          keep: { [evil]: evil },
          paging: { from: 1, to: 1, total: 1, prevHref: "javascript:alert(1)", nextHref: evil, label: evil },
        },
      }),
    );
    clean(o);
    expect(o).not.toContain("javascript:");
    expect(o).toContain('action="#"');
  });
});

describe("React wrappers draw the helpers' bytes", () => {
  test.each([CHECKS, { label: "Folk", columns: [{ label: "A" }], rows: [["<b>"]] }, { ...CHECKS, controls: { ...CHECKS.controls!, lang: "da" as const } }])("Table %#", (o) => {
    expect(renderToStaticMarkup(createElement(Table, o))).toBe(String(table(o)));
  });

  test.each<PaginationOptions>([
    { lang: "en", from: 1, to: 6, total: 248, nextHref: "?page=2" },
    { lang: "da", from: 0, to: 0, total: 0, label: `Sider "x"` },
  ])("Pagination %#", (o) => {
    expect(renderToStaticMarkup(createElement(Pagination, o))).toBe(String(pagination(o)));
  });
});

// chartSvg (rich answers v1): the structure, escaping, formats, token colours, clamping, empty and deterministic output, and a
// rasteriser check: resvg (what Spring runs in a Worker) renders it to a PNG at two sizes. Names in the fixtures are invented.

import { Resvg } from "@resvg/resvg-js";
import { describe, expect, test } from "vitest";
import { type Chart, CHART_MAX_POINTS, chartSvg, formatDate, formatNumber, niceTicks } from "../src/chart-svg.ts";
import { ROLES } from "../src/family.ts";

const days = ["2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20", "2026-11-21"];
const line: Chart = {
  kind: "chart",
  type: "line",
  title: "Omsætning pr. dag",
  x: { key: "day", label: "Dag", type: "date" },
  y: [
    { key: "shop", label: "Butik", type: "money", unit: "DKK", decimals: 0 },
    { key: "web", label: "Webshop", type: "money", unit: "DKK", decimals: 0 },
  ],
  rows: days.map((day, i) => ({ day, shop: 12345 + i * 1000, web: 4200 + i * 300 })),
  source: "Bageriet: Omsætning pr. dag",
};
const bar: Chart = {
  type: "bar",
  title: "Salg pr. produkt",
  x: { key: "p", label: "Produkt", type: "text" },
  y: [{ key: "n", label: "Antal", type: "number" }],
  rows: [
    { p: "Rugbrød", n: 120 },
    { p: "Kringle", n: 80 },
    { p: "Tebirkes", n: 200 },
  ],
};
const opts = { theme: "light", width: 800, height: 400, lang: "da" } as const;
const count = (s: string, re: RegExp) => (s.match(re) ?? []).length;

describe("structure", () => {
  test("a line chart: one path per series, a legend for two series, the title and the source", () => {
    const s = chartSvg(line, opts);
    expect(s.startsWith('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400"')).toBe(true);
    expect(count(s, /<path /g)).toBe(2);
    expect(s).toContain("Omsætning pr. dag");
    expect(s).toContain("Kilde: Bageriet: Omsætning pr. dag");
    expect(s).toContain("Butik (DKK)");
    expect(s).toContain("Webshop (DKK)");
  });

  test("a single series has no legend and uses the first chart slot", () => {
    const one = { ...line, y: [line.y[0]!] };
    const s = chartSvg(one, opts);
    expect(s).not.toContain("Butik");
    expect(s).toContain(`stroke="${ROLES.light["chart-1"]}"`);
  });

  test("a bar chart draws one bar per value, grouped for two series", () => {
    expect(count(chartSvg(bar, opts), /<rect /g)).toBe(1 + 3); // the surface and three bars
    const two: Chart = { ...bar, y: [...bar.y, { key: "m", label: "Retur", type: "number" }], rows: bar.rows.map((r) => ({ ...r, m: 5 })) };
    const s = chartSvg(two, opts);
    expect(count(s, /<rect /g)).toBe(1 + 6 + 2); // surface, six bars, two legend swatches
  });

  test("a null or NaN value is a gap: the line breaks and the bar is missing", () => {
    const gap: Chart = { ...line, y: [line.y[0]!], rows: line.rows.map((r, i) => ({ ...r, shop: i === 2 ? null : (r.shop as number) })) };
    const d = /<path d="([^"]+)"/.exec(chartSvg(gap, opts))![1]!;
    expect(count(d, /M/g)).toBe(2);
    const nan: Chart = { ...bar, rows: bar.rows.map((r, i) => (i === 1 ? { ...r, n: Number.NaN } : r)) };
    expect(count(chartSvg(nan, opts), /<rect /g)).toBe(1 + 2);
  });
});

describe("text", () => {
  test("every text is escaped", () => {
    const evil: Chart = { ...bar, title: `<script>alert("x")</script> & 'q'`, source: "<b>src</b>", rows: [{ p: "<i>x</i>", n: 1 }] };
    const s = chartSvg(evil, opts);
    expect(s).not.toContain("<script");
    expect(s).not.toContain("<b>");
    expect(s).not.toContain("<i>");
    expect(s).toContain("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;q&#39;");
  });

  test("Danish and English formats", () => {
    expect(formatNumber(12345.6, 1, "da")).toBe("12.345,6");
    expect(formatNumber(12345.6, 1, "en")).toBe("12,345.6");
    expect(formatNumber(-1234567, 0, "da")).toBe("-1.234.567");
    expect(formatDate("2026-11-17", "da")).toBe("17. nov 2026");
    expect(formatDate("2026-11-17", "en")).toBe("17 Nov 2026");
    expect(formatDate("uge 47", "da")).toBe("uge 47");
    const da = chartSvg(line, opts);
    expect(da).toContain("17. nov 2026");
    expect(da).toMatch(/>1[0-9]\.[0-9]{3}</); // thousands with a point
    const en = chartSvg(line, { ...opts, lang: "en" });
    expect(en).toContain("17 Nov 2026");
    expect(en).toContain("Source: ");
    expect(en).toMatch(/>1[0-9],[0-9]{3}</);
  });

  test("a percent axis carries the sign and a money axis carries its unit once, above the axis", () => {
    const pct: Chart = { ...bar, y: [{ key: "n", label: "Andel", type: "percent" }] };
    expect(chartSvg(pct, opts)).toContain(" %");
    const s = chartSvg(line, opts);
    expect(count(s, />DKK</g)).toBe(1);
  });

  test("nice ticks: 1, 2 or 5 times a power of ten, covering the data", () => {
    expect(niceTicks(0, 87, 4)).toEqual([0, 20, 40, 60, 80, 100]);
    expect(niceTicks(0, 1, 5)).toEqual([0, 0.2, 0.4, 0.6, 0.8, 1]);
    expect(niceTicks(5, 5, 4).length).toBeGreaterThan(1);
  });

  test("the font is the brand family with a system fallback, no variable", () => {
    const s = chartSvg(line, opts);
    expect(s).toContain('font-family="Archivo, Arial, sans-serif"');
    expect(s).not.toMatch(/var\(|<style|<script|foreignObject|href=|url\(|@import/);
  });
});

describe("colours come from the tokens", () => {
  test.each(["light", "dark"] as const)("%s", (theme) => {
    const c = ROLES[theme];
    const s = chartSvg(line, { ...opts, theme });
    expect(s).toContain(`fill="${c.card}"`);
    expect(s).toContain(`stroke="${c["chart-1"]}"`);
    expect(s).toContain(`stroke="${c["chart-2"]}"`);
    expect(s).toContain(`stroke="${c.border}"`);
    expect(s).toContain(`fill="${c["muted-foreground"]}"`);
    expect(s).toContain(`fill="${c["card-foreground"]}"`);
    const other = ROLES[theme === "light" ? "dark" : "light"];
    expect(s).not.toContain(other["chart-1"]);
  });
});

describe("never throws", () => {
  test("more than 4 series and more than 400 points are clamped, with a note", () => {
    const many: Chart = {
      ...line,
      y: ["a", "b", "c", "d", "e", "f"].map((k) => ({ key: k, label: k.toUpperCase(), type: "number" as const })),
      rows: Array.from({ length: 450 }, (_, i) => ({ day: "2026-01-01", a: i, b: i, c: i, d: i, e: i, f: i })),
    };
    const s = chartSvg(many, opts);
    expect(count(s, /<path /g)).toBe(4);
    expect(s).toContain("Viser de første 4 serier af 6.");
    expect(s).toContain(`Viser de første ${CHART_MAX_POINTS} punkter af 450.`);
    expect(chartSvg(many, { ...opts, lang: "en" })).toContain("Showing the first 4 of 6 series.");
  });

  test("empty rows say so calmly", () => {
    for (const c of [{ ...line, rows: [] }, { ...bar, rows: [] }, { ...line, rows: [{ day: "x", shop: null, web: null }] }]) {
      const s = chartSvg(c, opts);
      expect(s).toContain("Ingen data");
      expect(s).toContain("</svg>");
    }
    expect(chartSvg({ ...bar, rows: [] }, { ...opts, lang: "en" })).toContain("No data");
  });

  test("input outside the contract does not throw", () => {
    for (const bad of [null, undefined, {}, { type: "pie", rows: "x", y: 3 }, { type: "line", x: null, y: [null], rows: [null, 1] }]) {
      expect(() => chartSvg(bad as never, opts)).not.toThrow();
      expect(chartSvg(bad as never, opts)).toContain("</svg>");
    }
    expect(() => chartSvg(line, { theme: "x", width: Number.NaN, height: -5, lang: "fr" } as never)).not.toThrow();
  });

  test("a single point and a constant series still draw", () => {
    expect(chartSvg({ ...line, rows: [line.rows[0]!] }, opts)).toContain("<path");
    expect(chartSvg({ ...line, rows: line.rows.map((r) => ({ ...r, shop: 7, web: 7 })) }, opts)).toContain("<path");
  });
});

test("deterministic: the same input gives the same string", () => {
  expect(chartSvg(line, opts)).toBe(chartSvg(structuredClone(line), { ...opts }));
  expect(chartSvg(bar, opts)).toBe(chartSvg(structuredClone(bar), { ...opts }));
});

describe("resvg renders it", () => {
  const sizes = [
    [800, 400],
    [480, 270],
  ] as const;
  const cases = sizes.flatMap(([w, h]) =>
    (["light", "dark"] as const).flatMap((theme) =>
      [
        ["line", line],
        ["bar", bar],
      ].map(([k, c]) => [w, h, theme, k, c] as const),
    ),
  );
  test.each(cases)(
    "%ix%i %s %s",
    (w, h, theme, _k, c) => {
      const svg = chartSvg(c as Chart, { theme, width: w, height: h, lang: "da" });
      const png = new Resvg(svg, { font: { loadSystemFonts: false }, fitTo: { mode: "original" } }).render();
      expect(png.width).toBe(w);
      expect(png.height).toBe(h);
      expect(png.asPng().length).toBeGreaterThan(500);
    },
  );
});

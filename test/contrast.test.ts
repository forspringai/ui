// WCAG 2.2 AA on every background (hub ui-standard §3): text roles at least 4.5:1 wherever they can
// sit, every product's accent at least 4.5:1 on the page in both themes (D-90), and the label on a
// filled accent too. The numbers are printed in the test names, so a failing run says by how much.

import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { contrast, distance } from "../src/color.ts";
import { MODES, model } from "../src/emit.ts";

const m = model(join(import.meta.dirname, "..", "tokens"));
const SURFACES = ["background", "card", "muted"] as const;
const AA = 4.5;

describe.each(MODES)("%s theme", (mode) => {
  const c = (role: string) => m.colors[role]![mode];

  describe.each(m.products)("%s accent", (p) => {
    const accent = m.product[p]!.primary[mode];
    for (const s of ["background", "card"]) {
      const r = contrast(accent, c(s));
      test(`on ${s}: ${r.toFixed(2)}:1`, () => expect(r).toBeGreaterThanOrEqual(AA));
    }
    const fg = m.product[p]!["primary-foreground"][mode];
    const r = contrast(fg, accent);
    test(`primary-foreground ${fg} on it: ${r.toFixed(2)}:1`, () => expect(r).toBeGreaterThanOrEqual(AA));
  });

  describe.each(["foreground", "body-foreground", "muted-foreground", "card-foreground", "success", "warning", "danger"])("%s as text", (role) => {
    for (const s of SURFACES) {
      const r = contrast(c(role), c(s));
      test(`on ${s}: ${r.toFixed(2)}:1`, () => expect(r).toBeGreaterThanOrEqual(AA));
    }
  });

  // A status colour must never be mistaken for a product's accent: danger beside SiteSpring's
  // terracotta, success beside DataSpring's teal. OKLab distance x100; 10 is clearly apart.
  describe.each(["success", "warning", "danger"])("%s apart from every accent", (role) => {
    for (const p of m.products) {
      const d = distance(c(role), m.product[p]!.primary[mode]);
      test(`${p}: ${d.toFixed(1)}`, () => expect(d).toBeGreaterThanOrEqual(10));
    }
  });

  // A signal mark is a non-text graphic beside its word (WCAG 1.4.11, 3:1 wherever it can sit), and
  // must never read as a product's brand: down beside PulseSpring's magenta, ok beside DataSpring's teal (D-13).
  describe.each(["signal-ok", "signal-warn", "signal-down", "signal-off"])("%s", (role) => {
    for (const s of SURFACES) {
      const r = contrast(c(role), c(s));
      test(`mark on ${s}: ${r.toFixed(2)}:1`, () => expect(r).toBeGreaterThanOrEqual(3));
    }
    for (const p of m.products) {
      const d = distance(c(role), m.product[p]!.primary[mode]);
      test(`apart from ${p}: ${d.toFixed(1)}`, () => expect(d).toBeGreaterThanOrEqual(10));
    }
  });

  test("the focus ring is visible on the page (non-text, 3:1)", () => {
    for (const p of m.products) expect(contrast(m.product[p]!.ring[mode], c("background"))).toBeGreaterThanOrEqual(3);
  });
});

test("the D-90 accents, exactly", () => {
  const got = Object.fromEntries(m.products.map((p) => [p, m.product[p]!.primary]));
  expect(got).toEqual({
    forspring: { light: "#2244ff", dark: "#6b83ff" },
    sitespring: { light: "#b8442a", dark: "#e0714f" },
    dataspring: { light: "#0b7c82", dark: "#2ba7ad" },
    appspring: { light: "#7b3f8c", dark: "#b57cc6" },
    pulsespring: { light: "#a3237a", dark: "#e06dba" },
  });
});

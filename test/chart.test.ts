// The categorical chart palette's gate: the dataviz validator's checks, rerun over the committed
// values (as Canonify's chart-palette test does), so an edit to tokens/chart.json that breaks colour-
// blind separation fails here with the slot and its number.

import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { contrast, distance, lc } from "../src/color.ts";
import { MODES, model } from "../src/emit.ts";

const m = model(join(import.meta.dirname, "..", "tokens"));
const BAND = { light: [0.43, 0.77], dark: [0.48, 0.67] } as const;

test("eight slots", () => {
  expect(m.roles.filter((r) => r.startsWith("chart-"))).toEqual(["chart-1", "chart-2", "chart-3", "chart-4", "chart-5", "chart-6", "chart-7", "chart-8"]);
});

describe.each(MODES)("%s theme", (mode) => {
  const slots = [1, 2, 3, 4, 5, 6, 7, 8].map((i) => m.colors[`chart-${i}`]![mode]);
  const surfaces = ["background", "card"].map((s) => m.colors[s]![mode]);

  test("lightness band and chroma floor (reads as a colour, not grey)", () => {
    for (const c of slots) {
      const [l, ch] = lc(c);
      expect(l, c).toBeGreaterThanOrEqual(BAND[mode][0]);
      expect(l, c).toBeLessThanOrEqual(BAND[mode][1]);
      expect(ch, c).toBeGreaterThanOrEqual(0.1);
    }
  });

  test("every mark at least 3:1 on background and card (WCAG 1.4.11)", () => {
    for (const c of slots) for (const s of surfaces) expect(contrast(c, s), `${c} on ${s}`).toBeGreaterThanOrEqual(3);
  });

  test("neighbours apart under protanopia and deuteranopia (>= 8) and normal vision (>= 15)", () => {
    for (let i = 0; i < 7; i++) {
      const [a, b] = [slots[i]!, slots[i + 1]!];
      expect(Math.min(distance(a, b, "protan"), distance(a, b, "deutan")), `${a} / ${b}`).toBeGreaterThanOrEqual(8);
      expect(distance(a, b), `${a} / ${b}`).toBeGreaterThanOrEqual(15);
    }
  });

  test("no two slots alike under normal vision (>= 12)", () => {
    for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) expect(distance(slots[i]!, slots[j]!), `${slots[i]} / ${slots[j]}`).toBeGreaterThanOrEqual(12);
  });

  // Eight hues cannot all avoid five accents and three status colours; the floor keeps every slot
  // from being a near copy of one. The closest today: olive and success green (light, 7.5), green and
  // DataSpring's teal (dark, 9.7). Every other slot is at least 10 from all eight. Raise it, never
  // lower it.
  test("no slot a near copy of an accent or a status colour (>= 7)", () => {
    const reserved = [...m.products.map((p) => m.product[p]!.primary[mode]), ...["success", "warning", "danger"].map((r) => m.colors[r]![mode])];
    for (const c of slots) for (const r of reserved) expect(distance(c, r), `${c} / ${r}`).toBeGreaterThanOrEqual(7);
  });
});

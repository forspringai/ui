// A notice that is not an error must never look like one. Accents can be red-ish (SiteSpring's
// terracotta, PulseSpring's magenta), and the first cut drew the plain notice in the accent: on
// SiteSpring it was 10 apart from the error notice's border and identical in tint (controller review
// of hen, 2026-10-10). This resolves the rules in components.css against the tokens, for every
// product in both themes, and holds the plain and status notices well apart from the error one.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { distance, rgb } from "../src/color.ts";
import { MODES, type Mode, model } from "../src/emit.ts";

const root = join(import.meta.dirname, "..");
const m = model(join(root, "tokens"));
const css = readFileSync(join(root, "css/components.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

// selector -> property -> value, for the flat rules (the layers' bodies hold no nesting but media).
const rules = new Map<string, Record<string, string>>();
for (const r of css.matchAll(/([^{};]+)\{([^{}]*)\}/g)) {
  const decls: Record<string, string> = {};
  for (const d of r[2]!.split(";")) {
    const i = d.indexOf(":");
    if (i > 0) decls[d.slice(0, i).trim()] = d.slice(i + 1).trim();
  }
  for (const sel of r[1]!.split(",")) rules.set(sel.trim(), { ...rules.get(sel.trim()), ...decls });
}

const hex = (c: number[]) => "#" + c.map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("");

// Enough of CSS colour to resolve these rules: var() of a role, and color-mix(in srgb, a p%, b).
function resolve(expr: string, mode: Mode, product: string): string {
  const e = expr.trim();
  const v = /^var\(--([a-z0-9-]+)\)$/.exec(e);
  if (v) {
    const role = v[1]!;
    const own = m.product[product]![role as "primary"];
    if (own) return own[mode];
    if (!m.colors[role]) throw new Error(`unknown role ${role}`);
    return m.colors[role][mode];
  }
  const mix = /^color-mix\(in srgb,\s*(.+?)\s+(\d+)%,\s*(.+)\)$/.exec(e);
  if (mix) {
    const a = rgb(resolve(mix[1]!, mode, product));
    const b = rgb(resolve(mix[3]!, mode, product));
    const p = Number(mix[2]) / 100;
    return hex(a.map((x, i) => x * p + b[i]! * (1 - p)));
  }
  throw new Error(`cannot resolve ${e}`);
}

function notice(selector: string, mode: Mode, product: string) {
  const own = rules.get(selector)!;
  const base = rules.get(".notice")!;
  const border = (own.border ?? base.border)!.replace(/^1px solid /, "");
  return { background: resolve(own.background ?? base.background!, mode, product), border: resolve(border, mode, product) };
}

// OKLab x100. The border carries the difference (a neutral hairline against danger red); the
// background is a second cue, white or the dark card against the 9% danger tint, which is about
// twice the just-noticeable step. The first cut's accent notice had the same 9% tint idea in the
// accent's hue, 10 from the error border on SiteSpring.
const BORDER_APART = 20;
const BACKGROUND_APART = 4;

describe.each(MODES)("%s theme", (mode) => {
  describe.each(m.products)("%s", (product) => {
    const error = notice(".notice.error", mode, product);
    const plain = notice(".notice", mode, product);
    const border = distance(plain.border, error.border);
    const bg = distance(plain.background, error.background);
    test(`.notice vs .notice.error: border ${border.toFixed(1)}, background ${bg.toFixed(1)}`, () => {
      expect(border).toBeGreaterThanOrEqual(BORDER_APART);
      expect(bg).toBeGreaterThanOrEqual(BACKGROUND_APART);
    });
  });
});

test("the plain notice and the primary tag take no accent fill or outline", () => {
  expect(rules.get(".notice")!.background).not.toContain("primary");
  expect(rules.get(".notice")!.border).not.toContain("primary");
  expect(JSON.stringify(rules.get(".tag.primary"))).not.toMatch(/border|background/);
  expect(css).not.toMatch(/color-mix\(in srgb, var\(--primary\) \d+%, var\(--(card|background|muted)\)\)/);
});

// The component layer stays on the roles: no colour literal outside the tokens (the Google button's
// colours are Google's and live in google-button.css), no type size off the ladders, and every class
// the HTML helpers write has a rule.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";
import { demoPage } from "../demo/index.ts";

const root = join(import.meta.dirname, "..");
const css = readFileSync(join(root, "css/components.css"), "utf8");
const code = css.replace(/\/\*[\s\S]*?\*\//g, "");

test("components.css has no hex, rgb(), hsl() or named colour literals", () => {
  expect(code.match(/#[0-9a-f]{3,8}\b/gi)).toBeNull();
  expect(code.match(/\b(rgba?|hsla?|oklch|oklab|lab|lch|hwb)\(/gi)).toBeNull();
  // Keywords that are colours (transparent and currentColor are not a palette).
  expect(code.match(/:\s*(white|black|red|blue|green|gray|grey)\b/gi)).toBeNull();
});

test("type sizes come from the two ladders", () => {
  const sizes = [...code.matchAll(/font(?:-size)?:[^;]*?\b(\d+(?:\.\d+)?)px/g)].map((m) => m[1]);
  expect(sizes).toEqual([]);
});

test("radii come from the tokens, or are a pill", () => {
  for (const m of code.matchAll(/border-radius:\s*([^;]+);/g)) expect(m[1]).toMatch(/^(var\(--radius-(button|card|input|panel)\)|999px)$/);
});

test("both layers are declared in order, and every rule sits in one", () => {
  expect(code.trimStart().startsWith("@layer forspring.base, forspring.components;")).toBe(true);
  const outside = code.replace(/@layer forspring\.(base|components) \{[\s\S]*$/, "").replace("@layer forspring.base, forspring.components;", "");
  expect(outside.trim()).toBe("");
});

test("every class in the demo page has a rule", () => {
  const html = demoPage();
  const used = new Set([...html.matchAll(/class="([^"]+)"/g)].flatMap((m) => m[1]!.split(/\s+/)));
  const gsi = readFileSync(join(root, "css/google-button.css"), "utf8");
  // The demo's own layout, the mark's parts (styled as .brand .mark .fill), and data-state's "empty",
  // which is the plain state and only names the kind for a product's own rules.
  const demoOnly = ["demo-controls", "demo-row", "demo-grid", "mark", "fill", "coil", "empty"];
  const missing = [...used].filter((c) => !demoOnly.includes(c) && !new RegExp(`\\.${c}\\b`).test(css + gsi));
  expect(missing).toEqual([]);
});

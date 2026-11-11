// The component layer stays on the roles: no colour literal outside the tokens (the Google button's
// colours are Google's and live in google-button.css), no type size off the ladders, no duration,
// shadow or line-height that is not a token (D-27), media queries at the breakpoints, and every class
// the HTML helpers write has a rule.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";
import { demoPage, standardPages } from "../demo/index.ts";
import { PHONE_WIDTH } from "../src/audit/audit.ts";
import { model } from "../src/emit.ts";

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

test("every class in the demo page and the standard pages has a rule", () => {
  const html = demoPage() + Object.values(standardPages()).join("");
  const used = new Set([...html.matchAll(/class="([^"]+)"/g)].flatMap((m) => m[1]!.split(/\s+/)));
  const gsi = readFileSync(join(root, "css/google-button.css"), "utf8");
  // The demo's own layout, the mark's parts (styled as .brand .mark .fill), and data-state's "empty",
  // which is the plain state and only names the kind for a product's own rules; likewise the bar menus'
  // and standard pages' kinds (D-17), hooks for a product's own rules.
  const demoOnly = ["demo-controls", "demo-row", "demo-grid", "demo-toasts", "demo-icons", "mark", "fill", "coil", "empty", "org-switcher", "product-switcher", "choose-org", "no-org", "refused"];
  const missing = [...used].filter((c) => !demoOnly.includes(c) && !new RegExp(`\\.${c}\\b`).test(css + gsi));
  expect(missing).toEqual([]);
});

// D-14: every margin, padding, gap and inset is a space token, 0 or auto. The audit checks the
// rendered page; this checks the rules a page may not happen to show.
test("spacing comes from the 4px scale: no px literal in a margin, padding, gap or inset", () => {
  const props = /^\s*(margin|padding|gap|row-gap|column-gap|inset|top|right|bottom|left)(-[a-z-]+)?:\s*([^;]+);/gm;
  const off: string[] = [];
  for (const m of code.matchAll(props)) {
    // A negative space step (-4px) is on the grid; the skip link's -9999px parks it off screen.
    for (const px of m[3]!.matchAll(/(-?\d+(?:\.\d+)?)px/g)) {
      const v = Number(px[1]);
      if (v !== -9999 && v % 4 !== 0) off.push(`${m[1]}${m[2] ?? ""}: ${m[3]}`);
    }
  }
  expect(off).toEqual([]);
});

test("inputs, selects and buttons take their height from the control tokens", () => {
  const rule = (sel: string) => {
    const i = code.indexOf(`${sel} {`);
    expect(i, sel).toBeGreaterThan(-1);
    return code.slice(i, code.indexOf("}", i));
  };
  expect(rule("  button")).toContain("min-height: var(--control-height);");
  expect(rule("  .button")).toContain("min-height: var(--control-height);");
  expect(rule("  input,\n  select,\n  textarea")).toContain("min-height: var(--control-height);");
  expect(rule("  :is(button, .button).small")).toContain("min-height: var(--control-height-small);");
  expect(rule("  :is(input, select).small")).toContain("min-height: var(--control-height-small);");
  expect(code).toContain("min-height: var(--control-touch);");
});

test("the select draws its chevron without an image request", () => {
  const i = code.indexOf("  select {");
  const select = code.slice(i, code.indexOf("}", i));
  expect(select).toContain("appearance: none;");
  expect(select).toContain("padding-inline-end: var(--space-8);");
  expect(select).toMatch(/linear-gradient\([^;]*var\(--muted-foreground\)/);
  expect(code).not.toMatch(/url\(/);
});

// D-27: motion, elevation and leading are tokens, as spacing is (D-14).
test("durations come from the motion tokens: no bare 0.15s or 1.4s", () => {
  expect(code.match(/(?<![\w-])\d*\.?\d+m?s\b/g)).toBeNull();
  // Easing is a token or a keyword; a cubic-bezier() written here would be a curve no token names.
  expect(code).not.toMatch(/cubic-bezier\(/);
  for (const m of code.matchAll(/(?:transition|animation)(?:-duration)?:\s*([^;]+);/g)) {
    if (/^none\b/.test(m[1]!)) continue;
    expect(m[1], m[0]).toMatch(/var\(--motion-duration-[a-z]+\)/);
  }
});

test("reduced motion stops everything", () => {
  const i = code.indexOf("@media (prefers-reduced-motion: reduce)");
  expect(i).toBeGreaterThan(-1);
  const block = code.slice(i, code.indexOf("}\n  }", i));
  expect(block).toContain("transition: none !important;");
  expect(block).toContain("animation: none !important;");
});

test("a box-shadow is an elevation token, none, or a 2 to 3px edge rule in a role", () => {
  const off: string[] = [];
  for (const m of code.matchAll(/box-shadow:\s*([^;]+);/g)) {
    const v = m[1]!.trim();
    if (/^var\(--shadow-(raised|overlay)\)$/.test(v) || v === "none") continue;
    // The accent's edge rule on a selected row or tab: a solid inset line like a border, no blur.
    const edge = /^inset (-?\d+)(?:px)? (-?\d+)(?:px)? 0 var\(--[a-z-]+\)$/.exec(v);
    if (edge && [edge[1], edge[2]].every((n) => Math.abs(Number(n)) <= 3)) continue;
    off.push(v);
  }
  expect(off).toEqual([]);
});

test("every line-height is a leading token or a control's line box, never a bare number", () => {
  const values = [
    ...[...code.matchAll(/line-height:\s*([^;]+);/g)].map((m) => m[1]!.trim()),
    // The font shorthand's size/line-height.
    ...[...code.matchAll(/\bfont:[^;]*?\)\s*\/\s*([^\s;]+(?:\([^;]*?\))?)/g)].map((m) => m[1]!.trim()),
  ];
  expect(values.length).toBeGreaterThan(40);
  const off = values.filter((v) => !/^(var\(--(leading-[a-z0-9-]+|_control-line(-small)?|space-\d+)\)|calc\(.*\))$/.test(v));
  expect(off).toEqual([]);
  // A leading named here is one the tokens define.
  const m = model(join(root, "tokens"));
  const names = new Set(["solid", ...Object.entries(m.leading).flatMap(([ladder, steps]) => (typeof steps === "number" ? [] : Object.keys(steps).map((k) => `${ladder}-${k}`)))]);
  for (const v of values) {
    const lead = /^var\(--leading-([a-z0-9-]+)\)$/.exec(v);
    if (lead) expect(names, v).toContain(lead[1]);
  }
});

// A media query cannot read a custom property, so the widths are px here, held to the tokens.
test("every media query width is a breakpoint token, and the audit's phone is the phone", () => {
  const m = model(join(root, "tokens"));
  const widths = [...code.matchAll(/@media[^{]*\((?:max|min)-width:\s*(\d+)px\)/g)].map((x) => Number(x[1]));
  expect(widths.length).toBeGreaterThan(0);
  for (const w of widths) expect(Object.values(m.breakpoint), `${w}px`).toContain(w);
  expect(widths).toContain(m.breakpoint.phone);
  expect(PHONE_WIDTH).toBe(m.breakpoint.phone);
});

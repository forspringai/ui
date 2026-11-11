// The component layer stays on the roles: no colour literal outside the tokens (the Google button's
// colours are Google's and live in google-button.css), no type size off the ladders, no duration,
// shadow or line-height that is not a token (D-27), media queries at the breakpoints, and every class
// the HTML helpers write has a rule.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";
import { demoPage, standardPages } from "../demo/index.ts";
import { PHONE_WIDTH, RICH_SLOTS, SMALL_SIZES } from "../src/audit/audit.ts";
import { model } from "../src/emit.ts";

const root = join(import.meta.dirname, "..");
const strip = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, "");
const css = readFileSync(join(root, "css/components.css"), "utf8");
const code = strip(css);
// The shadcn preset (D-33) is held to the same rules as the component layer.
const shadcn = strip(readFileSync(join(root, "css/shadcn.css"), "utf8"));
const sheets: [string, string][] = [
  ["css/components.css", code],
  ["css/shadcn.css", shadcn],
];

test.each(sheets)("%s: no hex, rgb(), hsl() or named colour literals", (_file, code) => {
  expect(code.match(/#[0-9a-f]{3,8}\b/gi)).toBeNull();
  expect(code.match(/\b(rgba?|hsla?|oklch|oklab|lab|lch|hwb)\(/gi)).toBeNull();
  // Keywords that are colours (transparent and currentColor are not a palette).
  expect(code.match(/:\s*(white|black|red|blue|green|gray|grey)\b/gi)).toBeNull();
});

test.each(sheets)("%s: type sizes come from the two ladders", (_file, code) => {
  const sizes = [...code.matchAll(/font(?:-size)?:[^;]*?\b(\d+(?:\.\d+)?)px/g)].map((m) => m[1]);
  expect(sizes).toEqual([]);
});

test.each(sheets)("%s: radii come from the tokens, or are a pill", (_file, code) => {
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
test.each(sheets)("%s: spacing comes from the 4px scale: no px literal in a margin, padding, gap or inset", (_file, code) => {
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
test.each(sheets)("%s: durations come from the motion tokens: no bare 0.15s or 1.4s", (_file, code) => {
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

test.each(sheets)("%s: a box-shadow is an elevation token, none, or a 2 to 3px edge rule in a role", (_file, code) => {
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

test.each(sheets)("%s: every line-height is a leading token or a control's line box, never a bare number", (_file, code) => {
  const values = [
    ...[...code.matchAll(/line-height:\s*([^;]+);/g)].map((m) => m[1]!.trim()),
    // The font shorthand's size/line-height.
    ...[...code.matchAll(/\bfont:[^;]*?\)\s*\/\s*([^\s;]+(?:\([^;]*?\))?)/g)].map((m) => m[1]!.trim()),
  ];
  expect(values.length).toBeGreaterThan(_file === "css/components.css" ? 40 : 10);
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
test.each(sheets)("%s: every media query width is a breakpoint token, and the audit's phone is the phone", (_file, code) => {
  const m = model(join(root, "tokens"));
  const widths = [...code.matchAll(/@media[^{]*\((?:max|min)-width:\s*(\d+)px\)/g)].map((x) => Number(x[1]));
  expect(widths.length).toBeGreaterThan(0);
  for (const w of widths) expect(Object.values(m.breakpoint), `${w}px`).toContain(w);
  expect(widths).toContain(m.breakpoint.phone);
  expect(PHONE_WIDTH).toBe(m.breakpoint.phone);
});

// --- The shadcn preset (D-33) --------------------------------------------------------------------

// Each rule block of shadcn.css: its selectors, its declarations, and whether it sits in @media.
function rules(text: string): { selectors: string[]; decls: Map<string, string>; media: boolean }[] {
  const out: { selectors: string[]; decls: Map<string, string>; media: boolean }[] = [];
  const m = text.indexOf("@media");
  const mediaEnd = m === -1 ? -1 : (() => {
    let depth = 0;
    for (let i = text.indexOf("{", m); i < text.length; i++) {
      if (text[i] === "{") depth++;
      else if (text[i] === "}" && --depth === 0) return i;
    }
    return text.length;
  })();
  for (const b of text.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const decls = new Map([...b[2]!.matchAll(/([a-z-]+):\s*([^;]+);/g)].map((d) => [d[1]!, d[2]!.trim()]));
    // Split the selector list on its top-level commas, not those inside :is().
    const selectors: string[] = [];
    let depth = 0;
    let cur = "";
    for (const ch of b[1]!) {
      if (ch === "(") depth++;
      else if (ch === ")") depth--;
      if (ch === "," && depth === 0) (selectors.push(cur.trim()), (cur = ""));
      else cur += ch;
    }
    selectors.push(cur.trim());
    out.push({ selectors, decls, media: m !== -1 && b.index! > m && b.index! < mediaEnd });
  }
  return out;
}

test("shadcn.css: one layer, declared after Tailwind's four, and every rule sits in it", () => {
  expect(shadcn.trimStart().startsWith("@layer theme, base, components, utilities, forspring-shadcn;")).toBe(true);
  const outside = shadcn.replace(/@layer forspring-shadcn \{[\s\S]*$/, "").replace("@layer theme, base, components, utilities, forspring-shadcn;", "");
  expect(outside.trim()).toBe("");
});

test("shadcn.css sets on each slot exactly what the audit's RICH_SLOTS checks", () => {
  const all = rules(shadcn);
  const on = (sel: string, media = false) => {
    const decls = new Map<string, string>();
    for (const r of all) if (r.media === media && r.selectors.includes(sel)) for (const [k, v] of r.decls) decls.set(k, v);
    return decls;
  };
  const textVar = (step: string) => `var(--text-${step.replace(".", "-")})`;
  const smallSel = (slot: string) => all.find((r) => !r.media && r.selectors.some((x) => x.startsWith(`[data-slot="${slot}"]:is(`) && SMALL_SIZES.slice(0, 2).every((z) => x.includes(`[data-size="${z}"]`))));
  for (const [slot, spec] of Object.entries(RICH_SLOTS)) {
    const d = on(`[data-slot="${slot}"]`);
    expect(d.get("border-radius"), slot).toBe(spec.radius === undefined ? undefined : spec.radius === "pill" ? "999px" : `var(--radius-${spec.radius})`);
    expect(d.get("min-height"), slot).toBe(spec.height === undefined ? undefined : spec.height === "control" ? "var(--control-height)" : `var(--${spec.height.replace(".", "-")})`);
    expect(d.get("font-size"), slot).toBe(spec.text === undefined ? undefined : textVar(spec.text));
    if (spec.height === "control") {
      // Under the phone breakpoint every size reaches the touch floor.
      expect(on(`[data-slot="${slot}"]`, true).get("min-height"), slot).toBe("var(--control-touch)");
    }
    if (spec.small) {
      const r = smallSel(slot);
      expect(r, `${slot} small`).toBeDefined();
      expect(r!.decls.get("min-height")).toBe("var(--control-height-small)");
      expect(r!.decls.get("font-size")).toBe(textVar(spec.small));
    }
  }
  // And the other way: a slot shadcn.css gives a radius, height or size is one the audit checks.
  const set = all.filter((r) => ["border-radius", "min-height", "font-size"].some((k) => r.decls.has(k))).flatMap((r) => r.selectors.map((x) => /^\[data-slot="([^"]+)"\]/.exec(x)?.[1]));
  expect(set.filter((x) => x !== undefined && !(x in RICH_SLOTS))).toEqual([]);
});

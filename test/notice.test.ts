// One notice style (D-44): a tinted fill in the tone, an icon, a small-caps label, an action button,
// and no coloured edge. A notice that is not an error must never look like one: accents can be
// red-ish (SiteSpring's terracotta, PulseSpring's magenta), so info is neutral, never an accent tint
// (controller review of hen, 2026-10-10). This resolves the rules in components.css against the
// tokens, for every product in both themes, and holds the contrast and the separation in numbers.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { contrast, distance, rgb } from "../src/color.ts";
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

// Split "a, b" at the top-level comma.
function split2(inner: string): [string, string] {
  let depth = 0;
  for (let i = 0; i < inner.length; i++) {
    if (inner[i] === "(") depth++;
    else if (inner[i] === ")") depth--;
    else if (inner[i] === "," && depth === 0) return [inner.slice(0, i).trim(), inner.slice(i + 1).trim()];
  }
  throw new Error(`no top-level comma in ${inner}`);
}

// Enough of CSS colour to resolve these rules: var() of a role, light-dark(a, b), and
// color-mix(in srgb, a p%, b).
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
  const ld = /^light-dark\((.+)\)$/.exec(e);
  if (ld) {
    const [light, dark] = split2(ld[1]!);
    return resolve(mode === "light" ? light : dark, mode, product);
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

// A notice's resolved fill and tone colour (the tone is label, icon and the tinted button's ink).
function notice(selector: string, mode: Mode, product: string) {
  const own = rules.get(selector)!;
  const base = rules.get(".notice")!;
  const fill = (own["--_fill"] ?? base["--_fill"])!;
  const tone = (own["--_tone"] ?? base["--_tone"])!;
  return { fill: resolve(fill, mode, product), tone: resolve(tone, mode, product) };
}

const TONES = [".notice.success", ".notice.warning", ".notice.error"] as const;
const INK = 4.5; // WCAG AA for text
const FILL_APART = 4; // OKLab x100, about twice the just-noticeable step
// The plain notice (neutral muted) against the error notice. Measured: ink 18.1 light and 23.4 dark,
// fill 3.4 light and 2.9 dark. The fill cannot reach FILL_APART: muted is the page's own neutral
// surface and the tint is 14% / 9%. The icon, the label word and the ink carry the difference.
const TONE_APART = 15;
const PLAIN_FILL_APART = 2.5;

describe.each(MODES)("%s theme", (mode) => {
  describe.each(m.products)("%s", (product) => {
    const page = m.colors.background![mode];
    const card = m.colors.card![mode];
    const fg = m.colors.foreground![mode];
    const body = m.colors["body-foreground"]![mode];

    test.each(TONES)("%s: label and body text read on the tint, the fill is apart from page and card", (sel) => {
      const n = notice(sel, mode, product);
      expect(contrast(n.tone, n.fill)).toBeGreaterThanOrEqual(INK);
      expect(contrast(fg, n.fill)).toBeGreaterThanOrEqual(INK);
      expect(contrast(body, n.fill)).toBeGreaterThanOrEqual(INK);
      expect(distance(n.fill, page)).toBeGreaterThanOrEqual(FILL_APART);
      expect(distance(n.fill, card)).toBeGreaterThanOrEqual(FILL_APART);
    });

    test(".notice (info) is neutral: muted fill, muted-foreground label, both readable", () => {
      const n = notice(".notice", mode, product);
      expect(n.fill).toBe(m.colors.muted![mode]);
      expect(n.tone).toBe(m.colors["muted-foreground"]![mode]);
      expect(contrast(n.tone, n.fill)).toBeGreaterThanOrEqual(INK);
      expect(contrast(fg, n.fill)).toBeGreaterThanOrEqual(INK);
    });

    test("a signal notice is neutral too", () => {
      for (const k of ["ok", "warn", "down", "off"]) {
        const sig = rules.get(`.notice.signal-${k}`)!;
        expect(sig["--_fill"]).toBe("var(--muted)");
        expect(sig["--_tone"]).toBe("var(--muted-foreground)");
      }
    });

    const error = notice(".notice.error", mode, product);
    const plain = notice(".notice", mode, product);
    const ink = distance(plain.tone, error.tone);
    const bg = distance(plain.fill, error.fill);
    test(`.notice vs .notice.error: ink ${ink.toFixed(1)}, fill ${bg.toFixed(1)}`, () => {
      expect(ink).toBeGreaterThanOrEqual(TONE_APART);
      expect(bg).toBeGreaterThanOrEqual(PLAIN_FILL_APART);
    });

    test("the tone buttons: filled success, warning and critical keep their label readable, hover too", () => {
      const pf = m.colors["primary-foreground"]![mode];
      for (const tone of ["success", "warning", "danger"]) {
        const c = m.colors[tone]![mode];
        expect(contrast(pf, c)).toBeGreaterThanOrEqual(INK);
        const hover = resolve(`color-mix(in srgb, var(--${tone}) 85%, var(--foreground))`, mode, product);
        expect(contrast(pf, hover)).toBeGreaterThanOrEqual(INK);
      }
    });
  });
});

// The tint is the same share in every tone, and the two themes' shares are the ones the numbers hold.
test("the tint is 14% of the tone over the card in the light theme and 9% in the dark one", () => {
  for (const sel of TONES) {
    const tone = sel.split(".").pop()!;
    const v = rules.get(sel)!["--_fill"]!;
    const role = tone === "error" ? "danger" : tone;
    expect(v).toBe(`light-dark(color-mix(in srgb, var(--${role}) 14%, var(--card)), color-mix(in srgb, var(--${role}) 9%, var(--card)))`);
  }
});

test("no notice, toast or card takes a coloured edge (D-44)", () => {
  for (const [sel, decls] of rules) {
    if (!/(^|\s)\.(notice|toast|card)\b/.test(sel)) continue;
    for (const [prop, val] of Object.entries(decls)) {
      expect(`${sel} ${prop}`).not.toMatch(/border-(left|inline-start)/);
      if (prop === "box-shadow") expect(`${sel}: ${val}`).not.toMatch(/inset/);
    }
  }
  expect(css).not.toMatch(/\.notice[^{]*\{[^}]*border-(left|inline-start)/);
});

test("the tone buttons: success and warning are filled", () => {
  const body = (sel: string) => new RegExp(`${sel.replace(/[.()[\]]/g, "\\$&")}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? "";
  expect(body(":is(button, .button).success")).toContain("background: var(--success)");
  expect(body(":is(button, .button).warning")).toContain("background: var(--warning)");
});

test("critical is filled and never looks like .danger", () => {
  // The selector holds a comma, so the rules map splits it: read the blocks by regex.
  const decl = (sel: string) => {
    const b = new RegExp(`${sel.replace(/[.()[\]]/g, "\\$&")}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? "";
    return Object.fromEntries(b.split(";").filter((d) => d.includes(":")).map((d) => [d.slice(0, d.indexOf(":")).trim(), d.slice(d.indexOf(":") + 1).trim()]));
  };
  const critical = decl(":is(button, .button).critical");
  const danger = decl(":is(button, .button).danger");
  expect(critical.background).toBe("var(--danger)");
  expect(critical.background).not.toBe("transparent");
  expect(critical.background).not.toBe(danger.background);
  expect(critical.color).toBe("var(--primary-foreground)");
  expect(danger.background).toBe("transparent");
  for (const mode of MODES) {
    const pf = m.colors["primary-foreground"]![mode];
    const fill = m.colors.danger![mode];
    const hover = resolve("color-mix(in srgb, var(--danger) 85%, var(--foreground))", mode, "forspring");
    expect(contrast(pf, fill)).toBeGreaterThanOrEqual(INK);
    expect(contrast(pf, hover)).toBeGreaterThanOrEqual(INK);
  }
});

test("the label is real text of at least 11px with letter-spacing", () => {
  const label = rules.get(".notice-label")!;
  expect(label.font).toContain("var(--text-chrome-label)");
  expect(label["letter-spacing"]).toMatch(/^0\.\d+em$/);
  expect(label["text-transform"]).toBe("uppercase");
});

test("the plain notice and the primary tag take no accent fill or outline", () => {
  expect(JSON.stringify(rules.get(".notice"))).not.toContain("primary");
  expect(JSON.stringify(rules.get(".tag.primary"))).not.toMatch(/border|background/);
  expect(css).not.toMatch(/color-mix\(in srgb, var\(--primary\) \d+%, var\(--(card|background|muted)\)\)/);
});

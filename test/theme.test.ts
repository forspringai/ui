// A customer's theme (ui D-34, hub D-117): validateTheme() refuses what test/contrast.test.ts would
// refuse for a product accent, names the fix, and customerTheme() writes values on the roles only.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { contrast, distance, fromOklch, oklch } from "../src/color.ts";
import { PRODUCTS, ROLES } from "../src/family.ts";
import {
  CODES,
  COMPONENT_MIXES,
  DENSITY_PRESETS,
  LEVELS,
  RADIUS_PRESETS,
  ThemeRefused,
  customerTheme,
  validateTheme,
  type Code,
  type Mode,
  type Problem,
} from "../src/theme.ts";

const root = join(import.meta.dirname, "..");
const MODES: Mode[] = ["light", "dark"];
const GOOD = {
  $schema: "node_modules/@forspring/ui/schema/customer-theme.schema.json",
  level: "brand",
  brand: {
    accent: { light: "#0f5132" },
    tint: { light: "#eef6f0" },
    logo: { light: "https://acme.example/logo.svg", dark: "assets/logo-dark.svg", alt: "Acme" },
  },
};

// The rules of test/contrast.test.ts, applied to a theme's resolved roles.
function obeysTheRules(roles: Record<Mode, Record<string, string>>) {
  for (const mode of MODES) {
    const c = roles[mode];
    for (const s of ["background", "card", "muted"]) {
      expect(contrast(c.primary!, c[s]!), `${mode} primary on ${s}`).toBeGreaterThanOrEqual(4.5);
      for (const t of ["foreground", "body-foreground", "muted-foreground", "success", "warning", "danger"]) expect(contrast(c[t]!, c[s]!), `${mode} ${t} on ${s}`).toBeGreaterThanOrEqual(4.5);
      for (const m of ["signal-ok", "signal-warn", "signal-down", "signal-off"]) expect(contrast(c[m]!, c[s]!), `${mode} ${m} on ${s}`).toBeGreaterThanOrEqual(3);
      expect(contrast(c.mark!, c[s]!), `${mode} mark on ${s}`).toBeGreaterThanOrEqual(3);
    }
    expect(contrast(c["primary-foreground"]!, c.primary!), `${mode} label`).toBeGreaterThanOrEqual(4.5);
    expect(contrast(c.ring!, c.background!), `${mode} ring`).toBeGreaterThanOrEqual(3);
    for (const r of ["success", "warning", "danger", "signal-ok", "signal-warn", "signal-down", "signal-off"]) expect(distance(c.primary!, c[r]!), `${mode} primary from ${r}`).toBeGreaterThanOrEqual(10);
  }
}

const at = (file: unknown, path: string, value: unknown): unknown => {
  const copy = structuredClone(file) as Record<string, unknown>;
  const keys = path.split(".");
  let o = copy;
  for (const k of keys.slice(0, -1)) o = o[k] as Record<string, unknown>;
  o[keys.at(-1)!] = value;
  return copy;
};
const codes = (ps: Problem[]) => ps.map((p) => p.code);
const readColor = (file: unknown, path: string) => path.split(".").reduce((o: any, k) => o[k], file) as string;

describe("a good theme", () => {
  test("passes, and its roles keep every rule in both themes", () => {
    const v = validateTheme(GOOD);
    expect(v.errors).toEqual([]);
    expect(v.ok).toBe(true);
    const t = customerTheme(GOOD, { selector: '[data-theme-org="acme"]' });
    expect(t.level).toBe("brand");
    expect(t.roles.light.primary).toBe("#0f5132");
    expect(t.roles.light.ring).toBe("#0f5132");
    expect(t.roles.light.mark).toBe("#0f5132");
    expect(t.roles.light.muted).toBe("#eef6f0");
    expect(t.roles.light.secondary).toBe("#eef6f0");
    expect(t.roles.light.accent).toBe("#eef6f0");
    expect(t.roles.light.card).toBe(ROLES.light.card);
    expect(t.roles.dark.foreground).toBe(ROLES.dark.foreground);
    expect(t.logo).toEqual({ light: "https://acme.example/logo.svg", dark: "assets/logo-dark.svg", alt: "Acme" });
    obeysTheRules(t.roles);
  });

  test("a missing dark value is derived, checked and reported as a warning with the value", () => {
    const v = validateTheme(GOOD);
    const derived = v.warnings.filter((w) => w.code === "theme.accent.dark_derived" || w.code === "theme.tint.dark_derived");
    expect(derived.map((w) => w.path).sort()).toEqual(["brand.accent.dark", "brand.tint.dark"]);
    const t = customerTheme(GOOD);
    expect(t.roles.dark.primary).toBe(derived.find((w) => w.path === "brand.accent.dark")!.fix);
    expect(t.roles.dark.muted).toBe(derived.find((w) => w.path === "brand.tint.dark")!.fix);
    // Written in, the derived values are a theme with no warnings.
    const pinned = at(at(GOOD, "brand.accent.dark", t.roles.dark.primary), "brand.tint.dark", t.roles.dark.muted);
    expect(validateTheme(pinned)).toEqual({ ok: true, errors: [], warnings: [] });
  });

  test("derived dark values pass the same rules, around the hue wheel", () => {
    for (let h = 0; h < 360; h += 30) {
      // A light accent at that hue, moved by the theme's own fix where it fails in light.
      let start: string | null = null;
      for (let c = 0.1; !start; c -= 0.01) start = fromOklch(0.45, c, h);
      const light = validateTheme({ level: "brand", brand: { accent: { light: start } } }).errors.find((e) => e.path === "brand.accent.light")?.fix ?? start;
      const tint = fromOklch(0.965, 0.015, h)!;
      const file = { level: "brand", brand: { accent: { light }, tint: { light: tint } } };
      const v = validateTheme(file);
      expect(v.errors, `hue ${h}: ${light} on ${tint}`).toEqual([]);
      obeysTheRules(customerTheme(file).roles);
    }
  });

  test("every product's own accent is a valid theme, with the family's label", () => {
    for (const [p, own] of Object.entries(PRODUCTS)) {
      const t = customerTheme({ level: "brand", brand: { accent: own.primary } });
      expect(t.roles.light["primary-foreground"], p).toBe(own["primary-foreground"].light);
      expect(t.roles.dark["primary-foreground"], p).toBe(own["primary-foreground"].dark);
    }
  });

  test("a DTCG colour value reads like its hex, and the file may be JSON text", () => {
    const dtcg = { level: "brand", brand: { accent: { light: { colorSpace: "srgb", components: [0.0588, 0.3176, 0.1961], hex: "#0f5132" } } } };
    expect(customerTheme(dtcg).roles.light.primary).toBe("#0f5132");
    expect(customerTheme(JSON.stringify(GOOD))).toEqual(customerTheme(GOOD));
  });

  test("the Default level is the family's look and writes no CSS", () => {
    const t = customerTheme({ level: "default" });
    expect(t).toEqual({ level: "default", roles: { light: { ...ROLES.light }, dark: { ...ROLES.dark } }, css: "", logo: null });
    expect(customerTheme({ level: "default" }, { product: "appspring" }).roles.light.primary).toBe(PRODUCTS.appspring.primary.light);
  });

  test("product: an accent close to the product's own is a warning, not a refusal", () => {
    const v = validateTheme({ level: "brand", brand: { accent: PRODUCTS.appspring.primary } }, { product: "appspring" });
    expect(v.ok).toBe(true);
    expect(codes(v.warnings)).toEqual(["theme.accent.product_close", "theme.accent.product_close"]);
    for (const p of ["nope", "toString"]) expect(() => validateTheme(GOOD, { product: p as never })).toThrow(/unknown product/);
  });
});

// One minimal failing file per refusal code. Where the error names a fix, writing it in at the path
// clears that code there.
const CASES: { code: Code; path: string; file: unknown }[] = [
  { code: "theme.schema", path: "colour", file: { level: "brand", brand: { accent: { light: "#0f5132" } }, colour: "red" } },
  { code: "theme.schema", path: "level", file: { level: "custom" } },
  { code: "theme.schema", path: "brand.accent", file: { level: "brand", brand: { tint: { light: "#eef6f0" } } } },
  { code: "theme.schema", path: "", file: "{ not json" },
  { code: "theme.color.format", path: "brand.accent.light", file: { level: "brand", brand: { accent: { light: "rebeccapurple" } } } },
  { code: "theme.color.format", path: "brand.accent.light", file: { level: "brand", brand: { accent: { light: { colorSpace: "srgb", components: [0, 0, 0], hex: "#0f5132" } } } } },
  { code: "theme.level.mismatch", path: "level", file: { level: "default", brand: { accent: { light: "#0f5132" } } } },
  { code: "theme.level.mismatch", path: "brand", file: { level: "brand" } },
  { code: "theme.accent.contrast", path: "brand.accent.light", file: { level: "brand", brand: { accent: { light: "#3d8bfd" } } } },
  { code: "theme.accent.contrast", path: "brand.accent.dark", file: { level: "brand", brand: { accent: { light: "#0f5132", dark: "#0f5132" } } } },
  { code: "theme.accent.label_contrast", path: "brand.accent.light", file: { level: "brand", brand: { accent: { light: "#777777" } } } },
  { code: "theme.accent.status_clash", path: "brand.accent.light", file: { level: "brand", brand: { accent: { light: "#9a1a2a" } } } },
  { code: "theme.accent.status_clash", path: "brand.accent.light", file: { level: "brand", brand: { accent: { light: "#257012" } } } },
  { code: "theme.tint.text_contrast", path: "brand.tint.light", file: { level: "brand", brand: { accent: { light: "#0f5132" }, tint: { light: "#b0b8c8" } } } },
  { code: "theme.tint.text_contrast", path: "brand.tint.dark", file: { level: "brand", brand: { accent: { light: "#0f5132" }, tint: { light: "#eef6f0", dark: "#d0e0ff" } } } },
  { code: "theme.tint.mark_contrast", path: "brand.tint.light", file: { level: "brand", brand: { accent: { light: "#0f5132" }, tint: { light: "#e3eee6" } } } },
  { code: "theme.logo.alt_missing", path: "brand.logo.alt", file: { level: "brand", brand: { accent: { light: "#0f5132" }, logo: { light: "logo.svg", alt: "  " } } } },
  { code: "theme.logo.unsafe_url", path: "brand.logo.light", file: { level: "brand", brand: { accent: { light: "#0f5132" }, logo: { light: "javascript:alert(1)", alt: "Acme" } } } },
  { code: "theme.guideline.unavailable", path: "level", file: { level: "guideline", brand: { accent: { light: "#0f5132" } }, guideline: { radius: "round" } } },
];

describe.each(CASES)("$code at $path", ({ code, path, file }) => {
  const v = validateTheme(file);
  const error = v.errors.find((e) => e.code === code && e.path === path);

  test("is refused with that code, a message and no fix it cannot stand behind", () => {
    expect(v.ok).toBe(false);
    expect(error, JSON.stringify(v.errors)).toBeDefined();
    expect(error!.message.length).toBeGreaterThan(20);
    expect(() => customerTheme(file)).toThrow(ThemeRefused);
    expect(() => customerTheme(file)).toThrow(code);
  });

  if (code.startsWith("theme.accent.") || code.startsWith("theme.tint.") || code === "theme.level.mismatch" || code === "theme.guideline.unavailable") {
    test("its fix clears it", () => {
      if (code === "theme.level.mismatch" && path === "brand") return expect(error!.fix).toBeUndefined();
      expect(error!.fix).toBeDefined();
      const fixed = validateTheme(at(file, path, error!.fix));
      expect(fixed.errors.filter((e) => e.path === path)).toEqual([]);
      if (code.startsWith("theme.accent.") || code.startsWith("theme.tint.")) {
        // A colour fix keeps the colour's hue: lightness and chroma move, the hue stays.
        const [[, c0, h0], [, c1, h1]] = [oklch(readColor(file, path)), oklch(error!.fix!)];
        if (c0 > 0.03 && c1 > 0.03) expect(Math.abs(((h1 - h0 + 540) % 360) - 180)).toBeLessThan(3);
      }
    });
  }
});

test("every refusal code has a case, and the codes are the documented list", () => {
  const refusals = CODES.filter((c) => !["theme.accent.dark_derived", "theme.tint.dark_derived", "theme.accent.product_close"].includes(c));
  expect(new Set(CASES.map((c) => c.code))).toEqual(new Set(refusals));
  const readme = readFileSync(join(root, "README.md"), "utf8");
  for (const c of CODES) expect(readme, c).toContain(`\`${c}\``);
});

test("the Guideline level is refused while it is not available, with its reason", () => {
  for (const file of [
    { level: "guideline", brand: { accent: { light: "#0f5132" } } },
    { level: "brand", brand: { accent: { light: "#0f5132" } }, guideline: { density: "compact" } },
  ]) {
    const v = validateTheme(file);
    const e = v.errors.find((x) => x.code === "theme.guideline.unavailable")!;
    expect(e.message).toMatch(/not available yet .*D-117/);
  }
});

test("logo URLs: https, data:image and bundle paths only (AppSpring's safeLogoUrl, and paths)", () => {
  const logo = (light: string) => validateTheme({ level: "brand", brand: { accent: { light: "#0f5132" }, logo: { light, alt: "Acme" } } });
  for (const ok of ["https://acme.example/logo.svg", "data:image/png;base64,iVBORw0KGgo=", "data:image/svg+xml,%3Csvg%3E", "logo.svg", "./assets/logo.png", "assets/brand/logo-dark.webp"]) expect(logo(ok).ok, ok).toBe(true);
  for (const bad of ["http://acme.example/logo.svg", "javascript:alert(1)", "data:text/html,<script>", "//evil.example/x.svg", "../secrets.svg", "assets/../../x.svg", "/abs/logo.svg", "https://acme.example/a\"onerror=x", " logo.svg", "file:///etc/passwd", "C:\\logo.svg"]) {
    expect(codes(logo(bad).errors), bad).toEqual(["theme.logo.unsafe_url"]);
  }
});

describe("the CSS", () => {
  const t = customerTheme(GOOD, { selector: '[data-theme-org="acme"]' });

  test("names only role custom properties and the component layer's accent mixes, never geometry", () => {
    const roles = new Set(Object.keys(ROLES.light));
    const props = [...t.css.matchAll(/(--[\w-]+):/g)].map((m) => m[1]!);
    for (const p of props) expect(roles.has(p.slice(2)) || ["--_link", "--_hover", "--_shadow"].includes(p), p).toBe(true);
    expect(t.css).not.toMatch(/--(radius|space|control|text|leading|font|motion|shadow|breakpoint)-/);
    expect(t.css).not.toMatch(/\d+(px|rem|em)\b/);
    expect(t.css.startsWith("/*")).toBe(true);
    expect(t.css).toContain('[data-theme-org="acme"] {\n');
  });

  test("redeclares the component layer's mixes exactly as css/components.css has them", () => {
    const components = readFileSync(join(root, "css/components.css"), "utf8");
    for (const line of COMPONENT_MIXES) expect(components).toContain(line);
    const declared = [...components.matchAll(/^\s+(--_(?:link|hover|shadow)):/gm)].map((m) => m[1]);
    expect(declared.sort()).toEqual(["--_hover", "--_link", "--_shadow"]);
  });

  test("the tinted roles are one surface in the family", () => {
    for (const mode of MODES) for (const r of ["secondary", "accent"] as const) expect(ROLES[mode][r]).toBe(ROLES[mode].muted);
  });

  test("is deterministic, and exactly this for the example", () => {
    expect(customerTheme(GOOD, { selector: '[data-theme-org="acme"]' })).toEqual(t);
    expect(t.css).toMatchInlineSnapshot(`
      "/* A customer's theme (@forspring/ui customerTheme, ui D-34): values on the roles, never geometry. */
      [data-theme-org="acme"] {
        --primary: light-dark(#0f5132, #5f9c78);
        --primary-foreground: light-dark(#ffffff, #111215);
        --ring: light-dark(#0f5132, #5f9c78);
        --mark: light-dark(#0f5132, #5f9c78);
        --background: light-dark(#fefffe, #0e1410);
        --muted: light-dark(#eef6f0, #1d231f);
        --secondary: light-dark(#eef6f0, #1d231f);
        --accent: light-dark(#eef6f0, #1d231f);
        --_link: color-mix(in srgb, var(--primary) 70%, var(--foreground));
        --_hover: color-mix(in srgb, var(--primary) 80%, light-dark(var(--background), var(--foreground)));
        --_shadow: color-mix(in srgb, light-dark(var(--foreground), var(--background)) 25%, transparent);
      }
      "
    `);
  });

  test("refuses a selector that could leave the rule", () => {
    for (const bad of ["x { }", "a; b", "</style>", "a /* b */", ""]) expect(() => customerTheme(GOOD, { selector: bad }), bad).toThrow(TypeError);
  });
});

// The schema, read by a small JSON Schema interpreter (the keywords the file uses), agrees with
// validateTheme() on what is off-schema.
type Schema = Record<string, any>;
function accepts(schema: Schema, v: unknown, rootSchema: Schema = schema): boolean {
  if (schema.$ref) return accepts(rootSchema.$defs[schema.$ref.replace("#/$defs/", "")], v, rootSchema);
  const isObj = typeof v === "object" && v !== null && !Array.isArray(v);
  const o = v as Record<string, unknown>;
  const checks: boolean[] = [];
  if (schema.type) checks.push(schema.type === "object" ? isObj : schema.type === "array" ? Array.isArray(v) : typeof v === schema.type);
  if ("const" in schema) checks.push(v === schema.const);
  if (schema.enum) checks.push(schema.enum.includes(v));
  if (typeof v === "string") {
    if (schema.pattern) checks.push(new RegExp(schema.pattern, "u").test(v));
    if (schema.minLength !== undefined) checks.push(v.length >= schema.minLength);
    if (schema.maxLength !== undefined) checks.push(v.length <= schema.maxLength);
  }
  if (typeof v === "number") {
    if (schema.minimum !== undefined) checks.push(v >= schema.minimum);
    if (schema.maximum !== undefined) checks.push(v <= schema.maximum);
  }
  if (Array.isArray(v)) {
    if (schema.minItems !== undefined) checks.push(v.length >= schema.minItems);
    if (schema.maxItems !== undefined) checks.push(v.length <= schema.maxItems);
    if (schema.items) checks.push(v.every((x) => accepts(schema.items, x, rootSchema)));
  }
  if (isObj) {
    if (schema.required) checks.push(schema.required.every((k: string) => k in o));
    if (schema.properties) checks.push(Object.entries(schema.properties).every(([k, s]) => !(k in o) || accepts(s as Schema, o[k], rootSchema)));
    if (schema.additionalProperties === false) checks.push(Object.keys(o).every((k) => k in (schema.properties ?? {})));
  }
  if (schema.allOf) checks.push(schema.allOf.every((s: Schema) => accepts(s, v, rootSchema)));
  if (schema.anyOf) checks.push(schema.anyOf.some((s: Schema) => accepts(s, v, rootSchema)));
  if (schema.oneOf) checks.push(schema.oneOf.filter((s: Schema) => accepts(s, v, rootSchema)).length === 1);
  if (schema.not) checks.push(!accepts(schema.not, v, rootSchema));
  if (schema.if && accepts(schema.if, v, rootSchema) && schema.then) checks.push(accepts(schema.then, v, rootSchema));
  return checks.every(Boolean);
}

describe("schema/customer-theme.schema.json", () => {
  const schema = JSON.parse(readFileSync(join(root, "schema/customer-theme.schema.json"), "utf8")) as Schema;
  const SHAPE: Code[] = ["theme.schema", "theme.color.format", "theme.level.mismatch", "theme.logo.alt_missing"];
  const corpus: unknown[] = [
    GOOD,
    { level: "default" },
    { level: "default", $description: "Forspring's look" },
    { level: "brand", brand: { accent: { light: "#0F5132", dark: "#5f9c78" } } },
    { level: "brand", brand: { accent: { light: { colorSpace: "srgb", components: [0.0588, 0.3176, 0.1961] } } } },
    { level: "guideline", brand: { accent: { light: "#0f5132" } }, guideline: { font: "Archivo", radius: "round", density: "compact" } },
    ...CASES.map((c) => c.file).filter((f) => typeof f !== "string"),
    {},
    [],
    { level: "brand", brand: { accent: { light: "#0f5132" }, logo: { light: "logo.svg" } } },
    { level: "brand", brand: { accent: { light: "#0f5132", extra: "#000000" } } },
    { level: "brand", brand: { accent: { light: { colorSpace: "display-p3", components: [0, 0, 0] } } } },
    { level: "brand", brand: { accent: { light: { colorSpace: "srgb", components: [0, 0, 0], alpha: 0.5 } } } },
    { level: "brand", brand: { accent: { light: "#0f5132" } }, guideline: { radius: "round" } },
    { level: "guideline" },
    { level: "guideline", brand: { accent: { light: "#0f5132" } }, guideline: { density: "loose" } },
    { level: "brand", brand: { accent: { light: "#0f5132" } }, $schema: 3 },
  ];

  test.each(corpus.map((f, i) => [i, f] as const))("file %i: the schema and validateTheme() agree on its shape", (_, file) => {
    // One known difference: a DTCG colour whose hex disagrees with its components is the right shape
    // for the schema and refused by validateTheme(); it is not in this corpus but in CASES.
    const hexMismatch = JSON.stringify(file).includes('"hex":"#0f5132"') && JSON.stringify(file).includes("[0,0,0]");
    if (hexMismatch) return;
    const shapeErrors = validateTheme(file).errors.filter((e) => SHAPE.includes(e.code));
    expect(accepts(schema, file), JSON.stringify(shapeErrors)).toBe(shapeErrors.length === 0);
  });

  test("its enums are the code's", () => {
    expect(schema.properties.level.enum).toEqual([...LEVELS]);
    expect(schema.$defs.guideline.properties.radius.enum).toEqual([...RADIUS_PRESETS]);
    expect(schema.$defs.guideline.properties.density.enum).toEqual([...DENSITY_PRESETS]);
    expect(schema.$schema).toBe("https://json-schema.org/draft/2020-12/schema");
  });

  test("ships with the package", () => {
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    expect(pkg.files).toContain("schema");
    expect(pkg.exports["./schema/customer-theme.schema.json"]).toBe("./schema/customer-theme.schema.json");
    expect(pkg.exports["./theme"]).toEqual({ types: "./dist/theme.d.ts", default: "./dist/theme.js" });
  });
});

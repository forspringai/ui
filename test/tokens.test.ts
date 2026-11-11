// The token files are valid DTCG 2025.10 and the two themes define the same roles.

import { cpSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { type Group, TokenSet, flatten, isGroup } from "../src/dtcg.ts";
import { build, model } from "../src/emit.ts";

const dir = join(import.meta.dirname, "..", "tokens");
const files = readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
const read = (f: string) => JSON.parse(readFileSync(join(dir, f), "utf8")) as Group;

describe.each(files)("%s", (f) => {
  test("every token has its own $value and $type", () => {
    const walk = (g: Group, path: string[]): void => {
      for (const [k, v] of Object.entries(g)) {
        if (k.startsWith("$") || !isGroup(v)) continue;
        if ("$value" in v) expect(typeof v.$type, [...path, k].join(".")).toBe("string");
        else walk(v, [...path, k]);
      }
    };
    walk(read(f), []);
    expect(flatten(read(f)).length).toBeGreaterThan(0);
  });
});

test("both themes resolve with no problems: aliases exist, types match, values have the 2025.10 shapes", () => {
  const shared = files.filter((f) => !f.startsWith("role.")).map(read);
  for (const theme of ["role.light.json", "role.dark.json"]) expect(new TokenSet([...shared, read(theme)]).problems).toEqual([]);
});

test("every role is defined in both themes", () => {
  const names = (f: string) => Object.keys(read(f).role as Group).filter((k) => !k.startsWith("$"));
  expect(names("role.dark.json")).toEqual(names("role.light.json"));
  const m = model(dir);
  for (const r of m.roles) {
    expect(m.colors[r]!.light, r).toMatch(/^#[0-9a-f]{6}$/);
    expect(m.colors[r]!.dark, r).toMatch(/^#[0-9a-f]{6}$/);
  }
});

test("the roles hub ui-standard §2 names are all there", () => {
  const m = model(dir);
  const required = ["background", "foreground", "muted", "muted-foreground", "card", "card-foreground", "border", "input", "ring", "primary", "primary-foreground", "success", "warning", "danger"];
  for (let i = 1; i <= 8; i++) required.push(`chart-${i}`);
  for (const r of required) expect(m.roles).toContain(r);
});

test("geometry is the fixed ladder", () => {
  const m = model(dir);
  expect(m.radius).toEqual({ button: 3, card: 6, input: 8, panel: 10 });
  for (const v of Object.values(m.space)) expect(v % 4).toBe(0);
  for (const ladder of Object.values(m.text)) for (const v of Object.values(ladder)) expect(v).toBeGreaterThanOrEqual(11);
});

test("control heights are steps of the space scale, and every output carries them (D-14)", () => {
  const m = model(dir);
  expect(m.control).toEqual({ height: 44, "height-small": 32, touch: 44 });
  for (const v of Object.values(m.control)) expect(Object.values(m.space)).toContain(v);
  // The default box is a 1px border, 12px padding and an 18px line; the small one 4px and 22px.
  expect(m.control.height).toBe(2 + 2 * m.space["3"]! + 18);
  expect(m.control["height-small"]).toBe(2 + 2 * m.space["1"]! + 22);
  // Primary controls on a phone (hub ui-standard §3).
  expect(m.control.touch).toBeGreaterThanOrEqual(44);
  const out = build(dir);
  expect(out["tokens.css"]).toContain("--control-height: 44px;");
  expect(out["tokens.css"]).toContain("--control-height-small: 32px;");
  expect(out["tokens.css"]).toContain("--control-touch: 44px;");
  expect(out["theme.css"]).toContain("--spacing-control: 44px;");
  expect(out["theme.css"]).toContain("--spacing-control-small: 32px;");
  expect(out["tokens.js"]).toMatch(/export const control = Object\.freeze\(\{\s*"height": 44,/);
  expect(out["tokens.d.ts"]).toContain('export declare const control: Deep<{"height":44,"height-small":32,"touch":44}>;');
});

test("three ladders; marketing's display steps sit above content's h1 and reach every output (D-22)", () => {
  const m = model(dir);
  expect(Object.keys(m.text)).toEqual(["chrome", "content", "marketing"]);
  expect(m.text.marketing).toEqual({ eyebrow: 13, lede: 20, h3: 24, "h2-min": 30, h2: 36, "h1-min": 48, h1: 72 });
  // A display ladder: the phone's hero is already larger than content's widest h1.
  expect(m.text.marketing!["h1-min"]).toBeGreaterThan(m.text.content!.h1!);
  // Each step says what it is for, so a page picks a step by use, not by size.
  const marketing = (read("geometry.json").text as Group).marketing as Group;
  for (const [k, v] of Object.entries(marketing)) if (!k.startsWith("$")) expect((v as Group).$description, k).toBeTruthy();
  const out = build(dir);
  for (const [k, v] of Object.entries(m.text.marketing!)) {
    expect(out["tokens.css"]).toContain(`--text-marketing-${k}: ${v}px;`);
    expect(out["theme.css"]).toContain(`--text-marketing-${k}: ${v}px;`);
  }
  expect(out["tokens.d.ts"]).toContain('"marketing":{"eyebrow":13,');
});

test("every ladder step has a leading, unitless and sensible, and every output carries them (D-27)", () => {
  const m = model(dir);
  expect(m.leading.solid).toBe(1);
  for (const [ladder, steps] of Object.entries(m.text)) {
    const lead = m.leading[ladder] as Record<string, number>;
    expect(Object.keys(lead), ladder).toEqual(Object.keys(steps));
    for (const v of Object.values(lead)) {
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(1.6);
    }
  }
  // Running text is looser than the headings above it.
  expect(m.leading.content!.body).toBeGreaterThan(m.leading.content!.h1!);
  const out = build(dir);
  expect(out["tokens.css"]).toContain("--leading-content-body: 1.55;");
  expect(out["tokens.css"]).toContain("--leading-solid: 1;");
  expect(out["theme.css"]).toContain("--text-content-body--line-height: 1.55;");
  expect(out["theme.css"]).toContain("--leading-chrome-meta: 1.4;");
});

test("a step without a leading fails the build", () => {
  const broken = mkdtempSync(join(tmpdir(), "ui-tokens-"));
  cpSync(dir, broken, { recursive: true });
  const g = read("geometry.json");
  delete ((g.leading as Group).content as Group).h2;
  writeFileSync(join(broken, "geometry.json"), JSON.stringify(g));
  expect(() => model(broken)).toThrow(/text\.content\.h2 has no leading\.content\.h2/);
});

test("breakpoints: the phone is the one components.css and the audit use, and they rise (D-27)", () => {
  const m = model(dir);
  expect(m.breakpoint).toEqual({ phone: 560, tablet: 800, wide: 1280 });
  const out = build(dir);
  for (const [k, v] of Object.entries(m.breakpoint)) expect(out["theme.css"]).toContain(`--breakpoint-${k}: ${v}px;`);
  // A custom property cannot be read in a media query, so tokens.css carries none.
  expect(out["tokens.css"]).not.toContain("--breakpoint-");
  expect(out["tokens.d.ts"]).toContain('export declare const breakpoint: Deep<{"phone":560,"tablet":800,"wide":1280}>;');
});

test("motion: fast is what the transitions used, slow sits in the marketing band, reduced motion zeroes all (D-27)", () => {
  const m = model(dir);
  expect(m.motion.duration).toEqual({ fast: 0.15, base: 0.25, slow: 0.6, pulse: 1.4 });
  expect(m.motion.duration.slow).toBeGreaterThanOrEqual(0.4);
  expect(m.motion.duration.slow).toBeLessThanOrEqual(1.2);
  expect(m.motion.ease.standard).toEqual([0.25, 0.1, 0.25, 1]);
  const out = build(dir);
  expect(out["tokens.css"]).toContain("--motion-duration-fast: 0.15s;");
  expect(out["tokens.css"]).toContain("--motion-ease-out: cubic-bezier(0.22, 1, 0.36, 1);");
  const reduced = out["tokens.css"]!.slice(out["tokens.css"]!.indexOf("@media (prefers-reduced-motion: reduce)"));
  for (const k of Object.keys(m.motion.duration)) expect(reduced).toContain(`--motion-duration-${k}: 0s;`);
  expect(out["theme.css"]).toContain("--ease-out: cubic-bezier(0.22, 1, 0.36, 1);");
});

test("shadows: ink in light and the ground in dark at 25%, as --_shadow, and never for a card (D-27)", () => {
  const m = model(dir);
  expect(Object.keys(m.shadow)).toEqual(["raised", "overlay"]);
  const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(" ");
  for (const level of Object.keys(m.shadow)) {
    expect(m.shadow[level]!.light).toMatch(new RegExp(`rgb\\(${rgb(m.colors.foreground!.light)} / 0\\.25\\)$`));
    expect(m.shadow[level]!.dark).toMatch(new RegExp(`rgb\\(${rgb(m.colors.background!.dark)} / 0\\.25\\)$`));
  }
  expect(m.shadow.raised!.light).toBe("0px 1px 2px 0px rgb(20 21 26 / 0.25)");
  expect(m.shadow.overlay!.light).toBe(`0px ${m.space["1"]}px ${m.space["4"]}px 0px rgb(20 21 26 / 0.25)`);
  const out = build(dir);
  expect(out["tokens.css"]).toContain("--shadow-overlay: 0px 4px 16px 0px light-dark(rgb(20 21 26 / 0.25), rgb(17 18 21 / 0.25));");
  expect(out["theme.css"]).toContain("--shadow-raised: 0px 1px 2px 0px light-dark(");
});

describe("the reader refuses what is not DTCG", () => {
  const color = (hex: string) => ({ $type: "color", $value: { colorSpace: "srgb", components: [1, 1, 1], hex } });
  const problems = (...trees: Group[]) => new TokenSet(trees).problems;

  test("an alias to nothing", () => expect(problems({ a: { $type: "color", $value: "{b}" } })).toEqual(["a: alias to b, which does not exist"]));
  test("an alias cycle", () => expect(problems({ a: { $value: "{b}" }, b: { $value: "{a}" } })[0]).toMatch(/alias cycle/));
  test("an alias of the wrong type", () => expect(problems({ a: color("#ffffff"), b: { $type: "dimension", $value: "{a}" } })).toEqual(["b: $type dimension aliases a, a color"]));
  test("a token with no type", () => expect(problems({ a: { $value: { value: 1, unit: "px" } } })).toEqual(["a: no $type on the token, its groups or its alias target"]));
  test("a hex that disagrees with its components", () => expect(problems({ a: color("#fffffe") })).toEqual(["a: hex #fffffe does not match its components"]));
  test("a pre-2025.10 string colour", () => expect(problems({ a: { $type: "color", $value: "#ffffff" } })).toEqual(["a: a color $value is { colorSpace, components }"]));
  test("a dimension as a string", () => expect(problems({ a: { $type: "dimension", $value: "4px" } })[0]).toMatch(/dimension/));
  test("a name with a dot", () => expect(problems({ "a.b": color("#ffffff") })[0]).toMatch(/may not contain/));
  test("a duration as a string", () => expect(problems({ a: { $type: "duration", $value: "150ms" } })[0]).toMatch(/duration/));
  test("a cubicBezier with an x outside 0 to 1", () => expect(problems({ a: { $type: "cubicBezier", $value: [1.2, 0, 0.5, 1] } })[0]).toMatch(/x coordinates/));
  test("a number as a string", () => expect(problems({ a: { $type: "number", $value: "1.5" } })).toEqual(["a: a number $value is a number"]));
  test("a shadow with a string offset and an alias of the wrong type", () => {
    const px = (value: number) => ({ value, unit: "px" });
    const shadow = { color: { colorSpace: "srgb", components: [0, 0, 0], alpha: 0.25 }, offsetX: px(0), offsetY: "1px", blur: "{c}", spread: px(0) };
    expect(problems({ c: color("#ffffff"), s: { $type: "shadow", $value: shadow } })).toEqual(["s.offsetY: a dimension $value is { value: number, unit: \"px\" | \"rem\" }", "s.blur: aliases c, a color, not a dimension"]);
  });
  test("a type inherited from a group is enough", () => expect(problems({ g: { $type: "dimension", a: { $value: { value: 1, unit: "px" } } } })).toEqual([]));
  test("a theme missing a role fails the build", () => {
    const broken = mkdtempSync(join(tmpdir(), "ui-tokens-"));
    cpSync(dir, broken, { recursive: true });
    const dark = read("role.dark.json");
    delete (dark.role as Group).ring;
    writeFileSync(join(broken, "role.dark.json"), JSON.stringify(dark));
    expect(() => model(broken)).toThrow(/role\.ring is in role\.light\.json but not role\.dark\.json/);
  });
});

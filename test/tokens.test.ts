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

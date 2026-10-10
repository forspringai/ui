// Reads design tokens in the W3C DTCG 2025.10 format: groups and tokens, `$type` inherited from the
// nearest group, `{dot.path}` aliases, and the 2025.10 value shapes for the types this package uses
// (color as an object with colorSpace and components, dimension as value and unit, fontFamily as a
// name or a list of names). Anything it cannot read is a problem, reported with its path, so a bad
// token fails the build and the tests rather than producing a quiet gap in the CSS.

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export type Group = { [key: string]: Json };

export type Token = {
  path: string;
  // Declared on the token or inherited from a group; undefined if neither (an alias may still
  // supply it from its target).
  type: string | undefined;
  value: Json;
  description?: string;
};

export type ColorValue = { colorSpace: string; components: (number | "none")[]; alpha?: number; hex?: string };
export type DimensionValue = { value: number; unit: "px" | "rem" };

// The types the 2025.10 format module defines. The build only knows how to write the first three;
// the rest are accepted as valid DTCG and refused by the writer if a role ever uses one.
const TYPES = new Set(["color", "dimension", "fontFamily", "fontWeight", "duration", "cubicBezier", "number", "strokeStyle", "border", "transition", "shadow", "gradient", "typography"]);
const ALIAS = /^\{([^{}]+)\}$/;

export function isGroup(v: Json): v is Group {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

// Every token under `tree`, depth first in file order.
export function flatten(tree: Group, problems: string[] = [], prefix: string[] = [], inherited?: string): Token[] {
  const out: Token[] = [];
  const type = typeof tree.$type === "string" ? tree.$type : inherited;
  for (const [name, node] of Object.entries(tree)) {
    if (name.startsWith("$")) continue;
    const path = [...prefix, name].join(".");
    if (/[{}.]/.test(name)) problems.push(`${path}: a name may not contain {, } or .`);
    if (!isGroup(node)) {
      problems.push(`${path}: neither a token nor a group`);
      continue;
    }
    if ("$value" in node) {
      const own = typeof node.$type === "string" ? node.$type : type;
      out.push({ path, type: own, value: node.$value!, ...(typeof node.$description === "string" ? { description: node.$description } : {}) });
    } else {
      out.push(...flatten(node, problems, [...prefix, name], type));
    }
  }
  return out;
}

// A set of token files read together, later files over earlier ones (DTCG's own merge rule for
// sets). Light and dark are two such sets: the shared files plus role.light.json or role.dark.json.
export class TokenSet {
  readonly tokens = new Map<string, Token>();
  readonly problems: string[] = [];

  constructor(trees: Group[]) {
    for (const tree of trees) for (const t of flatten(tree, this.problems)) this.tokens.set(t.path, t);
    for (const path of this.tokens.keys()) {
      try {
        const { type, value } = this.resolve(path);
        if (type === undefined) this.problems.push(`${path}: no $type on the token, its groups or its alias target`);
        else if (!TYPES.has(type)) this.problems.push(`${path}: unknown $type ${type}`);
        else this.problems.push(...checkValue(path, type, value));
      } catch (e) {
        this.problems.push((e as Error).message);
      }
    }
  }

  // Follows aliases to a concrete value. The alias's own $type, if any, must match its target's.
  resolve(path: string, seen: string[] = []): { type: string | undefined; value: Json } {
    const t = this.tokens.get(path);
    if (!t) throw new Error(`${seen.at(-1) ?? path}: alias to ${path}, which does not exist`);
    if (seen.includes(path)) throw new Error(`${seen[0]}: alias cycle ${[...seen, path].join(" -> ")}`);
    const m = typeof t.value === "string" ? ALIAS.exec(t.value) : null;
    if (!m) return { type: t.type, value: t.value };
    const target = this.resolve(m[1]!, [...seen, path]);
    if (t.type && target.type && t.type !== target.type) throw new Error(`${path}: $type ${t.type} aliases ${m[1]}, a ${target.type}`);
    return { type: t.type ?? target.type, value: target.value };
  }

  // The children of a group, by name, in file order.
  names(group: string): string[] {
    const prefix = `${group}.`;
    const seen = new Set<string>();
    for (const path of this.tokens.keys()) if (path.startsWith(prefix)) seen.add(path.slice(prefix.length).split(".")[0]!);
    return [...seen];
  }

  color(path: string): string {
    const { type, value } = this.resolve(path);
    if (type !== "color") throw new Error(`${path}: expected a color, found ${type}`);
    return colorHex(value as ColorValue);
  }

  dimension(path: string): DimensionValue {
    const { type, value } = this.resolve(path);
    if (type !== "dimension") throw new Error(`${path}: expected a dimension, found ${type}`);
    return value as DimensionValue;
  }

  fontFamily(path: string): string[] {
    const { type, value } = this.resolve(path);
    if (type !== "fontFamily") throw new Error(`${path}: expected a fontFamily, found ${type}`);
    return typeof value === "string" ? [value] : (value as string[]);
  }
}

function checkValue(path: string, type: string, v: Json): string[] {
  if (type === "color") {
    if (!isGroup(v) || typeof v.colorSpace !== "string" || !Array.isArray(v.components)) return [`${path}: a color $value is { colorSpace, components }`];
    if (v.colorSpace !== "srgb") return [`${path}: only srgb colours are written so far, found ${v.colorSpace}`];
    if (v.components.length !== 3 || !v.components.every((c) => typeof c === "number" && c >= 0 && c <= 1)) return [`${path}: srgb components are three numbers from 0 to 1`];
    if (v.alpha !== undefined && (typeof v.alpha !== "number" || v.alpha < 0 || v.alpha > 1)) return [`${path}: alpha is a number from 0 to 1`];
    if (v.hex !== undefined) {
      if (typeof v.hex !== "string" || !/^#[0-9a-fA-F]{6}$/.test(v.hex)) return [`${path}: hex is #rrggbb`];
      if (v.hex.toLowerCase() !== componentsHex(v.components as number[])) return [`${path}: hex ${v.hex} does not match its components`];
    }
    return [];
  }
  if (type === "dimension") {
    if (!isGroup(v) || typeof v.value !== "number" || (v.unit !== "px" && v.unit !== "rem")) return [`${path}: a dimension $value is { value: number, unit: "px" | "rem" }`];
    return [];
  }
  if (type === "fontFamily") {
    if (typeof v === "string" ? v === "" : !Array.isArray(v) || v.length === 0 || !v.every((f) => typeof f === "string" && f !== "")) return [`${path}: a fontFamily $value is a name or a list of names`];
    return [];
  }
  return [];
}

const componentsHex = (c: number[]) => `#${c.map((x) => Math.round(x * 255).toString(16).padStart(2, "0")).join("")}`;

export function colorHex(v: ColorValue): string {
  return componentsHex(v.components as number[]);
}

export const cssDimension = (d: DimensionValue) => `${d.value}${d.unit}`;

const GENERIC = /^(serif|sans-serif|monospace|cursive|fantasy|system-ui|math|emoji|ui-[a-z-]+)$/;
export const cssFontFamily = (names: string[]) => names.map((n) => (GENERIC.test(n) || /^[A-Za-z-]+$/.test(n) ? n : JSON.stringify(n))).join(", ");

// tokens/*.json, the role.<theme>.json files split out as themes.
export function readTokens(dir: string): { shared: Group[]; themes: Record<"light" | "dark", Group> } {
  const files = readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
  const read = (f: string) => JSON.parse(readFileSync(join(dir, f), "utf8")) as Group;
  const theme = (name: string) => {
    if (!files.includes(`role.${name}.json`)) throw new Error(`tokens/role.${name}.json is missing`);
    return read(`role.${name}.json`);
  };
  return {
    shared: files.filter((f) => !f.startsWith("role.")).map(read),
    themes: { light: theme("light"), dark: theme("dark") },
  };
}

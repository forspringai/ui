// A customer's theme as a checked file (hub D-117, ui D-34). AppSpring's customers wear their own
// brand on their own surfaces (hub D-103 item 4): hosted apps, forms, the e-sign portal and emails.
// Forspring's chrome never changes. A theme is a small JSON file in the app's bundle, drafted by an
// agent or a person, checked here at compile time and promoted by a person in AppSpring.
//
// validateTheme() says what is wrong, with a stable code and, for a colour, the nearest value that
// passes. customerTheme() turns a valid file into values on this package's roles, never geometry:
// the accent (primary, its label, the ring and the doll), the surface tint (background and the soft
// surface), the chart slots, the app's own state hues and the logo.
//
// Errors are accessibility (contrast) and safety (schema, logo URLs): they refuse. Taste (a colour
// near a status, two states alike) is a warning and never refuses (ui D-45, the adopted rule "the
// platform owns what must be true, the author owns what is seen"). Pure functions over src/family.ts, so they run in a Worker, a browser or a
// compiler with no file access.

import { contrast, distance, fromOklch, luminance, mix, oklab, oklch } from "./color.ts";
import { PRODUCTS, ROLES, type Product, type Role } from "./family.ts";

export type { Product, Role } from "./family.ts";
export type Mode = "light" | "dark";
const MODES: Mode[] = ["light", "dark"];

/** The three levels (hub D-117): Forspring's look, the customer's brand, and later the Guideline level. */
export const LEVELS = ["default", "brand", "guideline"] as const;
export type Level = (typeof LEVELS)[number];

// The Guideline level (hub D-117 items 1 to 3): Brand plus a font from a short approved list and one
// of two presets each for radius and density. Later, after AppSpring's Brand level, so it is off:
// validateTheme() refuses it while GUIDELINE_AVAILABLE is false. The names are in the schema so a
// drafted file is shaped right; the preset values below are a draft for that decision, not approved,
// and nothing applies them. ui ships each approved font's files and metrics when the list fills.
export const GUIDELINE_AVAILABLE = false;
export const APPROVED_FONTS: readonly string[] = [];
export const RADIUS_PRESETS = ["family", "square", "round"] as const;
export const DENSITY_PRESETS = ["family", "compact", "comfortable"] as const;
export type RadiusPreset = (typeof RADIUS_PRESETS)[number];
export type DensityPreset = (typeof DENSITY_PRESETS)[number];
export const GUIDELINE_PRESETS_DRAFT = {
  radius: {
    square: { button: 0, card: 0, input: 0, panel: 0 },
    round: { button: 8, card: 12, input: 12, panel: 16 },
  },
  density: {
    compact: { height: 36, "height-small": 28, touch: 44 },
    comfortable: { height: 48, "height-small": 36, touch: 48 },
  },
} as const;

/** #rrggbb, or a DTCG 2025.10 srgb colour value (opaque). */
export type ColorInput = string | { colorSpace: "srgb"; components: [number, number, number]; alpha?: 1; hex?: string };
export type ColorPair = { light: ColorInput; dark?: ColorInput };

export type ThemeFile = {
  $schema?: string;
  $description?: string;
  level: Level;
  /** At least one of accent, tint, charts or states (validateTheme refuses an empty brand). */
  brand?: {
    accent?: ColorPair;
    tint?: ColorPair;
    /** chart-1 first, 1 to 8 slots; a bare colour is the light value (dark derived). */
    charts?: (ColorInput | ColorPair)[];
    /** The app's own state keys (^[a-z][a-z0-9_]{0,39}$, at most 24); a bare colour is the light value. */
    states?: Record<string, ColorInput | ColorPair>;
    /** An https: URL, a data:image/ URL or a path in the app's bundle, and the words for it. */
    logo?: { light: string; dark?: string; alt: string };
  };
  guideline?: { font?: string; radius?: RadiusPreset; density?: DensityPreset };
};

/** Stable refusal and warning codes; AppSpring's compiler maps them, so they never change meaning. */
export const CODES = [
  "theme.schema",
  "theme.color.format",
  "theme.level.mismatch",
  "theme.accent.contrast",
  "theme.accent.label_contrast",
  "theme.tint.text_contrast",
  "theme.tint.mark_contrast",
  "theme.logo.alt_missing",
  "theme.logo.unsafe_url",
  "theme.guideline.unavailable",
  "theme.state.mark_contrast",
  "theme.state.label_contrast",
  "theme.chart.mark_contrast",
  // warnings
  "theme.accent.dark_derived",
  "theme.tint.dark_derived",
  "theme.accent.product_close",
  // a warning since ui D-45 (an error before): taste, not access
  "theme.accent.status_clash",
  "theme.state.dark_derived",
  "theme.state.close",
  "theme.state.status_clash",
  "theme.chart.dark_derived",
  "theme.chart.close",
] as const;
export type Code = (typeof CODES)[number];

/** path is dotted ("brand.accent.light", "" for the file); fix, when given, is a value that passes there. */
export type Problem = { path: string; code: Code; message: string; fix?: string };
export type Validation = { ok: boolean; errors: Problem[]; warnings: Problem[] };
export type ValidateOptions = { product?: Product };

export type Pair = { light: string; dark: string };
export type CustomerTheme = {
  level: Exclude<Level, "guideline">;
  /** Every role per theme, #rrggbb: the family's values with the customer's in place. */
  roles: { light: Record<Role, string>; dark: Record<Role, string> };
  /** Custom properties on the package's role names under the caller's selector; "" at the Default level. */
  css: string;
  logo: { light: string; dark: string; alt: string } | null;
  /** The app's own state hues (ui D-45), per key and theme: the hue, the label on it and the soft fill.
   *  The CSS names are --state-<key>, --state-<key>-foreground and --state-<key>-soft. */
  states: Record<string, { light: StateColors; dark: StateColors }>;
};
export type StateColors = { hue: string; foreground: string; soft: string };
export type CustomerThemeOptions = ValidateOptions & { selector?: string };

export class ThemeRefused extends Error {
  readonly errors: Problem[];
  constructor(errors: Problem[]) {
    super(`the theme is refused: ${errors.map((e) => `${e.code} at ${e.path || "(file)"}`).join(", ")}`);
    this.errors = errors;
  }
}

// The rules, from test/contrast.test.ts: text 4.5:1 (WCAG AA), a mark 3:1 (1.4.11), and an accent
// at least 10 from every status and signal colour (OKLab x100, D-20).
const AA = 4.5;
const NON_TEXT = 3;
const APART = 10;
const SURFACES = ["background", "card", "muted"] as const;
const TEXT_ROLES = ["foreground", "body-foreground", "muted-foreground", "success", "warning", "danger"] as const;
const MARK_ROLES = ["signal-ok", "signal-warn", "signal-down", "signal-off"] as const;
const CLASH_ROLES = ["success", "warning", "danger", ...MARK_ROLES] as const;
// The surface the tint replaces, under every name it has: shadcn's secondary and accent are the soft
// grey too (tokens/role.*.json), and a shadcn hover left grey on a tinted page would show the seam.
const TINT_ROLES = { background: ["background"], muted: ["muted", "secondary", "accent"] } as const;
// A dark surface derived from a light tint keeps its hue at the family's dark lightness, its chroma
// capped so it stays a surface (AppSpring's derive-org-tokens.ts, MAX_SURFACE_CHROMA).
const MAX_DARK_TINT_CHROMA = 0.05;
// The app's own states (ui D-45): a key is an enum or lifecycle value, at most 24 of them. The soft
// fill is the hue on the card at the notice tints' shares (css/components.css .notice).
export const STATE_KEY = /^[a-z][a-z0-9_]{0,39}$/;
export const MAX_STATES = 24;
export const SOFT_SHARE: Record<Mode, number> = { light: 0.14, dark: 0.09 };
// The chart slots an app may set (ui D-45), judged as the family's own are (tokens/chart.json, D-37):
// 3:1 on the page and the card, neighbours 15 apart and 8 under colour-vision simulation, the tint
// the slot at this share on the card.
const MAX_CHARTS = 8;
const CHART_TINT = 0.2;
const CHART_APART = 15;
const CHART_CVD_APART = 8;
const VISIONS = ["protan", "deutan", "tritan"] as const;
// Statuses a state hue may be mistaken for (a warning only).
const STATE_CLASH_ROLES = ["success", "warning", "danger"] as const;
// The component layer's shades of the accent (css/components.css, its forspring.base block). A custom
// property resolves its var()s where it is declared, so they are declared again under the theme's
// selector; test/theme.test.ts holds them equal to components.css.
export const COMPONENT_MIXES = [
  "--_link: color-mix(in srgb, var(--primary) 70%, var(--foreground));",
  "--_hover: color-mix(in srgb, var(--primary) 80%, light-dark(var(--background), var(--foreground)));",
  "--_shadow: color-mix(in srgb, light-dark(var(--foreground), var(--background)) 25%, transparent);",
] as const;

// ── Reading the file ──────────────────────────────────────────────────────────────────────────────

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const join = (path: string, key: string) => (path ? `${path}.${key}` : key);
const HEX = /^#[0-9a-fA-F]{6}$/;

type Sink = { errors: Problem[]; warnings: Problem[] };

function keys(v: unknown, path: string, allowed: string[], required: string[], s: Sink, what: string): v is Obj {
  if (!isObj(v)) {
    s.errors.push({ path, code: "theme.schema", message: `${path || "the theme"} is ${what}, a JSON object` });
    return false;
  }
  for (const k of Object.keys(v)) {
    if (!allowed.includes(k)) s.errors.push({ path: join(path, k), code: "theme.schema", message: `${k} is not part of ${path || "a theme"}; it has ${allowed.join(", ")}` });
  }
  for (const k of required) {
    if (v[k] === undefined) s.errors.push({ path: join(path, k), code: "theme.schema", message: `${join(path, k)} is required` });
  }
  return true;
}

function color(v: unknown, path: string, s: Sink): string | null {
  const refuse = (why: string) => {
    s.errors.push({ path, code: "theme.color.format", message: `${path}: ${why}; write #rrggbb or a DTCG srgb colour { colorSpace: "srgb", components: [r, g, b] }` });
    return null;
  };
  if (typeof v === "string") return HEX.test(v) ? v.toLowerCase() : refuse(`${JSON.stringify(v)} is not #rrggbb`);
  if (!isObj(v)) return refuse("not a colour");
  const extra = Object.keys(v).filter((k) => !["colorSpace", "components", "alpha", "hex"].includes(k));
  if (extra.length) return refuse(`unknown key ${extra.join(", ")}`);
  if (v.colorSpace !== "srgb") return refuse("only srgb colours are accepted");
  const c = v.components;
  if (!Array.isArray(c) || c.length !== 3 || !c.every((x) => typeof x === "number" && x >= 0 && x <= 1)) return refuse("components are three numbers from 0 to 1");
  if (v.alpha !== undefined && v.alpha !== 1) return refuse("a theme colour is opaque (alpha 1)");
  const hex = `#${(c as number[]).map((x) => Math.round(x * 255).toString(16).padStart(2, "0")).join("")}`;
  if (v.hex !== undefined && (typeof v.hex !== "string" || v.hex.toLowerCase() !== hex)) return refuse(`hex ${JSON.stringify(v.hex)} does not match its components (${hex})`);
  return hex;
}

function pair(v: unknown, path: string, s: Sink): { light: string | null; dark: string | null | undefined } | null {
  if (!keys(v, path, ["light", "dark"], ["light"], s, "{ light, dark? }")) return null;
  if (v.light === undefined) return null;
  return { light: color(v.light, join(path, "light"), s), dark: v.dark === undefined ? undefined : color(v.dark, join(path, "dark"), s) };
}

// A state or chart colour is a bare colour (the light value; dark derived) or { light, dark? }.
function colorOrPair(v: unknown, path: string, s: Sink): { light: string | null; dark: string | null | undefined } | null {
  if (typeof v === "string" || (isObj(v) && v.colorSpace !== undefined)) return { light: color(v, path, s), dark: undefined };
  return pair(v, path, s);
}

// A logo is an https: URL, a data:image/ URL of a raster or SVG type (an <img> runs no script from
// either), or a relative path in the app's bundle. Nothing that can leave an attribute or name
// another scheme: no javascript:, http:, protocol-relative //, backslash or .. segment.
function safeLogo(v: string): boolean {
  if (v.length === 0 || v.length > 2048 || v !== v.trim()) return false;
  if (/^https:\/\//i.test(v)) {
    try {
      return new URL(v).protocol === "https:" && !/["'<>\s\\]/.test(v);
    } catch {
      return false;
    }
  }
  if (/^data:/i.test(v)) return /^data:image\/(png|jpeg|gif|webp|avif|svg\+xml)[;,][^"'<>\s\\]*$/i.test(v);
  return /^(\.\/)?[A-Za-z0-9_][A-Za-z0-9._~\-/]*$/.test(v) && !v.split("/").includes("..") && !v.includes("//");
}

// ── Colour rules ──────────────────────────────────────────────────────────────────────────────────

type Surfaces = Record<(typeof SURFACES)[number], string>;

// The tint is the soft surface (muted: table heads, hover rows, quiet sections), and the page is the
// same hue moved by the family's own step from soft to page: lighter in light, darker in dark. The
// family's grounds are built that way (paper a faint warm, soft the stronger one), and its signal-ok
// mark is only 3.07:1 on its soft grey, so a page set to the tint with a darker soft under it would
// refuse nearly every tint a customer writes.
function tintedPage(tint: string, mode: Mode): string {
  const step = oklch(ROLES[mode].background)[0] - oklch(ROLES[mode].muted)[0];
  const [l, c, h] = oklch(tint);
  const L = Math.max(0, Math.min(1, l + step));
  for (let k = 0; k <= 50; k++) {
    const hex = fromOklch(L, (c * (50 - k)) / 50, h);
    if (hex) return hex;
  }
  return ROLES[mode].background;
}

function surfaces(mode: Mode, tint: string | null): Surfaces {
  return { background: tint ? tintedPage(tint, mode) : ROLES[mode].background, card: ROLES[mode].card, muted: tint ?? ROLES[mode].muted };
}

// Text on a filled accent: the family's label (white in light, the dark ground in dark), else the
// theme's ink, whichever reaches 4.5:1. AppSpring's emailAccentForeground() picked black or white.
const labels = (mode: Mode) => [ROLES[mode]["primary-foreground"], ROLES[mode].foreground];
const label = (accent: string, mode: Mode) => labels(mode).find((p) => contrast(p, accent) >= AA) ?? null;

// Each rule is built once per theme and mode, with the fixed side of every pair (surfaces, labels,
// status and signal colours) measured up front: a fix search tries thousands of candidates.
const ratio = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
const apart = (p: number[], q: number[]) => 100 * Math.hypot(p[0]! - q[0]!, p[1]! - q[1]!, p[2]! - q[2]!);

function accentRule(mode: Mode, s: Surfaces) {
  const ground = SURFACES.map((name) => ({ name, lum: luminance(s[name]) }));
  const poles = labels(mode).map((hex) => ({ hex, lum: luminance(hex) }));
  const status = CLASH_ROLES.map((role) => ({ role, lab: oklab(ROLES[mode][role]) }));
  const findings = (hex: string) => {
    const [lum, lab] = [luminance(hex), oklab(hex)];
    return {
      contrast: ground.map(({ name, lum: g }) => ({ name, r: ratio(lum, g) })).filter((x) => x.r < AA),
      label: poles.find((p) => ratio(p.lum, lum) >= AA)?.hex ?? null,
      clashes: status.map(({ role, lab: q }) => ({ role, d: apart(lab, q) })).filter((x) => x.d < APART),
    };
  };
  const passes = (hex: string) => {
    const f = findings(hex);
    return !f.contrast.length && f.label !== null && !f.clashes.length;
  };
  return { findings, passes };
}

function tintRule(mode: Mode) {
  const lums = (roles: readonly Role[]) => roles.map((role) => ({ role, lum: luminance(ROLES[mode][role]) }));
  const [text, marks] = [lums(TEXT_ROLES), lums(MARK_ROLES)];
  const findings = (hex: string) => {
    const ground = [
      { on: "background", lum: luminance(tintedPage(hex, mode)) },
      { on: "muted", lum: luminance(hex) },
    ];
    const under = (roles: { role: Role; lum: number }[], floor: number) => roles.flatMap(({ role, lum }) => ground.map(({ on, lum: g }) => ({ role, on, r: ratio(lum, g) }))).filter((x) => x.r < floor);
    return { text: under(text, AA), marks: under(marks, NON_TEXT) };
  };
  const passes = (hex: string) => {
    const f = findings(hex);
    return !f.text.length && !f.marks.length;
  };
  return { findings, passes };
}

// A state hue is a mark on the surfaces (3:1) and carries a readable label when filled (4.5:1 with
// one of the two labels). Its soft fill needs no check: at the notice shares on the card the ink
// stays above 4.5:1 for every hue (test/theme.test.ts sweeps it).
function stateRule(mode: Mode, s: Surfaces) {
  const ground = SURFACES.map((name) => ({ name, lum: luminance(s[name]) }));
  const poles = labels(mode).map((hex) => ({ hex, lum: luminance(hex) }));
  const findings = (hex: string) => {
    const lum = luminance(hex);
    return {
      marks: ground.map(({ name, lum: g }) => ({ name, r: ratio(lum, g) })).filter((x) => x.r < NON_TEXT),
      label: poles.find((p) => ratio(p.lum, lum) >= AA)?.hex ?? null,
    };
  };
  const passes = (hex: string) => {
    const f = findings(hex);
    return !f.marks.length && f.label !== null;
  };
  return { findings, passes };
}

// A chart slot is a mark on the page and the card (3:1), as the family's slots are.
function chartRule(mode: Mode, s: Surfaces) {
  const ground = (["background", "card"] as const).map((name) => ({ name, lum: luminance(s[name]) }));
  const findings = (hex: string) => {
    const lum = luminance(hex);
    return { marks: ground.map(({ name, lum: g }) => ({ name, r: ratio(lum, g) })).filter((x) => x.r < NON_TEXT) };
  };
  return { findings, passes: (hex: string) => !findings(hex).marks.length };
}

// The least distance between two colours, in normal vision and under each simulated deficiency.
function closest(a: string, b: string): { normal: number; cvd: number } {
  return { normal: distance(a, b), cvd: Math.min(...VISIONS.map((v) => distance(a, b, v))) };
}

// The nearest colour that passes, at the same hue: every lightness on a 0.002 grid at the colour's own
// chroma and every step down to grey, the one with the least OKLab distance from the original wins.
// The way D-20 fixed DataSpring's teal (the smallest darkening that passes), searched instead of by
// hand. null when nothing at that hue passes.
function nearestPassing(hex: string, passes: (hex: string) => boolean): string | null {
  if (passes(hex)) return hex;
  const [, c0, h] = oklch(hex);
  const o = oklab(hex);
  const [ca, sa] = [Math.cos((h * Math.PI) / 180), Math.sin((h * Math.PI) / 180)];
  const n = Math.ceil(c0 / 0.004);
  let best: string | null = null;
  let bestD = Infinity;
  for (let k = 0; k <= n; k++) {
    const c = n === 0 ? 0 : (c0 * (n - k)) / n;
    for (let i = 0; i <= 500; i++) {
      const L = i / 500;
      if (100 * Math.hypot(L - o[0], c * ca - o[1], c * sa - o[2]) >= bestD + 0.5) continue;
      const cand = fromOklch(L, c, h);
      if (!cand || !passes(cand)) continue;
      const d = distance(hex, cand);
      if (d < bestD) [best, bestD] = [cand, d];
    }
  }
  return best;
}

const ratios = (xs: { r: number }[]) => xs.map((x) => `${x.r.toFixed(2)}:1`);

// ── validateTheme ─────────────────────────────────────────────────────────────────────────────────

type Resolved = { level: Level; accent: Pair | null; tint: Pair | null; charts: Pair[] | null; states: Record<string, Pair>; logo: CustomerTheme["logo"] };

function check(file: unknown, options: ValidateOptions): Sink & { resolved: Resolved } {
  const s: Sink = { errors: [], warnings: [] };
  const resolved: Resolved = { level: "default", accent: null, tint: null, charts: null, states: {}, logo: null };
  if (options.product !== undefined && !Object.hasOwn(PRODUCTS, options.product)) throw new TypeError(`unknown product: ${String(options.product)}`);
  if (typeof file === "string") {
    try {
      file = JSON.parse(file);
    } catch (e) {
      s.errors.push({ path: "", code: "theme.schema", message: `the theme is not JSON: ${(e as Error).message}` });
      return { ...s, resolved };
    }
  }
  if (!keys(file, "", ["$schema", "$description", "level", "brand", "guideline"], ["level"], s, "{ level, brand?, guideline? }")) return { ...s, resolved };
  for (const k of ["$schema", "$description"]) {
    if (file[k] !== undefined && typeof file[k] !== "string") s.errors.push({ path: k, code: "theme.schema", message: `${k} is a string` });
  }
  const level = file.level;
  if (level !== undefined && !LEVELS.includes(level as Level)) {
    s.errors.push({ path: "level", code: "theme.schema", message: `level is one of ${LEVELS.join(", ")}, not ${JSON.stringify(level)}` });
  }
  if (LEVELS.includes(level as Level)) resolved.level = level as Level;

  // Level and blocks agree: Default has neither block, Brand has brand, Guideline has both (D-117).
  if (level === "default" && file.brand !== undefined) s.errors.push({ path: "level", code: "theme.level.mismatch", message: "the Default level is Forspring's look and takes no brand values; set level to brand", fix: "brand" });
  if ((level === "brand" || level === "guideline") && file.brand === undefined) s.errors.push({ path: "brand", code: "theme.level.mismatch", message: `the ${level === "brand" ? "Brand" : "Guideline"} level needs a brand block (an accent, a tint, chart slots or states)` });
  if (file.guideline !== undefined && level !== "guideline") s.errors.push({ path: "guideline", code: "theme.level.mismatch", message: "a guideline block belongs to the Guideline level only" });

  if (file.guideline !== undefined && keys(file.guideline, "guideline", ["font", "radius", "density"], [], s, "{ font?, radius?, density? }")) {
    const g = file.guideline;
    if (g.font !== undefined && (typeof g.font !== "string" || !g.font)) s.errors.push({ path: "guideline.font", code: "theme.schema", message: "guideline.font is a font's name" });
    if (g.radius !== undefined && !RADIUS_PRESETS.includes(g.radius as RadiusPreset)) s.errors.push({ path: "guideline.radius", code: "theme.schema", message: `guideline.radius is one of ${RADIUS_PRESETS.join(", ")}` });
    if (g.density !== undefined && !DENSITY_PRESETS.includes(g.density as DensityPreset)) s.errors.push({ path: "guideline.density", code: "theme.schema", message: `guideline.density is one of ${DENSITY_PRESETS.join(", ")}` });
    if (GUIDELINE_AVAILABLE && typeof g.font === "string" && !APPROVED_FONTS.includes(g.font)) s.errors.push({ path: "guideline.font", code: "theme.schema", message: `guideline.font is one of ${APPROVED_FONTS.join(", ")}` });
  }
  if (!GUIDELINE_AVAILABLE && (level === "guideline" || file.guideline !== undefined)) {
    s.errors.push({
      path: level === "guideline" ? "level" : "guideline",
      code: "theme.guideline.unavailable",
      message: "the Guideline level is not available yet (hub D-117: later, after AppSpring's Brand level); use level brand without a guideline block",
      ...(level === "guideline" ? { fix: "brand" } : {}),
    });
  }

  if (file.brand === undefined || !keys(file.brand, "brand", ["accent", "tint", "charts", "states", "logo"], [], s, "{ accent?, tint?, charts?, states?, logo? }")) return { ...s, resolved };
  const brand = file.brand;
  if (!["accent", "tint", "charts", "states"].some((k) => brand[k] !== undefined)) {
    s.errors.push({ path: "brand", code: "theme.schema", message: "a brand block sets at least one of accent, tint, charts or states" });
  }
  const accent = brand.accent === undefined ? null : pair(brand.accent, "brand.accent", s);
  const tint = brand.tint === undefined ? null : pair(brand.tint, "brand.tint", s);

  // The tint first: the accent is then checked on the surfaces the theme makes.
  const tints: Partial<Record<Mode, string>> = {};
  if (tint?.light) {
    for (const mode of MODES) {
      const path = `brand.tint.${mode}`;
      let hex = mode === "light" ? tint.light : tint.dark;
      if (hex === null) continue;
      if (hex === undefined) {
        // No dark value: the light tint's hue at the family's dark soft lightness, chroma capped,
        // moved to the nearest passing value if it still fails. A warning, never a refusal.
        const [, c, h] = oklch(tint.light);
        const start = fromOklch(oklch(ROLES.dark.muted)[0], Math.min(c, MAX_DARK_TINT_CHROMA), h) ?? ROLES.dark.muted;
        hex = nearestPassing(start, tintRule("dark").passes) ?? ROLES.dark.muted;
        s.warnings.push({ path, code: "theme.tint.dark_derived", message: `no dark tint: derived ${hex} from ${tint.light} (its hue at the family's dark soft lightness); write brand.tint.dark to choose another`, fix: hex });
      } else {
        const rule = tintRule(mode);
        const f = rule.findings(hex);
        const fix = f.text.length || f.marks.length ? nearestPassing(hex, rule.passes) : null;
        const withFix = fix ? { fix } : {};
        if (f.text.length) {
          const worst = f.text.reduce((a, b) => (b.r < a.r ? b : a));
          s.errors.push({ path, code: "theme.tint.text_contrast", message: `${hex} is too ${mode === "light" ? "dark" : "light"} or too saturated for text in ${mode}: ${worst.role} is ${worst.r.toFixed(2)}:1 on the tinted ${worst.on} (text needs 4.5:1; ${f.text.length} pairs under)${fix ? `; ${fix} is the nearest that passes` : ""}`, ...withFix });
        }
        if (f.marks.length) {
          const worst = f.marks.reduce((a, b) => (b.r < a.r ? b : a));
          s.errors.push({ path, code: "theme.tint.mark_contrast", message: `the ${worst.role} mark is ${worst.r.toFixed(2)}:1 on the tinted ${worst.on} in ${mode} (a mark needs 3:1)${fix ? `; ${fix} is the nearest that passes` : ""}`, ...withFix });
        }
      }
      tints[mode] = hex;
    }
    if (tints.light && tints.dark) resolved.tint = { light: tints.light, dark: tints.dark };
  }

  if (accent?.light) {
    const accents: Partial<Record<Mode, string>> = {};
    for (const mode of MODES) {
      const path = `brand.accent.${mode}`;
      const rule = accentRule(mode, surfaces(mode, tints[mode] ?? null));
      let hex = mode === "light" ? accent.light : accent.dark;
      if (hex === null) continue;
      if (hex === undefined) {
        const derived = nearestPassing(accent.light, rule.passes);
        if (!derived) continue;
        hex = derived;
        s.warnings.push({ path, code: "theme.accent.dark_derived", message: `no dark accent: derived ${hex}, the nearest to ${accent.light} that passes on the dark surfaces; write brand.accent.dark to choose another`, fix: hex });
      } else {
        const f = rule.findings(hex);
        const fix = f.contrast.length || !f.label || f.clashes.length ? nearestPassing(hex, rule.passes) : null;
        // The clash is taste since ui D-45: a warning, so the colour stays the author's.
        const tail = fix ? `; ${fix} is the nearest that passes` : "";
        const withFix = fix ? { fix } : {};
        if (f.contrast.length) {
          s.errors.push({ path, code: "theme.accent.contrast", message: `${hex} is ${f.contrast.map((x) => `${x.r.toFixed(2)}:1 on ${x.name}`).join(", ")} in ${mode}; an accent is at least 4.5:1 on background, card and muted${tail}`, ...withFix });
        }
        if (!f.label) {
          const [a, b] = labels(mode) as [string, string];
          s.errors.push({ path, code: "theme.accent.label_contrast", message: `text on a filled ${hex} in ${mode} is under 4.5:1 either way: ${a} ${ratios([{ r: contrast(a, hex) }])}, ${b} ${ratios([{ r: contrast(b, hex) }])}${tail}`, ...withFix });
        }
        if (f.clashes.length) {
          s.warnings.push({ path, code: "theme.accent.status_clash", message: `${hex} is ${f.clashes.map((x) => `${x.d.toFixed(1)} from ${x.role} (${ROLES[mode][x.role]})`).join(", ")} in ${mode}; a brand colour stays at least 10 from every status and signal colour (OKLab x100) so it never reads as one${tail}`, ...withFix });
        }
      }
      accents[mode] = hex;
      if (options.product) {
        const own = PRODUCTS[options.product].primary[mode];
        const d = distance(hex, own);
        if (d < APART) s.warnings.push({ path, code: "theme.accent.product_close", message: `${hex} is ${d.toFixed(1)} from ${options.product}'s accent ${own} in ${mode}; the customer's views may read as ${options.product}'s own chrome` });
      }
    }
    if (accents.light && accents.dark) resolved.accent = { light: accents.light, dark: accents.dark };
  }

  // Chart slots, in order: chart-1 first.
  if (brand.charts !== undefined) {
    if (!Array.isArray(brand.charts) || brand.charts.length === 0 || brand.charts.length > MAX_CHARTS) {
      s.errors.push({ path: "brand.charts", code: "theme.schema", message: `brand.charts is a list of 1 to ${MAX_CHARTS} colours (chart-1 first)` });
    } else {
      const charts: Pair[] = [];
      brand.charts.forEach((v, i) => {
        const base = `brand.charts.${i}`;
        const c = colorOrPair(v, base, s);
        if (!c?.light) return;
        const got: Partial<Record<Mode, string>> = {};
        for (const mode of MODES) {
          const path = `${base}.${mode}`;
          const rule = chartRule(mode, surfaces(mode, tints[mode] ?? null));
          let hex: string | null | undefined = mode === "light" ? c.light : c.dark;
          if (hex === null) continue;
          if (hex === undefined) {
            const derived = nearestPassing(c.light, rule.passes);
            if (!derived) continue;
            hex = derived;
            if (hex !== c.light) s.warnings.push({ path, code: "theme.chart.dark_derived", message: `no dark value for chart-${i + 1}: derived ${hex}, the nearest to ${c.light} that is 3:1 on the dark page and card; write it to choose another`, fix: hex });
          } else {
            const f = rule.findings(hex);
            if (f.marks.length) {
              const fix = nearestPassing(hex, rule.passes);
              s.errors.push({ path, code: "theme.chart.mark_contrast", message: `chart-${i + 1} ${hex} is ${f.marks.map((x) => `${x.r.toFixed(2)}:1 on ${x.name}`).join(", ")} in ${mode}; a chart slot is at least 3:1 on the page and the card${fix ? `; ${fix} is the nearest that passes` : ""}`, ...(fix ? { fix } : {}) });
            }
          }
          got[mode] = hex;
        }
        if (got.light && got.dark) charts.push({ light: got.light, dark: got.dark });
      });
      if (charts.length === brand.charts.length) {
        for (let i = 1; i < charts.length; i++) {
          for (const mode of MODES) {
            const d = closest(charts[i - 1]![mode], charts[i]![mode]);
            if (d.normal < CHART_APART || d.cvd < CHART_CVD_APART) {
              s.warnings.push({ path: `brand.charts.${i}`, code: "theme.chart.close", message: `chart-${i} and chart-${i + 1} are ${d.normal.toFixed(1)} apart (${d.cvd.toFixed(1)} under colour-vision simulation) in ${mode}; neighbours read apart at ${CHART_APART} (${CHART_CVD_APART})` });
              break;
            }
          }
        }
        resolved.charts = charts;
      }
    }
  }

  // The app's own states: key -> hue.
  if (brand.states !== undefined) {
    if (!isObj(brand.states)) {
      s.errors.push({ path: "brand.states", code: "theme.schema", message: "brand.states is an object: a state key to its colour" });
    } else {
      const entries = Object.entries(brand.states);
      if (entries.length > MAX_STATES) s.errors.push({ path: "brand.states", code: "theme.schema", message: `brand.states has at most ${MAX_STATES} keys, not ${entries.length}` });
      for (const [key, v] of entries.slice(0, MAX_STATES)) {
        const base = `brand.states.${key}`;
        if (!STATE_KEY.test(key)) {
          s.errors.push({ path: base, code: "theme.schema", message: `${JSON.stringify(key)} is not a state key: lower case letters, digits and _, starting with a letter, at most 40` });
          continue;
        }
        const c = colorOrPair(v, base, s);
        if (!c?.light) continue;
        const got: Partial<Record<Mode, string>> = {};
        for (const mode of MODES) {
          const path = `${base}.${mode}`;
          const rule = stateRule(mode, surfaces(mode, tints[mode] ?? null));
          let hex: string | null | undefined = mode === "light" ? c.light : c.dark;
          if (hex === null) continue;
          if (hex === undefined) {
            const derived = nearestPassing(c.light, rule.passes);
            if (!derived) continue;
            hex = derived;
            if (hex !== c.light) s.warnings.push({ path, code: "theme.state.dark_derived", message: `no dark value for ${key}: derived ${hex}, the nearest to ${c.light} that passes on the dark surfaces; write it to choose another`, fix: hex });
          } else {
            const f = rule.findings(hex);
            const fix = rule.passes(hex) ? null : nearestPassing(hex, rule.passes);
            const tail = fix ? `; ${fix} is the nearest that passes` : "";
            const withFix = fix ? { fix } : {};
            if (f.marks.length) s.errors.push({ path, code: "theme.state.mark_contrast", message: `${key} ${hex} is ${f.marks.map((x) => `${x.r.toFixed(2)}:1 on ${x.name}`).join(", ")} in ${mode}; a state colour is at least 3:1 on background, card and muted${tail}`, ...withFix });
            if (!f.label) {
              const [a, b] = labels(mode) as [string, string];
              s.errors.push({ path, code: "theme.state.label_contrast", message: `text on a filled ${key} ${hex} in ${mode} is under 4.5:1 either way: ${a} ${ratios([{ r: contrast(a, hex) }])}, ${b} ${ratios([{ r: contrast(b, hex) }])}${tail}`, ...withFix });
            }
          }
          got[mode] = hex;
          for (const role of STATE_CLASH_ROLES) {
            const d = distance(hex, ROLES[mode][role]);
            if (d < APART) s.warnings.push({ path, code: "theme.state.status_clash", message: `${key} ${hex} is ${d.toFixed(1)} from ${role} (${ROLES[mode][role]}) in ${mode}; it may read as ${role}, which is fine only if it means that` });
          }
        }
        if (got.light && got.dark) resolved.states[key] = { light: got.light, dark: got.dark };
      }
      const keysOk = Object.keys(resolved.states);
      for (let i = 0; i < keysOk.length; i++) {
        for (let j = i + 1; j < keysOk.length; j++) {
          const [a, b] = [keysOk[i]!, keysOk[j]!];
          for (const mode of MODES) {
            const d = closest(resolved.states[a]![mode], resolved.states[b]![mode]);
            if (d.normal < APART || d.cvd < APART) {
              s.warnings.push({ path: `brand.states.${b}`, code: "theme.state.close", message: `${a} and ${b} are ${d.normal.toFixed(1)} apart (${d.cvd.toFixed(1)} under colour-vision simulation) in ${mode}; they may read as one state` });
              break;
            }
          }
        }
      }
    }
  }

  if (brand.logo !== undefined && keys(brand.logo, "brand.logo", ["light", "dark", "alt"], ["light"], s, "{ light, dark?, alt }")) {
    const logo = brand.logo;
    let ok = true;
    for (const k of ["light", "dark"] as const) {
      const v = logo[k];
      if (v === undefined) continue;
      if (typeof v !== "string" || !safeLogo(v)) {
        ok = false;
        s.errors.push({ path: `brand.logo.${k}`, code: "theme.logo.unsafe_url", message: `brand.logo.${k} is an https: URL, a data:image/ URL (png, jpeg, gif, webp, avif, svg+xml) or a relative path in the app's bundle, with no .. segment` });
      }
    }
    if (typeof logo.alt !== "string" || !logo.alt.trim()) {
      ok = false;
      s.errors.push({ path: "brand.logo.alt", code: "theme.logo.alt_missing", message: "a logo needs alt: the words a screen reader says for it, usually the customer's name" });
    }
    if (ok && typeof logo.light === "string") resolved.logo = { light: logo.light, dark: typeof logo.dark === "string" ? logo.dark : logo.light, alt: (logo.alt as string).trim() };
  }
  return { ...s, resolved };
}

/** Check a theme file (parsed, or its JSON text). ok when there are no errors; warnings never refuse. */
export function validateTheme(file: unknown, options: ValidateOptions = {}): Validation {
  const { errors, warnings } = check(file, options);
  return { ok: errors.length === 0, errors, warnings };
}

// ── customerTheme ─────────────────────────────────────────────────────────────────────────────────

const pairCss = (p: Pair) => (p.light === p.dark ? p.light : `light-dark(${p.light}, ${p.dark})`);

/** A valid theme's values on the package's roles, and its CSS under options.selector. Throws ThemeRefused on an invalid file. */
export function customerTheme(file: unknown, options: CustomerThemeOptions = {}): CustomerTheme {
  const selector = options.selector ?? "[data-customer-theme]";
  if (!selector.trim() || /[{}<>;\\]|\/\*/.test(selector)) throw new TypeError(`not a selector this can write: ${JSON.stringify(selector)}`);
  const { errors, resolved } = check(file, options);
  if (errors.length) throw new ThemeRefused(errors);

  const product = options.product ?? "forspring";
  const base = (mode: Mode): Record<Role, string> => {
    const own = PRODUCTS[product];
    return { ...ROLES[mode], primary: own.primary[mode], "primary-foreground": own["primary-foreground"][mode], ring: own.ring[mode], mark: own.mark[mode] };
  };
  const roles = { light: base("light"), dark: base("dark") };
  const set: [string, Pair][] = [];
  const put = (names: readonly Role[], p: Pair) => {
    for (const r of names) {
      roles.light[r] = p.light;
      roles.dark[r] = p.dark;
      set.push([r, p]);
    }
  };
  if (resolved.accent) {
    const a = resolved.accent;
    put(["primary"], a);
    put(["primary-foreground"], { light: label(a.light, "light")!, dark: label(a.dark, "dark")! });
    put(["ring", "mark"], a);
  }
  if (resolved.tint) {
    const t = resolved.tint;
    put(TINT_ROLES.background, { light: tintedPage(t.light, "light"), dark: tintedPage(t.dark, "dark") });
    put(TINT_ROLES.muted, t);
  }
  resolved.charts?.forEach((c, i) => {
    put([`chart-${i + 1}` as Role], c);
    put([`chart-${i + 1}-tint` as Role], { light: mix(c.light, roles.light.card, CHART_TINT), dark: mix(c.dark, roles.dark.card, CHART_TINT) });
  });
  const states: CustomerTheme["states"] = {};
  const stateCss: string[] = [];
  for (const [key, p] of Object.entries(resolved.states)) {
    const colors = (mode: Mode): StateColors => ({ hue: p[mode], foreground: label(p[mode], mode)!, soft: mix(p[mode], roles[mode].card, SOFT_SHARE[mode]) });
    const st = { light: colors("light"), dark: colors("dark") };
    states[key] = st;
    const pc = (k: keyof StateColors) => pairCss({ light: st.light[k], dark: st.dark[k] });
    stateCss.push(`--state-${key}: ${pc("hue")};`, `--state-${key}-foreground: ${pc("foreground")};`, `--state-${key}-soft: ${pc("soft")};`);
  }
  const css = set.length || stateCss.length
    ? `/* A customer's theme (@forspring/ui customerTheme, ui D-34): values on the roles, never geometry. */\n${selector} {\n${[
        ...set.map(([r, p]) => `--${r}: ${pairCss(p)};`),
        ...stateCss,
        ...COMPONENT_MIXES,
      ]
        .map((l) => `  ${l}`)
        .join("\n")}\n}\n`
    : "";
  return { level: resolved.level === "brand" ? "brand" : "default", roles, css, logo: resolved.logo, states };
}

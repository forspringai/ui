// The design audit (hub ui-standard §3, "Enforcement"): every page at desktop and phone width, light
// and dark, measured in Chromium against the tokens. Rules and severities are D-8; the script budget
// is D-9. Playwright is the consumer's (a peer dependency); axe-core is ours, injected from
// node_modules, never a CDN.

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";
import type { Browser, BrowserContext, Page, Request } from "playwright";
import { collect, collectLayout, collectPopovers, type Box, type LayoutObservations, type Observations, type PopoverObservation, type Rgba, type SlotObservation } from "./page.js";
import type { AuditOptions, AuditResult, Finding, PageResult, Theme } from "./types.js";
import { consentHeaderGaps } from "../headers.js";
import { alignmentFindings, boxesInDetails, closedDetails, collectSymbols, hideUnseen, inkBoxes, measureSource, measureWithin, plainBaselineSpread, redlineCrops, redlineReport, setDetails, showUnseen, symbolFindings, type AlignmentFinding, type RawAlignment, type Redline } from "./alignment.js";

export type { AuditOptions, AuditResult, Finding, PageResult } from "./types.js";

export const DEFAULT_WIDTHS = [1280, 380];
export const DEFAULT_THEMES: Theme[] = ["light", "dark"];
/** Below this width the phone floors apply: primary controls 44 px tall (D-5's 560 px breakpoint, the
 * breakpoint.phone token since D-27; test/components.test.ts holds the two equal). */
export const PHONE_WIDTH = 560;

/**
 * The condition components.css draws anchored menus under (D-41). Without it the menus take the
 * fallback: absolute under the trigger, clamped to the viewport (Firefox today). A Chromium cannot be
 * told to drop anchor positioning, so a test sees the fallback by rewriting the stylesheet instead.
 */
export const ANCHOR_SUPPORTS = "(position-area: block-end) and (anchor-scope: all)";

/**
 * A condition no browser supports. Not a custom property: `(--x: 1)` is a valid declaration for any
 * value, so @supports would be true (0.27.1 had that bug, found by lead-bench).
 */
export const NO_ANCHOR = "(forspring-no-anchor: 1)";

// ANCHOR_SUPPORTS with any whitespace, so a minified build matches too ("(position-area:block-end) and(anchor-scope:all)").
const ANCHOR_SUPPORTS_ANY = /\(\s*position-area\s*:\s*block-end\s*\)\s*and\s*\(\s*anchor-scope\s*:\s*all\s*\)/g;

/** The stylesheet as a browser without anchor positioning applies it: the anchored block never, the fallback always. */
export const withoutAnchorPositioning = (css: string): string => css.replace(ANCHOR_SUPPORTS_ANY, NO_ANCHOR);

export const FAMILIES = ["Archivo", "Archivo Condensed", "Space Mono"];
// Google's button sets its own Roboto, by Google's branding guidelines (D-7).
const GOOGLE_FAMILIES = ["Roboto GSI", "Roboto"];

/** The package root, from src/audit/ (tests) or dist/audit/ (the bin) alike. */
export function packageRoot(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (;;) {
    const pkg = join(dir, "package.json");
    if (existsSync(pkg) && JSON.parse(readFileSync(pkg, "utf8")).name === "@forspring/ui") return dir;
    const up = dirname(dir);
    if (up === dir) throw new Error("@forspring/ui: package.json not found above the audit");
    dir = up;
  }
}

type Tokens = {
  products: readonly string[];
  accents: Record<string, { light: string; dark: string }>;
  roles: { light: Record<string, string> };
  radius: Record<string, number>;
  control: Record<string, number>;
  space: Record<string, number>;
  rhythm: Record<string, number>;
  text: { chrome: Record<string, number>; content: Record<string, number>; marketing?: Record<string, number> };
};

export async function loadTokens(root = packageRoot()): Promise<Tokens> {
  return (await import(pathToFileURL(join(root, "dist/tokens.js")).href)) as Tokens;
}

/** A slot's family values (D-33): token names, resolved against tokens.js when the audit runs. */
export type SlotSpec = {
  /** A radius token, or a pill (999px and over). */
  radius?: "button" | "card" | "input" | "panel" | "pill";
  /**
   * min-height: "control" is --control-height, --control-height-small at a small data-size, and
   * --control-touch on a phone (D-14); "space.<n>" is that space step at any width.
   */
  height?: "control" | `space.${number}`;
  /** font-size, a ladder step: "chrome.body", "content.small". */
  text?: string;
  /** font-size at a small data-size. */
  small?: string;
}

/** shadcn's data-size values that are the family's small control. */
export const SMALL_SIZES = ["sm", "xs", "icon-sm", "icon-xs"];

/**
 * The shadcn slots the family fixes, and what it fixes on each (D-33). css/shadcn.css sets exactly
 * these values on the same slots; test/components.test.ts holds the two together. A slot not here
 * (layout parts, headers, footers) is the app's own.
 */
export const RICH_SLOTS: Record<string, SlotSpec> = {
  button: { radius: "button", height: "control", text: "content.body", small: "content.small" },
  input: { radius: "input", height: "control", text: "content.body" },
  "select-trigger": { radius: "input", height: "control", text: "content.body", small: "content.small" },
  textarea: { radius: "input", text: "content.body" },
  label: { text: "chrome.body" },
  card: { radius: "card" },
  "card-title": { text: "chrome.title" },
  "card-description": { text: "content.small" },
  "dialog-content": { radius: "panel" },
  "alert-dialog-content": { radius: "panel" },
  "dialog-title": { text: "content.h2" },
  "alert-dialog-title": { text: "content.h2" },
  "dialog-description": { text: "content.small" },
  "alert-dialog-description": { text: "content.small" },
  "popover-content": { radius: "card", text: "chrome.body" },
  "dropdown-menu-content": { radius: "card", text: "chrome.body" },
  "dropdown-menu-sub-content": { radius: "card", text: "chrome.body" },
  "select-content": { radius: "card", text: "chrome.body" },
  "dropdown-menu-item": { radius: "button", text: "chrome.body" },
  "dropdown-menu-checkbox-item": { radius: "button", text: "chrome.body" },
  "dropdown-menu-radio-item": { radius: "button", text: "chrome.body" },
  "dropdown-menu-sub-trigger": { radius: "button", text: "chrome.body" },
  "select-item": { radius: "button", text: "chrome.body" },
  "tooltip-content": { radius: "button", text: "chrome.body" },
  table: { text: "chrome.body" },
  "table-head": { text: "chrome.meta" },
  "table-cell": { text: "chrome.body" },
  badge: { radius: "pill", height: "space.5", text: "chrome.label" },
};

type Scale = {
  sizes: number[];
  h1: [number, number];
  /** Fluid steps any text may sit inside, min to max: the marketing ladder's, under --marketing (D-29). */
  ranges?: [number, number][];
  marketing?: boolean;
  radii: number[];
  palette: [number, number, number][];
  allowSpacing: number[];
  /** The token values RICH_SLOTS names, under --rich-app only (D-33). */
  rich?: Pick<Tokens, "radius" | "control" | "space" | "text">;
  /** The layout rules' thresholds (D-41); scale() always sets them. */
  layout?: LayoutScale;
};

const hexRgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const toHex = ([r, g, b]: readonly number[]) => "#" + [r!, g!, b!].map((c) => Math.round(c).toString(16).padStart(2, "0")).join("");

// Chromium serialises computed colours as rgb(), rgba() or color(srgb ...); the probe page only
// produces those.
function parseComputed(s: string): [number, number, number] | null {
  let m = /^rgba?\(([^)]+)\)$/.exec(s);
  if (m) {
    const p = m[1]!.split(/[\s,/]+/).filter(Boolean).map(Number);
    return [p[0]!, p[1]!, p[2]!];
  }
  m = /^color\(srgb ([^)]+)\)$/.exec(s);
  if (m) {
    const p = m[1]!.split(/[\s/]+/).filter(Boolean).map(Number);
    return [p[0]! * 255, p[1]! * 255, p[2]! * 255];
  }
  return null;
}

// Every color-mix() and light-dark() in the component layer, so the shades it derives from the
// roles (links, hover, notice tints, shadows) count as the palette too.
function derivedExpressions(css: string): string[] {
  const out = new Set<string>();
  for (const start of ["color-mix(", "light-dark("]) {
    for (let i = css.indexOf(start); i !== -1; i = css.indexOf(start, i + 1)) {
      let depth = 0;
      for (let j = i + start.length - 1; j < css.length; j++) {
        if (css[j] === "(") depth++;
        else if (css[j] === ")" && --depth === 0) {
          out.add(css.slice(i, j + 1));
          break;
        }
      }
    }
  }
  return [...out];
}

/** The colours a page may use: every token value, and the shades components.css mixes from roles. */
export async function palette(browser: Browser, tokens: Tokens, root: string, product?: string): Promise<[number, number, number][]> {
  const hexes = new Set<string>();
  for (const f of readdirSync(join(root, "tokens"))) {
    if (!f.endsWith(".json") || f === "accent.json") continue;
    for (const m of readFileSync(join(root, "tokens", f), "utf8").matchAll(/"hex":\s*"(#[0-9a-f]{6})"/gi)) hexes.add(m[1]!.toLowerCase());
  }
  const products = product ? [product] : [...tokens.products];
  for (const p of products) for (const h of Object.values(tokens.accents[p]!)) hexes.add(h);

  const css = readFileSync(join(root, "dist/tokens.css"), "utf8") + "\n" + readFileSync(join(root, "dist/components.css"), "utf8");
  const exprs = [...Object.keys(tokens.roles.light).map((r) => `var(--${r})`), "var(--_link)", "var(--_hover)", "var(--_shadow)", ...derivedExpressions(readFileSync(join(root, "dist/components.css"), "utf8"))];
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    await page.setContent(`<!doctype html><style>${css}</style><body></body>`);
    const computed = await page.evaluate(
      ({ products, exprs }) => {
        const out: string[] = [];
        for (const p of products)
          for (const t of ["light", "dark"]) {
            const box = document.createElement("div");
            box.dataset.product = p;
            box.dataset.theme = t;
            const span = document.createElement("span");
            box.append(span);
            document.body.append(box);
            for (const e of exprs) {
              span.style.color = "";
              span.style.color = e;
              if (span.style.color) out.push(getComputedStyle(span).color);
            }
            box.remove();
          }
        return out;
      },
      { products, exprs },
    );
    const colours = [...hexes].map(hexRgb);
    for (const c of computed) {
      const rgb = parseComputed(c);
      if (rgb) colours.push(rgb);
    }
    return colours;
  } finally {
    await context.close();
  }
}

/**
 * The marketing ladder's sizes and fluid ranges (D-29). A fluid step is two tokens, `<step>-min` and
 * `<step>` (D-22), and a page clamps between them, so the audit measures any px in that range.
 */
export function marketingLadder(marketing: Record<string, number>): { sizes: number[]; ranges: [number, number][] } {
  const ranges: [number, number][] = [];
  for (const [step, min] of Object.entries(marketing)) {
    const max = step.endsWith("-min") ? marketing[step.slice(0, -"-min".length)] : undefined;
    if (max !== undefined) ranges.push([min, max]);
  }
  return { sizes: Object.values(marketing), ranges: ranges.sort((a, b) => a[0] - b[0]) };
}

export async function scale(browser: Browser, opts: AuditOptions, root = packageRoot()): Promise<Scale> {
  const tokens = await loadTokens(root);
  const { chrome, content } = tokens.text;
  // Marketing pages ask for their ladder; a console's page never sees it, so a hero size on a console
  // still fails.
  const marketing = opts.marketing ? marketingLadder(tokens.text.marketing ?? {}) : { sizes: [], ranges: [] };
  return {
    sizes: [...new Set([...Object.values(chrome), ...Object.values(content), ...marketing.sizes])].sort((a, b) => a - b),
    // h1 is fluid between its two steps (clamp() in components.css).
    h1: [content["h1-min"]!, content["h1"]!],
    ranges: marketing.ranges,
    marketing: opts.marketing,
    radii: [0, ...Object.values(tokens.radius)],
    palette: await palette(browser, tokens, root, opts.product),
    allowSpacing: opts.allowSpacing,
    rich: opts.richApp ? { radius: tokens.radius, control: tokens.control, space: tokens.space, text: tokens.text } : undefined,
    layout: layoutScale(tokens.rhythm, tokens.space),
  };
}

// --- Rules ---------------------------------------------------------------------------------------

const lin = (c: number) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const lum = ([r, g, b]: readonly number[]) => 0.2126 * lin(r!) + 0.7152 * lin(g!) + 0.0722 * lin(b!);
export const ratio = (a: readonly number[], b: readonly number[]) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
};
const near = (a: number, b: number, tol = 0.05) => Math.abs(a - b) < tol;
const px = (n: number) => `${Math.round(n * 100) / 100}px`;
const colourText = (c: Rgba) => toHex(c) + (c[3] < 1 ? ` at ${Math.round(c[3] * 100)}%` : "");

export function findings(obs: Observations, sc: Scale, width: number): Finding[] {
  const out: Finding[] = [];
  const ranges = sc.ranges ?? [];
  const sizesText = sc.sizes.join(", ") + " px" + ranges.map(([a, b]) => `, ${a} to ${b} px`).join("");
  const inRange = (size: number, [a, b]: [number, number]) => size >= a - 0.05 && size <= b + 0.05;

  for (const t of obs.texts) {
    // Contrast. Disabled controls are exempt (WCAG 1.4.3).
    if (!t.disabled) {
      if (t.bg === null) {
        out.push({ rule: "contrast", severity: "review", selector: t.imageOn!, value: "background-image", expected: "text on a plain background", note: "needs review: text over a background image or gradient; the audit cannot measure it" });
      } else {
        const a = t.fg[3];
        const fg = [0, 1, 2].map((i) => t.fg[i]! * a + t.bg![i]! * (1 - a));
        const large = t.size >= 24 || (t.size >= 18.66 && t.weight >= 700);
        const min = large ? 3 : 4.5;
        const r = ratio(fg, t.bg);
        if (r < min) out.push({ rule: "contrast", severity: "error", selector: t.selector, value: `${r.toFixed(2)}:1 (${toHex(fg)} on ${toHex(t.bg)})`, expected: `at least ${min}:1${large ? " (large text)" : ""}`, note: "WCAG 2.2 AA, 1.4.3" });
      }
    }
    // Type size.
    if (t.size < 11 - 0.05) out.push({ rule: "text-min", severity: "error", selector: t.selector, value: px(t.size), expected: "at least 11px", note: "no text under 11px (ui-standard §3)" });
    else if (!(t.gsi || sc.sizes.some((s) => near(s, t.size)) || (t.h1 && inRange(t.size, sc.h1)) || ranges.some((r) => inRange(t.size, r))))
      out.push({ rule: "font-size", severity: "error", selector: t.selector, value: px(t.size), expected: sizesText, note: sc.marketing ? "a size on none of the type ladders (tokens/geometry.json text.chrome, text.content, text.marketing)" : "a size on neither type ladder (tokens/geometry.json text.chrome, text.content)" });
    // Family.
    const families = t.gsi ? [...FAMILIES, ...GOOGLE_FAMILIES] : FAMILIES;
    if (!families.includes(t.family)) out.push({ rule: "font-family", severity: "error", selector: t.selector, value: t.family, expected: FAMILIES.join(", "), note: t.family.startsWith("Roboto") ? "Roboto belongs inside Google's button (.gsi) only" : "the family's fonts only, self-hosted" });
  }

  for (const f of obs.fonts)
    if (![...FAMILIES, ...GOOGLE_FAMILIES].includes(f)) out.push({ rule: "font-family", severity: "error", selector: "document.fonts", value: f, expected: FAMILIES.join(", "), note: "the page loaded a font face outside the family" });

  for (const b of obs.boxes) {
    if (!b.gsi) {
      const bad = new Set<string>();
      for (const corner of b.radii)
        for (const part of corner.split(" ")) {
          const n = parseFloat(part);
          const ok = part.endsWith("%") ? n === 0 || n === 50 : n === 0 || n >= 999 || sc.radii.some((r) => near(r, n));
          if (!ok) bad.add(part);
        }
      if (bad.size) out.push({ rule: "radius", severity: "error", selector: b.selector, value: [...bad].join(" "), expected: `${sc.radii.join(", ")} px, 50% or a pill (999px)`, note: "radii are fixed geometry (tokens radius.*)" });

      const off = new Map<string, string[]>();
      for (const s of b.spacing) {
        const v = Math.round(Math.abs(s.px) * 100) / 100;
        if (near(v % 4, 0, 0.01) || near(v % 4, 4, 0.01) || sc.allowSpacing.some((a) => near(a, v, 0.01))) continue;
        const key = px(v);
        off.set(key, [...(off.get(key) ?? []), s.prop]);
      }
      for (const [v, props] of off) out.push({ rule: "spacing", severity: "error", selector: b.selector, value: v, expected: "a multiple of 4px" + (sc.allowSpacing.length ? ` or ${sc.allowSpacing.join(", ")} (--allow-spacing)` : ""), note: props.join(", ") });

      for (const c of b.colours) {
        if (sc.palette.some((p) => Math.abs(p[0] - c.rgba[0]) <= 2 && Math.abs(p[1] - c.rgba[1]) <= 2 && Math.abs(p[2] - c.rgba[2]) <= 2)) continue;
        out.push({ rule: "palette", severity: "warning", selector: b.selector, value: colourText(c.rgba), expected: "a token colour (any alpha)", note: c.prop });
      }
    }
  }

  if (sc.rich) out.push(...primitives(obs.slots ?? [], sc.rich, width));

  for (const t of obs.smallTargets) out.push({ rule: "target-size", severity: "error", selector: t.selector, value: `${t.width}x${t.height}px`, expected: "at least 24x24px, or 24px clear of other targets", note: "WCAG 2.2 AA, 2.5.8" });
  if (width < PHONE_WIDTH)
    for (const t of obs.primaries)
      if (t.height < 43.5) out.push({ rule: "target-primary", severity: "error", selector: t.selector, value: `${t.height}px tall`, expected: "at least 44px tall on a phone", note: "primary controls on phones (ui-standard §3)" });
  for (const g of obs.orgLists ?? [])
    out.push({
      rule: "own-org-list",
      severity: "error",
      selector: g.selector,
      value: `${g.orgs} organisations as ${g.kind === "select" ? "a select" : g.kind}, drawn by the page`,
      expected: "@forspring/ui's org list: orgList(), orgPicker(), chooseOrgPage() or the bar's org switcher (data-forspring-org-list)",
      note: "the suite has one org list (D-59); forspring-ui-check org-lists finds the source",
    });
  return out;
}

/**
 * The rich-app check (D-33): each known slot's radius, min-height and font-size against the family's
 * value, which css/shadcn.css sets. The generic rules accept any token (a 6px button, 14px input
 * text); this one knows which token each part takes.
 */
export function primitives(slots: SlotObservation[], t: NonNullable<Scale["rich"]>, width: number): Finding[] {
  const out: Finding[] = [];
  const step = (name: string) => {
    const [ladder, key] = name.split(".") as [keyof typeof t.text, string];
    return { px: t.text[ladder]![key]!, token: `--text-${ladder}-${key}` };
  };
  for (const o of slots) {
    const spec = RICH_SLOTS[o.slot];
    if (!spec) continue;
    const small = o.size !== null && SMALL_SIZES.includes(o.size);
    const note = `data-slot="${o.slot}"${o.size ? ` data-size="${o.size}"` : ""}: @forspring/ui/shadcn.css sets it; keep the copied component's classes off it (D-33)`;
    const add = (value: string, expected: string) => out.push({ rule: "primitive", severity: "error", selector: o.selector, value, expected, note });

    if (spec.radius) {
      const want = spec.radius === "pill" ? null : t.radius[spec.radius]!;
      const bad = new Set<string>();
      for (const corner of o.radii)
        for (const part of corner.split(" ")) {
          const n = parseFloat(part);
          if (part.endsWith("%") || (want === null ? n < 999 : !near(n, want))) bad.add(part);
        }
      if (bad.size) add(`border-radius ${[...bad].join(" ")}`, want === null ? "a pill (999px)" : `${want}px (--radius-${spec.radius})`);
    }

    if (spec.height) {
      let want: number;
      let token: string;
      if (spec.height === "control") {
        [want, token] = width < PHONE_WIDTH ? [t.control.touch!, "--control-touch, on a phone"] : small ? [t.control["height-small"]!, "--control-height-small"] : [t.control.height!, "--control-height"];
      } else {
        const n = spec.height.slice("space.".length);
        [want, token] = [t.space[n]!, `--space-${n}`];
      }
      if (!near(o.minHeight, want, 0.5) || o.height < want - 0.5) add(`min-height ${px(o.minHeight)}, ${px(o.height)} tall`, `min-height ${want}px (${token})`);
    }

    const text = small && spec.small ? spec.small : spec.text;
    if (text) {
      const s = step(text);
      if (!near(o.fontSize, s.px)) add(`font-size ${px(o.fontSize)}`, `${s.px}px (${s.token})`);
    }
  }
  return out;
}

// --- Layout: spacing, alignment, popovers and surfaces (D-41) -----------------------------------

/** The thresholds the layout rules read: the rhythm tokens, and the surface steps in OKLab L. */
export type LayoutScale = {
  /** The rhythm tokens in px (tokens.rhythm); a stack whose every gap is one of them is on the rhythm. */
  rhythm: number[];
  /** The least gap two controls may have: 8 px, or the smallest rhythm token if that is larger. */
  minGap: number;
  /** A popover's nearest edge from its trigger, at most (px). */
  anchorGap: number;
  /** A region's fill from the surface behind it, at least (OKLab L). */
  fillStep: number;
  /** A region's four-sided border from the surface behind it, at least (OKLab L). */
  borderStep: number;
  /** The space scale in px (tokens.space): a gap between two siblings is one of them, or none (D-42). */
  space: number[];
};

export function layoutScale(rhythm: Record<string, number>, space: Record<string, number> = {}): LayoutScale {
  const steps = [...new Set(Object.values(rhythm))].sort((a, b) => a - b);
  const scale = [...new Set(Object.values(space))].sort((a, b) => a - b);
  return { rhythm: steps, minGap: Math.max(8, steps[0] ?? 0), anchorGap: 8, fillStep: 0.02, borderStep: 0.04, space: scale };
}

/** OKLab lightness of an sRGB colour (0 to 255 per channel), 0 to 1. */
export function oklabL([r, g, b]: readonly number[]): number {
  const [lr, lg, lb] = [lin(r!), lin(g!), lin(b!)];
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s2 = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s2;
}

const overlap = (a0: number, a1: number, b0: number, b1: number) => Math.min(a1, b1) - Math.max(a0, b0);
const r1 = (n: number) => Math.round(n * 10) / 10;

/**
 * The layout rules (D-41, D-42), written once here so the screens bench runs the same ones
 * (lead-bench's definitions, D-41). control-gap, stack-rhythm and surface-distinct are taste-class
 * warnings; control-text-centre, off-scale and clip are basics and errors (D-42). ui's own tests hold
 * the demo to none of either.
 */
export function layoutFindings(obs: LayoutObservations, t: LayoutScale): Finding[] {
  const out: Finding[] = [];
  const warn = (rule: Finding["rule"], selector: string, value: string, expected: string, note: string) => out.push({ rule, severity: "warning", selector, value, expected, note });

  // control-gap: two controls whose boxes overlap by 1 px or more on one axis need minGap on the other.
  const skip = new Set(obs.composite.map(([i, j]) => `${i} ${j}`));
  for (let i = 0; i < obs.controls.length; i++)
    for (let j = i + 1; j < obs.controls.length; j++) {
      if (skip.has(`${i} ${j}`)) continue;
      const [a, b] = [obs.controls[i]!.box, obs.controls[j]!.box];
      const ox = overlap(a.x, a.x + a.w, b.x, b.x + b.w);
      const oy = overlap(a.y, a.y + a.h, b.y, b.y + b.h);
      let gap: number | null = null;
      let axis = "";
      if (ox >= 1 && oy >= 1) [gap, axis] = [-Math.min(ox, oy), "overlapping"];
      else if (ox >= 1) [gap, axis] = [-oy, "one above the other"];
      else if (oy >= 1) [gap, axis] = [-ox, "side by side"];
      if (gap === null || gap >= t.minGap - 0.01) continue;
      const names = `${obs.controls[i]!.selector} | ${obs.controls[j]!.selector}`;
      warn("control-gap", names, gap <= 0 ? `${gap < 0 ? "overlapping" : "touching"} (${r1(gap)}px, ${axis})` : `${r1(gap)}px apart, ${axis}`, `at least ${t.minGap}px between two controls (--rhythm-actions)`, "space controls on the rhythm: put buttons in actions(), or let the container's rhythm part them (D-41)");
    }

  // control-text-centre (D-42): the label's ink, cap top to baseline, in the middle of the padding
  // box: as much room above it as below, to 1 px. Measured on the ink, not the line box, which a font
  // with more ascent than descent centres while its letters sit high.
  for (const c of obs.texts) {
    const off = (c.inkTop + c.inkBottom) / 2 - (c.boxTop + c.boxBottom) / 2;
    if (Math.abs(off) <= 0.51) continue;
    const [above, below] = [c.inkTop - c.boxTop, c.boxBottom - c.inkBottom];
    out.push({ rule: "control-text-centre", severity: "error", selector: c.selector, value: `${r1(above)}px above the label, ${r1(below)}px below${c.lines > 1 ? ` (${c.lines} lines)` : ""}`, expected: "the label's ink (cap top to baseline) in the middle of the control: above and below within 1px", note: "size the control from --control-height with ui's font faces (fonts.css or fontFaces()), whose metrics centre the cap band; never nudge with padding alone (D-14, D-42)" });
  }

  // stack-rhythm: the gaps between a stack's children equal (within 1 px), or each a rhythm token.
  for (const st of obs.stacks) {
    const gaps: { gap: number; a: string; b: string }[] = [];
    for (let i = 1; i < st.children.length; i++) {
      const [p, c] = [st.children[i - 1]!, st.children[i]!];
      // Deliberately apart (an auto margin), or on another line of a wrapped row: not a rhythm gap.
      if (p.autoAfter || c.autoBefore) continue;
      const cross = st.axis === "block" ? overlap(p.box.x, p.box.x + p.box.w, c.box.x, c.box.x + c.box.w) : overlap(p.box.y, p.box.y + p.box.h, c.box.y, c.box.y + c.box.h);
      if (cross < 1) continue;
      const gap = st.axis === "block" ? c.box.y - (p.box.y + p.box.h) : c.box.x - (p.box.x + p.box.w);
      // Side by side in a block flow (two buttons on one line) is not a step down the stack.
      if (st.axis === "block" && c.box.y < p.box.y + p.box.h - 1 && overlap(p.box.y, p.box.y + p.box.h, c.box.y, c.box.y + c.box.h) >= 1) continue;
      gaps.push({ gap, a: p.selector, b: c.selector });
    }
    if (gaps.length < 2) continue;
    const vals = gaps.map((g) => g.gap);
    if (Math.max(...vals) - Math.min(...vals) <= 1) continue;
    const onRhythm = (g: number) => t.rhythm.some((r) => Math.abs(r - g) <= 1);
    for (const g of gaps.filter((x) => !onRhythm(x.gap)))
      warn("stack-rhythm", st.selector, `${r1(g.gap)}px between ${g.a} and ${g.b}`, `equal gaps, or each a rhythm token (${t.rhythm.join(", ")} px)`, "space a stack's children with --rhythm-* (D-41)");
  }

  // off-scale (D-42): the room between two siblings, edge to edge along the stack, is a step of the
  // space scale (within 1 px) or none. Not where a grid's tracks or shared-out free space set it,
  // nor across an auto margin or a wrap.
  for (const st of obs.stacks) {
    if (st.laidOut) continue;
    for (let i = 1; i < st.children.length; i++) {
      const [p, c] = [st.children[i - 1]!, st.children[i]!];
      if (p.autoAfter || c.autoBefore) continue;
      const cross = st.axis === "block" ? overlap(p.box.x, p.box.x + p.box.w, c.box.x, c.box.x + c.box.w) : overlap(p.box.y, p.box.y + p.box.h, c.box.y, c.box.y + c.box.h);
      if (cross < 1) continue;
      if (st.axis === "block" && c.box.y < p.box.y + p.box.h - 1 && overlap(p.box.y, p.box.y + p.box.h, c.box.y, c.box.y + c.box.h) >= 1) continue;
      const gap = st.axis === "block" ? c.box.y - (p.box.y + p.box.h) : c.box.x - (p.box.x + p.box.w);
      if (gap <= 1 || t.space.some((v) => Math.abs(v - gap) <= 1)) continue;
      out.push({ rule: "off-scale", severity: "error", selector: st.selector, value: `${r1(gap)}px between ${p.selector} and ${c.selector}`, expected: `a step of the space scale (${t.space.join(", ")} px), within 1px, or none`, note: "space siblings with gap or margin on --space-* or --rhythm-*; a gap no token makes reads as a mistake (D-42)" });
    }
  }

  // clip (D-42): text cut by its box with no ellipsis or clamp, text out of the box it is written in,
  // and anything past the window's sides.
  for (const c of obs.clips) {
    const what = c.kind === "viewport" ? `${c.by}px past the window's ${c.sides.join(" and ")}` : c.kind === "scroll" ? `${c.by}px more below, and nothing shows it` : `"${c.text}" ${c.kind === "cut" ? "cut" : "out of its box"} by ${c.by}px at the ${c.sides.join(", ")}`;
    const fix = { cut: "let it wrap, or say the cut is meant: text-overflow: ellipsis across, a line clamp down, or a scroller", spill: "let the box grow with its words (min-height, not height; no fixed width on a label), or wrap them", viewport: "keep the page inside the window at every width: let it wrap, or give the wide part a scroller of its own", scroll: "let the box grow to its content, or show there is more: a shadow that scrolls with it (background-attachment: local, as .table-wrap); a scrollbar is no cue, an overlay one is not drawn until the reader scrolls" }[c.kind];
    const expected = { cut: "every word inside the box it is written in", spill: "every word inside the box it is written in", viewport: "nothing past the window's sides", scroll: "a scroller with more below shows it" }[c.kind];
    out.push({ rule: "clip", severity: "error", selector: c.selector, value: what, expected, note: `${fix} (D-42)` });
  }

  for (const r of obs.regions) {
    const behind = oklabL(r.behind);
    const fill = r.fill ? Math.abs(oklabL(r.fill) - behind) : 0;
    const border = r.border ? Math.abs(oklabL(r.border) - behind) : 0;
    if (fill >= t.fillStep - 1e-4 || border >= t.borderStep - 1e-4) continue;
    const what = `${r.fill ? `fill ${fill.toFixed(3)} L` : "no fill"}, ${r.border ? `border ${border.toFixed(3)} L` : "no four-sided border"} from the surface behind (${toHex(r.behind)})`;
    warn("surface-distinct", r.selector, what, `a fill at least ${t.fillStep} L, or a border on all four sides at least ${t.borderStep} L, from the surface behind`, "a pane reads as a pane: the card surface on the page, or a border (D-41)");
  }
  return out;
}

/**
 * popover-anchor: an open popover within anchorGap of its trigger, across its inline span, inside the
 * window. Past the window's bottom is how a menu that should have flipped up shows: lead-bench's rule
 * is that with no room below it opens upward, so inside the window is the whole of that check. An open
 * popover with no trigger to measure against is a finding of its own, never skipped.
 */
export function popoverFindings(list: PopoverObservation[], t: LayoutScale): Finding[] {
  const out: Finding[] = [];
  const edge = (b: Box) => ({ l: b.x, r: b.x + b.w, t: b.y, b: b.y + b.h });
  for (const p of list) out.push(...rowInsetFindings(p));
  for (const p of list) {
    if (!p.triggerBox || !p.trigger) {
      out.push({ rule: "popover-anchor", severity: "warning", selector: p.selector, value: "no trigger found", expected: "a trigger that names it (popovertarget, aria-controls, a summary) or an anchor", note: "open a popover from the button it belongs to, so it can be anchored to it (D-41)" });
      continue;
    }
    const [o, g] = [edge(p.box), edge(p.triggerBox)];
    const problems: string[] = [];
    const below = o.t >= g.t;
    const dist = below ? o.t - g.b : g.t - o.b;
    if (dist > t.anchorGap + 0.5) problems.push(`${r1(dist)}px ${below ? "below" : "above"} its trigger`);
    if (overlap(o.l, o.r, g.l, g.r) < 1) problems.push("outside its trigger's inline span");
    const outside = [o.l < -0.5 && "start", o.r > p.viewport.w + 0.5 && "end", o.t < -0.5 && "top", o.b > p.viewport.h + 0.5 && "bottom"].filter(Boolean);
    if (outside.length) problems.push(`past the window's ${outside.join(", ")}`);
    if (problems.length)
      out.push({ rule: "popover-anchor", severity: "warning", selector: `${p.selector} (trigger ${p.trigger})`, value: problems.join("; "), expected: `within ${t.anchorGap}px of its trigger, across its inline span, inside the window`, note: "anchor a menu to its trigger: ui's details menus and tooltips do (D-41)" });
  }
  return out;
}

/**
 * menu-row-inset (D-76): in an open menu, every row and control that spans it (half its inner width or
 * more) sits on one inline inset, start and end, within 1px: the rows' hover and chosen surfaces, a
 * toggle, a sign-out button. The inset most of them share is the menu's; a row off it is the finding.
 * From the 0.51.0 red-line triage (D-74): the user menu's sign-out sat 4px further in than the rows above
 * it, and no rule saw it. Menus only (a positioned panel: a details menu or an open popover): a content
 * disclosure's links and fields are inline in prose and hold no such line.
 */
export function rowInsetFindings(p: PopoverObservation): Finding[] {
  if (p.rows.length < 2) return [];
  const usual = (side: "start" | "end") => {
    const counts = new Map<number, number>();
    for (const r of p.rows) counts.set(Math.round(r[side]), (counts.get(Math.round(r[side])) ?? 0) + 1);
    // The inset most rows share; on a tie, the smaller (the panel's own padding, before any extra).
    return [...counts].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]![0];
  };
  const [start, end] = [usual("start"), usual("end")];
  return p.rows
    .filter((r) => Math.abs(r.start - start) > 1 || Math.abs(r.end - end) > 1)
    .map((r) => ({
      rule: "menu-row-inset" as const,
      severity: "error" as const,
      selector: `${r.selector} (in ${p.selector})`,
      value: `inset ${r1(r.start)}px at the start and ${r1(r.end)}px at the end; the menu's other rows ${start}px and ${end}px`,
      expected: "every row and control across a menu on the menu's one inset, start and end, within 1px",
      note: "a menu's rows, toggles and buttons share its inner edge: take the panel's padding, add none of your own (D-74, D-76)",
    }));
}

/**
 * Opens every menu and popover trigger on the page in turn, measures it open, and closes it (D-41).
 * Exported for a probe of its own (the screens bench): call it on a loaded page.
 */
export async function probePopovers(page: Page, t: LayoutScale): Promise<Finding[]> {
  const t0 = popoverFindings(await page.evaluate(collectPopovers), t);
  const count = await page.evaluate(() => {
    // Summaries, popover buttons, and script-driven menu buttons (aria-haspopup with aria-controls).
    const triggers = [...document.querySelectorAll("details:not([open]) > summary, [popovertarget], [aria-controls][aria-haspopup]:not([aria-haspopup='false'])")].filter((e) => e.checkVisibility({ visibilityProperty: true }) && e.getBoundingClientRect().width > 1);
    triggers.forEach((e, i) => e.setAttribute("data-ui-audit-trigger", String(i)));
    return triggers.length;
  });
  // What is open at rest is measured first: a popover a script opened, with or without a trigger.
  const out: Finding[] = [...t0];
  for (let i = 0; i < count; i++) {
    const opened = await page.evaluate(async (i) => {
      const e = document.querySelector(`[data-ui-audit-trigger="${i}"]`);
      if (!e) return false;
      e.scrollIntoView({ block: "center", inline: "nearest" });
      if (e.tagName === "SUMMARY") (e.parentElement as HTMLDetailsElement).open = true;
      // Already open (a script opened it at rest): measured above, and a press would close it.
      else if ((e as HTMLButtonElement).popoverTargetElement?.matches(":popover-open") || document.getElementById(e.getAttribute("aria-controls") ?? "")?.matches(":popover-open")) return false;
      // A popover opened by its button takes the button as its implicit anchor, as a press does; a
      // script-driven menu button runs its own script.
      else (e as HTMLElement).click();
      await new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)));
      return true;
    }, i);
    if (!opened) continue;
    out.push(...popoverFindings(await page.evaluate(collectPopovers), t));
    // Close as a person would (Escape), then make sure: a details element and a native popover by the DOM.
    await page.keyboard.press("Escape");
    await page.evaluate((i) => {
      const e = document.querySelector(`[data-ui-audit-trigger="${i}"]`);
      if (e?.tagName === "SUMMARY") (e.parentElement as HTMLDetailsElement).open = false;
      else if (e) {
        const target = document.getElementById(e.getAttribute("popovertarget") ?? e.getAttribute("aria-controls") ?? "");
        if (target?.matches(":popover-open")) target.hidePopover();
      }
    }, i);
  }
  await page.evaluate(() => document.querySelectorAll("[data-ui-audit-trigger]").forEach((e) => e.removeAttribute("data-ui-audit-trigger")));
  return out;
}

/** One finding per distinct (rule, selector, value), with a count, errors first. */
export function dedupe(list: Finding[]): Finding[] {
  const seen = new Map<string, Finding>();
  for (const f of list) {
    const key = JSON.stringify([f.rule, f.severity, f.selector, f.value, f.expected, f.note]);
    const had = seen.get(key);
    if (had) had.count = (had.count ?? 1) + 1;
    else seen.set(key, { ...f });
  }
  const order = { error: 0, warning: 1, review: 2 };
  return [...seen.values()].sort((a, b) => order[a.severity] - order[b.severity]);
}

/** --format text: one line per page, one per finding. */
export function formatText(result: AuditResult): string {
  const lines: string[] = [];
  for (const p of result.pages) {
    const errors = p.findings.filter((f) => f.severity === "error").length;
    lines.push(`${p.url}  ${p.width}px ${p.theme}  ${errors ? `${errors} error${errors === 1 ? "" : "s"}` : "ok"}`);
    for (const f of p.findings)
      lines.push(`  ${f.severity.padEnd(7)} ${f.rule.padEnd(14)} ${f.selector}  ${f.value}  (expected ${f.expected})${f.count ? ` x${f.count}` : ""}${f.note ? `  ${f.note}` : ""}`);
  }
  lines.push(result.ok ? "ok: no errors" : "failed: see the errors above");
  return lines.join("\n");
}

// --- Running pages ---------------------------------------------------------------------------------

const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

function axeSource(): string {
  return readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
}

const kb = (n: number) => `${(n / 1024).toFixed(1)} KB`;

/** A page is settled when no request is open and neither the network nor the DOM has changed for this long (D-16). */
export const SETTLE_QUIET = 300;
/** The most the audit waits for a page to settle after load before measuring it anyway. */
export const SETTLE_MAX = 10_000;
/** How long --wait-for waits by default. */
export const WAIT_TIMEOUT = 30_000;

/**
 * Waits for the page to go quiet: a single-page app draws after load, from lazy chunks and API
 * calls, so the load event alone measures an empty shell. A static page is quiet at once and costs
 * SETTLE_QUIET. Returns false when the page was still busy at SETTLE_MAX (a poll, an animation).
 */
async function settled(page: Page, open: Set<Request>, lastNet: () => number): Promise<boolean> {
  // The observer only notes the time of the last change; it is the audit's, set after load.
  await page.evaluate(() => {
    const w = window as unknown as { __forspringAuditQuiet: number };
    w.__forspringAuditQuiet = performance.now();
    new MutationObserver(() => (w.__forspringAuditQuiet = performance.now())).observe(document, { subtree: true, childList: true, attributes: true, characterData: true });
  });
  const start = Date.now();
  for (;;) {
    const domQuiet = await page.evaluate(() => performance.now() - (window as unknown as { __forspringAuditQuiet: number }).__forspringAuditQuiet);
    if (open.size === 0 && Date.now() - lastNet() >= SETTLE_QUIET && domQuiet >= SETTLE_QUIET) return true;
    if (Date.now() - start >= SETTLE_MAX) return false;
    await page.waitForTimeout(50);
  }
}

/**
 * The alignment findings of one page (D-66, D-74): measure.js and the symbol rule with every closed
 * menu closed (their items left out), then once more for each closed menu with only it open (only
 * its items kept). `crop` draws each pass's red-lines while that pass's menu is open.
 */
async function measureAlignment(page: Page, measure: string, crop: ((f: AlignmentFinding[]) => Promise<void>) | null): Promise<AlignmentFinding[]> {
  const pass = async (only?: number) => {
    await page.evaluate(measureWithin, only ?? null);
    let aligned: AlignmentFinding[];
    try {
      aligned = [...alignmentFindings(((await page.evaluate(measure)) as { findings: RawAlignment[] }).findings), ...symbolFindings(await page.evaluate(collectSymbols, only ?? null))];
    } finally {
      await page.evaluate(measureWithin, null);
    }
    const ink = aligned.filter((f) => f.rule === "alignment-ink-centre");
    const keep = await page.evaluate(inkBoxes, ink.map((f) => f.box));
    aligned = aligned.filter((f) => f.rule !== "alignment-ink-centre" || keep[ink.indexOf(f)]);
    const where = await page.evaluate(boxesInDetails, { boxes: aligned.map((f) => f.box), only });
    aligned = aligned.filter((_, k) => (only === undefined ? where[k] === -1 : where[k] === only));
    for (const f of aligned)
      if (f.rule === "alignment-shared-baseline" && f.severity === "error") {
        const spread = await page.evaluate(plainBaselineSpread, f.box);
        if (spread === null || spread < 2) Object.assign(f, { severity: "review", note: `${f.note}; text in a control or on a surface, which centres in its own box (D-66)` });
      }
    if (crop && aligned.length) await crop(aligned);
    return aligned;
  };
  // The labels only a screen reader reads stay hidden for every pass; hidden, they move nothing and show nothing.
  await page.evaluate(hideUnseen);
  try {
    const out = await pass();
    for (const i of await page.evaluate(closedDetails)) {
      await page.evaluate(setDetails, { i, open: true });
      try {
        out.push(...(await pass(i)));
      } finally {
        await page.evaluate(setDetails, { i, open: false });
      }
    }
    return out;
  } finally {
    await page.evaluate(showUnseen);
  }
}

async function auditPage(browser: Browser, url: string, width: number, theme: Theme, sc: Scale, opts: AuditOptions, axe: string, measure: string, redlines: Redline[]): Promise<PageResult> {
  const origin = new URL(url).origin;
  // The page's own origin and the ones the run allows (its API on another port): requests to these
  // go through, and are not third-party (D-16).
  const own = new Set([origin, ...(opts.allowOrigins ?? []).map((o) => new URL(o).origin)]);
  // bypassCSP lets the audit inject axe into a page whose strict CSP (as it should be) forbids it.
  const context: BrowserContext = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme, bypassCSP: true, serviceWorkers: "block", deviceScaleFactor: opts.redlines ? 2 : 1 });
  const found: Finding[] = [];
  // url -> resource type, and whether Chromium fetched it (a redirect hop) or the audit answered it.
  const offOrigin = new Map<string, { type: string; fetched: boolean }>();
  const scripts: Promise<number>[] = [];
  try {
    // Off-origin requests are recorded and answered empty, never fetched: the run stays offline
    // and the same in CI as on a laptop, and the finding does not depend on the third party.
    await context.route("**/*", (route) => {
      const req = route.request();
      const u = new URL(req.url());
      if (/^https?:$/.test(u.protocol) && !own.has(u.origin)) {
        offOrigin.set(req.url(), { type: req.resourceType(), fetched: false });
        return route.fulfill({ status: 204, body: "" });
      }
      return route.continue();
    });
    if (opts.cookie) {
      // The session goes as a header on the context's requests rather than a cookie in the jar: no
      // Domain, Secure or __Host- rules to get right over local http, and nothing a page's script
      // can read. (route.continue cannot set Cookie; Chromium drops it.) It reaches the audited
      // origin and the allowed ones only: every other HTTP request is answered above without leaving
      // the browser, and a WebSocket to anywhere else is closed unopened (D-10, D-16).
      await context.setExtraHTTPHeaders({ cookie: opts.cookie });
      const hosts = new Set([...own].map((o) => new URL(o).host));
      await context.routeWebSocket((u) => !hosts.has(u.host), (ws) => ws.close());
    }
    const page = await context.newPage();
    // Open requests and the time of the last network event, for settled().
    const open = new Set<Request>();
    let lastNet = Date.now();
    page.on("request", (req) => (open.add(req), (lastNet = Date.now())));
    const done = (req: Request) => (open.delete(req), (lastNet = Date.now()));
    page.on("requestfinished", done);
    page.on("requestfailed", done);
    // Playwright routes only the first URL of a redirect chain, so a same-origin URL that redirects
    // off-origin is followed by Chromium itself, past the route above (checked with Playwright 1.64,
    // 2026-10-10). Hosts are not resolved (cli.ts), but an IP literal needs no resolving. The hop
    // cannot be stopped from here; it is recorded and fails like any other third-party request (D-12).
    page.on("request", (req) => {
      if (!req.redirectedFrom()) return;
      const u = new URL(req.url());
      if (/^https?:$/.test(u.protocol) && !own.has(u.origin)) offOrigin.set(req.url(), { type: req.resourceType(), fetched: true });
    });
    page.on("response", (res) => {
      if (res.request().resourceType() !== "script" || !own.has(new URL(res.url()).origin)) return;
      scripts.push(
        (async () => {
          try {
            const body = await res.body();
            if (res.headers()["content-encoding"]) return (await res.request().sizes()).responseBodySize;
            // Served uncompressed (a local dev server): count what it gzips to, since production
            // serves it compressed and the budget is in gzipped bytes (ui-standard §3, D-9).
            return gzipSync(body).length;
          } catch {
            return 0;
          }
        })(),
      );
    });
    let res;
    try {
      res = await page.goto(url, { waitUntil: "load", timeout: 30_000 });
    } catch (e) {
      found.push({ rule: "page-load", severity: "error", selector: "document", value: (e as Error).message.split("\n")[0]!, expected: "the page loads", note: "check the URL and that the server is running" });
      return { url, width, theme, findings: found };
    }
    // A refusal page (403, 503) is a page people see and is audited like any other, when the run
    // says that status is expected (--allow-status, D-10).
    if (!res || (res.status() >= 400 && !(opts.allowStatus ?? []).includes(res.status()))) {
      found.push({ rule: "page-load", severity: "error", selector: "document", value: `HTTP ${res?.status() ?? "no response"}`, expected: `HTTP 200${opts.allowStatus?.length ? ` or ${opts.allowStatus.join(", ")} (--allow-status)` : ""}`, note: "the audit measures the page the server returns" });
      return { url, width, theme, findings: found };
    }
    // A redirected page is not the page asked for, and Chromium sends --cookie-env's header on the
    // first request only, so a signed-in URL that redirects would be audited signed out and could
    // pass as someone else's page. Give the audit the final URL instead (D-12).
    if (res.request().redirectedFrom()) {
      found.push({ rule: "page-load", severity: "error", selector: "document", value: `redirected to ${res.url()}`, expected: "the page itself, not a redirect", note: "audit the URL the redirect leads to; a redirect drops the --cookie-env session" });
      return { url, width, theme, findings: found };
    }
    // A single-page app draws after load: wait for the element the run names, then for the page to
    // go quiet, then for any fixed --settle (D-16).
    if (opts.waitFor) {
      const timeout = opts.waitTimeout ?? WAIT_TIMEOUT;
      try {
        await page.waitForSelector(opts.waitFor, { state: "visible", timeout });
      } catch (e) {
        const timedOut = (e as Error).name === "TimeoutError";
        found.push({ rule: "page-load", severity: "error", selector: opts.waitFor, value: timedOut ? `${opts.waitFor} not visible on ${url} after ${timeout} ms` : `${opts.waitFor} on ${url}: ${(e as Error).message.split("\n")[0]}`, expected: "the --wait-for element, visible", note: timedOut ? "check the selector, and that the page draws it (its API answered, it is signed in)" : "--wait-for takes a CSS selector" });
        return { url, width, theme, findings: found };
      }
    }
    if (!(await settled(page, open, () => lastNet)))
      found.push({ rule: "page-load", severity: "review", selector: "document", value: `still changing ${SETTLE_MAX / 1000} s after load`, expected: `no requests or DOM changes for ${SETTLE_QUIET} ms`, note: "measured anyway; give --wait-for the element that shows the page is drawn" });
    if (opts.settle) await page.waitForTimeout(opts.settle);
    await page.evaluate(() => document.fonts.ready.then(() => undefined));

    const obs = await page.evaluate(collect);
    found.push(...findings(obs, sc, width));
    found.push(...layoutFindings(await page.evaluate(collectLayout), sc.layout!));

    await page.addScriptTag({ content: axe });
    const violations = await page.evaluate(async (tags) => {
      const r = await (window as unknown as { axe: { run: (c: unknown, o: unknown) => Promise<{ violations: { id: string; help: string; impact: string; tags: string[]; nodes: { target: unknown[] }[] }[] }> } }).axe.run(document, { runOnly: { type: "tag", values: tags }, resultTypes: ["violations"] });
      // Experimental rules stay off, as in axe's own default run (label-content-name-mismatch flagged
      // the demo's "Log ud" button, whose label starts with its visible text, as 2.5.3 allows).
      return r.violations.filter((v) => !v.tags.includes("experimental")).map((v) => ({ id: v.id, help: v.help, impact: v.impact, targets: v.nodes.map((n) => n.target.map(String).join(" ")) }));
    }, AXE_TAGS);
    for (const v of violations)
      for (const target of v.targets) found.push({ rule: "axe", severity: "error", selector: target, value: v.id, expected: "no violation", note: `${v.help} (${v.impact})` });

    // consent-headers (D-77): a page with a choice list (one click gives consent or picks the org to
    // sign in with) is never framed and never stored. Checked once the page has drawn, since a console
    // may insert its rows by script. A list whose forms post to "#" (ui's own demo sample, which the
    // theme preview frames) gives nothing and is not held.
    if (await page.evaluate(() => [...document.querySelectorAll(".org-picker-choices form")].some((f) => (f.getAttribute("method") ?? "").toLowerCase() === "post" && f.getAttribute("action") !== "#"))) {
      const headers = await res.allHeaders();
      const gaps = consentHeaderGaps((name) => headers[name]);
      if (gaps.length)
        found.push({ rule: "consent-headers", severity: "error", selector: "document", value: gaps.join("; "), expected: "Content-Security-Policy frame-ancestors 'none' and Cache-Control: no-store", note: "answer a consent or org-choice page with consentHeaders() from @forspring/ui/html: never in a frame, never in a cache (D-77)" });
    }

    // Alignment (D-66), before the popover probe opens anything: measured from the top of the page,
    // first with every menu closed, then each closed menu or disclosure open on its own (D-74), with
    // the labels only a screen reader reads hidden throughout.
    await page.evaluate(() => scrollTo(0, 0));
    const aligned = await measureAlignment(page, measure, opts.redlines ? (f) => redlineCrops(page, f, width).then((cs) => { for (const c of cs) redlines.push({ url, width, theme, ...c }); }) : null);
    // Its review findings are for the red-line report, where a person sees them on a crop; a run without
    // --redlines carries only the errors (D-66).
    found.push(...aligned.filter((f) => opts.redlines || f.severity === "error").map(({ box: _box, measured: _measured, ...f }) => f));

    // Last, since it opens things: every menu and popover, one at a time (D-41).
    found.push(...(await probePopovers(page, sc.layout!)));

    for (const [u, { type, fetched }] of offOrigin) found.push({ rule: "third-party", severity: "error", selector: type, value: u, expected: `same origin as the page (${origin})${own.size > 1 ? ` or ${[...own].filter((o) => o !== origin).join(", ")} (--allow-origin)` : ""}`, note: `no fonts, analytics or CDN requests (ui-standard §3); ${fetched ? "reached through a same-origin redirect, which the browser followed" : "the audit answered it empty"}` });

    const bytes = (await Promise.all(scripts)).reduce((a, b) => a + b, 0);
    if (bytes > opts.budgetJs)
      found.push({ rule: "js-budget", severity: "error", selector: "script", value: `${kb(bytes)} gzipped in ${scripts.length} file${scripts.length === 1 ? "" : "s"}`, expected: `at most ${kb(opts.budgetJs)} (--budget-js)`, note: "console pages ship no script files by default; htmx pages about 20 KB" });
  } finally {
    await context.close();
  }
  return { url, width, theme, findings: dedupe(found) };
}

export async function audit(opts: AuditOptions, browser: Browser): Promise<AuditResult> {
  const sc = await scale(browser, opts);
  const axe = axeSource();
  const measure = measureSource();
  const redlines: Redline[] = [];
  const pages: PageResult[] = [];
  for (const url of opts.urls) for (const width of opts.widths) for (const theme of opts.themes) pages.push(await auditPage(browser, url, width, theme, sc, opts, axe, measure, redlines));
  if (opts.redlines) {
    const { html, files } = redlineReport(redlines, new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC");
    mkdirSync(opts.redlines, { recursive: true });
    writeFileSync(join(opts.redlines, "index.html"), html);
    for (const [name, png] of files) writeFileSync(join(opts.redlines, name), png);
  }
  return { ok: pages.every((p) => p.findings.every((f) => f.severity !== "error")), pages };
}

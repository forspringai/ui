import type { Browser } from "playwright";
import { type Observations, type SlotObservation } from "./page.js";
import type { AuditOptions, AuditResult, Finding, Theme } from "./types.js";
export type { AuditOptions, AuditResult, Finding, PageResult } from "./types.js";
export declare const DEFAULT_WIDTHS: number[];
export declare const DEFAULT_THEMES: Theme[];
/** Below this width the phone floors apply: primary controls 44 px tall (D-5's 560 px breakpoint, the
 * breakpoint.phone token since D-27; test/components.test.ts holds the two equal). */
export declare const PHONE_WIDTH = 560;
export declare const FAMILIES: string[];
/** The package root, from src/audit/ (tests) or dist/audit/ (the bin) alike. */
export declare function packageRoot(): string;
type Tokens = {
    products: readonly string[];
    accents: Record<string, {
        light: string;
        dark: string;
    }>;
    roles: {
        light: Record<string, string>;
    };
    radius: Record<string, number>;
    control: Record<string, number>;
    space: Record<string, number>;
    text: {
        chrome: Record<string, number>;
        content: Record<string, number>;
        marketing?: Record<string, number>;
    };
};
export declare function loadTokens(root?: string): Promise<Tokens>;
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
};
/** shadcn's data-size values that are the family's small control. */
export declare const SMALL_SIZES: string[];
/**
 * The shadcn slots the family fixes, and what it fixes on each (D-33). css/shadcn.css sets exactly
 * these values on the same slots; test/components.test.ts holds the two together. A slot not here
 * (layout parts, headers, footers) is the app's own.
 */
export declare const RICH_SLOTS: Record<string, SlotSpec>;
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
};
/** The colours a page may use: every token value, and the shades components.css mixes from roles. */
export declare function palette(browser: Browser, tokens: Tokens, root: string, product?: string): Promise<[number, number, number][]>;
/**
 * The marketing ladder's sizes and fluid ranges (D-29). A fluid step is two tokens, `<step>-min` and
 * `<step>` (D-22), and a page clamps between them, so the audit measures any px in that range.
 */
export declare function marketingLadder(marketing: Record<string, number>): {
    sizes: number[];
    ranges: [number, number][];
};
export declare function scale(browser: Browser, opts: AuditOptions, root?: string): Promise<Scale>;
export declare const ratio: (a: readonly number[], b: readonly number[]) => number;
export declare function findings(obs: Observations, sc: Scale, width: number): Finding[];
/**
 * The rich-app check (D-33): each known slot's radius, min-height and font-size against the family's
 * value, which css/shadcn.css sets. The generic rules accept any token (a 6px button, 14px input
 * text); this one knows which token each part takes.
 */
export declare function primitives(slots: SlotObservation[], t: NonNullable<Scale["rich"]>, width: number): Finding[];
/** One finding per distinct (rule, selector, value), with a count, errors first. */
export declare function dedupe(list: Finding[]): Finding[];
/** --format text: one line per page, one per finding. */
export declare function formatText(result: AuditResult): string;
/** A page is settled when no request is open and neither the network nor the DOM has changed for this long (D-16). */
export declare const SETTLE_QUIET = 300;
/** The most the audit waits for a page to settle after load before measuring it anyway. */
export declare const SETTLE_MAX = 10000;
/** How long --wait-for waits by default. */
export declare const WAIT_TIMEOUT = 30000;
export declare function audit(opts: AuditOptions, browser: Browser): Promise<AuditResult>;

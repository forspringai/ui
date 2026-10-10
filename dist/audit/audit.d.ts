import type { Browser } from "playwright";
import { type Observations } from "./page.js";
import type { AuditOptions, AuditResult, Finding, Theme } from "./types.js";
export type { AuditOptions, AuditResult, Finding, PageResult } from "./types.js";
export declare const DEFAULT_WIDTHS: number[];
export declare const DEFAULT_THEMES: Theme[];
/** Below this width the phone floors apply: primary controls 44 px tall (D-5's 560 px breakpoint). */
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
    text: {
        chrome: Record<string, number>;
        content: Record<string, number>;
    };
};
export declare function loadTokens(root?: string): Promise<Tokens>;
type Scale = {
    sizes: number[];
    h1: [number, number];
    radii: number[];
    palette: [number, number, number][];
    allowSpacing: number[];
};
/** The colours a page may use: every token value, and the shades components.css mixes from roles. */
export declare function palette(browser: Browser, tokens: Tokens, root: string, product?: string): Promise<[number, number, number][]>;
export declare function scale(browser: Browser, opts: AuditOptions, root?: string): Promise<Scale>;
export declare const ratio: (a: readonly number[], b: readonly number[]) => number;
export declare function findings(obs: Observations, sc: Scale, width: number): Finding[];
/** One finding per distinct (rule, selector, value), with a count, errors first. */
export declare function dedupe(list: Finding[]): Finding[];
/** --format text: one line per page, one per finding. */
export declare function formatText(result: AuditResult): string;
export declare function audit(opts: AuditOptions, browser: Browser): Promise<AuditResult>;

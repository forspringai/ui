import type { AuditOptions, Refusal } from "./types.js";
export declare const USAGE = "ui-audit <url...> [options]\n\nAudits each page at 1280 and 380 px wide, in light and dark, against @forspring/ui's tokens.\n\n  --budget-js <size>      script files per page, gzipped (default 0; e.g. 20kb for htmx)\n  --product <key>         accept only this product's accent (forspring, sitespring, ...)\n  --allow-spacing <list>  off-grid spacings in px to accept while migrating (e.g. 2,6,10,14,18)\n  --format json|text      json is the default (also --json); text for a person reading a build\n  --help\n\nExit codes: 0 no errors, 1 findings with severity error, 2 invalid input, 5 Playwright missing,\n64 usage.";
export type Parsed = {
    opts: AuditOptions;
    format: "json" | "text";
    help?: boolean;
} | {
    refusal: Refusal;
    exit: 2 | 64;
    format: "json" | "text";
};
export declare function parseSize(s: string): number | null;
export declare function parseArgs(argv: string[], products: readonly string[], env?: Record<string, string | undefined>): Parsed;

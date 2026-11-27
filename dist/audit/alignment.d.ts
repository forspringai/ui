import type { Finding } from "./types.js";
/** One finding as measure.js returns it. */
export type RawAlignment = {
    id: number;
    rule: string;
    where: string;
    detail: string;
    rect: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    measured: Record<string, unknown>;
};
/** An alignment finding keeps its box (document px), so a red-line report can draw on it. */
export type AlignmentFinding = Finding & {
    box: RawAlignment["rect"];
    measured: Record<string, unknown>;
};
export declare function measureSource(): string;
/** measure.js's findings as the audit's: the two gated rules as errors from 2 px, three as review, the rest dropped. */
export declare function alignmentFindings(raw: readonly RawAlignment[]): AlignmentFinding[];
/** A red-line crop: the page it came from, the finding, and the PNG (2x). */
export type Redline = {
    url: string;
    width: number;
    theme: string;
    finding: AlignmentFinding;
    png: Buffer;
    cssWidth: number;
};
type Shooter = {
    evaluate<R, A>(fn: (arg: A) => R, arg: A): Promise<R>;
    screenshot(o: {
        fullPage: boolean;
        clip: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
    }): Promise<Buffer>;
};
/** Outlines each finding's box in red (and the shared edge it missed, as a red line), crops it, and takes the marks away. */
export declare function redlineCrops(page: Shooter, found: readonly AlignmentFinding[], viewport: number): Promise<{
    finding: AlignmentFinding;
    png: Buffer;
    cssWidth: number;
}[]>;
/** The report: one self-contained page and the crops beside it (index.html, 1.png, 2.png, ...). */
export declare function redlineReport(shots: readonly Redline[], when: string): {
    html: string;
    files: Map<string, Buffer>;
};
/**
 * A shared-baseline error stands only for plain text (D-66). measure.js compares the first text of
 * each child of a flex row, so a bar's wordmark is measured against the label inside the org
 * switcher's bordered summary; a control centres its label in its own box, and that is not a fault.
 * This re-measures the row (found by its box) with text inside a control or a surface left out, and
 * returns the plain texts' baseline spread, or null when fewer than two texts of two sizes are left.
 */
export declare function plainBaselineSpread(box: RawAlignment["rect"]): number | null;
export {};

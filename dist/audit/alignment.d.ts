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
/**
 * What a sighted reader sees is what is measured (D-74). measure.js takes every text node as ink, so a
 * label only a screen reader reads (.visually-hidden: 1 px, clipped) counted as text: the toast's
 * "Luk" behind its ×, a table's "Vælg" column, the language row's "Language:". On the 0.50.0 demo
 * those were 70 of the 178 findings, and none was a fault. These hide such labels (display: none,
 * which moves nothing, since they are out of flow) while measure.js runs, and bring them back.
 */
export declare function hideUnseen(): number;
/** measure.js measures within window.__alignmentOptions.root: one details element (its index), or the body. */
export declare function measureWithin(i: number | null): void;
export declare function showUnseen(): void;
/**
 * The page's closed menus and disclosures (D-74): each closed details element that is not inside
 * another closed one. Their items are laid out but not painted, so measured with the menu closed a
 * finding had a box and a blank crop. The audit measures each with only it open.
 */
export declare function closedDetails(): number[];
export declare function setDetails({ i, open }: {
    i: number;
    open: boolean;
}): void;
/**
 * For each box, the index of the closed details element (of closedDetails' list, or of `only` when
 * given, open or not) whose content holds an element with that box, or -1. The summary is outside:
 * it shows when the details is closed.
 */
export declare function boxesInDetails({ boxes, only }: {
    boxes: {
        x: number;
        y: number;
        width: number;
        height: number;
    }[];
    only?: number;
}): number[];
/**
 * Whether each ink-centre finding's box is one the eye centres text in (D-74): a box with a surface of
 * its own (a fill, a shadow, or a border all round: a button, a chip, a badge) holding one line of
 * text. A panel's foot or sign-out row is a section under a divider, not a box: the reader weighs the
 * text against the divider and the panel's edge, which measure.js does not see (12 findings on the
 * 0.50.0 demo, none a fault); wrapped text is weighed by its first line (the diff's lines).
 */
export declare function inkBoxes(boxes: RawAlignment["rect"][]): boolean[];
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
/** A symbol beside text whose centre misses the text's first line (D-69). */
export type SymbolObservation = {
    selector: string;
    text: string;
    symbol: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    offset: number;
};
/**
 * Symbols with words (D-69): every icon (svg.icon) or signal mark (.signal-mark) that leads or trails
 * words in a row sits with its centre on the cap centre of the words' first line, the line beside it.
 * measure.js's icon-with-label sees only SVG icons in controls under 56 px with a surface of their own,
 * so it missed Peter's case (a signal's diamond above a notice's title, review of 0.47.1). The cap centre
 * is the baseline less half the cap height, from the font's own metrics, as measure.js reads it.
 */
export declare function collectSymbols(within?: number | null): SymbolObservation[];
/** A symbol 1.5 px or more off its line's cap centre is an error (D-69); under that, nothing. */
export declare function symbolFindings(obs: readonly SymbolObservation[]): AlignmentFinding[];
export {};

export interface ChartSeries {
    key: string;
    label: string;
    type: "number" | "money" | "percent";
    unit?: string;
    decimals?: number;
}
/** The `Chart` of the rich answers contract v1. */
export interface Chart {
    kind?: "chart";
    type: "line" | "bar";
    title?: string;
    x: {
        key: string;
        label: string;
        type: "date" | "text" | "number";
    };
    y: ChartSeries[];
    rows: Record<string, string | number | null>[];
    source?: string;
}
export interface ChartSvgOptions {
    theme: "light" | "dark";
    width: number;
    height: number;
    lang: "da" | "en";
}
export declare const CHART_MAX_SERIES = 4;
export declare const CHART_MAX_POINTS = 400;
export declare const CHART_FONT_FAMILY = "Archivo, Arial, sans-serif";
/** A number in the reader's marks: Danish "12.345,6", English "12,345.6". */
export declare function formatNumber(v: number, decimals: number, lang: "da" | "en"): string;
/** A date as "17. nov 2026" (da) or "17 Nov 2026" (en); text that is not an ISO date comes back as it is. */
export declare function formatDate(s: string, lang: "da" | "en"): string;
/** Ticks on 1, 2 or 5 times a power of ten, covering [lo, hi], about `target` of them. */
export declare function niceTicks(lo: number, hi: number, target: number): number[];
/**
 * The chart as an SVG document string, `width` by `height` px. See the header for what the output promises and for the font
 * the rasteriser must load.
 */
export declare function chartSvg(chart: Chart, opts: ChartSvgOptions): string;

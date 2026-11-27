import type { Product } from "./html.ts";
export type ShareImageOptions = {
    /** The page's h1. Wrapped onto at most three lines (four in the square), sized down to fit. */
    headline: string;
    /** The domain under the lockup, as people type it: "flowspring.ai", "bakery.example". */
    domain: string;
    /** A family product's lockup (the default, Forspring's). */
    product?: Product;
    /** A customer's logo instead of a product's: an https: or data:image/ URL and its aspect (width / height). */
    logo?: {
        href: string;
        aspect: number;
        alt: string;
    };
    /** A customer's name in the headline face, when they have no logo. */
    name?: string;
    /** 1200 x 630 (og:image, the default) or the 1080 x 1080 square post. */
    size?: "1200x630" | "1080x1080";
    /** Where the package's fonts/ are served, ending in "/", to load the faces with @font-face. */
    fontBase?: string;
};
export declare const ADVANCE: Record<string, number>;
/** The headline's width at a size, in px, as the condensed face sets it. */
export declare function headlineWidth(text: string, size: number): number;
/** The share image as an SVG document, light theme only (a share image never follows a viewer's theme). */
export declare function shareImage(o: ShareImageOptions): string;

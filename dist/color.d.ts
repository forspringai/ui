export declare function rgb(hex: string): [number, number, number];
/** CSS color-mix(in srgb, a share, b), as #rrggbb: gamma-encoded channels, rounded. */
export declare function mix(a: string, b: string, share: number): string;
export declare function luminance(hex: string): number;
export declare function contrast(a: string, b: string): number;
type Vision = "protan" | "deutan" | "tritan";
export declare function oklab(hex: string, vision?: Vision): [number, number, number];
export declare function lc(hex: string): [number, number];
export declare function distance(a: string, b: string, vision?: Vision): number;
export declare function oklch(hex: string): [number, number, number];
export declare function fromOklch(l: number, c: number, h: number): string | null;
export {};

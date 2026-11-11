import { type Product, type Role } from "./family.ts";
export type { Product, Role } from "./family.ts";
export type Mode = "light" | "dark";
/** The three levels (hub D-117): Forspring's look, the customer's brand, and later the Guideline level. */
export declare const LEVELS: readonly ["default", "brand", "guideline"];
export type Level = (typeof LEVELS)[number];
export declare const GUIDELINE_AVAILABLE = false;
export declare const APPROVED_FONTS: readonly string[];
export declare const RADIUS_PRESETS: readonly ["family", "square", "round"];
export declare const DENSITY_PRESETS: readonly ["family", "compact", "comfortable"];
export type RadiusPreset = (typeof RADIUS_PRESETS)[number];
export type DensityPreset = (typeof DENSITY_PRESETS)[number];
export declare const GUIDELINE_PRESETS_DRAFT: {
    readonly radius: {
        readonly square: {
            readonly button: 0;
            readonly card: 0;
            readonly input: 0;
            readonly panel: 0;
        };
        readonly round: {
            readonly button: 8;
            readonly card: 12;
            readonly input: 12;
            readonly panel: 16;
        };
    };
    readonly density: {
        readonly compact: {
            readonly height: 36;
            readonly "height-small": 28;
            readonly touch: 44;
        };
        readonly comfortable: {
            readonly height: 48;
            readonly "height-small": 36;
            readonly touch: 48;
        };
    };
};
/** #rrggbb, or a DTCG 2025.10 srgb colour value (opaque). */
export type ColorInput = string | {
    colorSpace: "srgb";
    components: [number, number, number];
    alpha?: 1;
    hex?: string;
};
export type ColorPair = {
    light: ColorInput;
    dark?: ColorInput;
};
export type ThemeFile = {
    $schema?: string;
    $description?: string;
    level: Level;
    brand?: {
        accent: ColorPair;
        tint?: ColorPair;
        /** An https: URL, a data:image/ URL or a path in the app's bundle, and the words for it. */
        logo?: {
            light: string;
            dark?: string;
            alt: string;
        };
    };
    guideline?: {
        font?: string;
        radius?: RadiusPreset;
        density?: DensityPreset;
    };
};
/** Stable refusal and warning codes; AppSpring's compiler maps them, so they never change meaning. */
export declare const CODES: readonly ["theme.schema", "theme.color.format", "theme.level.mismatch", "theme.accent.contrast", "theme.accent.label_contrast", "theme.accent.status_clash", "theme.tint.text_contrast", "theme.tint.mark_contrast", "theme.logo.alt_missing", "theme.logo.unsafe_url", "theme.guideline.unavailable", "theme.accent.dark_derived", "theme.tint.dark_derived", "theme.accent.product_close"];
export type Code = (typeof CODES)[number];
/** path is dotted ("brand.accent.light", "" for the file); fix, when given, is a value that passes there. */
export type Problem = {
    path: string;
    code: Code;
    message: string;
    fix?: string;
};
export type Validation = {
    ok: boolean;
    errors: Problem[];
    warnings: Problem[];
};
export type ValidateOptions = {
    product?: Product;
};
export type Pair = {
    light: string;
    dark: string;
};
export type CustomerTheme = {
    level: Exclude<Level, "guideline">;
    /** Every role per theme, #rrggbb: the family's values with the customer's in place. */
    roles: {
        light: Record<Role, string>;
        dark: Record<Role, string>;
    };
    /** Custom properties on the package's role names under the caller's selector; "" at the Default level. */
    css: string;
    logo: {
        light: string;
        dark: string;
        alt: string;
    } | null;
};
export type CustomerThemeOptions = ValidateOptions & {
    selector?: string;
};
export declare class ThemeRefused extends Error {
    readonly errors: Problem[];
    constructor(errors: Problem[]);
}
export declare const COMPONENT_MIXES: readonly ["--_link: color-mix(in srgb, var(--primary) 70%, var(--foreground));", "--_hover: color-mix(in srgb, var(--primary) 80%, light-dark(var(--background), var(--foreground)));", "--_shadow: color-mix(in srgb, light-dark(var(--foreground), var(--background)) 25%, transparent);"];
/** Check a theme file (parsed, or its JSON text). ok when there are no errors; warnings never refuse. */
export declare function validateTheme(file: unknown, options?: ValidateOptions): Validation;
/** A valid theme's values on the package's roles, and its CSS under options.selector. Throws ThemeRefused on an invalid file. */
export declare function customerTheme(file: unknown, options?: CustomerThemeOptions): CustomerTheme;

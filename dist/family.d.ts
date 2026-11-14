export type Role = "background" | "foreground" | "mark" | "body-foreground" | "card" | "card-foreground" | "popover" | "popover-foreground" | "muted" | "muted-foreground" | "secondary" | "secondary-foreground" | "accent" | "accent-foreground" | "border" | "input" | "primary" | "primary-foreground" | "ring" | "success" | "warning" | "danger" | "destructive" | "signal-ok" | "signal-warn" | "signal-down" | "signal-off" | "chart-1" | "chart-2" | "chart-3" | "chart-4" | "chart-5" | "chart-6" | "chart-7" | "chart-8" | "chart-1-tint" | "chart-2-tint" | "chart-3-tint" | "chart-4-tint" | "chart-5-tint" | "chart-6-tint" | "chart-7-tint" | "chart-8-tint";
export type Product = "forspring" | "spring" | "sitespring" | "dataspring" | "appspring" | "pulsespring";
type Pair = {
    readonly light: string;
    readonly dark: string;
};
/** Every role's value per theme, #rrggbb; primary, ring and mark are Forspring's. */
export declare const ROLES: {
    readonly light: Readonly<Record<Role, string>>;
    readonly dark: Readonly<Record<Role, string>>;
};
/** Each product's own roles (primary, primary-foreground, ring, mark) per theme. */
export declare const PRODUCTS: Readonly<Record<Product, Readonly<Record<"primary" | "primary-foreground" | "ring" | "mark", Pair>>>>;
export {};

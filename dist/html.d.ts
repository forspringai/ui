declare const BRAND: unique symbol;
export declare class Html {
    readonly value: string;
    readonly [BRAND] = true;
    constructor(value: string);
    toString(): string;
}
/** Text, markup from these helpers, lists of either, or nothing (null, undefined, false). */
export type Content = string | number | Html | null | undefined | false | readonly Content[];
/** Escapes text for an element's content or a quoted attribute. */
export declare const esc: (s: string) => string;
/** Vouches for a string as HTML. Never pass it anything a person or another system wrote. */
export declare const raw: (s: string) => Html;
/** A template whose interpolations are escaped unless they are Html. */
export declare function html(strings: TemplateStringsArray, ...values: Content[]): Html;
export declare function safeHref(href: string): string;
export type Lang = "da" | "en";
/** The suite's products (hub D-90); the same list as tokens.js's products, checked by a test. */
export type Product = "forspring" | "sitespring" | "dataspring" | "appspring" | "pulsespring";
export type Theme = "light" | "dark";
/**
 * The @font-face rules, with the font files under `base` ("/assets/fonts/" when a product serves the
 * package's fonts/ there, "../fonts/" for dist/fonts.css). `google: true` adds Roboto Medium for the
 * Google button.
 */
export declare function fontFaces(base: string, opts?: {
    google?: boolean;
}): string;
/** Roboto Medium alone, for the Google button (google-button.css carries it). */
export declare const googleFontFace: (base: string) => string;
export declare const mark: () => Html;
export type Link = {
    label: string;
    href: string;
    lang?: Lang;
};
export type ShellOptions = {
    lang: Lang;
    /** The page's own title; " · Forspring" is added. */
    title: string;
    /** Sets data-product on <html>; unset means Forspring. */
    product?: Product;
    /** An explicit theme; unset follows the system. */
    theme?: Theme;
    /** The product's name after the wordmark: "konto", "SiteSpring". */
    productLabel: string;
    /** Where the wordmark leads, and its accessible name. */
    home?: string;
    homeLabel?: string;
    /** Stylesheets and anything else for <head>: raw(`<style>…</style>`) or <link> tags. */
    head?: Content;
    /** Other products the person can switch to; renders a details menu after the wordmark. */
    switcher?: {
        label: string;
        items: (Link & {
            current?: boolean;
        })[];
    };
    /** Controls in the bar after the switcher, such as an organisation select. They take the small size, 32px (D-14). */
    controls?: Content;
    /** The signed-in person: their address, and markup for signing out (a form with its CSRF token). */
    user?: {
        email: string;
        signOut?: Content;
    };
    /** The product's own menu: a sidebar on a wide screen, folded under "Menu" on a phone (D-13). */
    menu?: Menu;
    /** A single card in a narrow column: sign-in and refusals. */
    narrow?: boolean;
    bodyClass?: string;
    footer?: Link[];
    body: Content;
};
/** A monitored thing's state, as a traffic light: up, late, down, or not being judged (D-13). */
export type Signal = "ok" | "warn" | "down" | "off";
export type MenuItem = Link & {
    /** true: this page. "parent": the page is under this item (a check under its project). */
    current?: boolean | "parent" | undefined;
    /** A short badge after the label ("2"), with a signal mark before it and words for a screen reader. */
    badge?: {
        text: string;
        signal?: Signal | undefined;
        label?: string | undefined;
    } | undefined;
};
export type MenuGroup = {
    label?: string;
    items: MenuItem[];
};
export type Menu = {
    /** The menu's accessible name: "Hovedmenu", "Main menu". */
    label: string;
    /** The phone's fold: "Menu". */
    toggle: string;
    /** What the menu is for (an organisation) and where else the person can go; a switcher when more than one. */
    context?: {
        label: string;
        name: string;
        items?: (Link & {
            current?: boolean;
        })[];
    };
    groups: MenuGroup[];
};
/** A whole page: doctype, head, skip link, bar, the menu when there is one, main and footer. */
export declare function shell(o: ShellOptions): Html;
export type ButtonOptions = {
    label: Content;
    variant?: "primary" | "ghost" | "danger";
    small?: boolean;
    wide?: boolean;
    /** A link styled as a button; otherwise a <button>. */
    href?: string;
    type?: "submit" | "button" | "reset";
    name?: string;
    value?: string;
    /** The accessible name, when the visible label alone is ambiguous ("Log ud" on which device). */
    ariaLabel?: string;
    disabled?: boolean;
};
export declare function button(o: ButtonOptions): Html;
export type FieldOptions = {
    label: Content;
    name: string;
    /** Defaults to the name. Hint and error ids derive from it. */
    id?: string;
    type?: string;
    value?: string;
    hint?: Content;
    error?: Content;
    required?: boolean;
    autocomplete?: string;
    placeholder?: string;
    /** input (default), textarea, or select with options. */
    control?: "input" | "textarea" | "select";
    options?: {
        value: string;
        label: string;
        selected?: boolean;
    }[];
};
/** A label, its control, a hint and an error, wired with aria-describedby and aria-invalid. */
export declare function field(o: FieldOptions): Html;
export type Tone = "info" | "success" | "warning" | "error";
/** What just happened. Errors and warnings are alerts; the rest are polite status messages. */
/**
 * What just happened, in words. `signal` instead of `tone` reports a monitored state (D-13): the
 * neutral card with the signal's colour as its edge rule and its mark before the title.
 */
export declare function notice(o: {
    tone?: Tone;
    signal?: Signal;
    title?: Content;
    text: Content;
}): Html;
/** A monitored thing's state: the signal's mark (a shape as well as a colour) and the word (D-13). */
export declare function signal(text: Content, s: Signal): Html;
/** Where the page sits: its parents as links, before the h1. The page itself is the h1, not a crumb. */
export declare function crumbs(label: string, items: Link[]): Html;
export declare function tag(text: Content, tone?: "primary" | "success" | "warning" | "danger"): Html;
export declare function card(body: Content): Html;
export type ListItem = {
    name: Content;
    meta?: Content;
    action?: Content;
};
/** The account's list: a name, an optional meta line under it, and an action at the end. */
export declare function list(items: ListItem[]): Html;
export type Column = {
    label: Content;
    num?: boolean;
    phoneHide?: boolean;
};
/**
 * A table in a scrolling frame. The frame is a labelled region a keyboard can reach (tabindex 0),
 * so a table wider than a phone is scrolled, never clipped.
 */
export declare function table(o: {
    label: string;
    caption?: Content;
    columns: Column[];
    rows: Content[][];
}): Html;
export type SwitchOptions = {
    checked: boolean;
    /** The accessible name: what the switch turns on ("SiteSpring for Mette"). */
    label: string;
    /** The visible state words. */
    on?: string;
    off?: string;
    name?: string;
    value?: string;
};
/** A submit button[role=switch]; the server flips it and redraws the page (no script). */
export declare function switchButton(o: SwitchOptions): Html;
export type StateOptions = {
    kind: "empty" | "loading" | "failed";
    title: Content;
    text?: Content;
    action?: Content;
};
/**
 * Empty (nothing there, or nothing matching a filter: say which), loading (the shape of what is
 * coming, announced politely) or failed (the read failed; never claims there is nothing).
 */
export declare function state(o: StateOptions): Html;
/** The divider between two ways in: "eller". */
export declare const orDivider: (text: Content) => Html;
/** Google's button (google-button.css), as a submit button for the caller's form. */
export declare function googleButton(label: Content): Html;
export {};

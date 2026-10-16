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
/** The suite's products (hub D-90, D-101); the same list as tokens.js's products, checked by a test. */
export type Product = "forspring" | "spring" | "sitespring" | "dataspring" | "appspring" | "pulsespring";
/** Each product's name as its wordmark writes it (hub D-101): never lowercase, never split. */
export declare const PRODUCT_NAMES: Record<Product, string>;
/** This package's version, the same as package.json's (a test checks), for the default brand path. */
export declare const VERSION = "0.10.0";
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
export declare const MARK_VIEWBOX = "-184 -160 368 368";
export declare const mark: () => Html;
/** The doll's paths alone, classes fill and coil, for the brand files. */
export declare const MARK_PATHS: string;
/** The page's icons, each a URL. shell() writes them from `brandBase` unless `favicon` names them. */
export type Favicon = {
    svg: string;
    png32?: string;
    png16?: string;
    appleTouch?: string;
};
/** Where shell() expects the package's dist/brand/ by default: /assets/ui/<version>/brand/, the path
 *  products copy the package's files to (account D-20), versioned so a year-long cache stays right. */
export declare const DEFAULT_BRAND_BASE = "/assets/ui/0.10.0/brand/";
/** A product's favicon files under `base`, the URL where dist/brand/ is served (ending in /). */
export declare function faviconFor(product: Product, base?: string): Favicon;
/**
 * The <link> tags for a favicon. The PNGs carry sizes and come first, so a browser that reads SVG
 * icons takes the SVG (it has the dark-mode doll) and the rest take a PNG.
 */
export declare function faviconLinks(f: Favicon): Html;
export type Link = {
    label: string;
    href: string;
    lang?: Lang;
};
/** The suite's one role set (hub D-96), a person's place in an organisation. */
export type Role = "owner" | "admin" | "member" | "viewer";
export declare const ROLES: readonly Role[];
/** The roles as words inside a sentence or beside a name, as the account writes them. */
export declare const ROLE_NAMES: Record<Lang, Record<Role, string>>;
/** An organisation as the bar and the pages show it: the customer's name and your role there. */
export type Org = {
    slug: string;
    name: string;
    role: Role;
};
/** The bar's org switcher (D-17). */
export type BarOrg = {
    /** The organisation this page is in. Its role shows in the user menu's head. */
    current: Org;
    /** Every organisation the person has this product in, the current one too. The switcher shows only
     *  when there is more than one; `href` overrides the link that keeps the person's place. */
    orgs?: (Org & {
        href?: string;
    })[];
    /** This page's path, so switching keeps the person's place: /o/noon/runs becomes /o/spekta/runs. */
    path?: string;
    /** "Manage people in <org>": the account's people page, for owners and admins. */
    peopleHref?: string;
};
/** The bar's product switcher: the other products this organisation has, each opening the same org. */
export type BarProducts = {
    items: {
        name: string;
        href: string;
        current?: boolean;
    }[];
    /** "All of <org> at Forspring": the account's page for the organisation. */
    accountHref: string;
};
/** The user menu: an avatar button with the person, their role here, the account, language, sign out. */
export type UserMenu = {
    name: string;
    email: string;
    /** "Your Forspring account". */
    accountHref: string;
    /** "Agents and keys in <org>": the account's agents page, filtered to this product. */
    agentsHref?: string;
    /** This page in each language; the page's own language is marked. */
    languages?: Record<Lang, string>;
    /** The product's sign-out: a POST to `action` with `fields` as hidden inputs (its CSRF token). It ends
     *  the product's session and sends the browser to the account's end-session (hub D-99). */
    signOut: {
        action: string;
        fields?: Record<string, string>;
    };
};
/** The bar alone: for shell(), and for a rich app's own frame (the React Bar renders the same). */
export type BarOptions = {
    lang: Lang;
    /** Sets the brand: the product's doll and name, or Forspring's ink doll and name (D-18). Unset means Forspring. */
    product?: Product;
    /** The product's name. A product's pages show its doll in its accent and this name as the wordmark
     *  ("SiteSpring"), with no Forspring mark or name (hub D-98, D-101: a product is its own brand,
     *  like Word with an Office account). Forspring's own pages (product unset or "forspring") show the
     *  ink doll, "Forspring" and this label ("konto"). */
    productLabel: string;
    /** Where the wordmark leads, and its accessible name. Defaults to the org's home, /o/<org>/, with an org. */
    home?: string;
    homeLabel?: string;
    /** The org switcher (D-17). */
    org?: BarOrg;
    /** The product switcher (D-17). */
    products?: BarProducts;
    /** The user menu (D-17). */
    userMenu?: UserMenu;
    /** @deprecated Use `products`. A details menu of links after the wordmark. */
    switcher?: {
        label: string;
        items: (Link & {
            current?: boolean;
        })[];
    };
    /** Controls in the bar after the switchers, such as a search. They take the small size, 32px (D-14). */
    controls?: Content;
    /** @deprecated Use `userMenu`. The person's address and markup for signing out, in the bar itself. */
    user?: {
        email: string;
        signOut?: Content;
    };
};
export type ShellOptions = BarOptions & {
    /** The page's own title; " · <product name>" is added (" · Forspring" on Forspring's own pages). */
    title: string;
    /** An explicit theme; unset follows the system. */
    theme?: Theme;
    /** The URL where the package's dist/brand/ is served, ending in "/"; shell() links the product's
     *  favicon from there (hub D-101). Default DEFAULT_BRAND_BASE, /assets/ui/<version>/brand/. */
    brandBase?: string;
    /** The favicon's files, when they are not the package's under brandBase; false leaves the links out. */
    favicon?: Favicon | false;
    /** Stylesheets and anything else for <head>: raw(`<style>…</style>`) or <link> tags. */
    head?: Content;
    /** The product's own menu: a sidebar on a wide screen, folded under "Menu" on a phone (D-13). */
    menu?: Menu;
    /** A single card in a narrow column: sign-in and refusals. */
    narrow?: boolean;
    bodyClass?: string;
    footer?: Link[];
    body: Content;
};
/**
 * The same page in another organisation: /o/noon/runs?x=1 becomes /o/spekta/runs?x=1, and a path
 * outside /o/ becomes the org's home. A page that does not exist there is the product's to send home.
 */
export declare function orgPath(path: string, slug: string): string;
/** Up to two letters for the avatar: the first and last names' initials, else the address's first. */
export declare function initials(name: string, email?: string): string;
/** The bar: wordmark, org switcher, product switcher, controls, user menu. The menus are details
 *  elements, so they open with no script. */
export declare function bar(o: BarOptions): Html;
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

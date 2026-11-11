import { ICON_NAMES, type IconName } from "./icons/lucide.ts";
export { ICON_NAMES, type IconName };
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
export declare const VERSION = "0.17.0";
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
/**
 * One of the package's icons (ICON_NAMES, a subset of Lucide, ISC) as inline SVG: a 24 by 24 grid,
 * one stroke weight, in currentColor, so it takes the colour of the text around it and 1em of its
 * size (.icon). Nothing is fetched: the paths are in the markup.
 *
 * Without a label it is decoration, aria-hidden, and the words beside it carry the meaning. With
 * one it is an image with that name (role="img"), for an icon that stands alone.
 */
export declare function icon(name: IconName, o?: {
    label?: string;
}): Html;
/** The page's icons, each a URL, and the web manifest (D-28). shell() writes them from `brandBase` unless `favicon` names them. */
export type Favicon = {
    svg: string;
    png32?: string;
    png16?: string;
    appleTouch?: string;
    manifest?: string;
};
/** Where shell() expects the package's dist/brand/ by default: /assets/ui/<version>/brand/, the path
 *  products copy the package's files to (account D-20), versioned so a year-long cache stays right. */
export declare const DEFAULT_BRAND_BASE = "/assets/ui/0.17.0/brand/";
/** A product's favicon files under `base`, the URL where dist/brand/ is served (ending in /). */
export declare function faviconFor(product: Product, base?: string): Favicon;
/**
 * The <link> tags for a favicon and the web manifest. The PNGs carry sizes and come first, so a
 * browser that reads SVG icons takes the SVG (it has the dark-mode doll) and the rest take a PNG.
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
    /** An icon before the label (D-26), hidden from a screen reader: the label says it. For a button
     *  that is only an icon, give the words as `ariaLabel` and leave `label` empty. */
    icon?: IconName;
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
    /** An input's pattern, a regular expression the whole value must match; the browser blocks the
     *  form's submit until it does. The browser reads it with the v flag, so escape it (regexEscape). */
    pattern?: string;
    /** The words a browser adds to its own message when the pattern does not match. */
    title?: string;
    /** "off" for a value that must be typed exactly (a name to confirm), so a phone neither
     *  capitalizes nor corrects it. */
    autocapitalize?: "off" | "none" | "sentences" | "words" | "characters";
    autocorrect?: "on" | "off";
    spellcheck?: boolean;
    /** Beside the label, outside it: a tooltip() with more about the field (D-26). Not for what a
     *  person needs to fill it in; that is the hint, which is always shown. */
    help?: Content;
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
/** A header that sorts: a link to the page in that order, and the order it is in now, if any. */
export type ColumnSort = {
    href: string;
    dir?: "asc" | "desc" | undefined;
};
export type Column = {
    label: Content;
    num?: boolean;
    phoneHide?: boolean;
    sort?: ColumnSort | undefined;
};
/** One page of a list: rows `from` to `to` (1-based, inclusive; 0 and 0 when there are none) of
 *  `total`, how many pages there are, and the pages before and after this one when they exist. It
 *  spreads into pagination()'s options. */
export type Page = {
    page: number;
    from: number;
    to: number;
    total: number;
    pages: number;
    prev?: number;
    next?: number;
};
/**
 * The paging arithmetic, so a product's query and its links agree: page `page` (1-based) of `total`
 * rows, `size` to a page. A page before the first is the first and one past the end is the last, so
 * an old link or a hand-typed ?page=999 still shows rows; no rows is one empty page.
 */
export declare function pageOf(total: number, page: number, size: number): Page;
export type PaginationOptions = {
    lang: Lang;
    /** The rows shown, 1-based and inclusive, of `total` (pageOf() gives all three). The words are
     *  "1–6 af 248" with an en dash, the range sign in both languages. */
    from: number;
    to: number;
    total: number;
    /** The previous and next pages. Unset at an end: the word stays, marked unavailable. */
    prevHref?: string | undefined;
    nextHref?: string | undefined;
    /** The nav's accessible name. Default "Sider" / "Pages"; name the list when a page has two. */
    label?: string | undefined;
    /** The order the rows are in, after the range: "1–6 af 248, værst først". */
    order?: Content;
};
/**
 * "1–6 af 248" and Previous and Next as links, in a labelled nav. At an end the word stays where it
 * was, as a span marked aria-disabled, so the row does not shift and a screen reader hears that there
 * is no next page rather than finding nothing. The links carry rel prev and next.
 */
export declare function pagination(o: PaginationOptions): Html;
export type TableSearch = {
    /** The query parameter. Default "q". */
    name?: string;
    /** What the person searched for, back in the box. */
    value?: string;
    /** "Søg i 248 tjek". */
    placeholder?: string;
    /** The field's label. Default the placeholder, else "Søg"; when it says what the placeholder says
     *  it is visually hidden, since the placeholder already shows it. */
    label?: string;
    /** Where the form goes. Default this page (no action attribute), so the query string is the state. */
    action?: string;
};
/** A filter: a link to the page with that filter, its count, and whether it is the one in force. */
export type TableFilter = {
    label: Content;
    count?: number;
    href: string;
    current?: boolean;
};
export type TableControls = {
    lang: Lang;
    /** A GET form above the table. It replaces the query string, so `keep` carries the rest. */
    search?: TableSearch;
    /** Links styled as chips beside the search; the current one is aria-current. */
    filters?: TableFilter[];
    /** The order the rows are in, said in the footer: "værst først". Without it, a column whose sort
     *  has a `dir` is said instead ("sorteret efter Oppetid, faldende"). */
    sort?: {
        label: Content;
    };
    /** The footer's range and Previous and Next: options for pagination(), or its result. */
    paging?: Omit<PaginationOptions, "lang" | "order"> | Html;
    /** The other query parameters in force (the filter, the sort), as hidden inputs in the search
     *  form, so a search keeps them. Leave the page out: a new search starts on page 1. */
    keep?: Record<string, string>;
    /** Drawn in place of the table when there are no rows: a state() saying nothing matches, and which. */
    empty?: Content;
};
export type TableOptions = {
    label: string;
    caption?: Content;
    columns: Column[];
    rows: Content[][];
    /** Prefix for the search field's id, unique on the page. Default "table". */
    id?: string;
    /** Search, filters, the stated order and paging around the table (D-25). */
    controls?: TableControls;
};
/**
 * A table in a scrolling frame. The frame is a labelled region a keyboard can reach (tabindex 0),
 * so a table wider than a phone is scrolled, never clipped.
 *
 * With `controls` (D-25) it is a list at scale: a search form and filter chips above, the order and
 * the paging below. All of it is a GET form and links, so it works with no script and the URL holds
 * the state; the server searches, filters, sorts and slices, and draws the page it was asked for.
 */
export declare function table(o: TableOptions): Html;
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
/** Escapes a string for a RegExp, so it matches only itself. Browsers compile an input's pattern with
 *  the v flag, where escaping anything but these characters is a syntax error (and the browser then
 *  ignores the pattern), so this escapes exactly the syntax characters and "/". */
export declare const regexEscape: (s: string) => string;
export type DialogOptions = {
    /** The dialog's id, unique on the page; the title's id and the close form's derive from it. */
    id: string;
    title: Content;
    body: Content;
    /** The safe action's words ("Luk", "Behold"): first in the footer, a ghost button that closes the
     *  dialog through a form method="dialog", and the one focused when it opens. */
    close: Content;
    /** The other actions, after the close button. */
    actions?: Content;
    /** One POST form around the body and the actions, so a field in the body is sent with the
     *  action's button: `fields` are hidden inputs (the CSRF token). */
    form?: {
        action: string;
        fields?: Record<string, string>;
    };
    /** A choice that needs an answer before anything else (a destructive confirm): role alertdialog,
     *  described by the body, so a screen reader reads what is lost with the title. */
    alert?: boolean;
    /** Draw it as the no-script fallback page instead: a section in place, the title the page's h1,
     *  and the close button a link to `closeHref`. A trigger's href leads here when script is off. */
    page?: {
        closeHref: string;
    };
};
/**
 * A native <dialog>, opened as a modal by dialogScript() from a dialogTrigger() (or by the product's
 * own showModal()). What the browser does and this package relies on: showModal() makes the rest of
 * the page inert, puts focus on the autofocus element (the close button, the safe action), Escape
 * closes it, and a form method="dialog" closes it with no request. The script returns focus to the
 * trigger on close, which browsers do too but Safari not after a mouse click on a link.
 */
export declare function dialog(o: DialogOptions): Html;
/** The button that opens a dialog: a link to the no-script confirm page (`href`), which
 *  dialogScript() turns into showModal() on the dialog with id `dialog`. */
export declare function dialogTrigger(o: {
    dialog: string;
    href: string;
    label: Content;
    variant?: ButtonOptions["variant"];
    small?: boolean;
}): Html;
/**
 * The triggers' script, as text: put it on the page once (dialogScript(nonce) writes the tag), or
 * bundle it. It listens on the document, so dialogs React draws later open too. Without it, or in a
 * browser with no <dialog>, the trigger is the link it is and the server's confirm page answers. A
 * modified click (a new tab) is left to the link. On close it puts focus back on the trigger and
 * resets the dialog's forms, so a half-typed name is gone when it opens again. A click on the
 * backdrop does not close it: a destructive choice is left by a button or Escape, never by a stray
 * click.
 */
export declare const DIALOG_SCRIPT = "(() => {\n  if (typeof HTMLDialogElement !== \"function\") return;\n  document.addEventListener(\"click\", (e) => {\n    const t = e.target instanceof Element ? e.target.closest(\"[data-dialog-open]\") : null;\n    if (!t || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;\n    const d = document.getElementById(t.getAttribute(\"data-dialog-open\"));\n    if (!(d instanceof HTMLDialogElement) || d.open) return;\n    e.preventDefault();\n    d.addEventListener(\"close\", () => {\n      d.querySelectorAll(\"form\").forEach((f) => f.reset());\n      t.focus();\n    }, { once: true });\n    d.showModal();\n  });\n})();";
/** DIALOG_SCRIPT in a <script> tag, with the page's CSP nonce when it has one. */
export declare function dialogScript(nonce?: string): Html;
export type ConfirmDestructiveOptions = {
    lang: Lang;
    /** The dialog's id, unique on the page; a dialogTrigger() names it. */
    id: string;
    /** The question, naming the thing: "Slet banegaarden.dk?". */
    title: Content;
    /** What is lost, each with its count: ["181 pages", "4 forms", "62 redirects"]. Up to four are one
     *  sentence ("This removes 181 pages, 4 forms and 62 redirects."), more a list. */
    losses?: Content[];
    /** What else happens, after the losses: "The domain stops answering at once." */
    text?: Content;
    /** Adds "It can't be undone." / "Det kan ikke fortrydes." */
    irreversible?: boolean;
    /** The name the person must type before the browser lets the form submit. The server checks it
     *  again: the browser's check is a speed bump, not a guard. */
    confirmName?: string;
    /** The typed name's input name. Default "confirm". */
    confirmField?: string;
    /** Overrides the field's label, "Skriv <name> for at bekræfte". */
    nameLabel?: Content;
    /** Where the destructive POST goes, and its hidden fields (the CSRF token), as connectPanel's createKey. */
    action: string;
    fields?: Record<string, string>;
    /** The safe action. Default "Behold" / "Keep"; better with the thing: "Behold hjemmesiden". */
    keepLabel?: Content;
    /** The destructive action, verb first: "Slet hjemmesiden". */
    confirmLabel: Content;
    /** The no-script fallback page, Keep a link back to `keepHref` (see dialog()). */
    page?: {
        keepHref: string;
    };
};
/**
 * A destructive action's confirm, on dialog(): it says what is lost, whether it can be undone, can
 * ask for the thing's name, and puts the safe action first and in focus. With `confirmName`, the
 * input's pattern is that exact name and it is required, so the browser holds the submit until it
 * matches, with no script, and the destructive button looks unavailable until then (CSS :has()).
 *
 * The server must check the name again, and the CSRF token, before it deletes anything: a pattern
 * is the browser's, and a request can come from anywhere.
 */
export declare function confirmDestructive(o: ConfirmDestructiveOptions): Html;
/** What a toast reports: done, a warning, a failure, or a fact. Not notice()'s Tone: a toast says
 *  danger, as tag() does, because it reports something that went wrong elsewhere, not a form's error. */
export type ToastTone = "success" | "warning" | "danger" | "info";
export type ToastOptions = {
    lang: Lang;
    /** Default "info". A danger toast is an alert, read out at once; the rest are polite status. */
    tone?: ToastTone;
    /** What happened, in a sentence: "Ændringerne er gemt." */
    text: Content;
    /** This page without the toast: its URL with the flash parameter dropped (/o/noon/sites, not
     *  /o/noon/sites?gemt=1), or the same URL when the flash was a one-time cookie. Dismiss is a link
     *  here, so it works with no script; toastScript() makes it instant. */
    dismissHref: string;
    /** One thing to do about it, a link: "Fortryd", "Se fakturaen". A toast with one never hides itself. */
    action?: {
        label: Content;
        href: string;
    };
    /** Unique on the page. Default "toast"; give each one in a toastRegion() its own. */
    id?: string;
};
/**
 * The message after a POST and its 303 (D-26): "Ændringerne er gemt." It floats at the bottom of the
 * window, with the tone's icon and, for a screen reader, its word, and a Dismiss link to this page
 * without it. Draw it early in the page (at the start of main), so a screen reader reaching the page
 * meets it first: a live region on a page that has just loaded is read in order, not announced.
 *
 * Not notice(): a notice is part of the page and stays as long as what it says is true (a form's
 * errors, a trial running out); a toast reports what the last request did and goes.
 */
export declare function toast(o: ToastOptions): Html;
/** Several toasts stacked at the bottom of the window, newest last, in a region named "Beskeder" /
 *  "Messages" that a screen reader can jump to. */
export declare function toastRegion(o: {
    lang: Lang;
    toasts: Content;
    label?: string;
}): Html;
/**
 * The toasts' optional script, as text (toastScript(nonce) writes the tag). Dismiss removes the toast
 * where it is and puts its link's URL in the address bar (history.replaceState), so a reload does
 * not bring it back; a modified click is left to the link. A success or info toast with no action
 * hides itself after 8 seconds, waiting while the pointer or focus is on it. A danger or warning
 * toast never does, whatever its markup says: a failure stays until a person has read it. Under
 * prefers-reduced-motion nothing hides by itself, and Dismiss still works.
 */
export declare const TOAST_SCRIPT = "(() => {\n  const gone = (t, href) => {\n    const region = t.parentElement;\n    t.remove();\n    if (region && region.classList.contains(\"toast-region\") && !region.querySelector(\".toast\")) region.remove();\n    if (href) try { history.replaceState(history.state, \"\", href); } catch {}\n  };\n  document.addEventListener(\"click\", (e) => {\n    const a = e.target instanceof Element ? e.target.closest(\"[data-toast-dismiss]\") : null;\n    if (!a || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;\n    const t = a.closest(\".toast\");\n    if (!t) return;\n    e.preventDefault();\n    gone(t, a.getAttribute(\"href\"));\n  });\n  if (matchMedia(\"(prefers-reduced-motion: reduce)\").matches) return;\n  for (const t of document.querySelectorAll(\".toast[data-toast-autohide]\")) {\n    if (t.classList.contains(\"toast-danger\") || t.classList.contains(\"toast-warning\") || t.getAttribute(\"role\") === \"alert\") continue;\n    let timer = 0;\n    const start = () => {\n      clearTimeout(timer);\n      timer = setTimeout(() => {\n        if (t.matches(\":hover, :focus-within\")) return;\n        gone(t, t.querySelector(\"[data-toast-dismiss]\")?.getAttribute(\"href\"));\n      }, 8000);\n    };\n    const wait = () => clearTimeout(timer);\n    t.addEventListener(\"pointerenter\", wait);\n    t.addEventListener(\"focusin\", wait);\n    t.addEventListener(\"pointerleave\", start);\n    t.addEventListener(\"focusout\", start);\n    start();\n  }\n})();";
/** TOAST_SCRIPT in a <script> tag, with the page's CSP nonce when it has one. */
export declare function toastScript(nonce?: string): Html;
export type TooltipOptions = {
    /** The tooltip's id, unique on the page: the trigger opens it and is described by it. */
    id: string;
    /** What the person presses, inside a button: icon("help-circle"), or a word. */
    trigger: Content;
    /** The trigger's accessible name, when the trigger is an icon: "Mere om CVR-nummer". */
    label?: string;
    /** A sentence or two, plain text and inline markup. */
    text: Content;
};
/**
 * A short explanation beside something (D-26): a button and a native popover. Pressing the button,
 * or tapping it, shows the text (popovertarget, popovertargetaction="show"); a press elsewhere or
 * Escape hides it, all with no script. Where the browser has interest invokers (interestfor,
 * Chromium only), pointing at it or focusing it shows it too, and the browser lets Escape hide that.
 * The trigger is described by the text (aria-describedby), which is in the DOM throughout, so a
 * screen reader reads it with the button even closed.
 *
 * A tooltip never holds the only copy of something a person needs to act: what a field needs is its
 * hint, and what a button does is its label. A tooltip is for the curious, so it is fine to miss it.
 */
export declare function tooltip(o: TooltipOptions): Html;
/** A moment: a Date, written in the page's language in Copenhagen's time (as the standard pages
 *  write one), a Date with the caller's own words for it ("om 2 timer"), or words alone. */
export type When = Date | string | {
    at: Date;
    label: Content;
};
/** A decision that has been made: it replaces the buttons on every copy of the request (Spring's
 *  D-52: one decision closes them all), so nobody approves something already rejected. */
export type ApprovalOutcome = {
    status: "approved" | "rejected" | "expired";
    /** Who decided: "Peter Engelbrecht". Not for an expired request. */
    by?: Content;
    at?: When;
    /** What follows from it, in Spring's words: "Påmindelserne er sendt." */
    note?: Content;
};
/** One short fact about what approving does. A warning ("Kan ikke fortrydes") takes a triangle and
 *  a danger a diamond, in the status colour, beside words that say it. */
export type ApprovalEffect = {
    text: Content;
    tone?: "warning" | "danger";
};
export type ApprovalOptions = {
    lang: Lang;
    /** The section's id, unique on the page; the title's id derives from it. */
    id: string;
    /** The agent asking: "Spring". */
    agent: string;
    /** The person it acts for: "Maria (Økonomi)", shown as "Maria (Økonomi) via Spring". */
    onBehalfOf?: Content;
    /** What it wants to do, the section's heading: "Spring vil sende 14 betalingspåmindelser". */
    title: Content;
    /** A sentence under the title: what it prepared and what it waits for. */
    summary?: Content;
    /** The title's heading level: 2 by default, 3 inside a section that has its own h2. */
    headingLevel?: 2 | 3;
    /** When the request lapses. Hidden once it is decided. */
    expires?: When;
    /** The reason, and the rule or skill it follows, linked: "Følger skillen Rykker for forfaldne
     *  fakturaer, trin 3". */
    why?: {
        text: Content;
        links?: Link[];
    };
    /** What it changes, one item each: an item is one Content, or an array of parts written with " · "
     *  between them (["Nordkraft ApS #2041", "33 dage", "12.400 kr."]). The first `show` (3) are drawn,
     *  then "+k flere", where k is `total` (default: the items' count) less those drawn, linked to
     *  `moreHref`. So a caller can pass only the first few of a long list. */
    changes: {
        items: Content[];
        total?: number;
        show?: number;
        moreHref?: string;
    };
    /** What approving costs or touches: "Sender 14 mails fra finance@", "Kan ikke fortrydes". */
    effects?: ApprovalEffect[];
    /** POST forms, each with its hidden fields (the CSRF token and the request's id), as confirmDestructive's. */
    approve: {
        label?: Content;
        action: string;
        fields?: Record<string, string>;
    };
    /** A link to change the request before deciding. */
    edit?: {
        label?: Content;
        href: string;
    };
    reject?: {
        label?: Content;
        action: string;
        fields?: Record<string, string>;
    };
    /** "Se udkastet": the thing itself (the mails, the page) as it would go out. */
    draftHref?: string;
    /** An explain() trail, drawn after the facts. */
    explain?: Content;
    /** Decided already: the outcome line replaces the buttons and the expiry. */
    outcome?: ApprovalOutcome;
};
/**
 * An agent's request for approval, as a section a person can decide on: who asks and for whom, what
 * it wants to do, why (and the rule it follows), what changes, what approving does, when it lapses,
 * and the decision as POST forms. The facts are a description list, one row per fact, in the order
 * and words of Spring's Slack card, so the web and the channel say the same thing.
 *
 * Approve and reject post to the product, which checks the CSRF token, that the person may decide,
 * and that nobody decided first, before it acts: a page can be old, and a request can come from
 * anywhere. Once decided, every copy draws `outcome` in place of the buttons.
 */
export declare function approval(o: ApprovalOptions): Html;
/** A field that changes: its name and its value before and after. A missing value is "Ingen". */
export type DiffField = {
    label: Content;
    before?: Content;
    after?: Content;
};
/** A line of text, as the caller split it: unchanged context, added or removed. */
export type DiffLine = {
    kind: "same" | "added" | "removed";
    text: Content;
};
export type DiffOptions = {
    lang: Lang;
    /** What changes, a caption above it and the table's accessible name: "Kanalens brief". */
    label?: string;
    /** Changed fields, drawn as a table of field, before and after. */
    fields?: DiffField[];
    /** Changed text, line by line. */
    lines?: DiffLine[];
};
/**
 * A change to fields or text, as the caller computed it: no diffing here, so the server decides what
 * changed and the page only shows it. Fields are a table with "Før" and "Efter" as its columns; lines
 * carry a sign (+, −) and, for a screen reader, the words "Tilføjet:" and "Fjernet:", so added and
 * removed are never told apart by colour alone. Pass only what differs, as Spring's channel card
 * does: a whole text twice makes the reader find the change by eye.
 */
export declare function diff(o: DiffOptions): Html;
/** One step the agent took: what it did, what it read or used (linked when it can be opened), and when. */
export type ExplainStep = {
    text: Content;
    used?: {
        label: Content;
        href?: string;
    };
    at?: When;
};
export type ExplainOptions = {
    lang: Lang;
    /** The agent: "Spring", in the summary "Hvorfor Spring gjorde det". */
    agent: string;
    steps: ExplainStep[];
    /** The rule or skill it followed, linked. */
    follows?: Link[];
};
/**
 * "Hvorfor Spring gjorde det": the trail of steps behind something an agent did or asks to do, as an
 * ordered list in a details element, closed so it costs the page one line until someone asks. A
 * Date on a step is written as a time of day: a trail is minutes long.
 */
export declare function explain(o: ExplainOptions): Html;
/** The divider between two ways in: "eller". */
export declare const orDivider: (text: Content) => Html;
/** Google's button (google-button.css), as a submit button for the caller's form. */
export declare function googleButton(label: Content): Html;

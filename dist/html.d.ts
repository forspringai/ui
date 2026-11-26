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
export type Product = "forspring" | "spring" | "sitespring" | "dataspring" | "appspring" | "pulsespring" | "flowspring";
/** Each product's name as its wordmark writes it (hub D-101): never lowercase, never split. */
export declare const PRODUCT_NAMES: Record<Product, string>;
/** This package's version, the same as package.json's (a test checks), for the default brand path. */
export declare const VERSION = "0.43.1";
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
export declare const DEFAULT_BRAND_BASE = "/assets/ui/0.43.1/brand/";
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
/** The suite's four access levels (hub D-96; Peter's access model, 2026-11-19, D-50): how much of the
 *  platform a person may run, set in the Forspring account. A ladder, one per person per org. Not a
 *  role: a role is a job in AppSpring (Chef, Bookkeeper), and the two never share a list. */
export type AccessLevel = "owner" | "admin" | "member" | "viewer";
export declare const ACCESS_LEVELS: readonly AccessLevel[];
/** The levels as words inside a sentence or beside a name, as the account writes them: lowercase in
 *  running text, capitalised as a label (Ejer, Administrator, Medlem, Læser). The word for the ladder
 *  itself is "adgangsniveau" / "access level", never "rolle" / "role". */
export declare const ACCESS_LEVEL_NAMES: Record<Lang, Record<AccessLevel, string>>;
/** An organisation as the bar and the pages show it: the customer's name and your access level there
 *  (the field keeps its old name, `role`). */
export type Org = {
    slug: string;
    name: string;
    role: AccessLevel;
};
/** The bar's org switcher (D-17). */
export type BarOrg = {
    /** The organisation this page is in. Your access level there shows in the user menu's head. */
    current: Org;
    /** Every organisation the person has this product in, the current one too. The switcher shows only
     *  when there is more than one; `href` overrides the link that keeps the person's place. */
    orgs?: (Org & {
        href?: string;
    })[];
    /** This page's path, so switching keeps the person's place: /o/acme/runs becomes /o/globex/runs. */
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
/** The user menu: an avatar button with the person, their access level here, the account, language, sign out. */
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
/** A small app's pages for the bar (D-46). */
export type BarNav = {
    /** The nav's accessible name: "Sider", "Pages". */
    label: string;
    /** The phone's fold, as Menu's `toggle`: "Menu". */
    toggle: string;
    /** `badge` is the menu item's count ("5"), the same look as in the sidebar and the fold (D-49). */
    items: (Link & {
        current?: boolean | undefined;
        badge?: MenuItem["badge"];
    })[];
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
    /** An app's own brand, for an app frame (AppSpring): the app's name as the wordmark and its logo, if
     *  any, in place of the product's doll; no doll and no Forspring mark (hub D-98; lead-brand's app-zone
     *  rule). `logo` is an https: URL, a data:image/ URL or a path in the app's bundle (the theme file's
     *  rule); any other value draws no logo. The logo is decoration beside the name (alt ""). `icon` is the
     *  app's own catalog icon, a ui icon name its author chose, drawn in ink when there is no logo; an
     *  unknown name draws nothing (D-49). `productLabel` still names the product in the page title. */
    app?: {
        name: string;
        logo?: string | undefined;
        icon?: string | undefined;
    };
    /** A small app's pages in the bar, after the wordmark (D-46): one row, the shown page marked with the
     *  muted surface and the accent along its foot. With it, the org and product switchers move to the
     *  bar's end with the person (the app's zone, then the platform's). Fewer than two items draw nothing.
     *  Hidden at 800px and under; shell() folds the same pages under `toggle`. For pages in groups, or more
     *  than fit one row, use shell's `menu` (the sidebar) instead. */
    nav?: BarNav;
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
    /** The product's own menu: a sidebar on a wide screen, folded under "Menu" on a phone (D-13). It
     *  wins over `nav`: a product with both gets the sidebar and no pages in the bar. */
    menu?: Menu;
    /** A single card in a narrow column: sign-in and refusals. */
    narrow?: boolean;
    bodyClass?: string;
    footer?: Link[];
    body: Content;
};
/**
 * The same page in another organisation: /o/acme/runs?x=1 becomes /o/globex/runs?x=1, and a path
 * outside /o/ becomes the org's home. A page that does not exist there is the product's to send home.
 */
export declare function orgPath(path: string, slug: string): string;
/** Up to two letters for the avatar: the first and last names' initials, else the address's first. */
export declare function initials(name: string, email?: string): string;
/** An organisation to choose: its name, your access level there, and the value the form sends back. */
export type PickerOrg = {
    name: string;
    role: AccessLevel;
    /** Sent back unchanged as the chosen button's value: opaque to the list (the account seals a token in it).
     *  Nothing is built from it. */
    value: string;
    /** The org's logo, an image URL; without one the row shows the name's first letter. */
    logo?: string;
};
/** An organisation to go to: its name, your access level there, and where its row leads. */
export type OrgLink = {
    name: string;
    role: AccessLevel;
    /** The row's link, as the caller gives it. */
    href: string;
    logo?: string;
    /** The org this page is in (aria-current). */
    current?: boolean;
    /** A tag after the name, e.g. "Last used here". */
    tag?: string;
    /** Words after the access level, e.g. "last used 12 Oct 2026". */
    meta?: string;
};
export type OrgListOptions = {
    lang: Lang;
    /** Inside a menu panel (the bar's switcher): no box of its own, a smaller mark, no chevron. */
    menu?: boolean;
} & ({
    links: OrgLink[];
} | {
    orgs: PickerOrg[];
    /** Where each choice is posted. */
    action: string;
    /** The field the chosen org's value is sent in (default `org`). */
    name?: string;
    /** Hidden fields every form carries: the CSRF token, the handle of the request it answers. */
    fields?: Record<string, string>;
});
/** A square mark: the image when there is one (decoration: the name beside it says who), else the first letter. */
export declare function orgMark(name: string, src?: string): Html;
/** The rows of the suite's one org list; nothing when there are none (the caller says why). */
export declare function orgList(o: OrgListOptions): Html;
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
    /** An icon before the label, decoration only (D-40). A group draws icons only when every item has one
     *  and no two match; otherwise the whole group is words only (D-39 point 6). */
    icon?: IconName | undefined;
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
/** The menu's contents: the context (and its switcher) and the groups, for a product that draws its own frame. */
export declare function menuBody(m: Menu): Html;
/**
 * The menu beside main: the sidebar on a wide screen, the fold under "Menu" on a narrow one, and main.
 * The fold sits inside its own nav (D-38), so a screen reader's landmark list has the menu while the
 * fold is closed; CSS shows one of the two navs at a time.
 */
export declare function menuFrame(m: Menu, body: Content, narrow?: boolean): Html;
/** A whole page: doctype, head, skip link, bar, the menu when there is one, main and footer. */
export declare function shell(o: ShellOptions): Html;
export type ButtonOptions = {
    label: Content;
    variant?: "primary" | "ghost" | "danger" | "success" | "warning" | "critical";
    small?: boolean;
    wide?: boolean;
    /** A link styled as a button; otherwise a <button>. */
    href?: string;
    type?: "submit" | "button" | "reset";
    name?: string;
    value?: string;
    /** The accessible name, when the visible label alone is ambiguous ("Log ud" on which device). */
    ariaLabel?: string;
    /** Kept for the account's markup (D-5), but don't use it: a disabled button cannot be focused, says
     *  nothing about why, and needs script to come back (D-23). Keep the button live and let the submit
     *  say what is missing, or leave it out and say why in words (docs/usage.md section 4). */
    disabled?: boolean;
    /** An icon before the label (D-26), hidden from a screen reader: the label says it. For a button
     *  that is only an icon, give the words as `ariaLabel` and leave `label` empty. */
    icon?: IconName;
    /** Working, then a tick (D-53). Draws the button inside a `.button-progress` span with a status
     *  region, and the words the script needs. `state` is what the server draws now: "working" (a
     *  spinner and the word, aria-busy, a second press ignored) or "done" (a tick and the word); unset
     *  is the idle button. With buttonScript() on the page, a submit sets "working" and the product
     *  sends `ui:button-done` when it is finished. Not for links. */
    progress?: {
        lang: Lang;
        state?: "working" | "done";
        working?: string;
        done?: string;
    };
};
export declare function button(o: ButtonOptions): Html;
export type ActionsOptions = {
    /** The one primary action, first in the row: a button(), usually the form's submit. */
    primary?: Content;
    /** Ghost actions after it: Annuller as a link back, a secondary step. */
    secondary?: Content;
    /** What loses something (a danger button(), a dialogTrigger() to a confirm), apart at the far end. */
    destructive?: Content;
};
/**
 * A row of actions (D-41): one height and the actions gap, the primary first, then the secondary
 * ones, and the destructive one apart at the far end. On a phone it is a column of full-width
 * buttons with the same gap. The order is the helper's, so a page cannot get it wrong. (A
 * destructive confirm puts the safe action first instead: that is dialog()'s own row, D-23.)
 */
export declare function actions(o: ActionsOptions): Html;
export type FieldOptions = {
    label: Content;
    name: string;
    /** Defaults to the name. Hint and error ids derive from it. */
    id?: string;
    type?: string;
    value?: string;
    hint?: Content;
    error?: Content;
    /** Sets `required` and says "påkrævet" / "required" in the label, quiet but in its accessible name
     *  (D-30). Mark whichever is rarer in a form, the required fields or the optional ones, never both. */
    required?: boolean;
    /** Says "valgfri" / "optional" in the label, in a form that marks its optional fields (D-30). */
    optional?: boolean;
    /** false: `required` sets the attribute and writes no word, in a form that marks its optional fields
     *  instead or says once above it that every field is required. */
    requiredWord?: boolean;
    /** The page's language, for the required or optional word; Danish by default. */
    lang?: Lang;
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
/**
 * A platform error's short `ref` (hub D-88: the first characters of the request's traceparent), in
 * monospace and selected whole by one click, with the hint to quote it to support (D-30). notice(),
 * state() and refusedPage() draw it from their `ref`; call it alone for an error drawn without them.
 */
export declare function errorRef(o: {
    lang: Lang;
    ref: string;
}): Html;
export type StripOptions = {
    /** The bold lead: "Viewing as Sales." */
    title?: Content;
    /** The rest of the line: "You are Inês Costa, Owner." It is cut with an ellipsis on a phone. */
    text?: Content;
    /** The one way out: a link, or a POST form (a CSRF token in `fields`). */
    action?: {
        label: Content;
        href: string;
    } | {
        label: Content;
        post: string;
        fields?: Record<string, string>;
    };
};
/** The platform's loud line for an unusual truth, above the bar (D-48): viewing as another role. The
 *  amber at full strength with ink text in both themes; never an app's colour. Place it before bar().
 *  role="status": assistive tech hears it when it appears without a reload. */
export declare function strip(o: StripOptions): Html;
export type NoticeOptions = {
    tone?: Tone;
    signal?: Signal;
    /** The label word in small caps: the tone's word by default ("Udført", "Done"); none for a signal. */
    label?: string;
    /** A content icon (clock, file-text) in place of the tone's own. The label still carries the meaning. */
    icon?: IconName;
    title?: Content;
    text: Content;
    /** One action, a link button in the tone: filled for success and warning, an outline for an error, ghost for info. */
    action?: {
        label: Content;
        href: string;
    };
    /** A platform error's short ref (hub D-88), shown under the text with errorRef(). */
    ref?: string;
    /** The page's language, for the label and the ref's words; Danish by default. */
    lang?: Lang;
};
/**
 * What is true about this page, in words: errors and warnings are alerts, the rest polite status
 * messages (D-44). One style: a tinted fill in the tone, the tone's icon, the label in small caps,
 * and an optional action in the tone. Info is neutral. `signal` instead of `tone` reports a
 * monitored state (D-13): the neutral fill with the signal's mark as its icon.
 */
export declare function notice(o: NoticeOptions): Html;
/** One error in a form, for errorSummary(): the field's id (its link target) and what to do. */
export type FormError = {
    field: string;
    message: Content;
};
export type ErrorSummaryOptions = {
    lang: Lang;
    errors: FormError[];
    /** The heading; "Ret disse felter" / "Fix these fields" by default. */
    title?: Content;
    /** The summary's own id, for a page that moves focus to it; "error-summary" by default. */
    id?: string;
};
/**
 * A failed submit's summary, at the top of the form (D-30, docs/usage.md section 4): the error
 * notice with a heading and one link per error to its field. It takes focus (tabindex="-1" and
 * autofocus, so a full page load lands on it) and is an alert, so a screen reader reads it first.
 * Nothing when there are no errors.
 */
export declare function errorSummary(o: ErrorSummaryOptions): Html;
/** A monitored thing's state: the signal's mark (a shape as well as a colour) and the word (D-13). */
export declare function signal(text: Content, s: Signal): Html;
/** Where the page sits: its parents as links, before the h1. The page itself is the h1, not a crumb. */
export declare function crumbs(label: string, items: Link[]): Html;
export declare function tag(text: Content, tone?: "primary" | "success" | "warning" | "danger"): Html;
export type RemovableTagOptions = {
    text: Content;
    tone?: "primary" | "success" | "warning" | "danger";
    /** The remove button: a submit, so it works with no script. Put the tag in the form that removes it,
     *  or name that form with `form`. */
    remove: {
        /** What the button does, verb first, naming the thing and whom it is taken from: "Remove Chef from
         *  Carla Ferreira" / "Fjern Kok fra Carla Ferreira". It is the button's only name (the x is hidden). */
        label: string;
        name?: string;
        value?: string;
        /** The id of the form it submits, when the tag sits outside it. */
        form?: string;
        /** Where it submits, when that is not the form's own action. */
        formAction?: string;
    };
};
/**
 * A tag with a remove button inside it (D-52): "Chef" with an x that takes the role away. The button
 * is a 24 px target (WCAG 2.5.8) with the focus ring, and grows to the touch floor on a phone like
 * every other button. Use it where a person may take the thing away right there; a tag that only
 * shows something stays tag().
 */
export declare function removableTag(o: RemovableTagOptions): Html;
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
    /** Rows a person ticks, then does one thing to (D-53). */
    selectable?: TableSelectable;
};
export type TableSelectable = {
    lang: Lang;
    /** The checkbox's name and each row's value (the row's id), one per row, in row order. */
    name: string;
    ids: string[];
    /** What each row is called, one per row, for the checkbox's name ("Select Bager Hansen"). */
    labels: string[];
    /** Where the selection goes: a form around the table and `actions`. GET or POST (default POST);
     *  `fields` are hidden inputs (the CSRF token). */
    form: {
        action: string;
        method?: "get" | "post";
        fields?: Record<string, string>;
    };
    /** The buttons that act on the selection, in the bar under the table: button() submits, each
     *  with its own formaction, name and value as the product needs. */
    actions: Content;
    /** Ids already ticked, as the server draws them (a page that came back with a selection). */
    selected?: string[];
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
    /** failed: a platform error's short ref (hub D-88), shown with errorRef() before the action. */
    ref?: string;
    /** The page's language, for the ref's words; Danish by default. */
    lang?: Lang;
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
    /** The question, naming the thing: "Slet bakery.example?". */
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
    /** This page without the toast: its URL with the flash parameter dropped (/o/acme/sites, not
     *  /o/acme/sites?gemt=1), or the same URL when the flash was a one-time cookie. Dismiss is a link
     *  here, so it works with no script; toastScript() makes it instant. */
    dismissHref: string;
    /** One thing to do about it, a link: "Fortryd", "Se fakturaen". A toast with one never hides itself. */
    action?: {
        label: Content;
        href: string;
    };
    /** An undo (D-53): the toast says what happened and offers Undo as a POST form to the product's
     *  undo URL (`fields` are its hidden inputs, the CSRF token). With toastScript() a bar and "8 s"
     *  show the time left, hover or focus pauses it, Escape dismisses, and when it runs out the toast
     *  goes. The script also sends a cancelable `ui:undo` event on the toast before the POST: a
     *  product that calls preventDefault() on it does the undo itself. Without script the toast stays
     *  until dismissed, and the product decides how long the undo URL is good. Instead of `action`. */
    undo?: {
        action: string;
        fields?: Record<string, string>;
        label?: Content;
        seconds?: number;
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
export declare const TOAST_SCRIPT = "(() => {\n  const gone = (t, href) => {\n    const region = t.parentElement;\n    t.remove();\n    if (region && region.classList.contains(\"toast-region\") && !region.querySelector(\".toast\")) region.remove();\n    if (href) try { history.replaceState(history.state, \"\", href); } catch {}\n  };\n  document.addEventListener(\"click\", (e) => {\n    const a = e.target instanceof Element ? e.target.closest(\"[data-toast-dismiss]\") : null;\n    if (!a || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;\n    const t = a.closest(\".toast\");\n    if (!t) return;\n    e.preventDefault();\n    gone(t, a.getAttribute(\"href\"));\n  });\n  const reduce = matchMedia(\"(prefers-reduced-motion: reduce)\").matches;\n  const undoable = () => [...document.querySelectorAll(\".toast[data-toast-undo]\")].filter((t) => t.getAttribute(\"data-toast-undo\"));\n  document.addEventListener(\"submit\", (e) => {\n    const f = e.target;\n    if (!(f instanceof Element) || !f.matches(\"form.toast-undo-form\")) return;\n    const t = f.closest(\".toast\");\n    if (!t) return;\n    if (!t.dispatchEvent(new CustomEvent(\"ui:undo\", { bubbles: true, cancelable: true, detail: { form: f } }))) {\n      e.preventDefault();\n      gone(t, t.querySelector(\"[data-toast-dismiss]\")?.getAttribute(\"href\"));\n    }\n  });\n  document.addEventListener(\"keydown\", (e) => {\n    if (e.key !== \"Escape\" || e.defaultPrevented || document.querySelector(\"dialog[open]\")) return;\n    const all = undoable();\n    const active = document.activeElement;\n    const t = all.find((x) => x.contains(active)) || (!active || active === document.body ? all[all.length - 1] : null);\n    if (t) gone(t, t.querySelector(\"[data-toast-dismiss]\")?.getAttribute(\"href\"));\n  });\n  for (const t of undoable()) {\n    const total = Number(t.getAttribute(\"data-toast-undo\")) * 1000;\n    if (!(total > 0)) continue;\n    const bar = document.createElement(\"progress\");\n    bar.className = \"toast-time-bar\";\n    bar.max = total;\n    const text = document.createElement(\"span\");\n    text.className = \"toast-time-text\";\n    const box = document.createElement(\"span\");\n    box.className = \"toast-time\";\n    box.setAttribute(\"aria-hidden\", \"true\");\n    box.append(bar, text);\n    t.append(box);\n    let left = total, last = Date.now();\n    const paint = () => {\n      bar.value = left;\n      text.textContent = Math.ceil(left / 1000) + \" s\";\n    };\n    paint();\n    const timer = setInterval(() => {\n      const now = Date.now();\n      const paused = t.matches(\":hover, :focus-within\");\n      t.toggleAttribute(\"data-paused\", paused);\n      if (!paused) left -= now - last;\n      last = now;\n      if (!t.isConnected) return clearInterval(timer);\n      if (left <= 0) {\n        clearInterval(timer);\n        return gone(t, t.querySelector(\"[data-toast-dismiss]\")?.getAttribute(\"href\"));\n      }\n      paint();\n    }, reduce ? 1000 : 100);\n  }\n  if (reduce) return;\n  for (const t of document.querySelectorAll(\".toast[data-toast-autohide]\")) {\n    if (t.classList.contains(\"toast-danger\") || t.classList.contains(\"toast-warning\") || t.getAttribute(\"role\") === \"alert\") continue;\n    let timer = 0;\n    const start = () => {\n      clearTimeout(timer);\n      timer = setTimeout(() => {\n        if (t.matches(\":hover, :focus-within\")) return;\n        gone(t, t.querySelector(\"[data-toast-dismiss]\")?.getAttribute(\"href\"));\n      }, 8000);\n    };\n    const wait = () => clearTimeout(timer);\n    t.addEventListener(\"pointerenter\", wait);\n    t.addEventListener(\"focusin\", wait);\n    t.addEventListener(\"pointerleave\", start);\n    t.addEventListener(\"focusout\", start);\n    start();\n  }\n})();";
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
/**
 * 1. Working, then a tick (button({ progress })). A submit button says it is working (a spinner and
 * the product's word, aria-busy, still focusable, a second press ignored) and then that it is done
 * (a tick and the word) for two seconds, then goes back to its label. The words are announced once,
 * through the button's own status region, never through the button. The script sets "working" on
 * submit; the product sends `ui:button-done` (or `ui:button-working`, `ui:button-reset`) as a
 * bubbling event on the button or its form when it knows. A page restored from the back-forward cache
 * resets every busy button. Without the script the server draws the state (`progress.state`).
 */
export declare const BUTTON_SCRIPT = "(() => {\n  const DONE_MS = 2000;\n  const saved = new WeakMap();\n  const timers = new WeakMap();\n  const find = (t) => (t instanceof Element ? (t.matches(\"button[data-working]\") ? t : t.querySelector(\"button[data-working]\")) : null);\n  const say = (b, text) => {\n    const s = b.parentElement && b.parentElement.querySelector('[role=\"status\"]');\n    if (s) s.textContent = text;\n  };\n  const reset = (b) => {\n    clearTimeout(timers.get(b));\n    if (saved.has(b)) b.innerHTML = saved.get(b);\n    saved.delete(b);\n    b.removeAttribute(\"aria-busy\");\n    b.removeAttribute(\"data-state\");\n    say(b, \"\");\n  };\n  const show = (b, state) => {\n    clearTimeout(timers.get(b));\n    if (!saved.has(b) && !b.hasAttribute(\"data-state\")) saved.set(b, b.innerHTML);\n    b.setAttribute(\"data-state\", state);\n    if (state === \"working\") {\n      b.setAttribute(\"aria-busy\", \"true\");\n      const spin = document.createElement(\"span\");\n      spin.className = \"spinner\";\n      spin.setAttribute(\"aria-hidden\", \"true\");\n      b.replaceChildren(spin, document.createTextNode(b.getAttribute(\"data-working\")));\n      say(b, b.getAttribute(\"data-working\"));\n    } else {\n      b.removeAttribute(\"aria-busy\");\n      const tpl = b.parentElement && b.parentElement.querySelector(\"template[data-done-icon]\");\n      b.replaceChildren(...(tpl ? [tpl.content.cloneNode(true)] : []), document.createTextNode(b.getAttribute(\"data-done\")));\n      say(b, b.getAttribute(\"data-done\"));\n      timers.set(b, setTimeout(() => reset(b), DONE_MS));\n    }\n  };\n  document.addEventListener(\"click\", (e) => {\n    const b = e.target instanceof Element ? e.target.closest(\"button[data-working]\") : null;\n    if (b && b.getAttribute(\"aria-busy\") === \"true\") e.preventDefault();\n  });\n  document.addEventListener(\"submit\", (e) => {\n    const b = e.submitter instanceof Element ? e.submitter.closest(\"button[data-working]\") : find(e.target);\n    if (!b) return;\n    if (b.getAttribute(\"aria-busy\") === \"true\") return e.preventDefault();\n    show(b, \"working\");\n  });\n  for (const [type, f] of [[\"ui:button-working\", (b) => show(b, \"working\")], [\"ui:button-done\", (b) => show(b, \"done\")], [\"ui:button-reset\", reset]]) {\n    document.addEventListener(type, (e) => {\n      const b = find(e.target);\n      if (b) f(b);\n    });\n  }\n  addEventListener(\"pageshow\", (e) => {\n    if (e.persisted) for (const b of document.querySelectorAll('button[data-working][aria-busy=\"true\"]')) reset(b);\n  });\n})();";
/** BUTTON_SCRIPT in a <script> tag, with the page's CSP nonce when it has one. */
export declare const buttonScript: (nonce?: string) => Html;
/**
 * 2. A value that just changed (changedValue()). A table cell or a stat gets a tint that fades out
 * over the pulse duration; under reduced motion the tint is static and clears after the same time
 * (the script removes `data-changed` after 1.6 seconds either way). Mark a node from script by
 * sending a bubbling `ui:changed` event on it. A page drawn with no script and reduced motion keeps
 * the tint until the next load, since nothing can take it away.
 */
export type ChangedValueOptions = {
    changed?: boolean;
};
export declare function changedValue(content: Content, o?: ChangedValueOptions): Html;
export declare const CHANGED_SCRIPT = "(() => {\n  const MS = 1600;\n  const timers = new WeakMap();\n  const clear = (el) => timers.set(el, setTimeout(() => el.removeAttribute(\"data-changed\"), MS));\n  document.addEventListener(\"ui:changed\", (e) => {\n    const el = e.target;\n    if (!(el instanceof Element)) return;\n    clearTimeout(timers.get(el));\n    el.removeAttribute(\"data-changed\");\n    void el.offsetWidth;\n    el.setAttribute(\"data-changed\", \"true\");\n    clear(el);\n  });\n  for (const el of document.querySelectorAll(\"[data-changed]\")) clear(el);\n})();";
/** CHANGED_SCRIPT in a <script> tag, with the page's CSP nonce when it has one. */
export declare const changedScript: (nonce?: string) => Html;
/**
 * 4. Selecting rows (table({ selectable })). The checkbox column is a form: tick and press an action,
 * with no script. The script adds a drag from one checkbox down or up over the rows (on a touch
 * screen only a drag that starts in the checkbox column, so the page still scrolls), Shift+click and
 * Shift+Space for a range from the last row touched, Arrow keys between the checkboxes and Shift+Arrow
 * to extend, and the count: "3 selected" on screen as a drag moves, and in the status region once
 * when the selection settles.
 */
export declare const TABLE_SELECT_SCRIPT = "(() => {\n  const boxes = (f) => [...f.querySelectorAll(\"tbody td.select input[type=checkbox]\")];\n  const formOf = (el) => (el instanceof Element ? el.closest(\"form.table-select\") : null);\n  const say = (f, live) => {\n    const n = boxes(f).filter((b) => b.checked).length;\n    const text = (f.getAttribute(\"data-select-text\") || \"{n}\").replace(\"{n}\", n);\n    const c = f.querySelector(\".table-select-count\");\n    if (c) c.textContent = text;\n    const l = f.querySelector(\"[data-select-live]\");\n    if (live && l) l.textContent = text;\n  };\n  // A session remembers which boxes were ticked when a range began, so moving back shrinks the range.\n  const begin = (f, box, mode) => ({ f, box, mode, orig: boxes(f).map((b) => b.checked), moved: false });\n  const apply = (s, to, notify) => {\n    const list = boxes(s.f);\n    const a = list.indexOf(s.box), b = list.indexOf(to);\n    if (a < 0 || b < 0) return;\n    const lo = Math.min(a, b), hi = Math.max(a, b);\n    list.forEach((x, i) => {\n      const want = i >= lo && i <= hi ? s.mode : s.orig[i];\n      if (x.checked === want) return;\n      x.checked = want;\n      if (notify) x.dispatchEvent(new Event(\"change\", { bubbles: true }));\n    });\n  };\n  const anchors = new WeakMap();\n  // A run of Shift+Arrow keeps one session, so going back up shrinks what going down grew.\n  const runs = new WeakMap();\n  let drag = null;\n  let suppress = false;\n  document.addEventListener(\"pointerdown\", (e) => {\n    const td = e.target instanceof Element ? e.target.closest(\"td.select\") : null;\n    const f = formOf(td);\n    if (!td || !f || e.button !== 0 || e.shiftKey) return;\n    const box = td.querySelector(\"input[type=checkbox]\");\n    if (!box) return;\n    drag = { ...begin(f, box, !box.checked), id: e.pointerId, td, onInput: e.target === box };\n  });\n  document.addEventListener(\"pointermove\", (e) => {\n    if (!drag || e.pointerId !== drag.id) return;\n    const tr = document.elementFromPoint(e.clientX, e.clientY)?.closest(\"tr\");\n    const to = tr && drag.f.contains(tr) ? tr.querySelector(\"td.select input[type=checkbox]\") : null;\n    if (!to) return;\n    if (to !== drag.box) {\n      drag.moved = true;\n      drag.f.setAttribute(\"data-dragging\", \"\");\n      getSelection()?.removeAllRanges();\n    }\n    if (drag.moved) {\n      apply(drag, to, false);\n      say(drag.f, false);\n    }\n  });\n  const end = (e) => {\n    if (!drag || e.pointerId !== drag.id) return;\n    const d = drag;\n    drag = null;\n    d.f.removeAttribute(\"data-dragging\");\n    if (e.type === \"pointercancel\") {\n      boxes(d.f).forEach((x, i) => (x.checked = d.orig[i]));\n      return say(d.f, false);\n    }\n    if (d.moved) {\n      suppress = true;\n      setTimeout(() => (suppress = false), 0);\n      const list = boxes(d.f);\n      list.forEach((x, i) => x.checked !== d.orig[i] && x.dispatchEvent(new Event(\"change\", { bubbles: true })));\n      anchors.set(d.f, list.find((x, i) => x.checked !== d.orig[i]) || d.box);\n      say(d.f, true);\n    } else if (!d.onInput && e.target instanceof Element && d.td.contains(e.target)) {\n      d.box.click();\n    }\n  };\n  document.addEventListener(\"pointerup\", end);\n  document.addEventListener(\"pointercancel\", end);\n  document.addEventListener(\"click\", (e) => {\n    const box = e.target instanceof HTMLInputElement && e.target.closest(\"td.select\") ? e.target : null;\n    const f = formOf(box);\n    if (!box || !f) return;\n    if (suppress) {\n      suppress = false;\n      return e.preventDefault();\n    }\n    const from = anchors.get(f);\n    runs.delete(f);\n    if (e.shiftKey && from && from !== box) apply(begin(f, from, box.checked), box, true);\n    anchors.set(f, box);\n    say(f, true);\n  });\n  document.addEventListener(\"keydown\", (e) => {\n    const box = e.target instanceof HTMLInputElement && e.target.closest(\"td.select\") ? e.target : null;\n    const f = formOf(box);\n    if (!box || !f || e.altKey || e.ctrlKey || e.metaKey) return;\n    const list = boxes(f);\n    const i = list.indexOf(box);\n    if (e.key === \" \" && e.shiftKey) {\n      e.preventDefault();\n      runs.delete(f);\n      const from = anchors.get(f);\n      if (from && from !== box) {\n        apply(begin(f, from, !box.checked), box, true);\n      } else {\n        box.checked = !box.checked;\n        box.dispatchEvent(new Event(\"change\", { bubbles: true }));\n      }\n      anchors.set(f, box);\n      return say(f, true);\n    }\n    if (e.key !== \"ArrowDown\" && e.key !== \"ArrowUp\") return;\n    const to = list[i + (e.key === \"ArrowDown\" ? 1 : -1)];\n    e.preventDefault();\n    if (!to) return;\n    if (e.shiftKey) {\n      if (!runs.has(f)) runs.set(f, begin(f, anchors.get(f) || box, true));\n      const run = runs.get(f);\n      anchors.set(f, run.box);\n      apply(run, to, true);\n      say(f, true);\n    } else {\n      runs.delete(f);\n    }\n    to.focus();\n  });\n})();";
/** TABLE_SELECT_SCRIPT in a <script> tag, with the page's CSP nonce when it has one. */
export declare const tableSelectScript: (nonce?: string) => Html;
/**
 * 5. Hold to confirm on a phone (holdToConfirm()). A danger action whose label, on a coarse pointer,
 * says "Hold to …" and must be held for a second: a fill shows the progress, letting go early cancels,
 * and holding to the end posts the action's form. It is the confirm's own trigger (dialogTrigger's
 * link to the dialog and the no-script confirm page), so a keyboard, a screen reader, a fine pointer
 * and a tap that is not a hold all get the existing confirm, and nothing ever acts on a plain click.
 * A hold ended early swallows the click after it, so cancelling a hold does not open the dialog.
 * Under reduced motion the fill steps by quarters; the hold still takes the full time.
 */
export type HoldToConfirmOptions = {
    lang: Lang;
    /** The form's id, unique on the page. */
    id: string;
    /** The action's words, verb first, as a dialogTrigger's: "Slet hjemmesiden". */
    label: Content;
    /** What the coarse pointer sees instead: "Hold for at slette hjemmesiden". Default "Hold nede" / "Hold to confirm". */
    holdLabel?: string;
    /** The confirm: the dialog's id and the no-script page, as dialogTrigger() takes them. */
    dialog: string;
    href: string;
    /** Where a completed hold posts, and its hidden fields (the CSRF token). The server must check
     *  what it checks for a confirm: a hold is only a gesture. */
    action: string;
    fields?: Record<string, string>;
};
export declare function holdToConfirm(o: HoldToConfirmOptions): Html;
export declare const HOLD_SCRIPT = "(() => {\n  const HOLD_MS = 1000;\n  const EARLY_MS = 200;\n  let cur = null;\n  let swallow = false;\n  const reduced = () => matchMedia(\"(prefers-reduced-motion: reduce)\").matches;\n  const paint = (a, f) => a.style.setProperty(\"--_hold\", String(f));\n  const stop = () => {\n    if (!cur) return;\n    cancelAnimationFrame(cur.raf);\n    clearTimeout(cur.timer);\n    cur.a.removeAttribute(\"data-holding\");\n    paint(cur.a, 0);\n    cur = null;\n  };\n  const step = () => {\n    if (!cur) return;\n    const t = performance.now() - cur.start;\n    const f = Math.min(1, t / HOLD_MS);\n    paint(cur.a, reduced() ? Math.floor(f * 4) / 4 : f);\n    if (t >= HOLD_MS) {\n      const form = document.getElementById(cur.a.getAttribute(\"data-hold-form\"));\n      paint(cur.a, 1);\n      cur.done = true;\n      swallow = true;\n      cur.a.removeAttribute(\"data-holding\");\n      cur = null;\n      if (form instanceof HTMLFormElement) form.requestSubmit();\n      return;\n    }\n    if (reduced()) cur.timer = setTimeout(step, 250);\n    else cur.raf = requestAnimationFrame(step);\n  };\n  document.addEventListener(\"pointerdown\", (e) => {\n    const a = e.target instanceof Element ? e.target.closest(\"[data-hold-form]\") : null;\n    if (!a || e.button !== 0 || e.pointerType === \"mouse\" || !matchMedia(\"(pointer: coarse)\").matches) return;\n    stop();\n    swallow = false;\n    cur = { a, id: e.pointerId, start: performance.now(), raf: 0, timer: 0, done: false };\n    a.setAttribute(\"data-holding\", \"true\");\n    step();\n  });\n  const release = (e) => {\n    if (!cur || e.pointerId !== cur.id) return;\n    const early = performance.now() - cur.start;\n    stop();\n    // A hold let go after a moment was a try at holding: it must not open the dialog by its click.\n    if (e.type === \"pointerup\" && early >= EARLY_MS) {\n      swallow = true;\n      setTimeout(() => (swallow = false), 400);\n    }\n  };\n  document.addEventListener(\"pointerup\", release);\n  document.addEventListener(\"pointercancel\", release);\n  document.addEventListener(\"click\", (e) => {\n    if (!swallow || !(e.target instanceof Element) || !e.target.closest(\"[data-hold-form]\")) return;\n    swallow = false;\n    e.preventDefault();\n    e.stopImmediatePropagation();\n  }, true);\n  document.addEventListener(\"contextmenu\", (e) => {\n    if (cur || (e.target instanceof Element && e.target.closest(\"[data-hold-form]\") && matchMedia(\"(pointer: coarse)\").matches)) e.preventDefault();\n  });\n})();";
/** HOLD_SCRIPT in a <script> tag, with the page's CSP nonce when it has one. */
export declare const holdScript: (nonce?: string) => Html;
/**
 * 6. A cut-off countdown (cutoff(), sortByCutoff()). "Cut-off in 1 h 20 min" to the minute (rounded up) from `at`
 * and `now`, in the warning hue when under `warnWithin` minutes (default 60), and in danger with
 * "Cut-off passed" after. Each state has its own icon and words, so colour is never the only thing
 * that changes. The script rewrites every chip each minute from the browser's clock; without it the
 * chip shows the server's `now` and stays that way.
 */
export type CutoffOptions = {
    lang: Lang;
    /** The deadline. */
    at: Date | string;
    /** The server's now. */
    now: Date;
    /** Minutes before the cut-off at which the chip turns to the warning hue. Default 60. */
    warnWithin?: number;
    /** The product's words, when "Frist" / "Cut-off" is not the thing's name: `before` is followed by the time left. */
    words?: {
        before: string;
        passed: string;
    };
};
/** "1 h 20 min", "2 d 3 h", "20 min": the minutes left rounded up (a countdown says 20 min until it is 19), the
 *  units of the page's language. Nothing left is "under 1 min". */
export declare function timeLeft(ms: number, lang: Lang): string;
export declare function cutoff(o: CutoffOptions): Html;
/** The rows nearest their cut-off first: those still to come, soonest first, then the ones that have
 *  passed, most recent first, then the ones with no cut-off, in the order given. Stable, and the
 *  array is a copy. */
export declare function sortByCutoff<T>(rows: readonly T[], at: (row: T) => Date | string | null | undefined, now: Date): T[];
export declare const COUNTDOWN_SCRIPT = "(() => {\n  const left = (ms, u) => {\n    const minutes = Math.ceil(ms / 60000);\n    if (minutes < 1) return u[3];\n    const d = Math.floor(minutes / 1440), h = Math.floor((minutes % 1440) / 60), m = minutes % 60;\n    const part = (n, w) => (n ? n + \" \" + w : \"\");\n    return (d ? [part(d, u[0]), part(h, u[1])] : h ? [part(h, u[1]), part(m, u[2])] : [part(m, u[2])]).filter(Boolean).join(\" \");\n  };\n  const run = () => {\n    for (const c of document.querySelectorAll(\"time[data-cutoff]\")) {\n      const ms = Date.parse(c.getAttribute(\"data-cutoff\")) - Date.now();\n      const warn = Number(c.getAttribute(\"data-warn\")) * 60000;\n      const state = ms <= 0 ? \"passed\" : ms <= warn ? \"warning\" : \"soon\";\n      const text = state === \"passed\" ? c.getAttribute(\"data-passed\") : c.getAttribute(\"data-before\") + \" \" + left(ms, c.getAttribute(\"data-units\").split(\",\"));\n      const t = c.querySelector(\".cutoff-text\");\n      if (t && t.textContent !== text) t.textContent = text;\n      if (c.getAttribute(\"data-state\") === state) continue;\n      c.setAttribute(\"data-state\", state);\n      c.classList.toggle(\"warning\", state === \"warning\");\n      c.classList.toggle(\"danger\", state === \"passed\");\n    }\n  };\n  run();\n  const next = () => setTimeout(() => { run(); next(); }, 60000 - (Date.now() % 60000) + 50);\n  next();\n})();";
/** COUNTDOWN_SCRIPT in a <script> tag, with the page's CSP nonce when it has one. */
export declare const countdownScript: (nonce?: string) => Html;
/**
 * 7. An honest progress bar (progress()). 0 of 10 is an empty track, with no minimum fill, and the
 * bar is full only when value equals max. A native <progress>, drawn by the CSS, so it needs no
 * inline style and a screen reader gets the value and the maximum. `label` is the product's words
 * for it ("0 af 10 låst"); it names the bar and is shown beside it.
 */
export type ProgressOptions = {
    value: number;
    max: number;
    /** "0 of 10 locked": shown, and the bar's accessible name. */
    label: string;
    /** Unique on the page when there are two or more. Default "progress". */
    id?: string;
};
export declare function progress(o: ProgressOptions): Html;

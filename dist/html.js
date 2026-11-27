// Small typed helpers that return the component layer's markup as HTML, so a product on Workers can
// draw its pages with no framework (hub ui-standard §1: thin console pages, server-rendered, no
// script). No dependencies, so it runs anywhere a string does.
//
// Everything interpolated is escaped. A helper returns Html, which passes through other helpers and
// the html`` tag unescaped; a plain string is always text. raw() is the one way to vouch for a
// string as markup, for a stylesheet or markup the caller built and escaped itself. String(h) or
// `${h}` gives the HTML.
import { iconSvg } from "./icons.js";
import { safeLogo } from "./logo.js";
import { ICON_NAMES, ICON_PATHS } from "./icons/lucide.js";
export { ICON_NAMES };
// A registered symbol rather than instanceof, so Html from a second copy of this module (src/ and
// dist/, or two installed versions) still passes through instead of being escaped twice.
const BRAND = Symbol.for("@forspring/ui/html");
export class Html {
    value;
    [BRAND] = true;
    constructor(value) {
        this.value = value;
    }
    toString() {
        return this.value;
    }
}
const ENTITIES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
/** Escapes text for an element's content or a quoted attribute. */
export const esc = (s) => s.replace(/[&<>"']/g, (c) => ENTITIES[c]);
/** Vouches for a string as HTML. Never pass it anything a person or another system wrote. */
export const raw = (s) => new Html(s);
function render(c) {
    if (c === null || c === undefined || c === false)
        return "";
    if (typeof c === "object" && !Array.isArray(c) && c[BRAND] === true)
        return c.value;
    if (Array.isArray(c))
        return c.map(render).join("");
    return esc(String(c));
}
/** A template whose interpolations are escaped unless they are Html. */
export function html(strings, ...values) {
    let out = strings[0];
    values.forEach((v, i) => (out += render(v) + strings[i + 1]));
    return new Html(out);
}
function attrs(a) {
    let out = "";
    for (const [k, v] of Object.entries(a)) {
        if (v === false || v === null || v === undefined)
            continue;
        out += v === true ? ` ${k}` : ` ${k}="${esc(String(v))}"`;
    }
    return out;
}
// Hrefs come from the product's code, but a javascript: or data: URL would still run when escaped,
// so anything but a relative URL, http(s) or mailto becomes "#".
export function safeHref(href) {
    // Browsers drop tabs, newlines and leading controls before reading the scheme ("java\nscript:").
    const bare = href.replace(/[\u0000-\u0020\u007f]/g, "");
    return !/^[a-z][a-z0-9+.-]*:/i.test(bare) || /^(https?|mailto):/i.test(bare) ? href : "#";
}
const cls = (...names) => names.filter(Boolean).join(" ") || undefined;
/** Each product's name as its wordmark writes it (hub D-101): never lowercase, never split. */
export const PRODUCT_NAMES = {
    forspring: "Forspring",
    spring: "Spring",
    sitespring: "SiteSpring",
    dataspring: "DataSpring",
    appspring: "AppSpring",
    pulsespring: "PulseSpring",
    flowspring: "FlowSpring",
};
/** This package's version, the same as package.json's (a test checks), for the default brand path. */
export const VERSION = "0.47.1";
// --- Fonts ------------------------------------------------------------------------------------------
// The files' own coverage: Google Fonts' "latin" subset (Basic Latin, Latin-1 and the common
// punctuation), as forspring.ai and the account ship them. Roboto is Latin-1 only.
const LATIN = "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+2000-206F, U+20AC, U+2122, U+2190-2193, U+2212, U+2215, U+2248, U+FEFF, U+FFFD";
// Archivo's own metrics (ascent 87.8%, descent 21%) put its cap band in the middle of the line, but
// the browser rounds ascent and descent to whole pixels apart and floors half a pixel of leading, so
// a label sat up to 1.5 px high in its control (D-42). These overrides keep their sum (108.8%: a
// line-height: normal is unchanged) and move the split, so cap-top to baseline sits within 0.5 px of
// the line's middle at every size from 11 to 24 px on every line from 1 to 1.7 (test/audit.test.ts).
const ARCHIVO_METRICS = "ascent-override: 90.5%;\n  descent-override: 18.3%;\n  line-gap-override: 0%;";
const FACES = [
    { family: "Archivo", file: "archivo.woff2", weight: "100 900", range: LATIN, metrics: ARCHIVO_METRICS },
    { family: "Archivo Condensed", file: "archivo-condensed.woff2", weight: "700 900", range: LATIN },
    { family: "Space Mono", file: "space-mono.woff2", weight: "400", range: LATIN },
];
const GOOGLE_FACE = { family: "Roboto GSI", file: "roboto-medium.woff2", weight: "500", range: "U+0000-00FF" };
/**
 * The @font-face rules, with the font files under `base` ("/assets/fonts/" when a product serves the
 * package's fonts/ there, "../fonts/" for dist/fonts.css). `google: true` adds Roboto Medium for the
 * Google button.
 */
const face = (f, base) => `@font-face {\n  font-family: "${f.family}";\n  src: url("${base}${f.file}") format("woff2");\n  font-weight: ${f.weight};\n  font-style: normal;\n  font-display: swap;\n${f.metrics ? `  ${f.metrics}\n` : ""}  unicode-range: ${f.range};\n}\n`;
/**
 * The @font-face rules, with the font files under `base` ("/assets/fonts/" when a product serves the
 * package's fonts/ there, "../fonts/" for dist/fonts.css). `google: true` adds Roboto Medium for the
 * Google button.
 */
export function fontFaces(base, opts = {}) {
    return [...FACES, ...(opts.google ? [GOOGLE_FACE] : [])].map((f) => face(f, base)).join("\n");
}
/** Roboto Medium alone, for the Google button (google-button.css carries it). */
export const googleFontFace = (base) => face(GOOGLE_FACE, base);
// --- The mark ---------------------------------------------------------------------------------------
// The doll (hub D-101): one mark for every product, only its colour changes. Inline it takes the
// page's --mark: the product's accent, ink on Forspring's own pages. The brand files (src/brand.ts)
// draw the same paths with the token colours written in.
export const MARK_VIEWBOX = "-184 -160 368 368";
const MARK_SVG = `<svg class="mark" viewBox="${MARK_VIEWBOX}" width="28" height="28" aria-hidden="true" focusable="false"><g class="fill" fill-rule="evenodd"><path d="M -146.98 63.23 A 160 160 0 1 1 146.98 63.23 A 346 346 0 0 1 -146.98 63.23 Z M -89 -44 a 28 28 0 1 0 56 0 a 28 28 0 1 0 -56 0 M 33 -44 a 28 28 0 1 0 56 0 a 28 28 0 1 0 -56 0"/><path d="M -146.98 63.23 A 346 346 0 0 0 146.98 63.23 A 160 160 0 0 1 -146.98 63.23 Z" transform="translate(0 48)"/></g><path class="coil" d="M 0.0 89.0 C 5.3 89.0 21.3 89.5 32.0 89.1 C 42.7 88.6 58.7 86.4 64.0 86.1 C 69.3 85.9 69.3 86.4 64.0 87.7 C 58.7 88.9 42.7 92.2 32.0 93.7 C 21.3 95.2 10.7 96.2 0.0 96.8 C -10.7 97.3 -21.3 97.3 -32.0 96.8 C -42.7 96.3 -58.7 94.1 -64.0 93.9 C -69.3 93.6 -69.3 94.2 -64.0 95.4 C -58.7 96.7 -42.7 100.0 -32.0 101.5 C -21.3 103.0 -10.7 104.0 -0.0 104.5 C 10.7 105.0 21.3 105.0 32.0 104.6 C 42.7 104.1 58.7 101.9 64.0 101.6 C 69.3 101.4 69.3 101.9 64.0 103.2 C 58.7 104.4 42.7 107.7 32.0 109.2 C 21.3 110.7 10.7 111.7 0.0 112.2 C -10.7 112.8 -21.3 112.8 -32.0 112.3 C -42.7 111.8 -58.7 109.6 -64.0 109.4 C -69.3 109.1 -69.3 109.7 -64.0 110.9 C -58.7 112.2 -42.7 115.5 -32.0 117.0 C -21.3 118.5 -10.7 119.5 -0.0 120.0 C 10.7 120.5 21.3 120.5 32.0 120.1 C 42.7 119.6 58.7 117.4 64.0 117.1 C 69.3 116.9 69.3 117.4 64.0 118.7 C 58.7 119.9 42.7 123.2 32.0 124.7 C 21.3 126.2 10.7 127.2 0.0 127.8 C -10.7 128.3 -21.3 128.3 -32.0 127.8 C -42.7 127.3 -58.7 125.1 -64.0 124.9 C -69.3 124.6 -69.3 125.2 -64.0 126.4 C -58.7 127.7 -42.7 131.0 -32.0 132.5 C -21.3 134.0 -10.7 135.0 -0.0 135.5 C 10.7 136.0 21.3 136.0 32.0 135.6 C 42.7 135.1 58.7 132.9 64.0 132.6 C 69.3 132.4 69.3 132.9 64.0 134.2 C 58.7 135.4 42.7 138.7 32.0 140.2 C 21.3 141.7 10.7 142.7 -0.0 143.2 C -10.7 143.8 -21.3 143.8 -32.0 143.3 C -42.7 142.8 -58.7 140.6 -64.0 140.4 C -69.3 140.1 -69.3 140.7 -64.0 141.9 C -58.7 143.2 -42.7 146.5 -32.0 148.0 C -21.3 149.5 -5.3 150.5 -0.0 151.0" fill="none" stroke-width="5" stroke-linecap="round"/></svg>`;
export const mark = () => raw(MARK_SVG);
/** The doll's paths alone, classes fill and coil, for the brand files. */
export const MARK_PATHS = MARK_SVG.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
// --- Icons (D-26) -----------------------------------------------------------------------------------
/**
 * One of the package's icons (ICON_NAMES, a subset of Lucide, ISC) as inline SVG: a 24 by 24 grid,
 * one stroke weight, in currentColor, so it takes the colour of the text around it and 1em of its
 * size (.icon). Nothing is fetched: the paths are in the markup.
 *
 * Without a label it is decoration, aria-hidden, and the words beside it carry the meaning. With
 * one it is an image with that name (role="img"), for an icon that stands alone.
 */
export function icon(name, o = {}) {
    if (!Object.hasOwn(ICON_PATHS, name))
        throw new Error(`icon: no icon named ${JSON.stringify(name)}`);
    return raw(iconSvg(ICON_PATHS[name], o));
}
/** Where shell() expects the package's dist/brand/ by default: /assets/ui/<version>/brand/, the path
 *  products copy the package's files to (account D-20), versioned so a year-long cache stays right. */
export const DEFAULT_BRAND_BASE = `/assets/ui/${VERSION}/brand/`;
/** A product's favicon files under `base`, the URL where dist/brand/ is served (ending in /). */
export function faviconFor(product, base = DEFAULT_BRAND_BASE) {
    const dir = `${base}${product}/`;
    return { svg: `${dir}favicon.svg`, png32: `${dir}favicon-32.png`, png16: `${dir}favicon-16.png`, appleTouch: `${dir}apple-touch-icon-180.png`, manifest: `${dir}site.webmanifest` };
}
/**
 * The <link> tags for a favicon and the web manifest. The PNGs carry sizes and come first, so a
 * browser that reads SVG icons takes the SVG (it has the dark-mode doll) and the rest take a PNG.
 */
export function faviconLinks(f) {
    return html `${f.png32 ? html `<link rel="icon" type="image/png" sizes="32x32" href="${safeHref(f.png32)}">` : ""}${f.png16 ? html `<link rel="icon" type="image/png" sizes="16x16" href="${safeHref(f.png16)}">` : ""}<link rel="icon" type="image/svg+xml" href="${safeHref(f.svg)}">${f.appleTouch ? html `<link rel="apple-touch-icon" sizes="180x180" href="${safeHref(f.appleTouch)}">` : ""}${f.manifest ? html `<link rel="manifest" href="${safeHref(f.manifest)}">` : ""}`;
}
export const ACCESS_LEVELS = ["owner", "admin", "member", "viewer"];
/** The levels as words inside a sentence or beside a name, as the account writes them: lowercase in
 *  running text, capitalised as a label (Ejer, Administrator, Medlem, Læser). The word for the ladder
 *  itself is "adgangsniveau" / "access level", never "rolle" / "role". */
export const ACCESS_LEVEL_NAMES = {
    da: { owner: "ejer", admin: "administrator", member: "medlem", viewer: "læser" },
    en: { owner: "owner", admin: "admin", member: "member", viewer: "viewer" },
};
// The bar's words are the suite's, not a product's: every product's bar says the same (D-17).
const BAR = {
    da: {
        orgs: "Dine organisationer",
        switchOrg: "skift organisation",
        people: (o) => `Administrer folk i ${o}`,
        products: "Produkter",
        has: (o) => `${o} har`,
        here: "her",
        allOf: (o) => `Alt for ${o} hos Forspring`,
        menu: "din konto",
        account: "Din Forspring-konto",
        agents: (o) => (o ? `Agenter og nøgler i ${o}` : "Agenter og nøgler"),
        roleIn: (r, o) => `${r} i ${o}`,
        language: "Sprog",
        signOut: "Log ud af Forspring",
    },
    en: {
        orgs: "Your organisations",
        switchOrg: "switch organisation",
        people: (o) => `Manage people in ${o}`,
        products: "Products",
        has: (o) => `${o} has`,
        here: "here",
        allOf: (o) => `All of ${o} at Forspring`,
        menu: "your account",
        account: "Your Forspring account",
        agents: (o) => (o ? `Agents and keys in ${o}` : "Agents and keys"),
        roleIn: (r, o) => `${r} in ${o}`,
        language: "Language",
        signOut: "Sign out of Forspring",
    },
};
const LANG_NAMES = { da: "Dansk", en: "English" };
/**
 * The same page in another organisation: /o/acme/runs?x=1 becomes /o/globex/runs?x=1, and a path
 * outside /o/ becomes the org's home. A page that does not exist there is the product's to send home.
 */
export function orgPath(path, slug) {
    const m = /^\/o\/[^/?#]+(.*)$/.exec(path);
    const rest = m ? m[1] : "";
    return `/o/${encodeURIComponent(slug)}${rest === "" || /^[?#]/.test(rest) ? `/${rest}` : rest}`;
}
/** Up to two letters for the avatar: the first and last names' initials, else the address's first. */
export function initials(name, email = "") {
    const words = name.trim().split(/\s+/).filter(Boolean);
    const first = (w) => (w ? Array.from(w)[0] : "");
    const letters = words.length > 1 ? first(words[0]) + first(words[words.length - 1]) : first(words[0]) || first(email);
    return letters.toLocaleUpperCase() || "?";
}
const current = (on, value = "true") => raw(on ? ` aria-current="${value}"` : "");
/** A square mark: the image when there is one (decoration: the name beside it says who), else the first letter. */
export function orgMark(name, src) {
    const inner = src ? html `<img src="${safeHref(src)}" alt="">` : (Array.from(name.trim())[0] ?? "?").toLocaleUpperCase();
    return html `<span class="org-picker-mark" aria-hidden="true">${inner}</span>`;
}
/** The rows of the suite's one org list; nothing when there are none (the caller says why). */
export function orgList(o) {
    const chevron = o.menu ? "" : icon("chevron-right");
    const inner = (g) => html `${orgMark(g.name, g.logo)}<span class="org-picker-text"><span class="name">${g.name}${g.tag ? html ` ${tag(g.tag, "primary")}` : ""}</span><span class="meta">${ACCESS_LEVEL_NAMES[o.lang][g.role]}${g.meta ? ` · ${g.meta}` : ""}</span></span>${chevron}`;
    let rows;
    if ("links" in o) {
        rows = o.links.map((g) => html `<li><a class="org-picker-row" href="${safeHref(g.href)}"${current(g.current)}>${inner(g)}</a></li>`);
    }
    else {
        const field = o.name ?? "org";
        const hidden = Object.entries(o.fields ?? {}).map(([k, v]) => html `<input type="hidden" name="${k}" value="${v}">`);
        rows = o.orgs.map((g) => html `<li><form method="post" action="${safeHref(o.action)}">${hidden}<button class="org-picker-row" type="submit" name="${field}" value="${g.value}">${inner(g)}</button></form></li>`);
    }
    if (rows.length === 0)
        return html ``;
    return html `<ul class="org-picker-list${o.menu ? " org-picker-menu" : ""}" data-forspring-org-list>${rows}</ul>`;
}
function orgSwitcher(o, t, lang) {
    const orgs = o.orgs ?? [];
    if (orgs.length < 2)
        return html ``;
    const items = orgList({
        lang,
        menu: true,
        links: orgs.map((g) => ({ name: g.name, role: g.role, href: g.href ?? orgPath(o.path ?? "/", g.slug), current: g.slug === o.current.slug })),
    });
    const foot = o.peopleHref ? html `<p class="bar-panel-foot"><a href="${safeHref(o.peopleHref)}">${t.people(o.current.name)}</a></p>` : "";
    return html `<details class="switcher bar-menu org-switcher"><summary><span class="bar-menu-name">${o.current.name}</span><span class="visually-hidden">, ${t.switchOrg}</span></summary><div class="bar-panel"><p class="bar-panel-label">${t.orgs}</p>${items}${foot}</div></details>`;
}
function productSwitcher(p, t, org) {
    const items = p.items.map((i) => html `<li><a href="${safeHref(i.href)}"${current(i.current)}><span class="bar-item-name">${i.name}</span>${i.current ? html `<span class="bar-item-meta">${t.here}</span>` : ""}</a></li>`);
    return html `<details class="switcher bar-menu product-switcher"><summary>${t.products}</summary><div class="bar-panel"><p class="bar-panel-label">${org ? t.has(org.name) : t.products}</p><ul>${items}</ul><p class="bar-panel-foot"><a href="${safeHref(p.accountHref)}">${org ? t.allOf(org.name) : t.account}</a></p></div></details>`;
}
function userMenu(u, t, lang, org) {
    const role = org ? html `<span class="user-role">${t.roleIn(ACCESS_LEVEL_NAMES[lang][org.role], org.name)}</span>` : "";
    const agents = u.agentsHref ? html `<li><a href="${safeHref(u.agentsHref)}">${t.agents(org?.name)}</a></li>` : "";
    const langs = u.languages
        ? html `<p class="user-lang"><span class="visually-hidden">${t.language}: </span>${["da", "en"].map((l) => html `<a href="${safeHref(u.languages[l])}" lang="${l}" hreflang="${l}"${current(l === lang)}>${LANG_NAMES[l]}</a>`)}</p>`
        : "";
    const fields = Object.entries(u.signOut.fields ?? {}).map(([name, value]) => html `<input type="hidden" name="${name}" value="${value}">`);
    return html `<details class="switcher bar-menu user-menu"><summary><span class="avatar">${initials(u.name, u.email)}</span><span class="visually-hidden">: ${u.name}, ${t.menu}</span></summary><div class="bar-panel"><p class="user-head"><span class="user-name">${u.name}</span><span class="user-email">${u.email}</span>${role}</p><ul><li><a href="${safeHref(u.accountHref)}">${t.account}</a></li>${agents}</ul>${langs}<form class="user-signout" method="post" action="${safeHref(u.signOut.action)}">${fields}${button({ label: t.signOut, variant: "ghost", small: true, wide: true })}</form></div></details>`;
}
/** The bar: wordmark, org switcher, product switcher, controls, user menu. The menus are details
 *  elements, so they open with no script. */
export function bar(o) {
    const t = BAR[o.lang];
    // Every bar carries a doll and a wordmark (hub D-101). Forspring's own pages (the account,
    // forspring.ai): the ink doll, "Forspring" and the label; a product's: its own doll in its accent
    // (the CSS's --mark) and its name, no Forspring mark or word (D-98).
    const own = o.product === undefined || o.product === "forspring";
    const org = o.org?.current;
    const legacy = o.switcher
        ? html `<details class="switcher"><summary>${o.switcher.label}</summary><ul>${o.switcher.items.map((i) => html `<li><a href="${safeHref(i.href)}"${current(i.current, "page")}>${i.label}</a></li>`)}</ul></details>`
        : "";
    const user = o.user ? html `<span class="who">${o.user.email}</span>${o.user.signOut}` : "";
    const home = o.home ?? (org ? `/o/${encodeURIComponent(org.slug)}/` : "/");
    const brand = o.app
        ? html `<a class="brand" href="${safeHref(home)}" aria-label="${o.homeLabel ?? o.app.name}">${appMark(o.app)}<span class="word">${o.app.name}</span></a>`
        : html `<a class="brand" href="${safeHref(home)}" aria-label="${o.homeLabel ?? (own ? `Forspring ${o.productLabel}` : o.productLabel)}">${mark()}${own ? html `<span class="word">Forspring</span> <span class="sub">${o.productLabel}</span>` : html `<span class="word">${o.productLabel}</span>`}</a>`;
    const switchers = html `${o.org ? orgSwitcher(o.org, t, o.lang) : ""}${o.products ? productSwitcher(o.products, t, org) : ""}${legacy}`;
    const nav = barNav(o.nav);
    // With the app's pages in the bar, the switchers join the person at the end: the app's zone, then the platform's.
    return nav
        ? html `<header class="bar"><div class="wrap bar-inner">${brand}${nav}${o.controls}<span class="spacer"></span>${switchers}${user}${o.userMenu ? userMenu(o.userMenu, t, o.lang, org) : ""}</div></header>`
        : html `<header class="bar"><div class="wrap bar-inner">${brand}${switchers}${o.controls}<span class="spacer"></span>${user}${o.userMenu ? userMenu(o.userMenu, t, o.lang, org) : ""}</div></header>`;
}
/** The app's logo when it is safe, else its catalog icon when ui has one by that name, else nothing (D-47, D-49). */
function appMark(a) {
    if (a.logo !== undefined && safeLogo(a.logo))
        return html `<img class="app-logo" src="${a.logo}" alt="" referrerpolicy="no-referrer">`;
    if (a.icon !== undefined && Object.hasOwn(ICON_PATHS, a.icon))
        return html `<span class="app-icon">${icon(a.icon)}</span>`;
    return "";
}
/** The pages to draw in the bar: two or more (one page needs no nav). */
const navItems = (n) => (n && n.items.length >= 2 ? n.items : undefined);
function barNav(n) {
    const items = navItems(n);
    if (!n || !items)
        return undefined;
    return html `<nav class="bar-nav" aria-label="${n.label}"><ul>${items.map((i) => html `<li><a href="${safeHref(i.href)}"${current(i.current, "page")}>${i.label}${i.badge ? menuBadge(i.badge) : ""}</a></li>`)}</ul></nav>`;
}
/** All or none per group (D-39 point 6): icons only when every item has one and no two match. */
const groupIcons = (items) => items.length > 0 && items.every((i) => i.icon !== undefined) && new Set(items.map((i) => i.icon)).size === items.length;
const signalMark = (s) => html `<span class="${`signal-mark ${s}`}" aria-hidden="true"></span>`;
/** A menu or bar-nav item's count: a signal mark when given, the text, and words for a screen reader. */
const menuBadge = (b) => html `<span class="menu-badge">${b.signal ? signalMark(b.signal) : ""}${b.text}${b.label ? html `<span class="visually-hidden"> ${b.label}</span>` : ""}</span>`;
/** The menu's contents: the context (and its switcher) and the groups, for a product that draws its own frame. */
export function menuBody(m) {
    const ctx = m.context;
    const others = ctx?.items ?? [];
    const context = !ctx
        ? ""
        : others.length > 1
            ? html `<details class="menu-context"><summary><span class="menu-label">${ctx.label}</span><span class="menu-context-name">${ctx.name}</span></summary><ul>${others.map((i) => html `<li><a href="${safeHref(i.href)}"${raw(i.current ? ' aria-current="true"' : "")}>${i.label}</a></li>`)}</ul></details>`
            : html `<div class="menu-context"><span class="menu-label">${ctx.label}</span><span class="menu-context-name">${ctx.name}</span></div>`;
    const groups = m.groups.map((g) => {
        const icons = groupIcons(g.items);
        return html `<div class="menu-group">${g.label ? html `<p class="menu-label">${g.label}</p>` : ""}<ul>${g.items.map((i) => {
            const badge = i.badge ? menuBadge(i.badge) : "";
            return html `<li><a href="${safeHref(i.href)}"${raw(i.current === "parent" ? ' aria-current="true"' : i.current ? ' aria-current="page"' : "")}>${icons ? icon(i.icon) : ""}<span class="menu-text">${i.label}</span>${badge}</a></li>`;
        })}</ul></div>`;
    });
    return html `${context}${groups}`;
}
/** The current item's label, for the phone's fold. */
const currentLabel = (m) => {
    const items = m.groups.flatMap((g) => g.items);
    return (items.find((i) => i.current === true) ?? items.find((i) => i.current === "parent"))?.label;
};
/**
 * The menu beside main: the sidebar on a wide screen, the fold under "Menu" on a narrow one, and main.
 * The fold sits inside its own nav (D-38), so a screen reader's landmark list has the menu while the
 * fold is closed; CSS shows one of the two navs at a time.
 */
export function menuFrame(m, body, narrow) {
    const current = currentLabel(m);
    return html `<div class="wrap app"><nav class="menu-fold-nav" aria-label="${m.label}"><details class="menu-fold"><summary><span>${m.toggle}</span>${current ? html `<span class="menu-fold-current">${current}</span>` : ""}</summary><div class="menu">${menuBody(m)}</div></details></nav><nav class="menu menu-side" aria-label="${m.label}">${menuBody(m)}</nav><main id="main"${raw(attrs({ class: cls(narrow && "narrow") }))}>${body}</main></div>`;
}
/** A whole page: doctype, head, skip link, bar, the menu when there is one, main and footer. */
export function shell(o) {
    const da = o.lang === "da";
    const own = o.product === undefined || o.product === "forspring";
    const footer = o.footer?.length
        ? html `<footer><div class="wrap foot">${o.footer.map((l) => html `<a href="${safeHref(l.href)}"${raw(l.lang ? attrs({ lang: l.lang, hreflang: l.lang }) : "")}>${l.label}</a>`)}</div></footer>`
        : "";
    const htmlAttrs = raw(attrs({ lang: o.lang, "data-product": o.product, "data-theme": o.theme }));
    const icons = o.favicon === false ? "" : faviconLinks(o.favicon ?? faviconFor(o.product ?? "forspring", o.brandBase));
    // Pages in the bar (no menu): the same pages fold under the toggle on a narrow screen, and no sidebar.
    const navPages = o.menu ? undefined : navItems(o.nav);
    const barOpts = o.menu ? { ...o, nav: undefined } : o;
    const menu = o.menu ?? (navPages && o.nav ? { label: o.nav.label, toggle: o.nav.toggle, groups: [{ items: navPages }] } : undefined);
    return html `<!doctype html><html${htmlAttrs}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${o.title} · ${own ? "Forspring" : o.productLabel}</title>${icons}${o.head}</head>
<body${raw(attrs({ class: cls(menu && "has-menu", navPages && "nav-in-bar", o.bodyClass) }))}><a class="skip" href="#main">${da ? "Spring til indhold" : "Skip to content"}</a>
${bar(barOpts)}
${menu ? menuFrame(menu, o.body, o.narrow) : html `<main id="main" class="${cls("wrap", o.narrow && "narrow")}">${o.body}</main>`}
${footer}</body></html>`;
}
const BUTTON = {
    da: { working: "Arbejder…", done: "Færdig" },
    en: { working: "Working…", done: "Done" },
};
function buttonProgress(o, variant) {
    const p = o.progress;
    const w = p.working ?? BUTTON[p.lang].working;
    const d = p.done ?? BUTTON[p.lang].done;
    const content = p.state === "working" ? html `<span class="spinner" aria-hidden="true"></span>${w}` : p.state === "done" ? html `${icon("check")}${d}` : o.icon ? html `${icon(o.icon)}${o.label}` : o.label;
    const a = {
        class: cls(variant, o.small && "small", o.wide && "wide"),
        type: o.type ?? "submit",
        name: o.name,
        value: o.value,
        "aria-label": o.ariaLabel,
        "data-working": w,
        "data-done": d,
        "data-state": p.state,
        "aria-busy": p.state === "working" ? "true" : undefined,
    };
    // The status region starts empty: on a fresh page the button's own words are read in order, and the
    // script writes the one announcement when the state changes, so the change is heard once.
    return html `<span class="button-progress"><button${raw(attrs(a))}>${content}</button><template data-done-icon>${icon("check")}</template><span class="visually-hidden" role="status"></span></span>`;
}
export function button(o) {
    const label = o.icon ? html `${icon(o.icon)}${o.label}` : o.label;
    const variant = o.variant && o.variant !== "primary" ? o.variant : null;
    if (o.progress && o.href === undefined)
        return buttonProgress(o, variant);
    if (o.href !== undefined) {
        return html `<a${raw(attrs({ class: cls("button", variant, o.small && "small", o.wide && "wide"), href: safeHref(o.href), "aria-label": o.ariaLabel }))}>${label}</a>`;
    }
    const a = { class: cls(variant, o.small && "small", o.wide && "wide"), type: o.type ?? "submit", name: o.name, value: o.value, "aria-label": o.ariaLabel, disabled: o.disabled };
    return html `<button${raw(attrs(a))}>${label}</button>`;
}
/**
 * A row of actions (D-41): one height and the actions gap, the primary first, then the secondary
 * ones, and the destructive one apart at the far end. On a phone it is a column of full-width
 * buttons with the same gap. The order is the helper's, so a page cannot get it wrong. (A
 * destructive confirm puts the safe action first instead: that is dialog()'s own row, D-23.)
 */
export function actions(o) {
    const end = o.destructive ? html `<div class="actions-end">${o.destructive}</div>` : "";
    return html `<div class="actions">${o.primary ?? ""}${o.secondary ?? ""}${end}</div>`;
}
/** A label, its control, a hint and an error, wired with aria-describedby and aria-invalid. */
export function field(o) {
    const id = o.id ?? o.name;
    const hintId = o.hint ? `${id}-hint` : undefined;
    const errorId = o.error ? `${id}-error` : undefined;
    const described = [hintId, errorId].filter(Boolean).join(" ") || undefined;
    const common = {
        id,
        name: o.name,
        required: o.required,
        autocomplete: o.autocomplete,
        autocapitalize: o.autocapitalize,
        autocorrect: o.autocorrect,
        spellcheck: o.spellcheck === undefined ? undefined : String(o.spellcheck),
        "aria-invalid": o.error ? "true" : undefined,
        "aria-describedby": described,
    };
    const control = o.control === "textarea"
        ? html `<textarea${raw(attrs({ ...common, placeholder: o.placeholder }))}>${o.value ?? ""}</textarea>`
        : o.control === "select"
            ? html `<select${raw(attrs(common))}>${(o.options ?? []).map((op) => html `<option${raw(attrs({ value: op.value, selected: op.selected }))}>${op.label}</option>`)}</select>`
            : html `<input${raw(attrs({ ...common, type: o.type ?? "text", value: o.value, placeholder: o.placeholder, pattern: o.pattern, title: o.title }))}>`;
    const word = o.required ? (o.requiredWord === false ? undefined : FORM[o.lang ?? "da"].required) : o.optional ? FORM[o.lang ?? "da"].optional : undefined;
    const label = html `<label for="${id}">${o.label}${word ? html ` <span class="field-mark">(${word})</span>` : ""}</label>`;
    return html `<div class="field">${o.help ? html `<div class="field-head">${label}${o.help}</div>` : label}${control}${o.hint ? html `<p class="hint" id="${hintId}">${o.hint}</p>` : ""}${o.error ? html `<p class="field-error" id="${errorId}">${o.error}</p>` : ""}</div>`;
}
/** The words the form and error helpers add (D-30), Danish and English, the package's like the bar's. */
const FORM = {
    da: { required: "påkrævet", optional: "valgfri", summary: "Ret disse felter", ref: "Fejlkode", refHint: "Nævn den, hvis du skriver til os." },
    en: { required: "required", optional: "optional", summary: "Fix these fields", ref: "Reference", refHint: "Quote it if you contact us." },
};
/**
 * A platform error's short `ref` (hub D-88: the first characters of the request's traceparent), in
 * monospace and selected whole by one click, with the hint to quote it to support (D-30). notice(),
 * state() and refusedPage() draw it from their `ref`; call it alone for an error drawn without them.
 */
export function errorRef(o) {
    const t = FORM[o.lang];
    return html `<p class="error-ref">${t.ref}: <code>${o.ref}</code><br>${t.refHint}</p>`;
}
/** The platform's loud line for an unusual truth, above the bar (D-48): viewing as another role. The
 *  amber at full strength with ink text in both themes; never an app's colour. Place it before bar().
 *  role="status": assistive tech hears it when it appears without a reload. */
export function strip(o) {
    const a = o.action;
    const action = !a
        ? ""
        : "href" in a
            ? html `<a class="strip-action" href="${safeHref(a.href)}">${a.label}</a>`
            : html `<form method="post" action="${safeHref(a.post)}">${Object.entries(a.fields ?? {}).map(([name, value]) => html `<input type="hidden" name="${name}" value="${value}">`)}<button class="strip-action" type="submit">${a.label}</button></form>`;
    return html `<div class="strip warning" role="status"><p>${o.title ? html `<strong>${o.title}</strong> ` : ""}${o.text ?? ""}</p>${action}</div>`;
}
// The kind of message in words, so the tone is never told by colour or icon alone (hub D-120).
const NOTICE_LABEL = {
    da: { info: "Bemærk", success: "Udført", warning: "Advarsel", error: "Fejl" },
    en: { info: "Note", success: "Done", warning: "Warning", error: "Error" },
};
// One default icon per tone: an i, a tick, a triangle and an octagon.
const NOTICE_ICON = { info: "info", success: "check", warning: "alert-triangle", error: "alert-octagon" };
const NOTICE_BUTTON = { info: "ghost", success: "success", warning: "warning", error: "critical" };
/**
 * What is true about this page, in words: errors and warnings are alerts, the rest polite status
 * messages (D-44). One style: a tinted fill in the tone, the tone's icon, the label in small caps,
 * and an optional action in the tone. Info is neutral. `signal` instead of `tone` reports a
 * monitored state (D-13): the neutral fill with the signal's mark as its icon.
 */
export function notice(o) {
    const lang = o.lang ?? "da";
    const ref = o.ref ? errorRef({ lang, ref: o.ref }) : "";
    const title = o.title ? html `<strong class="notice-title">${o.title}</strong>` : "";
    const act = (btn) => (o.action ? html `<a class="${`button small ${btn}`}" href="${safeHref(o.action.href)}">${o.action.label}</a>` : "");
    if (o.signal) {
        const role = o.signal === "down" || o.signal === "warn" ? "alert" : "status";
        const label = o.label ? html `<span class="notice-label">${o.label}</span>` : "";
        return html `<div class="${`notice signal-${o.signal}`}" role="${role}">${o.icon ? icon(o.icon) : signalMark(o.signal)}<div class="notice-body">${label}${title}${o.text}${ref}</div>${act("ghost")}</div>`;
    }
    const tone = o.tone ?? "info";
    const role = tone === "error" || tone === "warning" ? "alert" : "status";
    const label = html `<span class="notice-label">${o.label ?? NOTICE_LABEL[lang][tone]}</span>`;
    return html `<div class="${cls("notice", tone !== "info" && tone)}" role="${role}">${icon(o.icon ?? NOTICE_ICON[tone])}<div class="notice-body">${label}${title}${o.text}${ref}</div>${act(NOTICE_BUTTON[tone])}</div>`;
}
/**
 * A failed submit's summary, at the top of the form (D-30, docs/usage.md section 4): the error
 * notice with a heading and one link per error to its field. It takes focus (tabindex="-1" and
 * autofocus, so a full page load lands on it) and is an alert, so a screen reader reads it first.
 * Nothing when there are no errors.
 */
export function errorSummary(o) {
    if (!o.errors.length)
        return html ``;
    const id = o.id ?? "error-summary";
    return html `<div${raw(attrs({ class: "notice error error-summary", id, role: "alert", tabindex: "-1", autofocus: "", "aria-labelledby": `${id}-title` }))}>${icon(NOTICE_ICON.error)}<div class="notice-body"><span class="notice-label">${NOTICE_LABEL[o.lang].error}</span><h2 class="notice-title" id="${`${id}-title`}">${o.title ?? FORM[o.lang].summary}</h2><ul class="error-summary-list">${o.errors.map((e) => html `<li><a href="${`#${e.field}`}">${e.message}</a></li>`)}</ul></div></div>`;
}
/** A monitored thing's state: the signal's mark (a shape as well as a colour) and the word (D-13). */
export function signal(text, s) {
    return html `<span class="${`signal ${s}`}">${signalMark(s)}${text}</span>`;
}
/** Where the page sits: its parents as links, before the h1. The page itself is the h1, not a crumb. */
export function crumbs(label, items) {
    return html `<nav class="crumbs" aria-label="${label}"><ol>${items.map((i) => html `<li><a href="${safeHref(i.href)}">${i.label}</a></li>`)}</ol></nav>`;
}
export function tag(text, tone) {
    return html `<span class="${cls("tag", tone)}">${text}</span>`;
}
/**
 * A tag with a remove button inside it (D-52): "Chef" with an x that takes the role away. The button
 * is a 24 px target (WCAG 2.5.8) with the focus ring, and grows to the touch floor on a phone like
 * every other button. Use it where a person may take the thing away right there; a tag that only
 * shows something stays tag().
 */
export function removableTag(o) {
    if (o.remove.label.trim() === "")
        throw new Error("removableTag: remove.label is the button's only name; say what it removes and from whom");
    const a = { class: "tag-remove", type: "submit", name: o.remove.name, value: o.remove.value, form: o.remove.form, formaction: o.remove.formAction === undefined ? undefined : safeHref(o.remove.formAction) };
    return html `<span class="${cls("tag", o.tone, "removable")}">${o.text}<button${raw(attrs(a))}>${icon("x")}<span class="visually-hidden">${o.remove.label}</span></button></span>`;
}
export function card(body) {
    return html `<div class="card">${body}</div>`;
}
/** The account's list: a name, an optional meta line under it, and an action at the end. */
export function list(items) {
    return html `<ul class="list">${items.map((i) => html `<li><span class="grow"><span class="name">${i.name}</span>${i.meta ? html `<br><span class="meta">${i.meta}</span>` : ""}</span>${i.action}</li>`)}</ul>`;
}
const TABLE = {
    da: {
        search: "Søg",
        of: "af",
        prev: "Forrige",
        next: "Næste",
        pages: (t) => (t ? `Sider i ${t}` : "Sider"),
        filters: (t) => `Filtre for ${t}`,
        sortedBy: (c, d) => html `sorteret efter ${c}, ${d === "asc" ? "stigende" : "faldende"}`,
    },
    en: {
        search: "Search",
        of: "of",
        prev: "Previous",
        next: "Next",
        pages: (t) => (t ? `Pages of ${t}` : "Pages"),
        filters: (t) => `Filters for ${t}`,
        sortedBy: (c, d) => html `sorted by ${c}, ${d === "asc" ? "ascending" : "descending"}`,
    },
};
/** A count in the page's language: Danish writes 1.248, English 1,248. */
const count = (n, lang) => new Intl.NumberFormat(LOCALE[lang]).format(n);
/**
 * The paging arithmetic, so a product's query and its links agree: page `page` (1-based) of `total`
 * rows, `size` to a page. A page before the first is the first and one past the end is the last, so
 * an old link or a hand-typed ?page=999 still shows rows; no rows is one empty page.
 */
export function pageOf(total, page, size) {
    const n = Math.max(0, Math.floor(Number.isFinite(total) ? total : 0));
    const per = Math.max(1, Math.floor(Number.isFinite(size) ? size : 1));
    const pages = Math.max(1, Math.ceil(n / per));
    const p = Math.min(pages, Math.max(1, Math.floor(Number.isFinite(page) ? page : 1)));
    const out = { page: p, from: n ? (p - 1) * per + 1 : 0, to: Math.min(n, p * per), total: n, pages };
    if (p > 1)
        out.prev = p - 1;
    if (p < pages)
        out.next = p + 1;
    return out;
}
/**
 * "1–6 af 248" and Previous and Next as links, in a labelled nav. At an end the word stays where it
 * was, as a span marked aria-disabled, so the row does not shift and a screen reader hears that there
 * is no next page rather than finding nothing. The links carry rel prev and next.
 */
export function pagination(o) {
    const t = TABLE[o.lang];
    const range = o.total > 0 && o.to >= o.from ? `${count(o.from, o.lang)}–${count(o.to, o.lang)} ${t.of} ${count(o.total, o.lang)}` : `0 ${t.of} 0`;
    const step = (href, label, rel) => href === undefined ? html `<span class="button ghost small" aria-disabled="true">${label}</span>` : html `<a class="button ghost small" href="${safeHref(href)}" rel="${rel}">${label}</a>`;
    const order = o.order ? html `<span class="pagination-order">, ${o.order}</span>` : "";
    return html `<nav class="pagination" aria-label="${o.label ?? t.pages()}"><p class="pagination-range">${range}${order}</p><span class="pagination-steps">${step(o.prevHref, t.prev, "prev")}${step(o.nextHref, t.next, "next")}</span></nav>`;
}
const SELECT = {
    da: { column: "Vælg", row: (l) => `Vælg ${l}`, count: (n) => `${n} valgt`, region: "Markering" },
    en: { column: "Select", row: (l) => `Select ${l}`, count: (n) => `${n} selected`, region: "Selection" },
};
const isHtml = (c) => typeof c === "object" && c !== null && c[BRAND] === true;
const ARIA_SORT = { asc: "ascending", desc: "descending" };
/**
 * A table in a scrolling frame. The frame is a labelled region a keyboard can reach (tabindex 0),
 * so a table wider than a phone is scrolled, never clipped.
 *
 * With `controls` (D-25) it is a list at scale: a search form and filter chips above, the order and
 * the paging below. All of it is a GET form and links, so it works with no script and the URL holds
 * the state; the server searches, filters, sorts and slices, and draws the page it was asked for.
 */
export function table(o) {
    const c = (col) => cls(col?.num && "num", col?.phoneHide && "phone-hide");
    const head = (col) => {
        if (!col.sort)
            return html `<th scope="col"${raw(attrs({ class: c(col) }))}>${col.label}</th>`;
        const dir = col.sort.dir;
        // The arrow says the order to the eye; aria-sort says it to a screen reader, so it is hidden.
        const arrow = dir ? html `<span class="sort-dir" aria-hidden="true">${dir === "asc" ? "↑" : "↓"}</span>` : "";
        return html `<th scope="col"${raw(attrs({ class: c(col), "aria-sort": dir ? ARIA_SORT[dir] : undefined }))}><a class="sort" href="${safeHref(col.sort.href)}">${col.label}${arrow}</a></th>`;
    };
    const sel = o.selectable;
    if (sel && (sel.ids.length !== o.rows.length || sel.labels.length !== o.rows.length))
        throw new Error("table: a selectable table needs one id and one label for each row");
    const st = sel ? SELECT[sel.lang] : undefined;
    const ticked = new Set(sel?.selected ?? []);
    const selectHead = sel ? html `<th scope="col" class="select"><span class="visually-hidden">${st.column}</span></th>` : "";
    const selectCell = (i) => (sel ? html `<td class="select"><input type="checkbox" name="${sel.name}" value="${sel.ids[i]}" aria-label="${st.row(sel.labels[i])}"${raw(ticked.has(sel.ids[i]) ? " checked" : "")}></td>` : "");
    const frame0 = html `<div class="table-wrap" role="region" aria-label="${o.label}" tabindex="0"><table>${o.caption ? html `<caption>${o.caption}</caption>` : ""}<thead><tr>${selectHead}${o.columns.map(head)}</tr></thead><tbody>${o.rows.map((r, n) => html `<tr>${selectCell(n)}${r.map((cell, i) => html `<td${raw(attrs({ class: c(o.columns[i]) }))}>${cell}</td>`)}</tr>`)}</tbody></table></div>`;
    // One form around the table and its actions. The count is drawn twice: a visible one the script
    // updates as a pointer drags, and a status region it writes once when the selection settles.
    const frame = sel
        ? html `<form class="table-select" data-select-text="${st.count(0).replace("0", "{n}")}" action="${safeHref(sel.form.action)}" method="${sel.form.method ?? "post"}">${hidden(sel.form.fields)}${frame0}<div class="table-select-bar" role="group" aria-label="${st.region}"><p class="table-select-count" aria-hidden="true">${st.count(ticked.size)}</p><span class="visually-hidden" role="status" data-select-live></span><span class="table-select-actions">${sel.actions}</span></div></form>`
        : frame0;
    const k = o.controls;
    if (!k)
        return frame;
    const t = TABLE[k.lang];
    let search = "";
    if (k.search) {
        const s = k.search;
        const id = `${o.id ?? "table"}-search`;
        const label = s.label ?? s.placeholder ?? t.search;
        const hide = s.placeholder !== undefined && label === s.placeholder;
        search = html `<form class="table-search" method="get"${raw(attrs({ action: s.action === undefined ? undefined : safeHref(s.action) }))} role="search" aria-label="${label}">${hidden(k.keep)}<label${raw(attrs({ class: hide ? "visually-hidden" : undefined }))} for="${id}">${label}</label><input${raw(attrs({ class: "small", type: "search", id, name: s.name ?? "q", value: s.value, placeholder: s.placeholder }))}>${button({ label: t.search, variant: "ghost", small: true })}</form>`;
    }
    const filters = k.filters?.length
        ? html `<nav class="table-filters" aria-label="${t.filters(o.label)}"><ul>${k.filters.map((f) => html `<li><a class="chip" href="${safeHref(f.href)}"${current(f.current)}>${f.label}${f.count === undefined ? "" : html ` <span class="chip-count">${count(f.count, k.lang)}</span>`}</a></li>`)}</ul></nav>`
        : "";
    const top = search || filters ? html `<div class="table-controls">${search}${filters}</div>` : "";
    const sorted = o.columns.find((col) => col.sort?.dir);
    const order = k.sort?.label ?? (sorted ? t.sortedBy(sorted.label, sorted.sort.dir) : undefined);
    let foot = "";
    if (k.paging && isHtml(k.paging))
        foot = html `<div class="table-foot">${order ? html `<p class="table-order">${order}</p>` : ""}${k.paging}</div>`;
    else if (k.paging)
        foot = html `<div class="table-foot">${pagination({ ...k.paging, label: k.paging.label ?? t.pages(o.label), lang: k.lang, order })}</div>`;
    else if (order)
        foot = html `<div class="table-foot"><p class="table-order">${order}</p></div>`;
    const body = o.rows.length === 0 && k.empty ? k.empty : frame;
    return html `<div class="data-table">${top}${body}${foot}</div>`;
}
/** A submit button[role=switch]; the server flips it and redraws the page (no script). */
export function switchButton(o) {
    const word = o.checked ? (o.on ?? "Til") : (o.off ?? "Fra");
    return html `<button${raw(attrs({ type: "submit", class: "switch", role: "switch", "aria-checked": String(o.checked), "aria-label": o.label, name: o.name, value: o.value }))}><span class="track" aria-hidden="true"></span><span class="state" aria-hidden="true">${word}</span></button>`;
}
/**
 * Empty (nothing there, or nothing matching a filter: say which), loading (the shape of what is
 * coming, announced politely) or failed (the read failed; never claims there is nothing).
 */
export function state(o) {
    if (o.kind === "loading") {
        return html `<div class="data-state loading" role="status" aria-live="polite"><span class="visually-hidden">${o.title}</span><span class="skeleton"></span><span class="skeleton"></span><span class="skeleton"></span></div>`;
    }
    const role = o.kind === "failed" ? raw(' role="alert"') : "";
    return html `<div class="data-state ${o.kind}"${role}><p class="data-state-title">${o.title}</p>${o.text ? html `<p class="data-state-text">${o.text}</p>` : ""}${o.ref && o.kind === "failed" ? errorRef({ lang: o.lang ?? "da", ref: o.ref }) : ""}${o.action ? html `<div class="data-state-actions">${o.action}</div>` : ""}</div>`;
}
// --- Dialog and the destructive-action confirm (D-23) ----------------------------------------------
/** Escapes a string for a RegExp, so it matches only itself. Browsers compile an input's pattern with
 *  the v flag, where escaping anything but these characters is a syntax error (and the browser then
 *  ignores the pattern), so this escapes exactly the syntax characters and "/". */
export const regexEscape = (s) => s.replace(/[\\^$.*+?()[\]{}|/]/g, "\\$&");
/**
 * A native <dialog>, opened as a modal by dialogScript() from a dialogTrigger() (or by the product's
 * own showModal()). What the browser does and this package relies on: showModal() makes the rest of
 * the page inert, puts focus on the autofocus element (the close button, the safe action), Escape
 * closes it, and a form method="dialog" closes it with no request. The script returns focus to the
 * trigger on close, which browsers do too but Safari not after a mouse click on a link.
 */
export function dialog(o) {
    const titleId = `${o.id}-title`;
    const closeId = `${o.id}-close`;
    const close = o.page
        ? html `<a class="button ghost" href="${safeHref(o.page.closeHref)}" autofocus>${o.close}</a>`
        : html `<button type="submit" class="ghost" form="${closeId}" value="close" autofocus>${o.close}</button>`;
    const inner = html `<div class="dialog-body" id="${`${o.id}-body`}">${o.body}</div><div class="dialog-actions">${close}${o.actions}</div>`;
    const fields = Object.entries(o.form?.fields ?? {}).map(([name, value]) => html `<input type="hidden" name="${name}" value="${value}">`);
    const content = o.form ? html `<form class="dialog-form" method="post" action="${safeHref(o.form.action)}">${fields}${inner}</form>` : inner;
    // On the fallback page it is the page's content, not a dialog over it, so it takes no dialog role.
    const alert = o.alert && !o.page;
    const a = raw(attrs({ id: o.id, role: alert ? "alertdialog" : undefined, "aria-labelledby": titleId, "aria-describedby": alert ? `${o.id}-body` : undefined }));
    if (o.page)
        return html `<section class="dialog dialog-page"${a}><h1 class="dialog-title" id="${titleId}">${o.title}</h1>${content}</section>`;
    // The close form sits outside the POST form (forms do not nest); the close button reaches it with
    // form="", so it closes the dialog without the name field's validation.
    return html `<dialog class="dialog"${a}><h2 class="dialog-title" id="${titleId}">${o.title}</h2>${content}<form method="dialog" id="${closeId}"></form></dialog>`;
}
/** The button that opens a dialog: a link to the no-script confirm page (`href`), which
 *  dialogScript() turns into showModal() on the dialog with id `dialog`. */
export function dialogTrigger(o) {
    const variant = o.variant && o.variant !== "primary" ? o.variant : null;
    return html `<a${raw(attrs({ class: cls("button", variant, o.small && "small"), href: safeHref(o.href), "data-dialog-open": o.dialog }))}>${o.label}</a>`;
}
/**
 * The triggers' script, as text: put it on the page once (dialogScript(nonce) writes the tag), or
 * bundle it. It listens on the document, so dialogs React draws later open too. Without it, or in a
 * browser with no <dialog>, the trigger is the link it is and the server's confirm page answers. A
 * modified click (a new tab) is left to the link. On close it puts focus back on the trigger and
 * resets the dialog's forms, so a half-typed name is gone when it opens again. A click on the
 * backdrop does not close it: a destructive choice is left by a button or Escape, never by a stray
 * click.
 */
export const DIALOG_SCRIPT = `(() => {
  if (typeof HTMLDialogElement !== "function") return;
  document.addEventListener("click", (e) => {
    const t = e.target instanceof Element ? e.target.closest("[data-dialog-open]") : null;
    if (!t || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const d = document.getElementById(t.getAttribute("data-dialog-open"));
    if (!(d instanceof HTMLDialogElement) || d.open) return;
    e.preventDefault();
    d.addEventListener("close", () => {
      d.querySelectorAll("form").forEach((f) => f.reset());
      t.focus();
    }, { once: true });
    d.showModal();
  });
})();`;
/** DIALOG_SCRIPT in a <script> tag, with the page's CSP nonce when it has one. */
export function dialogScript(nonce) {
    return html `<script${raw(nonce ? ` nonce="${nonce.replace(/[^A-Za-z0-9+/=_-]/g, "")}"` : "")}>${raw(DIALOG_SCRIPT)}</script>`;
}
const CONFIRM = {
    da: {
        keep: "Behold",
        removes: (list) => html `Det fjerner ${list}.`,
        removesList: "Det fjerner:",
        and: "og",
        irreversible: "Det kan ikke fortrydes.",
        typeName: (name) => html `Skriv <b>${name}</b> for at bekræfte`,
        exactly: (name) => `Skriv ${name} præcis, som det står.`,
    },
    en: {
        keep: "Keep",
        removes: (list) => html `This removes ${list}.`,
        removesList: "This removes:",
        and: "and",
        irreversible: "It can't be undone.",
        typeName: (name) => html `Type <b>${name}</b> to confirm`,
        exactly: (name) => `Type ${name} exactly as it is written.`,
    },
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
export function confirmDestructive(o) {
    const t = CONFIRM[o.lang];
    const losses = o.losses ?? [];
    const join = (items) => html `${items.slice(0, -1).map((l, i) => html `${i ? ", " : ""}${l}`)}${items.length > 1 ? ` ${t.and} ` : ""}${items[items.length - 1]}`;
    const after = [o.text, o.irreversible ? html `<strong>${t.irreversible}</strong>` : ""].filter(Boolean);
    const afterText = after.map((a, i) => html `${i ? " " : ""}${a}`);
    let words;
    if (losses.length > 4) {
        words = html `<p>${t.removesList}</p><ul class="dialog-losses">${losses.map((l) => html `<li>${l}</li>`)}</ul>${after.length ? html `<p>${afterText}</p>` : ""}`;
    }
    else {
        const sentence = losses.length ? t.removes(join(losses)) : "";
        words = sentence || after.length ? html `<p>${sentence}${sentence && after.length ? " " : ""}${afterText}</p>` : html ``;
    }
    const name = o.confirmName;
    const input = name
        ? field({
            label: o.nameLabel ?? t.typeName(name),
            name: o.confirmField ?? "confirm",
            id: `${o.id}-name`,
            // The label already says what to type; a "required" beside it would only repeat it.
            required: true,
            requiredWord: false,
            pattern: regexEscape(name),
            title: t.exactly(name),
            autocomplete: "off",
            autocapitalize: "off",
            autocorrect: "off",
            spellcheck: false,
        })
        : "";
    return dialog({
        id: o.id,
        title: o.title,
        body: html `${words}${input}`,
        close: o.keepLabel ?? t.keep,
        actions: button({ label: o.confirmLabel, variant: "danger" }),
        form: { action: o.action, fields: o.fields },
        alert: true,
        page: o.page ? { closeHref: o.page.keepHref } : undefined,
    });
}
// The package's words, as the bar's and the confirm's are (D-17, D-23). The tone's word is read
// before the text, so a screen reader hears what kind of message it is, as an eye sees from the icon.
const TOAST = {
    da: { dismiss: "Luk", region: "Beskeder", undo: "Fortryd", tone: { success: "Udført", warning: "Advarsel", danger: "Fejl", info: "Bemærk" } },
    en: { dismiss: "Dismiss", region: "Messages", undo: "Undo", tone: { success: "Done", warning: "Warning", danger: "Error", info: "Note" } },
};
// A shape per tone as well as a colour, so the tone is never told by colour alone: a tick, a
// triangle, an octagon and an i.
const TOAST_ICON = { success: "check", warning: "alert-triangle", danger: "alert-octagon", info: "info" };
/**
 * The message after a POST and its 303 (D-26): "Ændringerne er gemt." It floats at the bottom of the
 * window, with the tone's icon and, for a screen reader, its word, and a Dismiss link to this page
 * without it. Draw it early in the page (at the start of main), so a screen reader reaching the page
 * meets it first: a live region on a page that has just loaded is read in order, not announced.
 *
 * Not notice(): a notice is part of the page and stays as long as what it says is true (a form's
 * errors, a trial running out); a toast reports what the last request did and goes.
 */
export function toast(o) {
    const t = TOAST[o.lang];
    const tone = o.tone ?? "info";
    const id = o.id ?? "toast";
    const textId = `${id}-text`;
    if (o.undo && o.action)
        throw new Error("toast: give an undo or an action, not both");
    // Only a success or a fact with nothing to do may hide itself, and only through toastScript().
    const autohide = (tone === "success" || tone === "info") && !o.action && !o.undo;
    const seconds = o.undo ? Math.max(1, Math.round(o.undo.seconds ?? 10)) : undefined;
    const a = raw(attrs({ class: `toast toast-${tone}`, id, role: tone === "danger" ? "alert" : "status", "aria-live": tone === "danger" ? undefined : "polite", "data-toast-autohide": autohide ? "true" : undefined, "data-toast-undo": seconds }));
    const undo = o.undo
        ? html `<form class="toast-undo-form" method="post" action="${safeHref(o.undo.action)}">${hidden(o.undo.fields)}<button type="submit" class="ghost small" aria-describedby="${textId}">${o.undo.label ?? t.undo}</button></form>`
        : "";
    const action = o.action ? html `<a class="button ghost small" href="${safeHref(o.action.href)}" aria-describedby="${textId}">${o.action.label}</a>` : undo;
    return html `<div${a}>${icon(TOAST_ICON[tone])}<p class="toast-text" id="${textId}"><span class="visually-hidden">${t.tone[tone]}: </span>${o.text}</p><span class="toast-actions">${action}<a class="button ghost small toast-dismiss" href="${safeHref(o.dismissHref)}" data-toast-dismiss="${id}" aria-describedby="${textId}">${icon("x")}<span class="visually-hidden">${t.dismiss}</span></a></span></div>`;
}
/** Several toasts stacked at the bottom of the window, newest last, in a region named "Beskeder" /
 *  "Messages" that a screen reader can jump to. */
export function toastRegion(o) {
    return html `<section class="toast-region" aria-label="${o.label ?? TOAST[o.lang].region}">${o.toasts}</section>`;
}
/**
 * The toasts' optional script, as text (toastScript(nonce) writes the tag). Dismiss removes the toast
 * where it is and puts its link's URL in the address bar (history.replaceState), so a reload does
 * not bring it back; a modified click is left to the link. A success or info toast with no action
 * hides itself after 8 seconds, waiting while the pointer or focus is on it. A danger or warning
 * toast never does, whatever its markup says: a failure stays until a person has read it. Under
 * prefers-reduced-motion nothing hides by itself, and Dismiss still works.
 */
export const TOAST_SCRIPT = `(() => {
  const gone = (t, href) => {
    const region = t.parentElement;
    t.remove();
    if (region && region.classList.contains("toast-region") && !region.querySelector(".toast")) region.remove();
    if (href) try { history.replaceState(history.state, "", href); } catch {}
  };
  document.addEventListener("click", (e) => {
    const a = e.target instanceof Element ? e.target.closest("[data-toast-dismiss]") : null;
    if (!a || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const t = a.closest(".toast");
    if (!t) return;
    e.preventDefault();
    gone(t, a.getAttribute("href"));
  });
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const undoable = () => [...document.querySelectorAll(".toast[data-toast-undo]")].filter((t) => t.getAttribute("data-toast-undo"));
  document.addEventListener("submit", (e) => {
    const f = e.target;
    if (!(f instanceof Element) || !f.matches("form.toast-undo-form")) return;
    const t = f.closest(".toast");
    if (!t) return;
    if (!t.dispatchEvent(new CustomEvent("ui:undo", { bubbles: true, cancelable: true, detail: { form: f } }))) {
      e.preventDefault();
      gone(t, t.querySelector("[data-toast-dismiss]")?.getAttribute("href"));
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || e.defaultPrevented || document.querySelector("dialog[open]")) return;
    const all = undoable();
    const active = document.activeElement;
    const t = all.find((x) => x.contains(active)) || (!active || active === document.body ? all[all.length - 1] : null);
    if (t) gone(t, t.querySelector("[data-toast-dismiss]")?.getAttribute("href"));
  });
  for (const t of undoable()) {
    const total = Number(t.getAttribute("data-toast-undo")) * 1000;
    if (!(total > 0)) continue;
    const bar = document.createElement("progress");
    bar.className = "toast-time-bar";
    bar.max = total;
    const text = document.createElement("span");
    text.className = "toast-time-text";
    const box = document.createElement("span");
    box.className = "toast-time";
    box.setAttribute("aria-hidden", "true");
    box.append(bar, text);
    t.append(box);
    let left = total, last = Date.now();
    const paint = () => {
      bar.value = left;
      text.textContent = Math.ceil(left / 1000) + " s";
    };
    paint();
    const timer = setInterval(() => {
      const now = Date.now();
      const paused = t.matches(":hover, :focus-within");
      t.toggleAttribute("data-paused", paused);
      if (!paused) left -= now - last;
      last = now;
      if (!t.isConnected) return clearInterval(timer);
      if (left <= 0) {
        clearInterval(timer);
        return gone(t, t.querySelector("[data-toast-dismiss]")?.getAttribute("href"));
      }
      paint();
    }, reduce ? 1000 : 100);
  }
  if (reduce) return;
  for (const t of document.querySelectorAll(".toast[data-toast-autohide]")) {
    if (t.classList.contains("toast-danger") || t.classList.contains("toast-warning") || t.getAttribute("role") === "alert") continue;
    let timer = 0;
    const start = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (t.matches(":hover, :focus-within")) return;
        gone(t, t.querySelector("[data-toast-dismiss]")?.getAttribute("href"));
      }, 8000);
    };
    const wait = () => clearTimeout(timer);
    t.addEventListener("pointerenter", wait);
    t.addEventListener("focusin", wait);
    t.addEventListener("pointerleave", start);
    t.addEventListener("focusout", start);
    start();
  }
})();`;
/** TOAST_SCRIPT in a <script> tag, with the page's CSP nonce when it has one. */
export function toastScript(nonce) {
    return html `<script${raw(nonce ? ` nonce="${nonce.replace(/[^A-Za-z0-9+/=_-]/g, "")}"` : "")}>${raw(TOAST_SCRIPT)}</script>`;
}
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
export function tooltip(o) {
    const trigger = raw(attrs({ type: "button", class: "tooltip-trigger", popovertarget: o.id, popovertargetaction: "show", interestfor: o.id, "aria-describedby": o.id, "aria-label": o.label }));
    return html `<span class="tooltip-wrap"><button${trigger}>${o.trigger}</button><span class="tooltip" id="${o.id}" popover="auto" role="tooltip">${o.text}</span></span>`;
}
const AGENT = {
    da: {
        waiting: "Venter på godkendelse",
        askedBy: "Anmodet af",
        via: (who, agent) => html `${who} via ${agent}`,
        expires: "Udløber",
        why: "Hvorfor",
        follows: "Følger",
        changes: "Hvad ændres",
        nothing: "Intet ændres.",
        more: (k) => `+${k} flere`,
        effects: "Hvad det gør",
        approve: "Godkend",
        edit: "Ret først",
        reject: "Afvis",
        draft: "Se udkastet",
        outcome: { approved: "Godkendt", rejected: "Afvist", expired: "Udløbet" },
        by: "af",
        field: "Felt",
        before: "Før",
        after: "Efter",
        none: "Ingen",
        added: "Tilføjet:",
        removed: "Fjernet:",
        explain: (agent) => `Hvorfor ${agent} gjorde det`,
        basedOn: "Ud fra",
    },
    en: {
        waiting: "Waiting for approval",
        askedBy: "Asked by",
        via: (who, agent) => html `${who} via ${agent}`,
        expires: "Expires",
        why: "Why",
        follows: "Follows",
        changes: "What changes",
        nothing: "Nothing changes.",
        more: (k) => `+${k} more`,
        effects: "What it does",
        approve: "Approve",
        edit: "Edit first",
        reject: "Reject",
        draft: "See the draft",
        outcome: { approved: "Approved", rejected: "Rejected", expired: "Expired" },
        by: "by",
        field: "Field",
        before: "Before",
        after: "After",
        none: "None",
        added: "Added:",
        removed: "Removed:",
        explain: (agent) => `Why ${agent} did this`,
        basedOn: "Based on",
    },
};
const LOCALE = { da: "da-DK", en: "en-GB" };
function when(w, lang, time = "full") {
    if (typeof w === "string")
        return html `${w}`;
    const at = w instanceof Date ? w : w.at;
    const label = w instanceof Date ? new Intl.DateTimeFormat(LOCALE[lang], { ...(time === "full" ? { dateStyle: "medium" } : {}), timeStyle: "short", timeZone: "Europe/Copenhagen" }).format(at) : w.label;
    return html `<time datetime="${at.toISOString()}">${label}</time>`;
}
const hidden = (fields = {}) => Object.entries(fields).map(([name, value]) => html `<input type="hidden" name="${name}" value="${value}">`);
/** "A, B og C", with the page's word for and. */
const joinAnd = (items, and) => html `${items.map((l, i) => html `${i === 0 ? "" : i === items.length - 1 ? ` ${and} ` : ", "}${l}`)}`;
const followsLinks = (links, t, lang) => links.length ? html `<span class="agent-follows">${t.follows} ${joinAnd(links.map((l) => html `<a href="${safeHref(l.href)}">${l.label}</a>`), lang === "da" ? "og" : "and")}</span>` : "";
const OUTCOME_SIGNAL = { approved: "ok", rejected: "off", expired: "warn" };
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
export function approval(o) {
    const t = AGENT[o.lang];
    const titleId = `${o.id}-title`;
    const h = o.headingLevel ?? 2;
    const fact = (label, value) => html `<div><dt>${label}</dt><dd>${value}</dd></div>`;
    const show = Math.max(0, o.changes.show ?? 3);
    const drawn = o.changes.items.slice(0, show);
    const more = Math.max(0, (o.changes.total ?? o.changes.items.length) - drawn.length);
    const item = (c) => (Array.isArray(c) ? html `<span class="approval-item-name">${c[0]}</span>${c.slice(1).map((p) => html ` · ${p}`)}` : c);
    const moreText = t.more(more);
    const changes = drawn.length || more
        ? html `<ul class="approval-changes">${drawn.map((c) => html `<li>${item(c)}</li>`)}${more ? html `<li class="approval-more">${o.changes.moreHref ? html `<a href="${safeHref(o.changes.moreHref)}">${moreText}</a>` : moreText}</li>` : ""}</ul>`
        : html `<p>${t.nothing}</p>`;
    const effects = o.effects?.length
        ? html `<ul class="approval-effects">${o.effects.map((e) => html `<li${raw(attrs({ class: e.tone }))}>${e.tone ? html `<strong>${e.text}</strong>` : e.text}</li>`)}</ul>`
        : "";
    const facts = html `<dl class="approval-facts">${fact(t.askedBy, o.onBehalfOf ? t.via(html `${o.onBehalfOf}`, o.agent) : o.agent)}${o.expires && !o.outcome ? fact(t.expires, when(o.expires, o.lang)) : ""}${o.why ? fact(t.why, html `${o.why.text}${o.why.links?.length ? " " : ""}${followsLinks(o.why.links ?? [], t, o.lang)}`) : ""}${fact(t.changes, changes)}${effects ? fact(t.effects, effects) : ""}</dl>`;
    // The buttons name the request for a screen reader through the title, so three "Godkend" on one
    // page are told apart.
    const described = raw(` aria-describedby="${esc(titleId)}"`);
    const actions = o.outcome
        ? outcomeLine(o.outcome, t, o.lang)
        : html `<div class="approval-actions"><form method="post" action="${safeHref(o.approve.action)}">${hidden(o.approve.fields)}<button type="submit"${described}>${o.approve.label ?? t.approve}</button></form>${o.edit ? html `<a class="button ghost" href="${safeHref(o.edit.href)}"${described}>${o.edit.label ?? t.edit}</a>` : ""}${o.reject ? html `<form method="post" action="${safeHref(o.reject.action)}">${hidden(o.reject.fields)}<button type="submit" class="ghost"${described}>${o.reject.label ?? t.reject}</button></form>` : ""}${o.draftHref ? html `<a class="go" href="${safeHref(o.draftHref)}">${t.draft}</a>` : ""}</div>`;
    const kicker = html `<p class="approval-kicker"><span class="approval-agent">${o.agent}</span>${o.outcome ? "" : html ` · ${t.waiting}`}</p>`;
    const title = raw(`<h${h} class="approval-title" id="${esc(titleId)}">${render(o.title)}</h${h}>`);
    return html `<section class="approval" id="${o.id}" aria-labelledby="${titleId}">${kicker}${title}${o.summary ? html `<p class="approval-summary">${o.summary}</p>` : ""}${facts}${o.explain}${actions}</section>`;
}
function outcomeLine(out, t, lang) {
    const by = out.by && out.status !== "expired" ? html ` ${t.by} ${out.by}` : "";
    const at = out.at ? html `${by ? " ·" : ""} ${when(out.at, lang)}` : "";
    // One span for the words: the signal is a flex row, and loose text and <time> would each be an
    // item with the row's gap between them.
    return html `<div class="approval-outcome"><p>${signal(html `<span>${t.outcome[out.status]}${by}${at}</span>`, OUTCOME_SIGNAL[out.status])}</p>${out.note ? html `<p>${out.note}</p>` : ""}</div>`;
}
/**
 * A change to fields or text, as the caller computed it: no diffing here, so the server decides what
 * changed and the page only shows it. Fields are a table with "Før" and "Efter" as its columns; lines
 * carry a sign (+, −) and, for a screen reader, the words "Tilføjet:" and "Fjernet:", so added and
 * removed are never told apart by colour alone. Pass only what differs, as Spring's channel card
 * does: a whole text twice makes the reader find the change by eye.
 */
export function diff(o) {
    const t = AGENT[o.lang];
    const label = o.label ?? t.changes;
    const value = (v) => (v === undefined || v === null || v === false || v === "" ? html `<span class="diff-none">${t.none}</span>` : v);
    const fields = o.fields?.length
        ? table({ label, columns: [{ label: t.field }, { label: t.before }, { label: t.after }], rows: o.fields.map((f) => [html `<span class="diff-field">${f.label}</span>`, value(f.before), value(f.after)]) })
        : "";
    const line = (l) => {
        if (l.kind === "same")
            return html `<li class="diff-line"><span class="diff-sign" aria-hidden="true"></span><span class="diff-text">${l.text}</span></li>`;
        const added = l.kind === "added";
        const tagName = added ? "ins" : "del";
        return html `<li class="${`diff-line ${l.kind}`}"><span class="diff-sign" aria-hidden="true">${added ? "+" : "−"}</span>${raw(`<${tagName} class="diff-text">`)}<span class="visually-hidden">${added ? t.added : t.removed} </span>${l.text}${raw(`</${tagName}>`)}</li>`;
    };
    const lines = o.lines?.length ? html `<ul class="diff-lines">${o.lines.map(line)}</ul>` : "";
    return html `<figure class="diff">${o.label ? html `<figcaption class="diff-label">${o.label}</figcaption>` : ""}${fields}${lines}</figure>`;
}
/**
 * "Hvorfor Spring gjorde det": the trail of steps behind something an agent did or asks to do, as an
 * ordered list in a details element, closed so it costs the page one line until someone asks. A
 * Date on a step is written as a time of day: a trail is minutes long.
 */
export function explain(o) {
    const t = AGENT[o.lang];
    const step = (s) => {
        const used = s.used ? html `${t.basedOn} ${s.used.href ? html `<a href="${safeHref(s.used.href)}">${s.used.label}</a>` : s.used.label}` : "";
        const at = s.at ? when(s.at, o.lang, "time") : "";
        const meta = used || at ? html `<span class="explain-meta">${used}${used && at ? " · " : ""}${at}</span>` : "";
        return html `<li><span class="explain-text">${s.text}</span>${meta}</li>`;
    };
    const follows = o.follows?.length ? html `<p class="explain-follows">${followsLinks(o.follows, t, o.lang)}</p>` : "";
    return html `<details class="explain"><summary>${t.explain(o.agent)}</summary><div class="explain-body"><ol class="explain-steps">${o.steps.map(step)}</ol>${follows}</div></details>`;
}
/** The divider between two ways in: "eller". */
export const orDivider = (text) => html `<p class="or"><span>${text}</span></p>`;
const GOOGLE_G = `<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>`;
/** Google's button (google-button.css), as a submit button for the caller's form. */
export function googleButton(label) {
    return html `<button class="gsi" type="submit">${raw(GOOGLE_G)}<span>${label}</span></button>`;
}
// --- Micro-interactions (D-53) ---------------------------------------------------------------------
// Seven small behaviours at component level, so every product gets them from the package. Each is
// markup that works with no script (a server-drawn state, a form, a link) plus, where it needs one,
// a script in the package's usual shape: a *_SCRIPT text and *Script(nonce) writing the tag. Every
// script listens on the document, so markup React draws later works too.
const scriptTag = (text, nonce) => html `<script${raw(nonce ? ` nonce="${nonce.replace(/[^A-Za-z0-9+/=_-]/g, "")}"` : "")}>${raw(text)}</script>`;
/**
 * 1. Working, then a tick (button({ progress })). A submit button says it is working (a spinner and
 * the product's word, aria-busy, still focusable, a second press ignored) and then that it is done
 * (a tick and the word) for two seconds, then goes back to its label. The words are announced once,
 * through the button's own status region, never through the button. The script sets "working" on
 * submit; the product sends `ui:button-done` (or `ui:button-working`, `ui:button-reset`) as a
 * bubbling event on the button or its form when it knows. A page restored from the back-forward cache
 * resets every busy button. Without the script the server draws the state (`progress.state`).
 */
export const BUTTON_SCRIPT = `(() => {
  const DONE_MS = 2000;
  const saved = new WeakMap();
  const timers = new WeakMap();
  const find = (t) => (t instanceof Element ? (t.matches("button[data-working]") ? t : t.querySelector("button[data-working]")) : null);
  const say = (b, text) => {
    const s = b.parentElement && b.parentElement.querySelector('[role="status"]');
    if (s) s.textContent = text;
  };
  const reset = (b) => {
    clearTimeout(timers.get(b));
    if (saved.has(b)) b.innerHTML = saved.get(b);
    saved.delete(b);
    b.removeAttribute("aria-busy");
    b.removeAttribute("data-state");
    say(b, "");
  };
  const show = (b, state) => {
    clearTimeout(timers.get(b));
    if (!saved.has(b) && !b.hasAttribute("data-state")) saved.set(b, b.innerHTML);
    b.setAttribute("data-state", state);
    if (state === "working") {
      b.setAttribute("aria-busy", "true");
      const spin = document.createElement("span");
      spin.className = "spinner";
      spin.setAttribute("aria-hidden", "true");
      b.replaceChildren(spin, document.createTextNode(b.getAttribute("data-working")));
      say(b, b.getAttribute("data-working"));
    } else {
      b.removeAttribute("aria-busy");
      const tpl = b.parentElement && b.parentElement.querySelector("template[data-done-icon]");
      b.replaceChildren(...(tpl ? [tpl.content.cloneNode(true)] : []), document.createTextNode(b.getAttribute("data-done")));
      say(b, b.getAttribute("data-done"));
      timers.set(b, setTimeout(() => reset(b), DONE_MS));
    }
  };
  document.addEventListener("click", (e) => {
    const b = e.target instanceof Element ? e.target.closest("button[data-working]") : null;
    if (b && b.getAttribute("aria-busy") === "true") e.preventDefault();
  });
  document.addEventListener("submit", (e) => {
    const b = e.submitter instanceof Element ? e.submitter.closest("button[data-working]") : find(e.target);
    if (!b) return;
    if (b.getAttribute("aria-busy") === "true") return e.preventDefault();
    show(b, "working");
  });
  for (const [type, f] of [["ui:button-working", (b) => show(b, "working")], ["ui:button-done", (b) => show(b, "done")], ["ui:button-reset", reset]]) {
    document.addEventListener(type, (e) => {
      const b = find(e.target);
      if (b) f(b);
    });
  }
  addEventListener("pageshow", (e) => {
    if (e.persisted) for (const b of document.querySelectorAll('button[data-working][aria-busy="true"]')) reset(b);
  });
})();`;
/** BUTTON_SCRIPT in a <script> tag, with the page's CSP nonce when it has one. */
export const buttonScript = (nonce) => scriptTag(BUTTON_SCRIPT, nonce);
export function changedValue(content, o = {}) {
    return html `<span${raw(attrs({ class: "changed-value", "data-changed": o.changed ? "true" : undefined }))}>${content}</span>`;
}
export const CHANGED_SCRIPT = `(() => {
  const MS = 1600;
  const timers = new WeakMap();
  const clear = (el) => timers.set(el, setTimeout(() => el.removeAttribute("data-changed"), MS));
  document.addEventListener("ui:changed", (e) => {
    const el = e.target;
    if (!(el instanceof Element)) return;
    clearTimeout(timers.get(el));
    el.removeAttribute("data-changed");
    void el.offsetWidth;
    el.setAttribute("data-changed", "true");
    clear(el);
  });
  for (const el of document.querySelectorAll("[data-changed]")) clear(el);
})();`;
/** CHANGED_SCRIPT in a <script> tag, with the page's CSP nonce when it has one. */
export const changedScript = (nonce) => scriptTag(CHANGED_SCRIPT, nonce);
/**
 * 4. Selecting rows (table({ selectable })). The checkbox column is a form: tick and press an action,
 * with no script. The script adds a drag from one checkbox down or up over the rows (on a touch
 * screen only a drag that starts in the checkbox column, so the page still scrolls), Shift+click and
 * Shift+Space for a range from the last row touched, Arrow keys between the checkboxes and Shift+Arrow
 * to extend, and the count: "3 selected" on screen as a drag moves, and in the status region once
 * when the selection settles.
 */
export const TABLE_SELECT_SCRIPT = `(() => {
  const boxes = (f) => [...f.querySelectorAll("tbody td.select input[type=checkbox]")];
  const formOf = (el) => (el instanceof Element ? el.closest("form.table-select") : null);
  const say = (f, live) => {
    const n = boxes(f).filter((b) => b.checked).length;
    const text = (f.getAttribute("data-select-text") || "{n}").replace("{n}", n);
    const c = f.querySelector(".table-select-count");
    if (c) c.textContent = text;
    const l = f.querySelector("[data-select-live]");
    if (live && l) l.textContent = text;
  };
  // A session remembers which boxes were ticked when a range began, so moving back shrinks the range.
  const begin = (f, box, mode) => ({ f, box, mode, orig: boxes(f).map((b) => b.checked), moved: false });
  const apply = (s, to, notify) => {
    const list = boxes(s.f);
    const a = list.indexOf(s.box), b = list.indexOf(to);
    if (a < 0 || b < 0) return;
    const lo = Math.min(a, b), hi = Math.max(a, b);
    list.forEach((x, i) => {
      const want = i >= lo && i <= hi ? s.mode : s.orig[i];
      if (x.checked === want) return;
      x.checked = want;
      if (notify) x.dispatchEvent(new Event("change", { bubbles: true }));
    });
  };
  const anchors = new WeakMap();
  // A run of Shift+Arrow keeps one session, so going back up shrinks what going down grew.
  const runs = new WeakMap();
  let drag = null;
  let suppress = false;
  document.addEventListener("pointerdown", (e) => {
    const td = e.target instanceof Element ? e.target.closest("td.select") : null;
    const f = formOf(td);
    if (!td || !f || e.button !== 0 || e.shiftKey) return;
    const box = td.querySelector("input[type=checkbox]");
    if (!box) return;
    drag = { ...begin(f, box, !box.checked), id: e.pointerId, td, onInput: e.target === box };
  });
  document.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const tr = document.elementFromPoint(e.clientX, e.clientY)?.closest("tr");
    const to = tr && drag.f.contains(tr) ? tr.querySelector("td.select input[type=checkbox]") : null;
    if (!to) return;
    if (to !== drag.box) {
      drag.moved = true;
      drag.f.setAttribute("data-dragging", "");
      getSelection()?.removeAllRanges();
    }
    if (drag.moved) {
      apply(drag, to, false);
      say(drag.f, false);
    }
  });
  const end = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    drag = null;
    d.f.removeAttribute("data-dragging");
    if (e.type === "pointercancel") {
      boxes(d.f).forEach((x, i) => (x.checked = d.orig[i]));
      return say(d.f, false);
    }
    if (d.moved) {
      suppress = true;
      setTimeout(() => (suppress = false), 0);
      const list = boxes(d.f);
      list.forEach((x, i) => x.checked !== d.orig[i] && x.dispatchEvent(new Event("change", { bubbles: true })));
      anchors.set(d.f, list.find((x, i) => x.checked !== d.orig[i]) || d.box);
      say(d.f, true);
    } else if (!d.onInput && e.target instanceof Element && d.td.contains(e.target)) {
      d.box.click();
    }
  };
  document.addEventListener("pointerup", end);
  document.addEventListener("pointercancel", end);
  document.addEventListener("click", (e) => {
    const box = e.target instanceof HTMLInputElement && e.target.closest("td.select") ? e.target : null;
    const f = formOf(box);
    if (!box || !f) return;
    if (suppress) {
      suppress = false;
      return e.preventDefault();
    }
    const from = anchors.get(f);
    runs.delete(f);
    if (e.shiftKey && from && from !== box) apply(begin(f, from, box.checked), box, true);
    anchors.set(f, box);
    say(f, true);
  });
  document.addEventListener("keydown", (e) => {
    const box = e.target instanceof HTMLInputElement && e.target.closest("td.select") ? e.target : null;
    const f = formOf(box);
    if (!box || !f || e.altKey || e.ctrlKey || e.metaKey) return;
    const list = boxes(f);
    const i = list.indexOf(box);
    if (e.key === " " && e.shiftKey) {
      e.preventDefault();
      runs.delete(f);
      const from = anchors.get(f);
      if (from && from !== box) {
        apply(begin(f, from, !box.checked), box, true);
      } else {
        box.checked = !box.checked;
        box.dispatchEvent(new Event("change", { bubbles: true }));
      }
      anchors.set(f, box);
      return say(f, true);
    }
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const to = list[i + (e.key === "ArrowDown" ? 1 : -1)];
    e.preventDefault();
    if (!to) return;
    if (e.shiftKey) {
      if (!runs.has(f)) runs.set(f, begin(f, anchors.get(f) || box, true));
      const run = runs.get(f);
      anchors.set(f, run.box);
      apply(run, to, true);
      say(f, true);
    } else {
      runs.delete(f);
    }
    to.focus();
  });
})();`;
/** TABLE_SELECT_SCRIPT in a <script> tag, with the page's CSP nonce when it has one. */
export const tableSelectScript = (nonce) => scriptTag(TABLE_SELECT_SCRIPT, nonce);
const HOLD = { da: "Hold nede", en: "Hold to confirm" };
export function holdToConfirm(o) {
    const hint = o.holdLabel ?? HOLD[o.lang];
    const a = raw(attrs({ class: "button danger hold-button", href: safeHref(o.href), "data-dialog-open": o.dialog, "data-hold-form": o.id }));
    return html `<span class="hold"><a${a}><span class="hold-fill" aria-hidden="true"><span>${hint}</span></span><span class="hold-label">${o.label}</span><span class="hold-hint" aria-hidden="true">${hint}</span></a><form class="hold-form" id="${o.id}" method="post" action="${safeHref(o.action)}" hidden>${hidden(o.fields)}</form></span>`;
}
export const HOLD_SCRIPT = `(() => {
  const HOLD_MS = 1000;
  const EARLY_MS = 200;
  let cur = null;
  let swallow = false;
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const paint = (a, f) => a.style.setProperty("--_hold", String(f));
  const stop = () => {
    if (!cur) return;
    cancelAnimationFrame(cur.raf);
    clearTimeout(cur.timer);
    cur.a.removeAttribute("data-holding");
    paint(cur.a, 0);
    cur = null;
  };
  const step = () => {
    if (!cur) return;
    const t = performance.now() - cur.start;
    const f = Math.min(1, t / HOLD_MS);
    paint(cur.a, reduced() ? Math.floor(f * 4) / 4 : f);
    if (t >= HOLD_MS) {
      const form = document.getElementById(cur.a.getAttribute("data-hold-form"));
      paint(cur.a, 1);
      cur.done = true;
      swallow = true;
      cur.a.removeAttribute("data-holding");
      cur = null;
      if (form instanceof HTMLFormElement) form.requestSubmit();
      return;
    }
    if (reduced()) cur.timer = setTimeout(step, 250);
    else cur.raf = requestAnimationFrame(step);
  };
  document.addEventListener("pointerdown", (e) => {
    const a = e.target instanceof Element ? e.target.closest("[data-hold-form]") : null;
    if (!a || e.button !== 0 || e.pointerType === "mouse" || !matchMedia("(pointer: coarse)").matches) return;
    stop();
    swallow = false;
    cur = { a, id: e.pointerId, start: performance.now(), raf: 0, timer: 0, done: false };
    a.setAttribute("data-holding", "true");
    step();
  });
  const release = (e) => {
    if (!cur || e.pointerId !== cur.id) return;
    const early = performance.now() - cur.start;
    stop();
    // A hold let go after a moment was a try at holding: it must not open the dialog by its click.
    if (e.type === "pointerup" && early >= EARLY_MS) {
      swallow = true;
      setTimeout(() => (swallow = false), 400);
    }
  };
  document.addEventListener("pointerup", release);
  document.addEventListener("pointercancel", release);
  document.addEventListener("click", (e) => {
    if (!swallow || !(e.target instanceof Element) || !e.target.closest("[data-hold-form]")) return;
    swallow = false;
    e.preventDefault();
    e.stopImmediatePropagation();
  }, true);
  document.addEventListener("contextmenu", (e) => {
    if (cur || (e.target instanceof Element && e.target.closest("[data-hold-form]") && matchMedia("(pointer: coarse)").matches)) e.preventDefault();
  });
})();`;
/** HOLD_SCRIPT in a <script> tag, with the page's CSP nonce when it has one. */
export const holdScript = (nonce) => scriptTag(HOLD_SCRIPT, nonce);
const CUTOFF = {
    da: { before: "Frist om", passed: "Frist overskredet", under: "under 1 min", d: "d", h: "t", min: "min" },
    en: { before: "Cut-off in", passed: "Cut-off passed", under: "under 1 min", d: "d", h: "h", min: "min" },
};
/** "1 h 20 min", "2 d 3 h", "20 min": the minutes left rounded up (a countdown says 20 min until it is 19), the
 *  units of the page's language. Nothing left is "under 1 min". */
export function timeLeft(ms, lang) {
    const t = CUTOFF[lang];
    const minutes = Math.ceil(ms / 60000);
    if (minutes < 1)
        return t.under;
    const d = Math.floor(minutes / 1440);
    const h = Math.floor((minutes % 1440) / 60);
    const m = minutes % 60;
    const part = (n, u) => (n ? `${n} ${u}` : "");
    return (d ? [part(d, t.d), part(h, t.h)] : h ? [part(h, t.h), part(m, t.min)] : [part(m, t.min)]).filter(Boolean).join(" ");
}
export function cutoff(o) {
    const at = o.at instanceof Date ? o.at : new Date(o.at);
    if (Number.isNaN(at.getTime()))
        throw new Error("cutoff: `at` is not a date");
    const t = CUTOFF[o.lang];
    const words = o.words ?? { before: t.before, passed: t.passed };
    const warn = Math.max(0, o.warnWithin ?? 60);
    const left = at.getTime() - o.now.getTime();
    const state = left <= 0 ? "passed" : left <= warn * 60000 ? "warning" : "soon";
    const text = state === "passed" ? words.passed : `${words.before} ${timeLeft(left, o.lang)}`;
    const a = {
        class: cls("tag cutoff", state === "warning" && "warning", state === "passed" && "danger"),
        datetime: at.toISOString(),
        "data-cutoff": at.toISOString(),
        "data-warn": warn,
        "data-before": words.before,
        "data-passed": words.passed,
        "data-units": `${t.d},${t.h},${t.min},${t.under}`,
        "data-state": state,
    };
    return html `<time${raw(attrs(a))}><span class="cutoff-icon cutoff-icon-soon" aria-hidden="true">${icon("clock")}</span><span class="cutoff-icon cutoff-icon-warning" aria-hidden="true">${icon("alert-triangle")}</span><span class="cutoff-icon cutoff-icon-passed" aria-hidden="true">${icon("alert-octagon")}</span><span class="cutoff-text">${text}</span></time>`;
}
/** The rows nearest their cut-off first: those still to come, soonest first, then the ones that have
 *  passed, most recent first, then the ones with no cut-off, in the order given. Stable, and the
 *  array is a copy. */
export function sortByCutoff(rows, at, now) {
    const time = (r) => {
        const v = at(r);
        const n = v === null || v === undefined ? Number.NaN : (v instanceof Date ? v : new Date(v)).getTime();
        return n;
    };
    const rank = (n) => (Number.isNaN(n) ? 2 : n > now.getTime() ? 0 : 1);
    return rows
        .map((r, i) => ({ r, i, n: time(r) }))
        .sort((a, b) => rank(a.n) - rank(b.n) || (rank(a.n) === 0 ? a.n - b.n : rank(a.n) === 1 ? b.n - a.n : 0) || a.i - b.i)
        .map((x) => x.r);
}
export const COUNTDOWN_SCRIPT = `(() => {
  const left = (ms, u) => {
    const minutes = Math.ceil(ms / 60000);
    if (minutes < 1) return u[3];
    const d = Math.floor(minutes / 1440), h = Math.floor((minutes % 1440) / 60), m = minutes % 60;
    const part = (n, w) => (n ? n + " " + w : "");
    return (d ? [part(d, u[0]), part(h, u[1])] : h ? [part(h, u[1]), part(m, u[2])] : [part(m, u[2])]).filter(Boolean).join(" ");
  };
  const run = () => {
    for (const c of document.querySelectorAll("time[data-cutoff]")) {
      const ms = Date.parse(c.getAttribute("data-cutoff")) - Date.now();
      const warn = Number(c.getAttribute("data-warn")) * 60000;
      const state = ms <= 0 ? "passed" : ms <= warn ? "warning" : "soon";
      const text = state === "passed" ? c.getAttribute("data-passed") : c.getAttribute("data-before") + " " + left(ms, c.getAttribute("data-units").split(","));
      const t = c.querySelector(".cutoff-text");
      if (t && t.textContent !== text) t.textContent = text;
      if (c.getAttribute("data-state") === state) continue;
      c.setAttribute("data-state", state);
      c.classList.toggle("warning", state === "warning");
      c.classList.toggle("danger", state === "passed");
    }
  };
  run();
  const next = () => setTimeout(() => { run(); next(); }, 60000 - (Date.now() % 60000) + 50);
  next();
})();`;
/** COUNTDOWN_SCRIPT in a <script> tag, with the page's CSP nonce when it has one. */
export const countdownScript = (nonce) => scriptTag(COUNTDOWN_SCRIPT, nonce);
export function progress(o) {
    if (!(o.max > 0) || !Number.isFinite(o.max))
        throw new Error("progress: max must be above 0");
    const value = Number.isFinite(o.value) ? Math.min(o.max, Math.max(0, o.value)) : 0;
    const id = o.id ?? "progress";
    const a = { class: "progress", role: "progressbar", value, max: o.max, "aria-valuemin": 0, "aria-valuemax": o.max, "aria-valuenow": value, "aria-labelledby": `${id}-label` };
    return html `<div class="progress-block"><progress${raw(attrs(a))}></progress><p class="progress-label" id="${id}-label">${o.label}</p></div>`;
}

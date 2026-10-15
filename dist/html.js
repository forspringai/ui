// Small typed helpers that return the component layer's markup as HTML, so a product on Workers can
// draw its pages with no framework (hub ui-standard §1: thin console pages, server-rendered, no
// script). No dependencies, so it runs anywhere a string does.
//
// Everything interpolated is escaped. A helper returns Html, which passes through other helpers and
// the html`` tag unescaped; a plain string is always text. raw() is the one way to vouch for a
// string as markup, for a stylesheet or markup the caller built and escaped itself. String(h) or
// `${h}` gives the HTML.
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
};
/** This package's version, the same as package.json's (a test checks), for the default brand path. */
export const VERSION = "0.9.0";
// --- Fonts ------------------------------------------------------------------------------------------
// The files' own coverage: Google Fonts' "latin" subset (Basic Latin, Latin-1 and the common
// punctuation), as forspring.ai and the account ship them. Roboto is Latin-1 only.
const LATIN = "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+2000-206F, U+20AC, U+2122, U+2190-2193, U+2212, U+2215, U+2248, U+FEFF, U+FFFD";
const FACES = [
    { family: "Archivo", file: "archivo.woff2", weight: "100 900", range: LATIN },
    { family: "Archivo Condensed", file: "archivo-condensed.woff2", weight: "700 900", range: LATIN },
    { family: "Space Mono", file: "space-mono.woff2", weight: "400", range: LATIN },
];
const GOOGLE_FACE = { family: "Roboto GSI", file: "roboto-medium.woff2", weight: "500", range: "U+0000-00FF" };
/**
 * The @font-face rules, with the font files under `base` ("/assets/fonts/" when a product serves the
 * package's fonts/ there, "../fonts/" for dist/fonts.css). `google: true` adds Roboto Medium for the
 * Google button.
 */
const face = (f, base) => `@font-face {\n  font-family: "${f.family}";\n  src: url("${base}${f.file}") format("woff2");\n  font-weight: ${f.weight};\n  font-style: normal;\n  font-display: swap;\n  unicode-range: ${f.range};\n}\n`;
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
const MARK_SVG = `<svg class="mark" viewBox="${MARK_VIEWBOX}" aria-hidden="true" focusable="false"><g class="fill" fill-rule="evenodd"><path d="M -146.98 63.23 A 160 160 0 1 1 146.98 63.23 A 346 346 0 0 1 -146.98 63.23 Z M -89 -44 a 28 28 0 1 0 56 0 a 28 28 0 1 0 -56 0 M 33 -44 a 28 28 0 1 0 56 0 a 28 28 0 1 0 -56 0"/><path d="M -146.98 63.23 A 346 346 0 0 0 146.98 63.23 A 160 160 0 0 1 -146.98 63.23 Z" transform="translate(0 48)"/></g><path class="coil" d="M 0.0 89.0 C 5.3 89.0 21.3 89.5 32.0 89.1 C 42.7 88.6 58.7 86.4 64.0 86.1 C 69.3 85.9 69.3 86.4 64.0 87.7 C 58.7 88.9 42.7 92.2 32.0 93.7 C 21.3 95.2 10.7 96.2 0.0 96.8 C -10.7 97.3 -21.3 97.3 -32.0 96.8 C -42.7 96.3 -58.7 94.1 -64.0 93.9 C -69.3 93.6 -69.3 94.2 -64.0 95.4 C -58.7 96.7 -42.7 100.0 -32.0 101.5 C -21.3 103.0 -10.7 104.0 -0.0 104.5 C 10.7 105.0 21.3 105.0 32.0 104.6 C 42.7 104.1 58.7 101.9 64.0 101.6 C 69.3 101.4 69.3 101.9 64.0 103.2 C 58.7 104.4 42.7 107.7 32.0 109.2 C 21.3 110.7 10.7 111.7 0.0 112.2 C -10.7 112.8 -21.3 112.8 -32.0 112.3 C -42.7 111.8 -58.7 109.6 -64.0 109.4 C -69.3 109.1 -69.3 109.7 -64.0 110.9 C -58.7 112.2 -42.7 115.5 -32.0 117.0 C -21.3 118.5 -10.7 119.5 -0.0 120.0 C 10.7 120.5 21.3 120.5 32.0 120.1 C 42.7 119.6 58.7 117.4 64.0 117.1 C 69.3 116.9 69.3 117.4 64.0 118.7 C 58.7 119.9 42.7 123.2 32.0 124.7 C 21.3 126.2 10.7 127.2 0.0 127.8 C -10.7 128.3 -21.3 128.3 -32.0 127.8 C -42.7 127.3 -58.7 125.1 -64.0 124.9 C -69.3 124.6 -69.3 125.2 -64.0 126.4 C -58.7 127.7 -42.7 131.0 -32.0 132.5 C -21.3 134.0 -10.7 135.0 -0.0 135.5 C 10.7 136.0 21.3 136.0 32.0 135.6 C 42.7 135.1 58.7 132.9 64.0 132.6 C 69.3 132.4 69.3 132.9 64.0 134.2 C 58.7 135.4 42.7 138.7 32.0 140.2 C 21.3 141.7 10.7 142.7 -0.0 143.2 C -10.7 143.8 -21.3 143.8 -32.0 143.3 C -42.7 142.8 -58.7 140.6 -64.0 140.4 C -69.3 140.1 -69.3 140.7 -64.0 141.9 C -58.7 143.2 -42.7 146.5 -32.0 148.0 C -21.3 149.5 -5.3 150.5 -0.0 151.0" fill="none" stroke-width="5" stroke-linecap="round"/></svg>`;
export const mark = () => raw(MARK_SVG);
/** The doll's paths alone, classes fill and coil, for the brand files. */
export const MARK_PATHS = MARK_SVG.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
/** Where shell() expects the package's dist/brand/ by default: /assets/ui/<version>/brand/, the path
 *  products copy the package's files to (account D-20), versioned so a year-long cache stays right. */
export const DEFAULT_BRAND_BASE = `/assets/ui/${VERSION}/brand/`;
/** A product's favicon files under `base`, the URL where dist/brand/ is served (ending in /). */
export function faviconFor(product, base = DEFAULT_BRAND_BASE) {
    const dir = `${base}${product}/`;
    return { svg: `${dir}favicon.svg`, png32: `${dir}favicon-32.png`, png16: `${dir}favicon-16.png`, appleTouch: `${dir}apple-touch-icon-180.png` };
}
/**
 * The <link> tags for a favicon. The PNGs carry sizes and come first, so a browser that reads SVG
 * icons takes the SVG (it has the dark-mode doll) and the rest take a PNG.
 */
export function faviconLinks(f) {
    return html `${f.png32 ? html `<link rel="icon" type="image/png" sizes="32x32" href="${safeHref(f.png32)}">` : ""}${f.png16 ? html `<link rel="icon" type="image/png" sizes="16x16" href="${safeHref(f.png16)}">` : ""}<link rel="icon" type="image/svg+xml" href="${safeHref(f.svg)}">${f.appleTouch ? html `<link rel="apple-touch-icon" sizes="180x180" href="${safeHref(f.appleTouch)}">` : ""}`;
}
export const ROLES = ["owner", "admin", "member", "viewer"];
/** The roles as words inside a sentence or beside a name, as the account writes them. */
export const ROLE_NAMES = {
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
        orgs: "Your organizations",
        switchOrg: "switch organization",
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
 * The same page in another organisation: /o/noon/runs?x=1 becomes /o/spekta/runs?x=1, and a path
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
function orgSwitcher(o, t, lang) {
    const orgs = o.orgs ?? [];
    if (orgs.length < 2)
        return html ``;
    const items = orgs.map((g) => html `<li><a href="${safeHref(g.href ?? orgPath(o.path ?? "/", g.slug))}"${current(g.slug === o.current.slug)}><span class="bar-item-name">${g.name}</span><span class="bar-item-meta">${ROLE_NAMES[lang][g.role]}</span></a></li>`);
    const foot = o.peopleHref ? html `<p class="bar-panel-foot"><a href="${safeHref(o.peopleHref)}">${t.people(o.current.name)}</a></p>` : "";
    return html `<details class="switcher bar-menu org-switcher"><summary><span class="bar-menu-name">${o.current.name}</span><span class="visually-hidden">, ${t.switchOrg}</span></summary><div class="bar-panel"><p class="bar-panel-label">${t.orgs}</p><ul>${items}</ul>${foot}</div></details>`;
}
function productSwitcher(p, t, org) {
    const items = p.items.map((i) => html `<li><a href="${safeHref(i.href)}"${current(i.current)}><span class="bar-item-name">${i.name}</span>${i.current ? html `<span class="bar-item-meta">${t.here}</span>` : ""}</a></li>`);
    return html `<details class="switcher bar-menu product-switcher"><summary>${t.products}</summary><div class="bar-panel"><p class="bar-panel-label">${org ? t.has(org.name) : t.products}</p><ul>${items}</ul><p class="bar-panel-foot"><a href="${safeHref(p.accountHref)}">${org ? t.allOf(org.name) : t.account}</a></p></div></details>`;
}
function userMenu(u, t, lang, org) {
    const role = org ? html `<span class="user-role">${t.roleIn(ROLE_NAMES[lang][org.role], org.name)}</span>` : "";
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
    const brand = html `<a class="brand" href="${safeHref(home)}" aria-label="${o.homeLabel ?? (own ? `Forspring ${o.productLabel}` : o.productLabel)}">${mark()}${own ? html `<span class="word">Forspring</span> <span class="sub">${o.productLabel}</span>` : html `<span class="word">${o.productLabel}</span>`}</a>`;
    return html `<header class="bar"><div class="wrap bar-inner">${brand}${o.org ? orgSwitcher(o.org, t, o.lang) : ""}${o.products ? productSwitcher(o.products, t, org) : ""}${legacy}${o.controls}<span class="spacer"></span>${user}${o.userMenu ? userMenu(o.userMenu, t, o.lang, org) : ""}</div></header>`;
}
const signalMark = (s) => html `<span class="${`signal-mark ${s}`}" aria-hidden="true"></span>`;
function menuBody(m) {
    const ctx = m.context;
    const others = ctx?.items ?? [];
    const context = !ctx
        ? ""
        : others.length > 1
            ? html `<details class="menu-context"><summary><span class="menu-label">${ctx.label}</span><span class="menu-context-name">${ctx.name}</span></summary><ul>${others.map((i) => html `<li><a href="${safeHref(i.href)}"${raw(i.current ? ' aria-current="true"' : "")}>${i.label}</a></li>`)}</ul></details>`
            : html `<div class="menu-context"><span class="menu-label">${ctx.label}</span><span class="menu-context-name">${ctx.name}</span></div>`;
    const groups = m.groups.map((g) => html `<div class="menu-group">${g.label ? html `<p class="menu-label">${g.label}</p>` : ""}<ul>${g.items.map((i) => {
        const badge = i.badge
            ? html `<span class="menu-badge">${i.badge.signal ? signalMark(i.badge.signal) : ""}${i.badge.text}${i.badge.label ? html `<span class="visually-hidden"> ${i.badge.label}</span>` : ""}</span>`
            : "";
        return html `<li><a href="${safeHref(i.href)}"${raw(i.current === "parent" ? ' aria-current="true"' : i.current ? ' aria-current="page"' : "")}><span class="menu-text">${i.label}</span>${badge}</a></li>`;
    })}</ul></div>`);
    return html `${context}${groups}`;
}
/** The current item's label, for the phone's fold. */
const currentLabel = (m) => {
    const items = m.groups.flatMap((g) => g.items);
    return (items.find((i) => i.current === true) ?? items.find((i) => i.current === "parent"))?.label;
};
function menuFrame(m, body, narrow) {
    const current = currentLabel(m);
    return html `<div class="wrap app"><details class="menu-fold"><summary><span>${m.toggle}</span>${current ? html `<span class="menu-fold-current">${current}</span>` : ""}</summary><nav class="menu" aria-label="${m.label}">${menuBody(m)}</nav></details><nav class="menu menu-side" aria-label="${m.label}">${menuBody(m)}</nav><main id="main"${raw(attrs({ class: cls(narrow && "narrow") }))}>${body}</main></div>`;
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
    return html `<!doctype html><html${htmlAttrs}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${o.title} · ${own ? "Forspring" : o.productLabel}</title>${icons}${o.head}</head>
<body${raw(attrs({ class: cls(o.menu && "has-menu", o.bodyClass) }))}><a class="skip" href="#main">${da ? "Spring til indhold" : "Skip to content"}</a>
${bar(o)}
${o.menu ? menuFrame(o.menu, o.body, o.narrow) : html `<main id="main" class="${cls("wrap", o.narrow && "narrow")}">${o.body}</main>`}
${footer}</body></html>`;
}
export function button(o) {
    const variant = o.variant && o.variant !== "primary" ? o.variant : null;
    if (o.href !== undefined) {
        return html `<a${raw(attrs({ class: cls("button", variant, o.small && "small", o.wide && "wide"), href: safeHref(o.href), "aria-label": o.ariaLabel }))}>${o.label}</a>`;
    }
    const a = { class: cls(variant, o.small && "small", o.wide && "wide"), type: o.type ?? "submit", name: o.name, value: o.value, "aria-label": o.ariaLabel, disabled: o.disabled };
    return html `<button${raw(attrs(a))}>${o.label}</button>`;
}
/** A label, its control, a hint and an error, wired with aria-describedby and aria-invalid. */
export function field(o) {
    const id = o.id ?? o.name;
    const hintId = o.hint ? `${id}-hint` : undefined;
    const errorId = o.error ? `${id}-error` : undefined;
    const described = [hintId, errorId].filter(Boolean).join(" ") || undefined;
    const common = { id, name: o.name, required: o.required, autocomplete: o.autocomplete, "aria-invalid": o.error ? "true" : undefined, "aria-describedby": described };
    const control = o.control === "textarea"
        ? html `<textarea${raw(attrs({ ...common, placeholder: o.placeholder }))}>${o.value ?? ""}</textarea>`
        : o.control === "select"
            ? html `<select${raw(attrs(common))}>${(o.options ?? []).map((op) => html `<option${raw(attrs({ value: op.value, selected: op.selected }))}>${op.label}</option>`)}</select>`
            : html `<input${raw(attrs({ ...common, type: o.type ?? "text", value: o.value, placeholder: o.placeholder }))}>`;
    return html `<div class="field"><label for="${id}">${o.label}</label>${control}${o.hint ? html `<p class="hint" id="${hintId}">${o.hint}</p>` : ""}${o.error ? html `<p class="field-error" id="${errorId}">${o.error}</p>` : ""}</div>`;
}
/** What just happened. Errors and warnings are alerts; the rest are polite status messages. */
/**
 * What just happened, in words. `signal` instead of `tone` reports a monitored state (D-13): the
 * neutral card with the signal's colour as its edge rule and its mark before the title.
 */
export function notice(o) {
    if (o.signal) {
        const role = o.signal === "down" || o.signal === "warn" ? "alert" : "status";
        const title = o.title ? html `<strong class="notice-title">${signalMark(o.signal)}${o.title}</strong>` : "";
        return html `<div class="${`notice signal-${o.signal}`}" role="${role}">${title}${o.text}</div>`;
    }
    const tone = o.tone ?? "info";
    const role = tone === "error" || tone === "warning" ? "alert" : "status";
    const title = o.title ? html `<strong class="notice-title">${o.title}</strong>` : "";
    return html `<div class="${cls("notice", tone !== "info" && tone)}" role="${role}">${title}${o.text}</div>`;
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
export function card(body) {
    return html `<div class="card">${body}</div>`;
}
/** The account's list: a name, an optional meta line under it, and an action at the end. */
export function list(items) {
    return html `<ul class="list">${items.map((i) => html `<li><span class="grow"><span class="name">${i.name}</span>${i.meta ? html `<br><span class="meta">${i.meta}</span>` : ""}</span>${i.action}</li>`)}</ul>`;
}
/**
 * A table in a scrolling frame. The frame is a labelled region a keyboard can reach (tabindex 0),
 * so a table wider than a phone is scrolled, never clipped.
 */
export function table(o) {
    const c = (col) => cls(col?.num && "num", col?.phoneHide && "phone-hide");
    return html `<div class="table-wrap" role="region" aria-label="${o.label}" tabindex="0"><table>${o.caption ? html `<caption>${o.caption}</caption>` : ""}<thead><tr>${o.columns.map((col) => html `<th scope="col"${raw(attrs({ class: c(col) }))}>${col.label}</th>`)}</tr></thead><tbody>${o.rows.map((r) => html `<tr>${r.map((cell, i) => html `<td${raw(attrs({ class: c(o.columns[i]) }))}>${cell}</td>`)}</tr>`)}</tbody></table></div>`;
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
    return html `<div class="data-state ${o.kind}"${role}><p class="data-state-title">${o.title}</p>${o.text ? html `<p class="data-state-text">${o.text}</p>` : ""}${o.action ? html `<div class="data-state-actions">${o.action}</div>` : ""}</div>`;
}
/** The divider between two ways in: "eller". */
export const orDivider = (text) => html `<p class="or"><span>${text}</span></p>`;
const GOOGLE_G = `<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>`;
/** Google's button (google-button.css), as a submit button for the caller's form. */
export function googleButton(label) {
    return html `<button class="gsi" type="submit">${raw(GOOGLE_G)}<span>${label}</span></button>`;
}

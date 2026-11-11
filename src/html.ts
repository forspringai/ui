// Small typed helpers that return the component layer's markup as HTML, so a product on Workers can
// draw its pages with no framework (hub ui-standard §1: thin console pages, server-rendered, no
// script). No dependencies, so it runs anywhere a string does.
//
// Everything interpolated is escaped. A helper returns Html, which passes through other helpers and
// the html`` tag unescaped; a plain string is always text. raw() is the one way to vouch for a
// string as markup, for a stylesheet or markup the caller built and escaped itself. String(h) or
// `${h}` gives the HTML.

import { ICON_NAMES, ICON_PATHS, type IconName } from "./icons/lucide.ts";

export { ICON_NAMES, type IconName };

// A registered symbol rather than instanceof, so Html from a second copy of this module (src/ and
// dist/, or two installed versions) still passes through instead of being escaped twice.
const BRAND = Symbol.for("@forspring/ui/html");

export class Html {
  readonly value: string;
  readonly [BRAND] = true;
  constructor(value: string) {
    this.value = value;
  }
  toString(): string {
    return this.value;
  }
}

/** Text, markup from these helpers, lists of either, or nothing (null, undefined, false). */
export type Content = string | number | Html | null | undefined | false | readonly Content[];

const ENTITIES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

/** Escapes text for an element's content or a quoted attribute. */
export const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => ENTITIES[c]!);

/** Vouches for a string as HTML. Never pass it anything a person or another system wrote. */
export const raw = (s: string): Html => new Html(s);

function render(c: Content): string {
  if (c === null || c === undefined || c === false) return "";
  if (typeof c === "object" && !Array.isArray(c) && (c as Html)[BRAND] === true) return (c as Html).value;
  if (Array.isArray(c)) return c.map(render).join("");
  return esc(String(c));
}

/** A template whose interpolations are escaped unless they are Html. */
export function html(strings: TemplateStringsArray, ...values: Content[]): Html {
  let out = strings[0]!;
  values.forEach((v, i) => (out += render(v) + strings[i + 1]!));
  return new Html(out);
}

// Attributes from an object: false, null and undefined leave the attribute out, true writes it bare.
type AttrValue = string | number | boolean | null | undefined;
function attrs(a: Record<string, AttrValue>): string {
  let out = "";
  for (const [k, v] of Object.entries(a)) {
    if (v === false || v === null || v === undefined) continue;
    out += v === true ? ` ${k}` : ` ${k}="${esc(String(v))}"`;
  }
  return out;
}

// Hrefs come from the product's code, but a javascript: or data: URL would still run when escaped,
// so anything but a relative URL, http(s) or mailto becomes "#".
export function safeHref(href: string): string {
  // Browsers drop tabs, newlines and leading controls before reading the scheme ("java\nscript:").
  const bare = href.replace(/[\u0000-\u0020\u007f]/g, "");
  return !/^[a-z][a-z0-9+.-]*:/i.test(bare) || /^(https?|mailto):/i.test(bare) ? href : "#";
}

const cls = (...names: (string | false | null | undefined)[]) => names.filter(Boolean).join(" ") || undefined;

export type Lang = "da" | "en";
/** The suite's products (hub D-90, D-101); the same list as tokens.js's products, checked by a test. */
export type Product = "forspring" | "spring" | "sitespring" | "dataspring" | "appspring" | "pulsespring";

/** Each product's name as its wordmark writes it (hub D-101): never lowercase, never split. */
export const PRODUCT_NAMES: Record<Product, string> = {
  forspring: "Forspring",
  spring: "Spring",
  sitespring: "SiteSpring",
  dataspring: "DataSpring",
  appspring: "AppSpring",
  pulsespring: "PulseSpring",
};

/** This package's version, the same as package.json's (a test checks), for the default brand path. */
export const VERSION = "0.16.0";
export type Theme = "light" | "dark";

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
const face = (f: (typeof FACES)[number], base: string) =>
  `@font-face {\n  font-family: "${f.family}";\n  src: url("${base}${f.file}") format("woff2");\n  font-weight: ${f.weight};\n  font-style: normal;\n  font-display: swap;\n  unicode-range: ${f.range};\n}\n`;

/**
 * The @font-face rules, with the font files under `base` ("/assets/fonts/" when a product serves the
 * package's fonts/ there, "../fonts/" for dist/fonts.css). `google: true` adds Roboto Medium for the
 * Google button.
 */
export function fontFaces(base: string, opts: { google?: boolean } = {}): string {
  return [...FACES, ...(opts.google ? [GOOGLE_FACE] : [])].map((f) => face(f, base)).join("\n");
}

/** Roboto Medium alone, for the Google button (google-button.css carries it). */
export const googleFontFace = (base: string): string => face(GOOGLE_FACE, base);

// --- The mark ---------------------------------------------------------------------------------------

// The doll (hub D-101): one mark for every product, only its colour changes. Inline it takes the
// page's --mark: the product's accent, ink on Forspring's own pages. The brand files (src/brand.ts)
// draw the same paths with the token colours written in.
export const MARK_VIEWBOX = "-184 -160 368 368";
const MARK_SVG = `<svg class="mark" viewBox="${MARK_VIEWBOX}" aria-hidden="true" focusable="false"><g class="fill" fill-rule="evenodd"><path d="M -146.98 63.23 A 160 160 0 1 1 146.98 63.23 A 346 346 0 0 1 -146.98 63.23 Z M -89 -44 a 28 28 0 1 0 56 0 a 28 28 0 1 0 -56 0 M 33 -44 a 28 28 0 1 0 56 0 a 28 28 0 1 0 -56 0"/><path d="M -146.98 63.23 A 346 346 0 0 0 146.98 63.23 A 160 160 0 0 1 -146.98 63.23 Z" transform="translate(0 48)"/></g><path class="coil" d="M 0.0 89.0 C 5.3 89.0 21.3 89.5 32.0 89.1 C 42.7 88.6 58.7 86.4 64.0 86.1 C 69.3 85.9 69.3 86.4 64.0 87.7 C 58.7 88.9 42.7 92.2 32.0 93.7 C 21.3 95.2 10.7 96.2 0.0 96.8 C -10.7 97.3 -21.3 97.3 -32.0 96.8 C -42.7 96.3 -58.7 94.1 -64.0 93.9 C -69.3 93.6 -69.3 94.2 -64.0 95.4 C -58.7 96.7 -42.7 100.0 -32.0 101.5 C -21.3 103.0 -10.7 104.0 -0.0 104.5 C 10.7 105.0 21.3 105.0 32.0 104.6 C 42.7 104.1 58.7 101.9 64.0 101.6 C 69.3 101.4 69.3 101.9 64.0 103.2 C 58.7 104.4 42.7 107.7 32.0 109.2 C 21.3 110.7 10.7 111.7 0.0 112.2 C -10.7 112.8 -21.3 112.8 -32.0 112.3 C -42.7 111.8 -58.7 109.6 -64.0 109.4 C -69.3 109.1 -69.3 109.7 -64.0 110.9 C -58.7 112.2 -42.7 115.5 -32.0 117.0 C -21.3 118.5 -10.7 119.5 -0.0 120.0 C 10.7 120.5 21.3 120.5 32.0 120.1 C 42.7 119.6 58.7 117.4 64.0 117.1 C 69.3 116.9 69.3 117.4 64.0 118.7 C 58.7 119.9 42.7 123.2 32.0 124.7 C 21.3 126.2 10.7 127.2 0.0 127.8 C -10.7 128.3 -21.3 128.3 -32.0 127.8 C -42.7 127.3 -58.7 125.1 -64.0 124.9 C -69.3 124.6 -69.3 125.2 -64.0 126.4 C -58.7 127.7 -42.7 131.0 -32.0 132.5 C -21.3 134.0 -10.7 135.0 -0.0 135.5 C 10.7 136.0 21.3 136.0 32.0 135.6 C 42.7 135.1 58.7 132.9 64.0 132.6 C 69.3 132.4 69.3 132.9 64.0 134.2 C 58.7 135.4 42.7 138.7 32.0 140.2 C 21.3 141.7 10.7 142.7 -0.0 143.2 C -10.7 143.8 -21.3 143.8 -32.0 143.3 C -42.7 142.8 -58.7 140.6 -64.0 140.4 C -69.3 140.1 -69.3 140.7 -64.0 141.9 C -58.7 143.2 -42.7 146.5 -32.0 148.0 C -21.3 149.5 -5.3 150.5 -0.0 151.0" fill="none" stroke-width="5" stroke-linecap="round"/></svg>`;

export const mark = (): Html => raw(MARK_SVG);

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
export function icon(name: IconName, o: { label?: string } = {}): Html {
  if (!Object.hasOwn(ICON_PATHS, name)) throw new Error(`icon: no icon named ${JSON.stringify(name)}`);
  const a = o.label ? `role="img" aria-label="${esc(o.label)}"` : 'aria-hidden="true"';
  return raw(`<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${a} focusable="false">${ICON_PATHS[name]}</svg>`);
}

// --- Favicons ---------------------------------------------------------------------------------------

/** The page's icons, each a URL, and the web manifest (D-28). shell() writes them from `brandBase` unless `favicon` names them. */
export type Favicon = { svg: string; png32?: string; png16?: string; appleTouch?: string; manifest?: string };

/** Where shell() expects the package's dist/brand/ by default: /assets/ui/<version>/brand/, the path
 *  products copy the package's files to (account D-20), versioned so a year-long cache stays right. */
export const DEFAULT_BRAND_BASE = `/assets/ui/${VERSION}/brand/`;

/** A product's favicon files under `base`, the URL where dist/brand/ is served (ending in /). */
export function faviconFor(product: Product, base: string = DEFAULT_BRAND_BASE): Favicon {
  const dir = `${base}${product}/`;
  return { svg: `${dir}favicon.svg`, png32: `${dir}favicon-32.png`, png16: `${dir}favicon-16.png`, appleTouch: `${dir}apple-touch-icon-180.png`, manifest: `${dir}site.webmanifest` };
}

/**
 * The <link> tags for a favicon and the web manifest. The PNGs carry sizes and come first, so a
 * browser that reads SVG icons takes the SVG (it has the dark-mode doll) and the rest take a PNG.
 */
export function faviconLinks(f: Favicon): Html {
  return html`${f.png32 ? html`<link rel="icon" type="image/png" sizes="32x32" href="${safeHref(f.png32)}">` : ""}${f.png16 ? html`<link rel="icon" type="image/png" sizes="16x16" href="${safeHref(f.png16)}">` : ""}<link rel="icon" type="image/svg+xml" href="${safeHref(f.svg)}">${f.appleTouch ? html`<link rel="apple-touch-icon" sizes="180x180" href="${safeHref(f.appleTouch)}">` : ""}${f.manifest ? html`<link rel="manifest" href="${safeHref(f.manifest)}">` : ""}`;
}

// --- Shell ------------------------------------------------------------------------------------------

export type Link = { label: string; href: string; lang?: Lang };

/** The suite's one role set (hub D-96), a person's place in an organisation. */
export type Role = "owner" | "admin" | "member" | "viewer";
export const ROLES: readonly Role[] = ["owner", "admin", "member", "viewer"];

/** The roles as words inside a sentence or beside a name, as the account writes them. */
export const ROLE_NAMES: Record<Lang, Record<Role, string>> = {
  da: { owner: "ejer", admin: "administrator", member: "medlem", viewer: "læser" },
  en: { owner: "owner", admin: "admin", member: "member", viewer: "viewer" },
};

/** An organisation as the bar and the pages show it: the customer's name and your role there. */
export type Org = { slug: string; name: string; role: Role };

/** The bar's org switcher (D-17). */
export type BarOrg = {
  /** The organisation this page is in. Its role shows in the user menu's head. */
  current: Org;
  /** Every organisation the person has this product in, the current one too. The switcher shows only
   *  when there is more than one; `href` overrides the link that keeps the person's place. */
  orgs?: (Org & { href?: string })[];
  /** This page's path, so switching keeps the person's place: /o/noon/runs becomes /o/spekta/runs. */
  path?: string;
  /** "Manage people in <org>": the account's people page, for owners and admins. */
  peopleHref?: string;
};

/** The bar's product switcher: the other products this organisation has, each opening the same org. */
export type BarProducts = {
  items: { name: string; href: string; current?: boolean }[];
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
  signOut: { action: string; fields?: Record<string, string> };
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
  switcher?: { label: string; items: (Link & { current?: boolean })[] };
  /** Controls in the bar after the switchers, such as a search. They take the small size, 32px (D-14). */
  controls?: Content;
  /** @deprecated Use `userMenu`. The person's address and markup for signing out, in the bar itself. */
  user?: { email: string; signOut?: Content };
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

// The bar's words are the suite's, not a product's: every product's bar says the same (D-17).
const BAR = {
  da: {
    orgs: "Dine organisationer",
    switchOrg: "skift organisation",
    people: (o: string) => `Administrer folk i ${o}`,
    products: "Produkter",
    has: (o: string) => `${o} har`,
    here: "her",
    allOf: (o: string) => `Alt for ${o} hos Forspring`,
    menu: "din konto",
    account: "Din Forspring-konto",
    agents: (o?: string) => (o ? `Agenter og nøgler i ${o}` : "Agenter og nøgler"),
    roleIn: (r: string, o: string) => `${r} i ${o}`,
    language: "Sprog",
    signOut: "Log ud af Forspring",
  },
  en: {
    orgs: "Your organizations",
    switchOrg: "switch organization",
    people: (o: string) => `Manage people in ${o}`,
    products: "Products",
    has: (o: string) => `${o} has`,
    here: "here",
    allOf: (o: string) => `All of ${o} at Forspring`,
    menu: "your account",
    account: "Your Forspring account",
    agents: (o?: string) => (o ? `Agents and keys in ${o}` : "Agents and keys"),
    roleIn: (r: string, o: string) => `${r} in ${o}`,
    language: "Language",
    signOut: "Sign out of Forspring",
  },
};

const LANG_NAMES: Record<Lang, string> = { da: "Dansk", en: "English" };

/**
 * The same page in another organisation: /o/noon/runs?x=1 becomes /o/spekta/runs?x=1, and a path
 * outside /o/ becomes the org's home. A page that does not exist there is the product's to send home.
 */
export function orgPath(path: string, slug: string): string {
  const m = /^\/o\/[^/?#]+(.*)$/.exec(path);
  const rest = m ? m[1]! : "";
  return `/o/${encodeURIComponent(slug)}${rest === "" || /^[?#]/.test(rest) ? `/${rest}` : rest}`;
}

/** Up to two letters for the avatar: the first and last names' initials, else the address's first. */
export function initials(name: string, email = ""): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = (w: string | undefined) => (w ? Array.from(w)[0]! : "");
  const letters = words.length > 1 ? first(words[0]) + first(words[words.length - 1]) : first(words[0]) || first(email);
  return letters.toLocaleUpperCase() || "?";
}

const current = (on: boolean | undefined, value = "true") => raw(on ? ` aria-current="${value}"` : "");

function orgSwitcher(o: BarOrg, t: (typeof BAR)[Lang], lang: Lang): Html {
  const orgs = o.orgs ?? [];
  if (orgs.length < 2) return html``;
  const items = orgs.map(
    (g) =>
      html`<li><a href="${safeHref(g.href ?? orgPath(o.path ?? "/", g.slug))}"${current(g.slug === o.current.slug)}><span class="bar-item-name">${g.name}</span><span class="bar-item-meta">${ROLE_NAMES[lang][g.role]}</span></a></li>`,
  );
  const foot = o.peopleHref ? html`<p class="bar-panel-foot"><a href="${safeHref(o.peopleHref)}">${t.people(o.current.name)}</a></p>` : "";
  return html`<details class="switcher bar-menu org-switcher"><summary><span class="bar-menu-name">${o.current.name}</span><span class="visually-hidden">, ${t.switchOrg}</span></summary><div class="bar-panel"><p class="bar-panel-label">${t.orgs}</p><ul>${items}</ul>${foot}</div></details>`;
}

function productSwitcher(p: BarProducts, t: (typeof BAR)[Lang], org: Org | undefined): Html {
  const items = p.items.map(
    (i) =>
      html`<li><a href="${safeHref(i.href)}"${current(i.current)}><span class="bar-item-name">${i.name}</span>${i.current ? html`<span class="bar-item-meta">${t.here}</span>` : ""}</a></li>`,
  );
  return html`<details class="switcher bar-menu product-switcher"><summary>${t.products}</summary><div class="bar-panel"><p class="bar-panel-label">${org ? t.has(org.name) : t.products}</p><ul>${items}</ul><p class="bar-panel-foot"><a href="${safeHref(p.accountHref)}">${org ? t.allOf(org.name) : t.account}</a></p></div></details>`;
}

function userMenu(u: UserMenu, t: (typeof BAR)[Lang], lang: Lang, org: Org | undefined): Html {
  const role = org ? html`<span class="user-role">${t.roleIn(ROLE_NAMES[lang][org.role], org.name)}</span>` : "";
  const agents = u.agentsHref ? html`<li><a href="${safeHref(u.agentsHref)}">${t.agents(org?.name)}</a></li>` : "";
  const langs = u.languages
    ? html`<p class="user-lang"><span class="visually-hidden">${t.language}: </span>${(["da", "en"] as const).map(
        (l) => html`<a href="${safeHref(u.languages![l])}" lang="${l}" hreflang="${l}"${current(l === lang)}>${LANG_NAMES[l]}</a>`,
      )}</p>`
    : "";
  const fields = Object.entries(u.signOut.fields ?? {}).map(([name, value]) => html`<input type="hidden" name="${name}" value="${value}">`);
  return html`<details class="switcher bar-menu user-menu"><summary><span class="avatar">${initials(u.name, u.email)}</span><span class="visually-hidden">: ${u.name}, ${t.menu}</span></summary><div class="bar-panel"><p class="user-head"><span class="user-name">${u.name}</span><span class="user-email">${u.email}</span>${role}</p><ul><li><a href="${safeHref(u.accountHref)}">${t.account}</a></li>${agents}</ul>${langs}<form class="user-signout" method="post" action="${safeHref(u.signOut.action)}">${fields}${button({ label: t.signOut, variant: "ghost", small: true, wide: true })}</form></div></details>`;
}

/** The bar: wordmark, org switcher, product switcher, controls, user menu. The menus are details
 *  elements, so they open with no script. */
export function bar(o: BarOptions): Html {
  const t = BAR[o.lang];
  // Every bar carries a doll and a wordmark (hub D-101). Forspring's own pages (the account,
  // forspring.ai): the ink doll, "Forspring" and the label; a product's: its own doll in its accent
  // (the CSS's --mark) and its name, no Forspring mark or word (D-98).
  const own = o.product === undefined || o.product === "forspring";
  const org = o.org?.current;
  const legacy = o.switcher
    ? html`<details class="switcher"><summary>${o.switcher.label}</summary><ul>${o.switcher.items.map(
        (i) => html`<li><a href="${safeHref(i.href)}"${current(i.current, "page")}>${i.label}</a></li>`,
      )}</ul></details>`
    : "";
  const user = o.user ? html`<span class="who">${o.user.email}</span>${o.user.signOut}` : "";
  const home = o.home ?? (org ? `/o/${encodeURIComponent(org.slug)}/` : "/");
  const brand = html`<a class="brand" href="${safeHref(home)}" aria-label="${o.homeLabel ?? (own ? `Forspring ${o.productLabel}` : o.productLabel)}">${mark()}${own ? html`<span class="word">Forspring</span> <span class="sub">${o.productLabel}</span>` : html`<span class="word">${o.productLabel}</span>`}</a>`;
  return html`<header class="bar"><div class="wrap bar-inner">${brand}${o.org ? orgSwitcher(o.org, t, o.lang) : ""}${o.products ? productSwitcher(o.products, t, org) : ""}${legacy}${o.controls}<span class="spacer"></span>${user}${o.userMenu ? userMenu(o.userMenu, t, o.lang, org) : ""}</div></header>`;
}

/** A monitored thing's state, as a traffic light: up, late, down, or not being judged (D-13). */
export type Signal = "ok" | "warn" | "down" | "off";

export type MenuItem = Link & {
  /** true: this page. "parent": the page is under this item (a check under its project). */
  current?: boolean | "parent" | undefined;
  /** A short badge after the label ("2"), with a signal mark before it and words for a screen reader. */
  badge?: { text: string; signal?: Signal | undefined; label?: string | undefined } | undefined;
};

export type MenuGroup = { label?: string; items: MenuItem[] };

export type Menu = {
  /** The menu's accessible name: "Hovedmenu", "Main menu". */
  label: string;
  /** The phone's fold: "Menu". */
  toggle: string;
  /** What the menu is for (an organisation) and where else the person can go; a switcher when more than one. */
  context?: { label: string; name: string; items?: (Link & { current?: boolean })[] };
  groups: MenuGroup[];
};

const signalMark = (s: Signal): Html => html`<span class="${`signal-mark ${s}`}" aria-hidden="true"></span>`;

function menuBody(m: Menu): Html {
  const ctx = m.context;
  const others = ctx?.items ?? [];
  const context = !ctx
    ? ""
    : others.length > 1
      ? html`<details class="menu-context"><summary><span class="menu-label">${ctx.label}</span><span class="menu-context-name">${ctx.name}</span></summary><ul>${others.map(
          (i) => html`<li><a href="${safeHref(i.href)}"${raw(i.current ? ' aria-current="true"' : "")}>${i.label}</a></li>`,
        )}</ul></details>`
      : html`<div class="menu-context"><span class="menu-label">${ctx.label}</span><span class="menu-context-name">${ctx.name}</span></div>`;
  const groups = m.groups.map(
    (g) => html`<div class="menu-group">${g.label ? html`<p class="menu-label">${g.label}</p>` : ""}<ul>${g.items.map((i) => {
      const badge = i.badge
        ? html`<span class="menu-badge">${i.badge.signal ? signalMark(i.badge.signal) : ""}${i.badge.text}${i.badge.label ? html`<span class="visually-hidden"> ${i.badge.label}</span>` : ""}</span>`
        : "";
      return html`<li><a href="${safeHref(i.href)}"${raw(i.current === "parent" ? ' aria-current="true"' : i.current ? ' aria-current="page"' : "")}><span class="menu-text">${i.label}</span>${badge}</a></li>`;
    })}</ul></div>`,
  );
  return html`${context}${groups}`;
}

/** The current item's label, for the phone's fold. */
const currentLabel = (m: Menu): string | undefined => {
  const items = m.groups.flatMap((g) => g.items);
  return (items.find((i) => i.current === true) ?? items.find((i) => i.current === "parent"))?.label;
};

function menuFrame(m: Menu, body: Content, narrow?: boolean): Html {
  const current = currentLabel(m);
  return html`<div class="wrap app"><details class="menu-fold"><summary><span>${m.toggle}</span>${current ? html`<span class="menu-fold-current">${current}</span>` : ""}</summary><nav class="menu" aria-label="${m.label}">${menuBody(m)}</nav></details><nav class="menu menu-side" aria-label="${m.label}">${menuBody(m)}</nav><main id="main"${raw(attrs({ class: cls(narrow && "narrow") }))}>${body}</main></div>`;
}

/** A whole page: doctype, head, skip link, bar, the menu when there is one, main and footer. */
export function shell(o: ShellOptions): Html {
  const da = o.lang === "da";
  const own = o.product === undefined || o.product === "forspring";
  const footer = o.footer?.length
    ? html`<footer><div class="wrap foot">${o.footer.map((l) => html`<a href="${safeHref(l.href)}"${raw(l.lang ? attrs({ lang: l.lang, hreflang: l.lang }) : "")}>${l.label}</a>`)}</div></footer>`
    : "";
  const htmlAttrs = raw(attrs({ lang: o.lang, "data-product": o.product, "data-theme": o.theme }));
  const icons = o.favicon === false ? "" : faviconLinks(o.favicon ?? faviconFor(o.product ?? "forspring", o.brandBase));
  return html`<!doctype html><html${htmlAttrs}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${o.title} · ${own ? "Forspring" : o.productLabel}</title>${icons}${o.head}</head>
<body${raw(attrs({ class: cls(o.menu && "has-menu", o.bodyClass) }))}><a class="skip" href="#main">${da ? "Spring til indhold" : "Skip to content"}</a>
${bar(o)}
${o.menu ? menuFrame(o.menu, o.body, o.narrow) : html`<main id="main" class="${cls("wrap", o.narrow && "narrow")!}">${o.body}</main>`}
${footer}</body></html>`;
}

// --- Blocks -----------------------------------------------------------------------------------------

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

export function button(o: ButtonOptions): Html {
  const label = o.icon ? html`${icon(o.icon)}${o.label}` : o.label;
  const variant = o.variant && o.variant !== "primary" ? o.variant : null;
  if (o.href !== undefined) {
    return html`<a${raw(attrs({ class: cls("button", variant, o.small && "small", o.wide && "wide"), href: safeHref(o.href), "aria-label": o.ariaLabel }))}>${label}</a>`;
  }
  const a = { class: cls(variant, o.small && "small", o.wide && "wide"), type: o.type ?? "submit", name: o.name, value: o.value, "aria-label": o.ariaLabel, disabled: o.disabled };
  return html`<button${raw(attrs(a))}>${label}</button>`;
}

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
  options?: { value: string; label: string; selected?: boolean }[];
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
export function field(o: FieldOptions): Html {
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
  const control =
    o.control === "textarea"
      ? html`<textarea${raw(attrs({ ...common, placeholder: o.placeholder }))}>${o.value ?? ""}</textarea>`
      : o.control === "select"
        ? html`<select${raw(attrs(common))}>${(o.options ?? []).map((op) => html`<option${raw(attrs({ value: op.value, selected: op.selected }))}>${op.label}</option>`)}</select>`
        : html`<input${raw(attrs({ ...common, type: o.type ?? "text", value: o.value, placeholder: o.placeholder, pattern: o.pattern, title: o.title }))}>`;
  const label = html`<label for="${id}">${o.label}</label>`;
  return html`<div class="field">${o.help ? html`<div class="field-head">${label}${o.help}</div>` : label}${control}${o.hint ? html`<p class="hint" id="${hintId!}">${o.hint}</p>` : ""}${o.error ? html`<p class="field-error" id="${errorId!}">${o.error}</p>` : ""}</div>`;
}

export type Tone = "info" | "success" | "warning" | "error";

/** What just happened. Errors and warnings are alerts; the rest are polite status messages. */
/**
 * What just happened, in words. `signal` instead of `tone` reports a monitored state (D-13): the
 * neutral card with the signal's colour as its edge rule and its mark before the title.
 */
export function notice(o: { tone?: Tone; signal?: Signal; title?: Content; text: Content }): Html {
  if (o.signal) {
    const role = o.signal === "down" || o.signal === "warn" ? "alert" : "status";
    const title = o.title ? html`<strong class="notice-title">${signalMark(o.signal)}${o.title}</strong>` : "";
    return html`<div class="${`notice signal-${o.signal}`}" role="${role}">${title}${o.text}</div>`;
  }
  const tone = o.tone ?? "info";
  const role = tone === "error" || tone === "warning" ? "alert" : "status";
  const title = o.title ? html`<strong class="notice-title">${o.title}</strong>` : "";
  return html`<div class="${cls("notice", tone !== "info" && tone)!}" role="${role}">${title}${o.text}</div>`;
}

/** A monitored thing's state: the signal's mark (a shape as well as a colour) and the word (D-13). */
export function signal(text: Content, s: Signal): Html {
  return html`<span class="${`signal ${s}`}">${signalMark(s)}${text}</span>`;
}

/** Where the page sits: its parents as links, before the h1. The page itself is the h1, not a crumb. */
export function crumbs(label: string, items: Link[]): Html {
  return html`<nav class="crumbs" aria-label="${label}"><ol>${items.map((i) => html`<li><a href="${safeHref(i.href)}">${i.label}</a></li>`)}</ol></nav>`;
}

export function tag(text: Content, tone?: "primary" | "success" | "warning" | "danger"): Html {
  return html`<span class="${cls("tag", tone)!}">${text}</span>`;
}

export function card(body: Content): Html {
  return html`<div class="card">${body}</div>`;
}

export type ListItem = { name: Content; meta?: Content; action?: Content };

/** The account's list: a name, an optional meta line under it, and an action at the end. */
export function list(items: ListItem[]): Html {
  return html`<ul class="list">${items.map(
    (i) => html`<li><span class="grow"><span class="name">${i.name}</span>${i.meta ? html`<br><span class="meta">${i.meta}</span>` : ""}</span>${i.action}</li>`,
  )}</ul>`;
}

/** A header that sorts: a link to the page in that order, and the order it is in now, if any. */
export type ColumnSort = { href: string; dir?: "asc" | "desc" | undefined };

export type Column = { label: Content; num?: boolean; phoneHide?: boolean; sort?: ColumnSort | undefined };

// --- A table at scale: search, filters, the stated order and paging (D-25) ----------------------

// The package's words, as the bar's and the confirm's are (D-17, D-23), so every product's table
// says "1–6 af 248" and "Forrige" the same way.
type TableText = {
  search: string;
  of: string;
  prev: string;
  next: string;
  pages: (table?: string) => string;
  filters: (table: string) => string;
  sortedBy: (column: Content, dir: "asc" | "desc") => Html;
};

const TABLE: Record<Lang, TableText> = {
  da: {
    search: "Søg",
    of: "af",
    prev: "Forrige",
    next: "Næste",
    pages: (t) => (t ? `Sider i ${t}` : "Sider"),
    filters: (t) => `Filtre for ${t}`,
    sortedBy: (c, d) => html`sorteret efter ${c}, ${d === "asc" ? "stigende" : "faldende"}`,
  },
  en: {
    search: "Search",
    of: "of",
    prev: "Previous",
    next: "Next",
    pages: (t) => (t ? `Pages of ${t}` : "Pages"),
    filters: (t) => `Filters for ${t}`,
    sortedBy: (c, d) => html`sorted by ${c}, ${d === "asc" ? "ascending" : "descending"}`,
  },
};

/** A count in the page's language: Danish writes 1.248, English 1,248. */
const count = (n: number, lang: Lang) => new Intl.NumberFormat(LOCALE[lang]).format(n);

/** One page of a list: rows `from` to `to` (1-based, inclusive; 0 and 0 when there are none) of
 *  `total`, how many pages there are, and the pages before and after this one when they exist. It
 *  spreads into pagination()'s options. */
export type Page = { page: number; from: number; to: number; total: number; pages: number; prev?: number; next?: number };

/**
 * The paging arithmetic, so a product's query and its links agree: page `page` (1-based) of `total`
 * rows, `size` to a page. A page before the first is the first and one past the end is the last, so
 * an old link or a hand-typed ?page=999 still shows rows; no rows is one empty page.
 */
export function pageOf(total: number, page: number, size: number): Page {
  const n = Math.max(0, Math.floor(Number.isFinite(total) ? total : 0));
  const per = Math.max(1, Math.floor(Number.isFinite(size) ? size : 1));
  const pages = Math.max(1, Math.ceil(n / per));
  const p = Math.min(pages, Math.max(1, Math.floor(Number.isFinite(page) ? page : 1)));
  const out: Page = { page: p, from: n ? (p - 1) * per + 1 : 0, to: Math.min(n, p * per), total: n, pages };
  if (p > 1) out.prev = p - 1;
  if (p < pages) out.next = p + 1;
  return out;
}

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
export function pagination(o: PaginationOptions): Html {
  const t = TABLE[o.lang];
  const range = o.total > 0 && o.to >= o.from ? `${count(o.from, o.lang)}–${count(o.to, o.lang)} ${t.of} ${count(o.total, o.lang)}` : `0 ${t.of} 0`;
  const step = (href: string | undefined, label: string, rel: string) =>
    href === undefined ? html`<span class="button ghost small" aria-disabled="true">${label}</span>` : html`<a class="button ghost small" href="${safeHref(href)}" rel="${rel}">${label}</a>`;
  const order = o.order ? html`<span class="pagination-order">, ${o.order}</span>` : "";
  return html`<nav class="pagination" aria-label="${o.label ?? t.pages()}"><p class="pagination-range">${range}${order}</p><span class="pagination-steps">${step(o.prevHref, t.prev, "prev")}${step(o.nextHref, t.next, "next")}</span></nav>`;
}

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
export type TableFilter = { label: Content; count?: number; href: string; current?: boolean };

export type TableControls = {
  lang: Lang;
  /** A GET form above the table. It replaces the query string, so `keep` carries the rest. */
  search?: TableSearch;
  /** Links styled as chips beside the search; the current one is aria-current. */
  filters?: TableFilter[];
  /** The order the rows are in, said in the footer: "værst først". Without it, a column whose sort
   *  has a `dir` is said instead ("sorteret efter Oppetid, faldende"). */
  sort?: { label: Content };
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

const isHtml = (c: unknown): c is Html => typeof c === "object" && c !== null && (c as Html)[BRAND] === true;

const ARIA_SORT = { asc: "ascending", desc: "descending" } as const;

/**
 * A table in a scrolling frame. The frame is a labelled region a keyboard can reach (tabindex 0),
 * so a table wider than a phone is scrolled, never clipped.
 *
 * With `controls` (D-25) it is a list at scale: a search form and filter chips above, the order and
 * the paging below. All of it is a GET form and links, so it works with no script and the URL holds
 * the state; the server searches, filters, sorts and slices, and draws the page it was asked for.
 */
export function table(o: TableOptions): Html {
  const c = (col: Column | undefined) => cls(col?.num && "num", col?.phoneHide && "phone-hide");
  const head = (col: Column) => {
    if (!col.sort) return html`<th scope="col"${raw(attrs({ class: c(col) }))}>${col.label}</th>`;
    const dir = col.sort.dir;
    // The arrow says the order to the eye; aria-sort says it to a screen reader, so it is hidden.
    const arrow = dir ? html`<span class="sort-dir" aria-hidden="true">${dir === "asc" ? "↑" : "↓"}</span>` : "";
    return html`<th scope="col"${raw(attrs({ class: c(col), "aria-sort": dir ? ARIA_SORT[dir] : undefined }))}><a class="sort" href="${safeHref(col.sort.href)}">${col.label}${arrow}</a></th>`;
  };
  const frame = html`<div class="table-wrap" role="region" aria-label="${o.label}" tabindex="0"><table>${o.caption ? html`<caption>${o.caption}</caption>` : ""}<thead><tr>${o.columns.map(head)}</tr></thead><tbody>${o.rows.map(
    (r) => html`<tr>${r.map((cell, i) => html`<td${raw(attrs({ class: c(o.columns[i]) }))}>${cell}</td>`)}</tr>`,
  )}</tbody></table></div>`;
  const k = o.controls;
  if (!k) return frame;

  const t = TABLE[k.lang];
  let search: Html | "" = "";
  if (k.search) {
    const s = k.search;
    const id = `${o.id ?? "table"}-search`;
    const label = s.label ?? s.placeholder ?? t.search;
    const hide = s.placeholder !== undefined && label === s.placeholder;
    search = html`<form class="table-search" method="get"${raw(attrs({ action: s.action === undefined ? undefined : safeHref(s.action) }))} role="search" aria-label="${label}">${hidden(k.keep)}<label${raw(attrs({ class: hide ? "visually-hidden" : undefined }))} for="${id}">${label}</label><input${raw(
      attrs({ class: "small", type: "search", id, name: s.name ?? "q", value: s.value, placeholder: s.placeholder }),
    )}>${button({ label: t.search, variant: "ghost", small: true })}</form>`;
  }
  const filters = k.filters?.length
    ? html`<nav class="table-filters" aria-label="${t.filters(o.label)}"><ul>${k.filters.map(
        (f) => html`<li><a class="chip" href="${safeHref(f.href)}"${current(f.current)}>${f.label}${f.count === undefined ? "" : html` <span class="chip-count">${count(f.count, k.lang)}</span>`}</a></li>`,
      )}</ul></nav>`
    : "";
  const top = search || filters ? html`<div class="table-controls">${search}${filters}</div>` : "";

  const sorted = o.columns.find((col) => col.sort?.dir);
  const order: Content = k.sort?.label ?? (sorted ? t.sortedBy(sorted.label, sorted.sort!.dir!) : undefined);
  let foot: Html | "" = "";
  if (k.paging && isHtml(k.paging)) foot = html`<div class="table-foot">${order ? html`<p class="table-order">${order}</p>` : ""}${k.paging}</div>`;
  else if (k.paging) foot = html`<div class="table-foot">${pagination({ ...k.paging, label: k.paging.label ?? t.pages(o.label), lang: k.lang, order })}</div>`;
  else if (order) foot = html`<div class="table-foot"><p class="table-order">${order}</p></div>`;

  const body = o.rows.length === 0 && k.empty ? k.empty : frame;
  return html`<div class="data-table">${top}${body}${foot}</div>`;
}

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
export function switchButton(o: SwitchOptions): Html {
  const word = o.checked ? (o.on ?? "Til") : (o.off ?? "Fra");
  return html`<button${raw(attrs({ type: "submit", class: "switch", role: "switch", "aria-checked": String(o.checked), "aria-label": o.label, name: o.name, value: o.value }))}><span class="track" aria-hidden="true"></span><span class="state" aria-hidden="true">${word}</span></button>`;
}

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
export function state(o: StateOptions): Html {
  if (o.kind === "loading") {
    return html`<div class="data-state loading" role="status" aria-live="polite"><span class="visually-hidden">${o.title}</span><span class="skeleton"></span><span class="skeleton"></span><span class="skeleton"></span></div>`;
  }
  const role = o.kind === "failed" ? raw(' role="alert"') : "";
  return html`<div class="data-state ${o.kind}"${role}><p class="data-state-title">${o.title}</p>${o.text ? html`<p class="data-state-text">${o.text}</p>` : ""}${o.action ? html`<div class="data-state-actions">${o.action}</div>` : ""}</div>`;
}

// --- Dialog and the destructive-action confirm (D-23) ----------------------------------------------

/** Escapes a string for a RegExp, so it matches only itself. Browsers compile an input's pattern with
 *  the v flag, where escaping anything but these characters is a syntax error (and the browser then
 *  ignores the pattern), so this escapes exactly the syntax characters and "/". */
export const regexEscape = (s: string): string => s.replace(/[\\^$.*+?()[\]{}|/]/g, "\\$&");

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
  form?: { action: string; fields?: Record<string, string> };
  /** A choice that needs an answer before anything else (a destructive confirm): role alertdialog,
   *  described by the body, so a screen reader reads what is lost with the title. */
  alert?: boolean;
  /** Draw it as the no-script fallback page instead: a section in place, the title the page's h1,
   *  and the close button a link to `closeHref`. A trigger's href leads here when script is off. */
  page?: { closeHref: string };
};

/**
 * A native <dialog>, opened as a modal by dialogScript() from a dialogTrigger() (or by the product's
 * own showModal()). What the browser does and this package relies on: showModal() makes the rest of
 * the page inert, puts focus on the autofocus element (the close button, the safe action), Escape
 * closes it, and a form method="dialog" closes it with no request. The script returns focus to the
 * trigger on close, which browsers do too but Safari not after a mouse click on a link.
 */
export function dialog(o: DialogOptions): Html {
  const titleId = `${o.id}-title`;
  const closeId = `${o.id}-close`;
  const close = o.page
    ? html`<a class="button ghost" href="${safeHref(o.page.closeHref)}" autofocus>${o.close}</a>`
    : html`<button type="submit" class="ghost" form="${closeId}" value="close" autofocus>${o.close}</button>`;
  const inner = html`<div class="dialog-body" id="${`${o.id}-body`}">${o.body}</div><div class="dialog-actions">${close}${o.actions}</div>`;
  const fields = Object.entries(o.form?.fields ?? {}).map(([name, value]) => html`<input type="hidden" name="${name}" value="${value}">`);
  const content = o.form ? html`<form class="dialog-form" method="post" action="${safeHref(o.form.action)}">${fields}${inner}</form>` : inner;
  // On the fallback page it is the page's content, not a dialog over it, so it takes no dialog role.
  const alert = o.alert && !o.page;
  const a = raw(attrs({ id: o.id, role: alert ? "alertdialog" : undefined, "aria-labelledby": titleId, "aria-describedby": alert ? `${o.id}-body` : undefined }));
  if (o.page) return html`<section class="dialog dialog-page"${a}><h1 class="dialog-title" id="${titleId}">${o.title}</h1>${content}</section>`;
  // The close form sits outside the POST form (forms do not nest); the close button reaches it with
  // form="", so it closes the dialog without the name field's validation.
  return html`<dialog class="dialog"${a}><h2 class="dialog-title" id="${titleId}">${o.title}</h2>${content}<form method="dialog" id="${closeId}"></form></dialog>`;
}

/** The button that opens a dialog: a link to the no-script confirm page (`href`), which
 *  dialogScript() turns into showModal() on the dialog with id `dialog`. */
export function dialogTrigger(o: { dialog: string; href: string; label: Content; variant?: ButtonOptions["variant"]; small?: boolean }): Html {
  const variant = o.variant && o.variant !== "primary" ? o.variant : null;
  return html`<a${raw(attrs({ class: cls("button", variant, o.small && "small"), href: safeHref(o.href), "data-dialog-open": o.dialog }))}>${o.label}</a>`;
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
export function dialogScript(nonce?: string): Html {
  return html`<script${raw(nonce ? ` nonce="${nonce.replace(/[^A-Za-z0-9+/=_-]/g, "")}"` : "")}>${raw(DIALOG_SCRIPT)}</script>`;
}

/** The confirm's own words, Danish and English. Like the bar's (D-17), they are the package's, so
 *  every product asks the same way. */
type ConfirmText = {
  keep: string;
  removes: (list: Html) => Html;
  removesList: string;
  and: string;
  irreversible: string;
  typeName: (name: string) => Html;
  exactly: (name: string) => string;
};

const CONFIRM: Record<Lang, ConfirmText> = {
  da: {
    keep: "Behold",
    removes: (list) => html`Det fjerner ${list}.`,
    removesList: "Det fjerner:",
    and: "og",
    irreversible: "Det kan ikke fortrydes.",
    typeName: (name) => html`Skriv <b>${name}</b> for at bekræfte`,
    exactly: (name) => `Skriv ${name} præcis, som det står.`,
  },
  en: {
    keep: "Keep",
    removes: (list) => html`This removes ${list}.`,
    removesList: "This removes:",
    and: "and",
    irreversible: "It can't be undone.",
    typeName: (name) => html`Type <b>${name}</b> to confirm`,
    exactly: (name) => `Type ${name} exactly as it is written.`,
  },
};

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
  page?: { keepHref: string };
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
export function confirmDestructive(o: ConfirmDestructiveOptions): Html {
  const t = CONFIRM[o.lang];
  const losses = o.losses ?? [];
  const join = (items: Content[]) => html`${items.slice(0, -1).map((l, i) => html`${i ? ", " : ""}${l}`)}${items.length > 1 ? ` ${t.and} ` : ""}${items[items.length - 1]}`;
  const after = [o.text, o.irreversible ? html`<strong>${t.irreversible}</strong>` : ""].filter(Boolean);
  const afterText = after.map((a, i) => html`${i ? " " : ""}${a}`);
  let words: Html;
  if (losses.length > 4) {
    words = html`<p>${t.removesList}</p><ul class="dialog-losses">${losses.map((l) => html`<li>${l}</li>`)}</ul>${after.length ? html`<p>${afterText}</p>` : ""}`;
  } else {
    const sentence = losses.length ? t.removes(join(losses)) : "";
    words = sentence || after.length ? html`<p>${sentence}${sentence && after.length ? " " : ""}${afterText}</p>` : html``;
  }
  const name = o.confirmName;
  const input = name
    ? field({
        label: o.nameLabel ?? t.typeName(name),
        name: o.confirmField ?? "confirm",
        id: `${o.id}-name`,
        required: true,
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
    body: html`${words}${input}`,
    close: o.keepLabel ?? t.keep,
    actions: button({ label: o.confirmLabel, variant: "danger" }),
    form: { action: o.action, fields: o.fields },
    alert: true,
    page: o.page ? { closeHref: o.page.keepHref } : undefined,
  });
}

// --- Toast and tooltip (D-26) ----------------------------------------------------------------------

/** What a toast reports: done, a warning, a failure, or a fact. Not notice()'s Tone: a toast says
 *  danger, as tag() does, because it reports something that went wrong elsewhere, not a form's error. */
export type ToastTone = "success" | "warning" | "danger" | "info";

// The package's words, as the bar's and the confirm's are (D-17, D-23). The tone's word is read
// before the text, so a screen reader hears what kind of message it is, as an eye sees from the icon.
const TOAST: Record<Lang, { dismiss: string; region: string; tone: Record<ToastTone, string> }> = {
  da: { dismiss: "Luk", region: "Beskeder", tone: { success: "Udført", warning: "Advarsel", danger: "Fejl", info: "Bemærk" } },
  en: { dismiss: "Dismiss", region: "Messages", tone: { success: "Done", warning: "Warning", danger: "Error", info: "Note" } },
};

// A shape per tone as well as a colour, so the tone is never told by colour alone: a tick, a
// triangle, an octagon and an i.
const TOAST_ICON: Record<ToastTone, IconName> = { success: "check", warning: "alert-triangle", danger: "alert-octagon", info: "info" };

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
  action?: { label: Content; href: string };
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
export function toast(o: ToastOptions): Html {
  const t = TOAST[o.lang];
  const tone = o.tone ?? "info";
  const id = o.id ?? "toast";
  const textId = `${id}-text`;
  // Only a success or a fact with nothing to do may hide itself, and only through toastScript().
  const autohide = (tone === "success" || tone === "info") && !o.action;
  const a = raw(attrs({ class: `toast toast-${tone}`, id, role: tone === "danger" ? "alert" : "status", "aria-live": tone === "danger" ? undefined : "polite", "data-toast-autohide": autohide ? "true" : undefined }));
  const action = o.action ? html`<a class="button ghost small" href="${safeHref(o.action.href)}" aria-describedby="${textId}">${o.action.label}</a>` : "";
  return html`<div${a}>${icon(TOAST_ICON[tone])}<p class="toast-text" id="${textId}"><span class="visually-hidden">${t.tone[tone]}: </span>${o.text}</p><span class="toast-actions">${action}<a class="button ghost small toast-dismiss" href="${safeHref(o.dismissHref)}" data-toast-dismiss="${id}" aria-describedby="${textId}">${icon("x")}<span class="visually-hidden">${t.dismiss}</span></a></span></div>`;
}

/** Several toasts stacked at the bottom of the window, newest last, in a region named "Beskeder" /
 *  "Messages" that a screen reader can jump to. */
export function toastRegion(o: { lang: Lang; toasts: Content; label?: string }): Html {
  return html`<section class="toast-region" aria-label="${o.label ?? TOAST[o.lang].region}">${o.toasts}</section>`;
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
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
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
export function toastScript(nonce?: string): Html {
  return html`<script${raw(nonce ? ` nonce="${nonce.replace(/[^A-Za-z0-9+/=_-]/g, "")}"` : "")}>${raw(TOAST_SCRIPT)}</script>`;
}

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
export function tooltip(o: TooltipOptions): Html {
  const trigger = raw(attrs({ type: "button", class: "tooltip-trigger", popovertarget: o.id, popovertargetaction: "show", interestfor: o.id, "aria-describedby": o.id, "aria-label": o.label }));
  return html`<span class="tooltip-wrap"><button${trigger}>${o.trigger}</button><span class="tooltip" id="${o.id}" popover="auto" role="tooltip">${o.text}</span></span>`;
}

// --- Agent approval, diff and "why it did that" (D-24) ---------------------------------------------

// The same words as Spring's approval cards in Slack (apps/harness/src/approval-message.ts): "Asked by
// <person> via Spring", "Why", "Expires", "What it does", "Approved by", "Rejected by", "Nothing
// changes", so a request reads the same on a web page and in a channel. They are the package's, as the
// bar's and the confirm's are (D-17, D-23): every product asks for approval the same way.
type AgentText = {
  waiting: string;
  askedBy: string;
  via: (who: Html, agent: string) => Html;
  expires: string;
  why: string;
  follows: string;
  changes: string;
  nothing: string;
  more: (k: number) => string;
  effects: string;
  approve: string;
  edit: string;
  reject: string;
  draft: string;
  outcome: Record<ApprovalOutcome["status"], string>;
  by: string;
  field: string;
  before: string;
  after: string;
  none: string;
  added: string;
  removed: string;
  explain: (agent: string) => string;
  basedOn: string;
};

const AGENT: Record<Lang, AgentText> = {
  da: {
    waiting: "Venter på godkendelse",
    askedBy: "Anmodet af",
    via: (who, agent) => html`${who} via ${agent}`,
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
    via: (who, agent) => html`${who} via ${agent}`,
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

const LOCALE: Record<Lang, string> = { da: "da-DK", en: "en-GB" };

/** A moment: a Date, written in the page's language in Copenhagen's time (as the standard pages
 *  write one), a Date with the caller's own words for it ("om 2 timer"), or words alone. */
export type When = Date | string | { at: Date; label: Content };

function when(w: When, lang: Lang, time: "full" | "time" = "full"): Html {
  if (typeof w === "string") return html`${w}`;
  const at = w instanceof Date ? w : w.at;
  const label = w instanceof Date ? new Intl.DateTimeFormat(LOCALE[lang], { ...(time === "full" ? { dateStyle: "medium" } : {}), timeStyle: "short", timeZone: "Europe/Copenhagen" }).format(at) : w.label;
  return html`<time datetime="${at.toISOString()}">${label}</time>`;
}

const hidden = (fields: Record<string, string> = {}) => Object.entries(fields).map(([name, value]) => html`<input type="hidden" name="${name}" value="${value}">`);

/** "A, B og C", with the page's word for and. */
const joinAnd = (items: Content[], and: string) => html`${items.map((l, i) => html`${i === 0 ? "" : i === items.length - 1 ? ` ${and} ` : ", "}${l}`)}`;

const followsLinks = (links: Link[], t: AgentText, lang: Lang) =>
  links.length ? html`<span class="agent-follows">${t.follows} ${joinAnd(links.map((l) => html`<a href="${safeHref(l.href)}">${l.label}</a>`), lang === "da" ? "og" : "and")}</span>` : "";

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
export type ApprovalEffect = { text: Content; tone?: "warning" | "danger" };

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
  why?: { text: Content; links?: Link[] };
  /** What it changes, one item each: an item is one Content, or an array of parts written with " · "
   *  between them (["Nordkraft ApS #2041", "33 dage", "12.400 kr."]). The first `show` (3) are drawn,
   *  then "+k flere", where k is `total` (default: the items' count) less those drawn, linked to
   *  `moreHref`. So a caller can pass only the first few of a long list. */
  changes: { items: Content[]; total?: number; show?: number; moreHref?: string };
  /** What approving costs or touches: "Sender 14 mails fra finance@", "Kan ikke fortrydes". */
  effects?: ApprovalEffect[];
  /** POST forms, each with its hidden fields (the CSRF token and the request's id), as confirmDestructive's. */
  approve: { label?: Content; action: string; fields?: Record<string, string> };
  /** A link to change the request before deciding. */
  edit?: { label?: Content; href: string };
  reject?: { label?: Content; action: string; fields?: Record<string, string> };
  /** "Se udkastet": the thing itself (the mails, the page) as it would go out. */
  draftHref?: string;
  /** An explain() trail, drawn after the facts. */
  explain?: Content;
  /** Decided already: the outcome line replaces the buttons and the expiry. */
  outcome?: ApprovalOutcome;
};

const OUTCOME_SIGNAL: Record<ApprovalOutcome["status"], Signal> = { approved: "ok", rejected: "off", expired: "warn" };

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
export function approval(o: ApprovalOptions): Html {
  const t = AGENT[o.lang];
  const titleId = `${o.id}-title`;
  const h = o.headingLevel ?? 2;
  const fact = (label: string, value: Content) => html`<div><dt>${label}</dt><dd>${value}</dd></div>`;

  const show = Math.max(0, o.changes.show ?? 3);
  const drawn = o.changes.items.slice(0, show);
  const more = Math.max(0, (o.changes.total ?? o.changes.items.length) - drawn.length);
  const item = (c: Content) => (Array.isArray(c) ? html`<span class="approval-item-name">${c[0]}</span>${c.slice(1).map((p) => html` · ${p}`)}` : c);
  const moreText = t.more(more);
  const changes = drawn.length || more
    ? html`<ul class="approval-changes">${drawn.map((c) => html`<li>${item(c)}</li>`)}${more ? html`<li class="approval-more">${o.changes.moreHref ? html`<a href="${safeHref(o.changes.moreHref)}">${moreText}</a>` : moreText}</li>` : ""}</ul>`
    : html`<p>${t.nothing}</p>`;

  const effects = o.effects?.length
    ? html`<ul class="approval-effects">${o.effects.map((e) => html`<li${raw(attrs({ class: e.tone }))}>${e.tone ? html`<strong>${e.text}</strong>` : e.text}</li>`)}</ul>`
    : "";

  const facts = html`<dl class="approval-facts">${fact(t.askedBy, o.onBehalfOf ? t.via(html`${o.onBehalfOf}`, o.agent) : o.agent)}${o.expires && !o.outcome ? fact(t.expires, when(o.expires, o.lang)) : ""}${
    o.why ? fact(t.why, html`${o.why.text}${o.why.links?.length ? " " : ""}${followsLinks(o.why.links ?? [], t, o.lang)}`) : ""
  }${fact(t.changes, changes)}${effects ? fact(t.effects, effects) : ""}</dl>`;

  // The buttons name the request for a screen reader through the title, so three "Godkend" on one
  // page are told apart.
  const described = raw(` aria-describedby="${esc(titleId)}"`);
  const actions = o.outcome
    ? outcomeLine(o.outcome, t, o.lang)
    : html`<div class="approval-actions"><form method="post" action="${safeHref(o.approve.action)}">${hidden(o.approve.fields)}<button type="submit"${described}>${o.approve.label ?? t.approve}</button></form>${
        o.edit ? html`<a class="button ghost" href="${safeHref(o.edit.href)}"${described}>${o.edit.label ?? t.edit}</a>` : ""
      }${o.reject ? html`<form method="post" action="${safeHref(o.reject.action)}">${hidden(o.reject.fields)}<button type="submit" class="ghost"${described}>${o.reject.label ?? t.reject}</button></form>` : ""}${
        o.draftHref ? html`<a class="go" href="${safeHref(o.draftHref)}">${t.draft}</a>` : ""
      }</div>`;

  const kicker = html`<p class="approval-kicker"><span class="approval-agent">${o.agent}</span>${o.outcome ? "" : html` · ${t.waiting}`}</p>`;
  const title = raw(`<h${h} class="approval-title" id="${esc(titleId)}">${render(o.title)}</h${h}>`);
  return html`<section class="approval" id="${o.id}" aria-labelledby="${titleId}">${kicker}${title}${o.summary ? html`<p class="approval-summary">${o.summary}</p>` : ""}${facts}${o.explain}${actions}</section>`;
}

function outcomeLine(out: ApprovalOutcome, t: AgentText, lang: Lang): Html {
  const by = out.by && out.status !== "expired" ? html` ${t.by} ${out.by}` : "";
  const at = out.at ? html`${by ? " ·" : ""} ${when(out.at, lang)}` : "";
  // One span for the words: the signal is a flex row, and loose text and <time> would each be an
  // item with the row's gap between them.
  return html`<div class="approval-outcome"><p>${signal(html`<span>${t.outcome[out.status]}${by}${at}</span>`, OUTCOME_SIGNAL[out.status])}</p>${out.note ? html`<p>${out.note}</p>` : ""}</div>`;
}

/** A field that changes: its name and its value before and after. A missing value is "Ingen". */
export type DiffField = { label: Content; before?: Content; after?: Content };
/** A line of text, as the caller split it: unchanged context, added or removed. */
export type DiffLine = { kind: "same" | "added" | "removed"; text: Content };

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
export function diff(o: DiffOptions): Html {
  const t = AGENT[o.lang];
  const label = o.label ?? t.changes;
  const value = (v: Content) => (v === undefined || v === null || v === false || v === "" ? html`<span class="diff-none">${t.none}</span>` : v);
  const fields = o.fields?.length
    ? table({ label, columns: [{ label: t.field }, { label: t.before }, { label: t.after }], rows: o.fields.map((f) => [html`<span class="diff-field">${f.label}</span>`, value(f.before), value(f.after)]) })
    : "";
  const line = (l: DiffLine) => {
    if (l.kind === "same") return html`<li class="diff-line"><span class="diff-sign" aria-hidden="true"></span><span class="diff-text">${l.text}</span></li>`;
    const added = l.kind === "added";
    const tagName = added ? "ins" : "del";
    return html`<li class="${`diff-line ${l.kind}`}"><span class="diff-sign" aria-hidden="true">${added ? "+" : "−"}</span>${raw(`<${tagName} class="diff-text">`)}<span class="visually-hidden">${added ? t.added : t.removed} </span>${l.text}${raw(`</${tagName}>`)}</li>`;
  };
  const lines = o.lines?.length ? html`<ul class="diff-lines">${o.lines.map(line)}</ul>` : "";
  return html`<figure class="diff">${o.label ? html`<figcaption class="diff-label">${o.label}</figcaption>` : ""}${fields}${lines}</figure>`;
}

/** One step the agent took: what it did, what it read or used (linked when it can be opened), and when. */
export type ExplainStep = { text: Content; used?: { label: Content; href?: string }; at?: When };

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
export function explain(o: ExplainOptions): Html {
  const t = AGENT[o.lang];
  const step = (s: ExplainStep) => {
    const used = s.used ? html`${t.basedOn} ${s.used.href ? html`<a href="${safeHref(s.used.href)}">${s.used.label}</a>` : s.used.label}` : "";
    const at = s.at ? when(s.at, o.lang, "time") : "";
    const meta = used || at ? html`<span class="explain-meta">${used}${used && at ? " · " : ""}${at}</span>` : "";
    return html`<li><span class="explain-text">${s.text}</span>${meta}</li>`;
  };
  const follows = o.follows?.length ? html`<p class="explain-follows">${followsLinks(o.follows, t, o.lang)}</p>` : "";
  return html`<details class="explain"><summary>${t.explain(o.agent)}</summary><div class="explain-body"><ol class="explain-steps">${o.steps.map(step)}</ol>${follows}</div></details>`;
}

/** The divider between two ways in: "eller". */
export const orDivider = (text: Content): Html => html`<p class="or"><span>${text}</span></p>`;

const GOOGLE_G = `<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>`;

/** Google's button (google-button.css), as a submit button for the caller's form. */
export function googleButton(label: Content): Html {
  return html`<button class="gsi" type="submit">${raw(GOOGLE_G)}<span>${label}</span></button>`;
}

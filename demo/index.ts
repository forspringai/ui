// The demo page: every component, drawn with src/html.ts, in Danish. pnpm build writes it to
// dist/demo/index.html and pnpm demo serves it. The product and theme switches at the top are the
// only script, and only here: products set data-product and data-theme on the server. The standard
// pages around signing in (D-17) are pages of their own, in DataSpring, in Danish and English:
// dist/demo/pages/<name>.<lang>.html, from standardPages().

import { button, card, crumbs, field, googleButton, html, list, notice, orDivider, raw, shell, signal, state, switchButton, table, tag, type BarOptions, type Lang, type Org } from "../src/html.ts";
import { connectPanel, connectScript, type ConnectPanelOptions } from "../src/connect.ts";
import { chooseOrgPage, noOrgPage, refusedPage, type StandardPage } from "../src/pages.ts";
import { REFUSAL_REASONS, type Refusal } from "../src/refusals.ts";

const PRODUCTS = [
  ["forspring", "Forspring"],
  ["spring", "Spring"],
  ["sitespring", "SiteSpring"],
  ["dataspring", "DataSpring"],
  ["appspring", "AppSpring"],
  ["pulsespring", "PulseSpring"],
] as const;

const radios = (name: string, items: readonly (readonly [string, string])[], checked: string) =>
  items.map(([value, label]) => html`<label><input type="radio" name="${name}" value="${value}"${raw(value === checked ? " checked" : "")}> ${label}</label>`);

const controls = html`<form class="demo-controls card" aria-label="Demovalg">
<fieldset><legend>Produkt</legend>${radios("product", PRODUCTS, "forspring")}</fieldset>
<fieldset><legend>Tema</legend>${radios("theme", [["system", "Som systemet"], ["light", "Lyst"], ["dark", "Mørkt"]], "system")}</fieldset>
</form>`;

// Reads ?product=, ?theme= and ?open= too, so a screenshot can ask for a state by URL.
const SCRIPT = `<script>
(() => {
  const root = document.documentElement, form = document.querySelector(".demo-controls"), q = new URLSearchParams(location.search);
  const apply = () => {
    const p = form.product.value, t = form.theme.value;
    root.dataset.product = p;
    if (t === "system") delete root.dataset.theme; else root.dataset.theme = t;
    const name = form.querySelector('input[name=product]:checked').parentElement.textContent.trim();
    // Every bar has the doll and a wordmark (D-18): a product's doll in its accent and its name alone,
    // Forspring's ink doll, "Forspring" and "konto". The doll's colour follows data-product (--mark).
    document.querySelectorAll(".brand").forEach((e) => {
      e.dataset.own ??= e.innerHTML;
      e.innerHTML = e.dataset.own;
      if (p !== "forspring") e.replaceChildren(e.querySelector(".mark"), Object.assign(document.createElement("span"), { className: "word", textContent: name }));
      // The label starts with the visible words, as WCAG 2.5.3 asks (D-8).
      e.setAttribute("aria-label", (p === "forspring" ? "Forspring konto" : name) + ", forside");
    });
    // The tab's icon is the product's doll too (D-18).
    document.querySelectorAll('link[rel="icon"], link[rel="apple-touch-icon"]').forEach((l) => {
      const parts = l.getAttribute("href").split("/");
      parts[parts.length - 2] = p;
      l.href = parts.join("/");
    });
  };
  if (q.get("product")) form.product.value = q.get("product");
  if (q.get("theme")) form.theme.value = q.get("theme");
  // ?open=org-switcher (or product-switcher, user-menu) opens a bar menu, so the audit measures its panel.
  if (q.get("open")) document.querySelector("details." + CSS.escape(q.get("open")))?.setAttribute("open", "");
  // ?tab=claude-ai (or other, cli) picks a tab in the connect panel (D-19).
  if (q.get("tab")) { const r = document.getElementById("connect-" + q.get("tab")); if (r) r.checked = true; }
  form.addEventListener("change", apply);
  apply();
})();
</script>`;

const head = raw(`<link rel="stylesheet" href="../tokens.css"><link rel="stylesheet" href="../fonts.css"><link rel="stylesheet" href="../components.css"><link rel="stylesheet" href="../google-button.css">
<style>
.demo-controls { display: flex; flex-wrap: wrap; gap: var(--space-4) var(--space-8); padding: var(--space-4) var(--space-5); margin-bottom: var(--space-8); }
.demo-row { display: flex; flex-wrap: wrap; gap: var(--space-3); align-items: center; margin-bottom: var(--space-4); }
.demo-grid { display: grid; gap: var(--space-4); grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr)); }
.demo-grid > * { margin: 0; }
</style>`);

// The standard pages (D-17), each a page of its own in DataSpring, as a product shows them.
const PAGES: [string, string][] = [
  ["choose-org", "Vælg en organisation"],
  ["no-org", "Ingen organisation endnu"],
  ...REFUSAL_REASONS.map((r): [string, string] => [`refused-${r}`, `Afvist: ${r}`]),
];

const ORGS: Org[] = [
  { slug: "bager-hansen", name: "Bager Hansen ApS", role: "admin" },
  { slug: "osterbro-cykler", name: "Østerbro Cykler", role: "owner" },
  { slug: "aero-kaffe", name: "Ærø Kaffebrænderi", role: "viewer" },
];

// The person's user menu; `da` and `en` are this page in each language.
const METTE = (_lang: Lang, da: string, en: string) => ({
  name: "Mette Kjær",
  email: "mette@eksempel.dk",
  accountHref: "#",
  agentsHref: "#",
  languages: { da, en },
  signOut: { action: "#", fields: { csrf: "demo" } },
});

// Connect an agent (D-19, hub D-102): SiteSpring for Bager Hansen, a person with several orgs, before
// tez: the bare MCP URL, the product's own key form and keys page.
const CONNECT = (lang: Lang): ConnectPanelOptions => ({
  lang,
  product: "sitespring",
  org: { slug: ORGS[0]!.slug, name: ORGS[0]!.name },
  mcpUrl: "https://mcp.sitespring.app/mcp",
  multiOrg: true,
  keysHref: "#",
  createKey: { action: "#", fields: { csrf: "demo" } },
});

const people = [
  ["Mette Kjær", "mette@eksempel.dk", "Administrator", true, false, 1240],
  ["Jonas Holm", "jonas@eksempel.dk", "Medlem", true, true, 87],
  ["Aisha Rahman", "aisha@eksempel.dk", "Medlem", false, true, 3],
] as const;

const peopleTable = table({
  label: "Folk og produkter",
  columns: [{ label: "Person" }, { label: "Rolle", phoneHide: true }, { label: "SiteSpring" }, { label: "DataSpring" }, { label: "Sider", num: true }],
  rows: people.map(([name, email, role, site, data, pages]) => [
    html`<span class="name">${name}</span><br><span class="email">${email}</span><span class="phone-only email"><br>${role}</span>`,
    role,
    html`<form class="inline" method="post" action="#">${switchButton({ checked: site, label: `SiteSpring for ${name}` })}</form>`,
    html`<form class="inline" method="post" action="#">${switchButton({ checked: data, label: `DataSpring for ${name}` })}</form>`,
    pages.toLocaleString("da-DK"),
  ]),
});

const wideTable = table({
  label: "Fakturaer, rul vandret for at se alle kolonner",
  caption: "Fakturaer",
  columns: [{ label: "Nummer" }, { label: "Kunde" }, { label: "Udstedt" }, { label: "Forfalder" }, { label: "Status" }, { label: "Beløb (kr.)", num: true }, { label: "Moms (kr.)", num: true }],
  rows: [
    ["2026-0412", "Bager Hansen ApS", "1. okt. 2026", "15. okt. 2026", tag("Betalt", "success"), "12.500,00", "3.125,00"],
    ["2026-0413", "Østerbro Cykler", "3. okt. 2026", "17. okt. 2026", tag("Forfalder snart", "warning"), "4.180,00", "1.045,00"],
    ["2026-0414", "Ærø Kaffebrænderi", "5. okt. 2026", "5. okt. 2026", tag("Overskredet", "danger"), "980,50", "245,13"],
  ],
});

const body = html`${controls}
${crumbs("Placering", [{ label: "Forside", href: "#" }, { label: "Komponenter", href: "#" }])}
<h1>Din Forspring-konto</h1>
<p class="lede">Logget ind som <b>mette@eksempel.dk</b>. Alt på siden er tegnet af @forspring/ui uden script.</p>

<section><h2>Beskeder</h2>
${notice({ text: "Vi sender en mail, når eksporten er klar." })}
${notice({ tone: "success", text: "Du har taget imod invitationen." })}
${notice({ tone: "warning", title: "Din prøveperiode udløber om 3 dage", text: "Vælg en plan for at beholde dine sider." })}
${notice({ tone: "error", text: "Det lykkedes ikke. Hent siden igen og prøv en gang til." })}
</section>

<section><h2>Signaler</h2>
<p>Tilstanden for noget, der overvåges: et mærke i form og farve, altid med ordet.</p>
<div class="demo-row">${signal("Oppe", "ok")}${signal("Forsinket", "warn")}${signal("Nede", "down")}${signal("Sat på pause", "off")}</div>
${notice({ signal: "down", title: "2 tjek er nede", text: html`<a href="#">Månedlig fakturakørsel</a>, <a href="#">Natlig backup</a>` })}
${notice({ signal: "ok", title: "Alt kører", text: "Alle 14 tjek har meldt sig til tiden." })}
</section>

<section><h2>Knapper og mærker</h2>
<div class="demo-row">${button({ label: "Gem" })}${button({ label: "Annuller", variant: "ghost", type: "button" })}${button({ label: "Slet kunden", variant: "danger", type: "button" })}${button({ label: "Åbn SiteSpring", href: "#" })}${button({ label: "Ikke nu", disabled: true, type: "button" })}</div>
<div class="demo-row">${button({ label: "Tag imod", small: true })}${button({ label: "Afslå", variant: "ghost", small: true })}${button({ label: "Fjern", variant: "danger", small: true })}</div>
<div class="demo-row">${tag("platform")}${tag("Denne enhed")}${tag("Ny", "primary")}${tag("Aktiv", "success")}${tag("Afventer", "warning")}${tag("Spærret", "danger")}</div>
</section>

<section><h2>Værktøjslinje</h2>
<p>Felter, valg og knapper har samme højde i hver størrelse og står på én linje.</p>
<form class="toolbar demo-row" method="get" action="#" role="search" aria-label="Søg i kunder"><input type="search" name="q" aria-label="Søg i kunder" placeholder="Søg i kunder"><select name="status" aria-label="Status"><option>Alle</option><option>Aktive</option><option>Spærrede</option></select>${button({ label: "Søg" })}${button({ label: "Ryd", variant: "ghost", type: "reset" })}</form>
<div class="toolbar demo-row"><input class="small" type="search" aria-label="Filtrer fakturaer" placeholder="Filtrer"><select class="small" aria-label="Periode"><option>Denne måned</option><option>Sidste måned</option></select>${button({ label: "Eksporter", variant: "ghost", small: true, type: "button" })}<select class="small" aria-label="Valuta" disabled><option>DKK</option></select></div>
</section>

<section><h2>Lister</h2>
${list([
  { name: "SiteSpring", action: html`<a class="go" href="#">Åbn SiteSpring</a>` },
  { name: "DataSpring", action: html`<a class="go" href="#">Åbn DataSpring</a>` },
  { name: "Chrome på macOS", meta: "Logget ind 9. okt. 2026 14.02, sidst brugt 10. okt. 2026 08.15", action: tag("Denne enhed") },
  { name: "Safari på iOS", meta: "Logget ind 2. okt. 2026 19.40, sidst brugt 8. okt. 2026 22.03", action: button({ label: "Log ud her", variant: "ghost", small: true, ariaLabel: "Log ud her, Safari på iOS" }) },
])}
</section>

<section><h2>Tabeller</h2>
${peopleTable}
<p class="fine">På en telefon flytter rollen ind under navnet, og ordene Til og Fra forsvinder.</p>
<div style="margin-top: var(--space-6)">${wideTable}</div>
</section>

<section><h2>Formular</h2>
${card(html`<form class="form" method="post" action="#">
${field({ label: "Navn", name: "name", value: "Mette Kjær", autocomplete: "name" })}
${field({ label: "Mail", name: "email", type: "email", value: "mette@eksempel", error: "Skriv en hel mailadresse, fx navn@firma.dk.", autocomplete: "email" })}
${field({ label: "Rolle", name: "role", control: "select", hint: "Administratorer kan slå produkter til og fra for andre.", options: [{ value: "member", label: "Medlem" }, { value: "admin", label: "Administrator", selected: true }] })}
${field({ label: "Besked til Mette", name: "note", control: "textarea", placeholder: "Valgfri" })}
<fieldset><legend>Produkter at slå til</legend><label><input type="checkbox" name="p" value="site" checked> SiteSpring</label><label><input type="checkbox" name="p" value="data"> DataSpring</label></fieldset>
<p>${button({ label: "Send invitation" })}</p>
</form>`)}
</section>

<section><h2>Tomt, henter og fejl</h2>
<div class="demo-grid">
${state({ kind: "empty", title: "Ingen kunder endnu", text: "Når du opretter en kunde, står den her.", action: button({ label: "Opret kunde", small: true }) })}
${state({ kind: "empty", title: "Ingen kunder matcher “Østerbro”", text: "Der er 14 kunder i alt.", action: button({ label: "Ryd søgningen", variant: "ghost", small: true, type: "button" }) })}
${state({ kind: "loading", title: "Henter kunder" })}
${state({ kind: "failed", title: "Kunderne kunne ikke hentes", text: "Vi ved ikke, om der er nogen. Prøv igen om lidt.", action: button({ label: "Prøv igen", variant: "ghost", small: true, type: "button" }) })}
</div>
</section>

${connectPanel(CONNECT("da"))}
<p class="fine">Panelet som side for sig i SiteSpring: <a href="pages/connect.da.html">dansk</a>, <a href="pages/connect.en.html" lang="en" hreflang="en">English</a>.</p>

<section><h2>Sider omkring log ind</h2>
<p>Standardsiderne, som hvert produkt viser med de samme ord (her i DataSpring). Hver er en side for sig.</p>
${list(PAGES.map(([name, title]) => ({ name: title, meta: html`<span lang="en">${name}</span>`, action: html`<span class="actions"><a class="go" href="${`pages/${name}.da.html`}">Dansk</a> <a class="go" href="${`pages/${name}.en.html`}" lang="en" hreflang="en">English</a></span>` })))}
</section>

<section><h2>Log ind</h2>
<div style="max-width: 480px">${card(html`<h1>Log ind på Forspring</h1><p class="lede">Én konto til SiteSpring, DataSpring og Spring.</p>
<form method="post" action="#">${googleButton("Fortsæt med Google")}</form>
${orDivider("eller")}
<form class="form" method="post" action="#">${field({ label: "Mail", name: "signin-email", type: "email", autocomplete: "email" })}${button({ label: "Send mig et link", wide: true })}</form>
<p class="fine">Ved at logge ind accepterer du <a href="#">vilkårene</a>.</p>`)}</div>
</section>
${connectScript()}
${raw(SCRIPT)}`;

export function demoPage(): string {
  return String(
    shell({
      lang: "da",
      title: "Komponenter",
      productLabel: "konto",
      homeLabel: "Forspring konto, forside",
      brandBase: "../brand/",
      head,
      org: { current: ORGS[0]!, orgs: ORGS, path: "/o/bager-hansen/komponenter", peopleHref: "#" },
      products: { items: PRODUCTS.filter(([key]) => key !== "forspring").map(([key, name]) => ({ name, href: `?product=${key}` })), accountHref: "#" },
      userMenu: METTE("da", "index.html", "index.html"),
      menu: {
        label: "Hovedmenu",
        toggle: "Menu",
        groups: [
          {
            items: [
              { label: "Komponenter", href: "#", current: true },
              { label: "Overblik", href: "#", badge: { text: "2", signal: "down", label: "nede" } },
              { label: "Advarsler", href: "#" },
            ],
          },
          {
            label: "Projekter",
            items: [
              { label: "Webshop", href: "#", badge: { text: "2", signal: "down", label: "nede" } },
              { label: "Bogføring", href: "#" },
            ],
          },
        ],
      },
      footer: [
        { label: "English", href: "#", lang: "en" },
        { label: "Privatlivspolitik", href: "https://forspring.ai/privatlivspolitik" },
        { label: "Vilkår", href: "https://forspring.ai/vilkaar" },
        { label: "forspring.ai", href: "https://forspring.ai" },
      ],
      body,
    }),
  );
}


const ADMINS = [
  { name: "Jonas Holm", email: "jonas@eksempel.dk" },
  { name: "Aisha Rahman", email: "aisha@eksempel.dk" },
];

function standard(name: string, lang: Lang): StandardPage {
  const orgs = ORGS.map((o) => ({ ...o, href: `/o/${o.slug}/` }));
  if (name === "choose-org")
    return chooseOrgPage({ lang, product: "DataSpring", lastHere: "osterbro-cykler", orgs: orgs.map((o, i) => ({ ...o, lastUsed: new Date(Date.UTC(2026, 9, 12 - i * 3, 9, 30)) })) });
  if (name === "no-org") return noOrgPage({ lang, product: "DataSpring", email: "mette@eksempel.dk", ask: ADMINS, accountHref: "#" });
  const reason = name.slice("refused-".length) as Refusal;
  return refusedPage({
    lang,
    reason,
    org: ORGS[0]!.name,
    orgs,
    people: reason === "org_suspended" ? [{ name: "Mette Kjær", email: "mette@eksempel.dk" }] : reason === "not_signed_in" || reason === "org_required" || reason === "org_mismatch" || reason === "account_unavailable" ? undefined : ADMINS,
    signInHref: "#",
    billingHref: "#",
    roleNeeded: "admin",
    credentialOrg: ORGS[1]!.name,
    command: reason === "not_signed_in" ? "dataspring auth login" : reason === "org_required" ? "dataspring datacore status --org bager-hansen" : undefined,
  });
}

/** dist/demo/pages/connect.<lang>.html: the connect panel on a page of its own, in SiteSpring's bar. */
function connectPages(out: Record<string, string>) {
  for (const lang of ["da", "en"] as const) {
    const da = lang === "da";
    out[`pages/connect.${lang}.html`] = String(
      shell({
        lang,
        product: "sitespring",
        productLabel: "SiteSpring",
        homeLabel: da ? "SiteSpring, forside" : "SiteSpring, home",
        title: da ? "Forbind en agent" : "Connect an agent",
        brandBase: "../../brand/",
        head: raw(`<link rel="stylesheet" href="../../tokens.css"><link rel="stylesheet" href="../../fonts.css"><link rel="stylesheet" href="../../components.css">`),
        org: { current: ORGS[0]!, orgs: ORGS, path: "/o/bager-hansen/agents", peopleHref: "#" },
        products: { items: [{ name: "SiteSpring", href: "/o/bager-hansen/", current: true }, { name: "DataSpring", href: "#" }, { name: "PulseSpring", href: "#" }], accountHref: "#" },
        userMenu: METTE(lang, "connect.da.html", "connect.en.html"),
        footer: [da ? { label: "English", href: "connect.en.html", lang: "en" } : { label: "Dansk", href: "connect.da.html", lang: "da" }, { label: da ? "Alle komponenter" : "All components", href: "../index.html" }],
        body: html`${connectPanel({ ...CONNECT(lang), headingLevel: 1 })}${connectScript()}`,
      }),
    ) + "\n";
  }
}

/** dist/demo/pages/<name>.<lang>.html: every standard page, in DataSpring's bar. */
export function standardPages(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [name] of PAGES)
    for (const lang of ["da", "en"] as const) {
      const p = standard(name, lang);
      // The bar as it is on that page: an org once one is known; none on choose-org, no-org and not_signed_in.
      const known = !["choose-org", "no-org", "refused-not_signed_in", "refused-org_required", "refused-not_a_member", "refused-account_unavailable"].includes(name);
      const signedIn = name !== "refused-not_signed_in" && name !== "refused-account_unavailable";
      out[`pages/${name}.${lang}.html`] = String(
        shell({
          lang,
          product: "dataspring",
          productLabel: "DataSpring",
          homeLabel: lang === "da" ? "DataSpring, forside" : "DataSpring, home",
          brandBase: "../../brand/",
          head: raw(`<link rel="stylesheet" href="../../tokens.css"><link rel="stylesheet" href="../../fonts.css"><link rel="stylesheet" href="../../components.css">`),
          org: known ? { current: ORGS[0]!, orgs: ORGS, path: "/o/bager-hansen/datacore/runs", peopleHref: "#" } : undefined,
          products: known ? { items: [{ name: "DataSpring", href: "/o/bager-hansen/", current: true }, { name: "SiteSpring", href: "#" }, { name: "PulseSpring", href: "#" }], accountHref: "#" } : undefined,
          userMenu: signedIn ? METTE(lang, `${name}.da.html`, `${name}.en.html`) : undefined,
          footer: [lang === "da" ? { label: "English", href: `${name}.en.html`, lang: "en" } : { label: "Dansk", href: `${name}.da.html`, lang: "da" }, { label: lang === "da" ? "Alle komponenter" : "All components", href: "../index.html" }],
          ...p,
        }),
      ) + "\n";
    }
  connectPages(out);
  return out;
}

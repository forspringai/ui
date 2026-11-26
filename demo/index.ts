// The demo page: every component, drawn with src/html.ts, in Danish. pnpm build writes it to
// dist/demo/index.html and pnpm demo serves it. The product and theme switches at the top are the
// only script, and only here: products set data-product and data-theme on the server. The standard
// pages around signing in (D-17) are pages of their own, in DataSpring, in Danish and English:
// dist/demo/pages/<name>.<lang>.html, from standardPages().

import { actions, approval, BUTTON_SCRIPT, button, CHANGED_SCRIPT, card, changedValue, confirmDestructive, COUNTDOWN_SCRIPT, cutoff, HOLD_SCRIPT, holdToConfirm, progress, sortByCutoff, TABLE_SELECT_SCRIPT, TOAST_SCRIPT, crumbs, dialog, dialogScript, dialogTrigger, diff, errorSummary, explain, field, googleButton, html, icon, ICON_NAMES, list, notice, orDivider, pageOf, raw, removableTag, shell, signal, state, switchButton, table, tag, toast, toastRegion, tooltip, type BarOptions, type ConfirmDestructiveOptions, type Lang, type Org } from "../src/html.ts";
import { connectPanel, connectScript, type ConnectPanelOptions } from "../src/connect.ts";
import { chooseOrgPage, noOrgPage, orgPickerPage, refusedPage, type StandardPage } from "../src/pages.ts";
import { REFUSAL_REASONS, type Refusal } from "../src/refusals.ts";
import { themePreviewPage } from "./theme-preview.ts";

const PRODUCTS = [
  ["forspring", "Forspring"],
  ["spring", "Spring"],
  ["sitespring", "SiteSpring"],
  ["dataspring", "DataSpring"],
  ["appspring", "AppSpring"],
  ["pulsespring", "PulseSpring"],
  ["flowspring", "FlowSpring"],
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
  // ?open=delete-site opens that dialog as a modal (D-23), for a screenshot or the audit.
  if (q.get("open")) { const d = document.getElementById(q.get("open")); if (d instanceof HTMLDialogElement) d.showModal(); }
  // ?open=cvr-tip opens that tooltip from its button (D-26), so it is anchored as a press anchors it.
  if (q.get("open")) document.querySelector('[popovertarget="' + CSS.escape(q.get("open")) + '"]')?.click();
  // ?tab=claude-ai (or other, cli) picks a tab in the connect panel (D-19).
  if (q.get("tab")) { const r = document.getElementById("connect-" + q.get("tab")); if (r) r.checked = true; }
  form.addEventListener("change", apply);
  apply();
})();
</script>`;

// ?live loads the package's own scripts and the few lines that stand in for a product's server.
const LIVE = `<script>
(() => {
  if (!new URLSearchParams(location.search).has("live")) return;
  const add = (text) => { const s = document.createElement("script"); s.textContent = text; document.head.append(s); };
  for (const text of ${JSON.stringify([BUTTON_SCRIPT, CHANGED_SCRIPT, TOAST_SCRIPT, TABLE_SELECT_SCRIPT, HOLD_SCRIPT, COUNTDOWN_SCRIPT]).replace(/</g, "\\u003c")}) add(text);
  // A product's server would answer; here a timer does.
  for (const f of document.querySelectorAll("#micro form")) f.addEventListener("submit", (e) => e.preventDefault());
  document.addEventListener("ui:undo", (e) => e.preventDefault());
  document.addEventListener("submit", (e) => {
    const b = e.submitter;
    if (b && b.hasAttribute("data-working")) setTimeout(() => b.dispatchEvent(new CustomEvent("ui:button-done", { bubbles: true })), 1500);
  });
  document.querySelector('[name="micro-refresh"]').addEventListener("click", () => {
    const v = document.querySelector("#micro-visits .changed-value");
    v.textContent = (1249 + Math.floor(Math.random() * 40)).toLocaleString("da-DK");
    v.dispatchEvent(new CustomEvent("ui:changed", { bubbles: true }));
  });
})();
</script>`;

const head = raw(`<link rel="stylesheet" href="../tokens.css"><link rel="stylesheet" href="../fonts.css"><link rel="stylesheet" href="../components.css"><link rel="stylesheet" href="../google-button.css">
<style>
.demo-controls { display: flex; flex-wrap: wrap; gap: var(--space-4) var(--space-8); padding: var(--space-4) var(--space-5); margin-bottom: var(--rhythm-flow); }
.demo-controls > * { margin: 0; }
.demo-row { display: flex; flex-wrap: wrap; gap: var(--space-3); align-items: center; margin-bottom: var(--space-4); }
.demo-grid { display: grid; gap: var(--space-4); grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr)); }
.demo-grid > * { margin: 0; }
.demo-toasts > .toast-region { position: static; inline-size: auto; max-inline-size: 30rem; margin-bottom: var(--space-6); }
.demo-icons { list-style: none; margin: var(--space-4) 0 0; padding: 0; display: grid; gap: var(--space-2); grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr)); }
.demo-icons li { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-2) var(--space-3); border: 1px solid var(--border); border-radius: var(--radius-card); background: var(--card); }
.demo-icons .icon { font-size: var(--text-content-h2); color: var(--foreground); }
</style>`);

// The standard pages (D-17), each a page of its own in DataSpring, as a product shows them.
const PAGES: [string, string][] = [
  ["choose-org", "Vælg en organisation"],
  ["no-org", "Ingen organisation endnu"],
  ...REFUSAL_REASONS.map((r): [string, string] => [`refused-${r}`, `Afvist: ${r}`]),
];

const ORGS: Org[] = [
  { slug: "bager-hansen", name: "Bager Hansen ApS", role: "admin" },
  { slug: "olstue-globex", name: "Ølstue Globex", role: "owner" },
  { slug: "aeble-example", name: "Æble & Co Example", role: "viewer" },
];

// The person's user menu; `da` and `en` are this page in each language.
const METTE = (_lang: Lang, da: string, en: string) => ({
  name: "Mette Kexample",
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

// The destructive confirm (D-23), SiteSpring's case from the brand review: deleting a site. The
// fallback page, for a browser with no script, is dist/demo/pages/delete-site.<lang>.html.
const DELETE_SITE = (lang: Lang): ConfirmDestructiveOptions & { title: string } =>
  lang === "da"
    ? {
        lang,
        id: "delete-site",
        title: "Slet bakery.example?",
        losses: ["181 sider", "4 formularer", "62 omdirigeringer"],
        text: "Domænet holder op med at svare med det samme.",
        irreversible: true,
        confirmName: "bakery.example",
        action: "#",
        fields: { csrf: "demo" },
        keepLabel: "Behold hjemmesiden",
        confirmLabel: "Slet hjemmesiden",
      }
    : {
        lang,
        id: "delete-site",
        title: "Delete bakery.example?",
        losses: ["181 pages", "4 forms", "62 redirects"],
        text: "The domain stops answering at once.",
        irreversible: true,
        confirmName: "bakery.example",
        action: "#",
        fields: { csrf: "demo" },
        keepLabel: "Keep site",
        confirmLabel: "Delete site",
      };

// Agent approval (D-24), the brand review's case: Spring asks before it sends payment reminders for
// Maria in finance, with the trail behind it folded in. A second request, already approved, shows the
// outcome in place of the buttons, as every copy shows it once someone decides.
const REMINDERS = approval({
  lang: "da",
  id: "approve-reminders",
  headingLevel: 3,
  agent: "Spring",
  onBehalfOf: "Maria (Økonomi)",
  title: "Spring vil sende 14 betalingspåmindelser",
  summary: "Spring har gjort påmindelser klar til de forfaldne fakturaer og venter på godkendelse.",
  expires: new Date(Date.UTC(2026, 10, 12, 13, 0)),
  why: { text: "Fakturaerne er mindst 14 dage forfaldne.", links: [{ label: "skillen Rykker for forfaldne fakturaer, trin 3", href: "#" }] },
  changes: {
    items: [
      ["Acme Nord ApS #2041", "33 dage", "12.400 kr."],
      ["Bager Hansen ApS #2038", "21 dage", "3.150 kr."],
      ["Ølstue Globex #2044", "16 dage", "8.720 kr."],
    ],
    total: 14,
    moreHref: "#",
  },
  effects: [{ text: "Sender 14 mails fra finance@" }, { text: "Kan ikke fortrydes", tone: "warning" }, { text: "Der bliver ikke trukket penge" }],
  explain: explain({
    lang: "da",
    agent: "Spring",
    steps: [
      { text: "Fandt 14 fakturaer, der er mere end 14 dage forfaldne", used: { label: "e-conomic: åbne fakturaer", href: "#" }, at: new Date(Date.UTC(2026, 10, 11, 8, 2)) },
      { text: "Tjekkede, at ingen af kunderne har aftalt en senere betaling", used: { label: "kundernes noter" }, at: new Date(Date.UTC(2026, 10, 11, 8, 3)) },
      { text: "Skrev en påmindelse til hver kunde", used: { label: "skabelonen Venlig påmindelse", href: "#" }, at: new Date(Date.UTC(2026, 10, 11, 8, 5)) },
    ],
    follows: [{ label: "skillen Rykker for forfaldne fakturaer, trin 3", href: "#" }],
  }),
  approve: { label: "Godkend og send", action: "#", fields: { csrf: "demo", request: "r-2041" } },
  edit: { href: "#" },
  reject: { action: "#", fields: { csrf: "demo", request: "r-2041" } },
  draftHref: "#",
});

const REMINDERS_DONE = approval({
  lang: "da",
  id: "approved-reminders",
  headingLevel: 3,
  agent: "Spring",
  onBehalfOf: "Maria (Økonomi)",
  title: "Spring vil sende 3 betalingspåmindelser",
  changes: { items: [["Æble & Co Example #2011", "18 dage", "980 kr."], ["Acme Nord ApS #2016", "15 dage", "4.300 kr."], ["Bager Hansen ApS #2019", "14 dage", "1.250 kr."]] },
  effects: [{ text: "Sender 3 mails fra finance@" }, { text: "Kan ikke fortrydes", tone: "warning" }],
  approve: { label: "Godkend og send", action: "#" },
  outcome: { status: "approved", by: "Mette Kexample", at: new Date(Date.UTC(2026, 10, 4, 9, 41)), note: "Påmindelserne er sendt." },
});

// A change to a channel's setup, as Spring's channel card shows one: only what differs.
const BRIEF_DIFF = diff({
  lang: "da",
  label: "Kanalen #økonomi",
  fields: [
    { label: "Ejere", before: "Maria Hexample", after: "Maria Hexample, Jonas Hexample" },
    { label: "Procedurer", before: "", after: "Rykker for forfaldne fakturaer" },
  ],
  lines: [
    { kind: "same", text: "Svar på dansk, kort og venligt." },
    { kind: "removed", text: "Send aldrig noget til kunder." },
    { kind: "added", text: "Påmindelser til kunder sendes kun efter godkendelse fra Maria eller Jonas." },
    { kind: "same", text: "Spørg, hvis en faktura mangler et nummer." },
  ],
});

const people = [
  ["Mette Kexample", "mette@eksempel.dk", "Administrator", true, false, 1240],
  ["Jonas Hexample", "jonas@eksempel.dk", "Medlem", true, true, 87],
  ["Aisha Rexample", "aisha@eksempel.dk", "Medlem", false, true, 3],
] as const;

// Små bevægelser (D-53): the seven micro-interactions, drawn as the server draws them. The scripts that
// make them move are loaded only with ?live (the review pages and a hand test), so the visual baselines
// show the same fixed picture every run: no clock, no timer.
const MICRO_NOW = new Date("2026-11-22T08:00:00Z");
const MICRO_SITES: [string, string, string][] = [
  ["Bager Hansen", "bager-hansen", "2026-11-22T09:20:00Z"],
  ["Example Frisør", "example-frisor", "2026-11-22T08:40:00Z"],
  ["Example Cykler", "example-cykler", "2026-11-22T07:30:00Z"],
  ["Café Example", "cafe-example", "2026-11-25T12:00:00Z"],
];
const MICRO_ROWS = sortByCutoff(MICRO_SITES, (r) => r[2], MICRO_NOW);
const microTable = table({
  label: "Hjemmesider med frist",
  columns: [{ label: "Hjemmeside" }, { label: "Frist" }],
  rows: MICRO_ROWS.map(([name, , at]) => [name, cutoff({ lang: "da", at, now: MICRO_NOW })]),
  selectable: {
    lang: "da",
    name: "site",
    ids: MICRO_ROWS.map((r) => r[1]),
    labels: MICRO_ROWS.map((r) => r[0]),
    form: { action: "#", fields: { csrf: "demo" } },
    actions: button({ label: "Udgiv de valgte", variant: "ghost", small: true }),
  },
});
const MICRO = html`<section id="micro"><h2>Små bevægelser</h2>
<p>Små tegn på, at noget sker. Hver virker uden script: serveren tegner tilstanden, og scriptet gør den levende. Med <code>?live</code> i adressen kører scripts på siden.</p>

<h3>Arbejder, så et flueben</h3>
<form class="demo-row" method="post" action="#">${button({ label: "Udgiv", progress: { lang: "da" } })}${button({ label: "Udgiv", progress: { lang: "da", state: "working" } })}${button({ label: "Udgiv", progress: { lang: "da", state: "done" } })}</form>

<h3>Værdi, der lige er ændret</h3>
<div class="demo-row"><p>Besøg i dag: <strong id="micro-visits">${changedValue("1.248", { changed: true })}</strong></p>${button({ label: "Hent nye tal", variant: "ghost", small: true, type: "button", name: "micro-refresh" })}</div>

<h3>Fortryd i en toast</h3>
<div class="demo-toasts">${toastRegion({ lang: "da", toasts: toast({ lang: "da", id: "toast-undo", tone: "success", text: "Siden “Åbningstider” er arkiveret.", dismissHref: "#micro", undo: { action: "#", fields: { csrf: "demo" }, seconds: 10 } }) })}</div>

<h3>Markér rækker</h3>
<p>Træk over felterne i den første kolonne, eller hold Shift nede. Tallet står under tabellen.</p>
${microTable}

<h3>Hold for at bekræfte</h3>
<p>På en telefon skal knappen holdes nede i et sekund. Et tryk, tastaturet og en skærmlæser får den samme bekræftelse som før.</p>
${holdToConfirm({ lang: "da", id: "micro-hold", label: "Slet hjemmesiden", holdLabel: "Hold for at slette hjemmesiden", dialog: "delete-site", href: "pages/delete-site.da.html", action: "#", fields: { csrf: "demo" } })}

<h3>Frist</h3>
<div class="demo-row">${cutoff({ lang: "da", at: "2026-11-25T12:00:00Z", now: MICRO_NOW })}${cutoff({ lang: "da", at: "2026-11-22T08:40:00Z", now: MICRO_NOW })}${cutoff({ lang: "da", at: "2026-11-22T07:30:00Z", now: MICRO_NOW })}</div>

<h3>Fremdrift, der ikke lyver</h3>
<div class="demo-grid">${progress({ id: "micro-p0", value: 0, max: 10, label: "0 af 10 låst" })}${progress({ id: "micro-p4", value: 4, max: 10, label: "4 af 10 låst" })}${progress({ id: "micro-p10", value: 10, max: 10, label: "10 af 10 låst" })}</div>
</section>`;

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
    ["2026-0413", "Ølstue Globex", "3. okt. 2026", "17. okt. 2026", tag("Forfalder snart", "warning"), "4.180,00", "1.045,00"],
    ["2026-0414", "Æble & Co Example", "5. okt. 2026", "5. okt. 2026", tag("Overskredet", "danger"), "980,50", "245,13"],
  ],
});

// A table at scale (D-25), the brand review's PulseSpring "Checks": 248 checks, page 1 of six rows,
// worst first. Every control is a link or the GET form, so the demo's hrefs stand in for the
// product's URLs with the state in the query string.
const CHECKS = [
  ["Natlig backup", "down", "Nede", "97,21 %", "Intet svar"],
  ["Månedlig fakturakørsel", "warn", "Forsinket", "99,40 %", "4,8 s"],
  ["Webshop: forside", "ok", "Oppe", "100,00 %", "212 ms"],
  ["Betalings-API", "ok", "Oppe", "99,98 %", "148 ms"],
  ["Lagersynk med e-conomic", "ok", "Oppe", "99,95 %", "1,2 s"],
  ["Nyhedsbrev, udsendelse", "ok", "Oppe", "99,90 %", "640 ms"],
] as const;
const checksPage = pageOf(248, 1, 6);

const checksTable = table({
  id: "checks",
  label: "Tjek",
  columns: [
    { label: "Tjek" },
    { label: "Tilstand", sort: { href: "#tjek", dir: "desc" } },
    { label: "Oppetid 30 d", num: true, sort: { href: "#tjek" } },
    { label: "Svartid", num: true, phoneHide: true, sort: { href: "#tjek" } },
  ],
  rows: CHECKS.map(([name, s, word, uptime, response]) => [html`<a href="#tjek">${name}</a>`, signal(word, s), uptime, response]),
  controls: {
    lang: "da",
    search: { placeholder: "Søg i 248 tjek" },
    filters: [
      { label: "Kræver opmærksomhed", count: 2, href: "#tjek" },
      { label: "Alle", count: 248, href: "#tjek", current: true },
    ],
    sort: { label: "værst først" },
    keep: { sort: "worst" },
    paging: { ...checksPage, nextHref: checksPage.next ? "#tjek" : undefined },
  },
});

// On a 422 page the summary takes focus on load. Here, in the middle of the gallery, that would scroll
// every visit down to the form, so the demo drops only the autofocus; the rest is the helper's markup.
const FORM_ERRORS = raw(
  String(
    errorSummary({
      lang: "da",
      errors: [
        { field: "email", message: "Mail: skriv en hel mailadresse, fx navn@firma.dk." },
        { field: "role", message: "Rolle: vælg, hvad Mette skal kunne." },
      ],
    }),
  ).replace(' autofocus=""', ""),
);

const body = html`${controls}
${crumbs("Placering", [{ label: "Forside", href: "#" }, { label: "Komponenter", href: "#" }])}
<h1>Din Forspring-konto</h1>
<p class="lede">Logget ind som <b>mette@eksempel.dk</b>. Alt på siden er tegnet af @forspring/ui uden script.</p>

<section><h2>Beskeder</h2>
${notice({ text: "Vi sender en mail, når eksporten er klar." })}
${notice({ label: "Værkstedsnote", icon: "clock", text: "Værkstedet har lukket tidligere fredag." })}
${notice({ tone: "success", text: "Du har taget imod invitationen.", action: { label: "Åbn siderne", href: "#" } })}
${notice({ tone: "warning", title: "Din prøveperiode udløber om 3 dage", text: "Vælg en plan for at beholde dine sider.", action: { label: "Vælg plan", href: "#" } })}
${notice({ tone: "error", text: "Det lykkedes ikke. Hent siden igen og prøv en gang til.", action: { label: "Prøv igen", href: "#" } })}
${notice({ tone: "error", title: "Noget gik galt hos os", text: "Intet er gået tabt. Prøv igen om lidt.", ref: "4bf92f35", lang: "da" })}
${notice({ label: "Opbevaring", icon: "file-text", text: "Din eksport gemmes i 30 dage.", action: { label: "Hent den", href: "#" } })}
</section>

<section><h2>Signaler</h2>
<p>Tilstanden for noget, der overvåges: et mærke i form og farve, altid med ordet.</p>
<div class="demo-row">${signal("Oppe", "ok")}${signal("Forsinket", "warn")}${signal("Nede", "down")}${signal("Sat på pause", "off")}</div>
${notice({ signal: "down", title: "2 tjek er nede", text: html`<a href="#">Månedlig fakturakørsel</a>, <a href="#">Natlig backup</a>` })}
${notice({ signal: "ok", title: "Alt kører", text: "Alle 14 tjek har meldt sig til tiden." })}
</section>

<section><h2>Knapper og mærker</h2>
<div class="demo-row">${button({ label: "Gem" })}${button({ label: "Annuller", variant: "ghost", type: "button" })}${button({ label: "Slet kunden", variant: "danger", type: "button" })}${button({ label: "Åbn SiteSpring", href: "#" })}</div>
<p class="fine">Ingen knap er slået fra (D-23). Må man ikke gøre noget, står knappen der ikke, og siden siger hvorfor: “Kun administratorer kan invitere folk.”</p>
<div class="demo-row">${button({ label: "Tag imod", small: true })}${button({ label: "Afslå", variant: "ghost", small: true })}${button({ label: "Fjern", variant: "danger", small: true })}</div>
<div class="demo-row">${tag("platform")}${tag("Denne enhed")}${tag("Ny", "primary")}${tag("Aktiv", "success")}${tag("Afventer", "warning")}${tag("Spærret", "danger")}</div>
<div class="demo-row">${removableTag({ text: "Kok", remove: { label: "Fjern Kok fra Carla Ferreira", name: "role", value: "kok" } })}${removableTag({ text: "Bogholder", remove: { label: "Fjern Bogholder fra Carla Ferreira", name: "role", value: "bogholder" } })}</div>
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

<section id="tjek"><h2>Tabel med mange rækker</h2>
<p>En lang liste får søgning, filtre, en rækkefølge, der står skrevet, og sider. Det hele er links og en GET-formular, så det virker uden script, og adressen husker, hvor man er.</p>
${checksTable}
</section>

<section><h2>Formular</h2>
<p>Sådan ser formularen ud, når den er sendt med fejl: en oversigt øverst, der får fokus og linker til hvert felt, og fejlen ved feltet. De påkrævede felter står med ord, fordi de er færrest her.</p>
${card(html`${FORM_ERRORS}<form class="form" method="post" action="#">
${field({ label: "Navn", name: "name", value: "Mette Kexample", autocomplete: "name" })}
${field({ label: "Mail", name: "email", type: "email", value: "mette@eksempel", required: true, error: "Skriv en hel mailadresse, fx navn@firma.dk.", autocomplete: "email" })}
${field({ label: "Rolle", name: "role", control: "select", required: true, hint: "Administratorer kan slå produkter til og fra for andre.", error: "Vælg, hvad Mette skal kunne.", options: [{ value: "", label: "Vælg en rolle", selected: true }, { value: "member", label: "Medlem" }, { value: "admin", label: "Administrator" }] })}
${field({ label: "Besked til Mette", name: "note", control: "textarea" })}
<fieldset><legend>Produkter at slå til</legend><label><input type="checkbox" name="p" value="site" checked> SiteSpring</label><label><input type="checkbox" name="p" value="data"> DataSpring</label></fieldset>
${actions({ primary: button({ label: "Send invitation" }), secondary: button({ label: "Annuller", variant: "ghost", href: "#" }) })}
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

<section><h2>Dialog og bekræftelse før sletning</h2>
<p>Noget, der ikke kan fortrydes, sker aldrig med ét klik. Dialogen siger, hvad der går tabt, beder om navnet og har det sikre valg først. Uden script fører knappen til <a href="pages/delete-site.da.html">en side med det samme spørgsmål</a>.</p>
${actions({ primary: button({ label: "Udgiv ændringer", type: "button" }), secondary: button({ label: "Se ændringerne", variant: "ghost", href: "#" }), destructive: dialogTrigger({ dialog: "delete-site", href: "pages/delete-site.da.html", label: "Slet hjemmesiden", variant: "danger" }) })}
${confirmDestructive(DELETE_SITE("da"))}
</section>

<section id="toast"><h2>Toast, værktøjstip og ikoner</h2>
<p>En toast siger, hvad den sidste handling gjorde, efter at siden er sendt og hentet igen. På en side ligger den nederst i vinduet; her står de fire i rækkefølge. Luk er et link til siden uden beskeden, så det virker uden script.</p>
<div class="demo-toasts">${toastRegion({
  lang: "da",
  toasts: [
    toast({ lang: "da", id: "toast-success", tone: "success", text: "Ændringerne er gemt.", dismissHref: "#toast" }),
    toast({ lang: "da", id: "toast-info", text: "Eksporten er gået i gang. Vi sender en mail, når den er klar.", dismissHref: "#toast" }),
    toast({ lang: "da", id: "toast-warning", tone: "warning", text: "Siden er udgivet, men 2 billeder mangler en alternativ tekst.", action: { label: "Se billederne", href: "#toast" }, dismissHref: "#toast" }),
    toast({ lang: "da", id: "toast-danger", tone: "danger", text: "Mailen kunne ikke sendes. Prøv igen om lidt.", action: { label: "Prøv igen", href: "#toast" }, dismissHref: "#toast" }),
  ],
})}</div>
<p>Et værktøjstip forklarer noget, man kan klare sig uden. Det åbner, når man trykker på knappen, og lukker med Escape eller et tryk ved siden af. Det, man skal vide for at udfylde feltet, står i hjælpeteksten.</p>
${card(html`<form class="form" method="post" action="#">${field({ label: "Firmanavn", name: "company", required: true, requiredWord: false, autocomplete: "organization" })}${field({
  label: "CVR-nummer",
  name: "cvr",
  optional: true,
  hint: "Otte cifre, fx 12345678.",
  autocomplete: "off",
  help: tooltip({ id: "cvr-tip", label: "Mere om CVR-nummer", trigger: icon("help-circle"), text: "Vi slår firmaets navn og adresse op i CVR-registret, så du ikke skal skrive dem." }),
})}</form>`)}
<div class="demo-row" style="margin-top: var(--space-6)">${button({ label: "Ny kunde", icon: "plus", type: "button" })}${button({ label: "Hent CSV", icon: "download", variant: "ghost", type: "button" })}${button({ label: "Åbn i SiteSpring", icon: "external-link", variant: "ghost", href: "#" })}${button({ label: "", icon: "trash", variant: "danger", small: true, type: "button", ariaLabel: "Slet kunden" })}</div>
<ul class="demo-icons" aria-label="Alle ikoner">${ICON_NAMES.map((n) => html`<li>${icon(n)}<code>${n}</code></li>`)}</ul>
</section>

<section><h2>Agentgodkendelse</h2>
<p>En agent spørger, før den gør noget, der rækker ud over den selv: hvem der spørger, hvorfor, hvad der ændres, og hvad det gør. Siden siger det samme som kortet i Slack, og når nogen har besluttet, viser hver kopi beslutningen.</p>
${REMINDERS}
${REMINDERS_DONE}
<h3>Før og efter</h3>
${BRIEF_DIFF}
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

${MICRO}
${connectScript()}
${dialogScript()}
${raw(SCRIPT)}${raw(LIVE)}`;

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
  { name: "Jonas Hexample", email: "jonas@eksempel.dk" },
  { name: "Aisha Rexample", email: "aisha@eksempel.dk" },
];

function standard(name: string, lang: Lang): StandardPage {
  const orgs = ORGS.map((o) => ({ ...o, href: `/o/${o.slug}/` }));
  if (name === "choose-org")
    return chooseOrgPage({ lang, product: "DataSpring", lastHere: "olstue-globex", orgs: orgs.map((o, i) => ({ ...o, lastUsed: new Date(Date.UTC(2026, 9, 12 - i * 3, 9, 30)) })) });
  if (name === "no-org") return noOrgPage({ lang, product: "DataSpring", email: "mette@eksempel.dk", ask: ADMINS, accountHref: "#" });
  const reason = name.slice("refused-".length) as Refusal;
  return refusedPage({
    lang,
    reason,
    org: ORGS[0]!.name,
    orgs,
    people: reason === "org_suspended" ? [{ name: "Mette Kexample", email: "mette@eksempel.dk" }] : reason === "not_signed_in" || reason === "org_required" || reason === "org_mismatch" || reason === "account_unavailable" ? undefined : ADMINS,
    signInHref: "#",
    billingHref: "#",
    roleNeeded: "admin",
    credentialOrg: ORGS[1]!.name,
    command: reason === "not_signed_in" ? "dataspring auth login" : reason === "org_required" ? "dataspring datacore status --org bager-hansen" : undefined,
    // The account not answering is an upstream error, so it carries the request's ref (hub D-88).
    ref: reason === "account_unavailable" ? "4bf92f35" : undefined,
  });
}

/** dist/demo/pages/org-picker.<lang>.html: the sign-in org picker as the account shows it (no bar: the person has signed
 *  in but no org is chosen yet). Kept out of the standard pages' list on the index, so the index's look stays as it is. */
function orgPickerPages(out: Record<string, string>): void {
  for (const lang of ["da", "en"] as const) {
    const name = "org-picker";
    out[`pages/${name}.${lang}.html`] = String(
      shell({
        lang,
        product: "spring",
        productLabel: "Spring",
        homeLabel: lang === "da" ? "Spring, forside" : "Spring, home",
        brandBase: "../../brand/",
        head: raw(`<link rel="stylesheet" href="../../tokens.css"><link rel="stylesheet" href="../../fonts.css"><link rel="stylesheet" href="../../components.css">`),
        userMenu: METTE(lang, `${name}.da.html`, `${name}.en.html`),
        footer: [lang === "da" ? { label: "English", href: `${name}.en.html`, lang: "en" } : { label: "Dansk", href: `${name}.da.html`, lang: "da" }, { label: lang === "da" ? "Alle komponenter" : "All components", href: "../index.html" }],
        ...orgPickerPage({
          lang,
          action: "#",
          fields: { csrf: "demo" },
          connecting: { kind: lang === "da" ? "Slack-workspace" : "Slack workspace", name: "Acme" },
          subtitle: lang === "da" ? "Hvilken organisation skal Slack-workspacet Acme forbindes med?" : "Which organisation should the Slack workspace Acme connect to?",
          note:
            lang === "da"
              ? "Du kan kun ændre det senere ved at fjerne Spring fra workspacet og installere den igen."
              : "You can change this later only by removing Spring from the workspace and installing it again.",
          // A demo of the role words: a real caller lists only the roles it allows (Spring's install: owner and admin),
          // so the viewer row here only shows how each access level reads.
          orgs: ORGS.map((o) => ({ value: `sealed.${o.slug}`, name: o.name, role: o.role })),
        }),
      }),
    ) + "\n";
  }
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

/** dist/demo/pages/delete-site.<lang>.html: the confirm as the page a trigger's link leads to with
 *  no script (D-23), in SiteSpring's bar. Keep leads back to the components page. */
function confirmPages(out: Record<string, string>) {
  for (const lang of ["da", "en"] as const) {
    const da = lang === "da";
    const o = DELETE_SITE(lang);
    out[`pages/delete-site.${lang}.html`] = String(
      shell({
        lang,
        product: "sitespring",
        productLabel: "SiteSpring",
        homeLabel: da ? "SiteSpring, forside" : "SiteSpring, home",
        title: o.title,
        narrow: true,
        brandBase: "../../brand/",
        head: raw(`<link rel="stylesheet" href="../../tokens.css"><link rel="stylesheet" href="../../fonts.css"><link rel="stylesheet" href="../../components.css">`),
        org: { current: ORGS[0]!, orgs: ORGS, path: "/o/bager-hansen/sites/bakery.example/delete", peopleHref: "#" },
        products: { items: [{ name: "SiteSpring", href: "/o/bager-hansen/", current: true }, { name: "DataSpring", href: "#" }, { name: "PulseSpring", href: "#" }], accountHref: "#" },
        userMenu: METTE(lang, "delete-site.da.html", "delete-site.en.html"),
        footer: [da ? { label: "English", href: "delete-site.en.html", lang: "en" } : { label: "Dansk", href: "delete-site.da.html", lang: "da" }, { label: da ? "Alle komponenter" : "All components", href: "../index.html" }],
        body: confirmDestructive({ ...o, page: { keepHref: "../index.html" } }),
      }),
    ) + "\n";
  }
}

// The founder's case (D-41): the page from the ui-sdk-trial (trial/pages.ts, "ours") as he saw it, on
// 0.26.0: bar()'s product switcher in a page's own nav, two field() selects and a Save in a bare form,
// and a dialogTrigger() in a paragraph, all with no class of their own. Then the same lead drawn with
// actions(). dist/demo/pages/lead.en.html; the visual test and the four layout checks run on it.
const LEAD_PRODUCTS = [
  { name: "AppSpring", href: "#", current: true },
  { name: "SiteSpring", href: "#" },
  { name: "DataSpring", href: "#" },
];
const STAGES = [
  { value: "open", label: "Open" },
  { value: "won", label: "Won", selected: true },
  { value: "lost", label: "Lost" },
];

function leadPage(): string {
  const switcher = html`<nav aria-label="Products"><details class="switcher bar-menu product-switcher"><summary>Products</summary><div class="bar-panel"><p class="bar-panel-label">Acme has</p><ul>${LEAD_PRODUCTS.map(
    (p) => html`<li><a href="${p.href}"${raw(p.current ? ' aria-current="true"' : "")}><span class="bar-item-name">${p.name}</span></a></li>`,
  )}</ul></div></details></nav>`;
  const ours = html`${switcher}
<form>${field({ name: "stage", label: "Stage", control: "select", options: STAGES, lang: "en", hint: "Where the lead stands." })}
${field({ name: "owner", label: "Owner", control: "select", options: [{ value: "a", label: "Anna", selected: true }], lang: "en" })}<button type="submit" class="ghost">Save</button></form>
<p>${dialogTrigger({ dialog: "remove", href: "#remove", label: "Remove lead", variant: "ghost" })}</p>
${dialog({ id: "remove", title: "Remove the lead?", body: "This removes the lead and its notes.", close: "Keep", alert: true, actions: html`<button type="submit" class="danger">Remove</button>`, form: { action: "#" } })}`;
  const withActions = html`<section><h2>With actions()</h2>
<form>${field({ name: "stage2", label: "Stage", control: "select", options: STAGES, lang: "en", hint: "Where the lead stands." })}
${field({ name: "owner2", label: "Owner", control: "select", options: [{ value: "a", label: "Anna", selected: true }], lang: "en" })}
${actions({ primary: button({ label: "Save" }), secondary: button({ label: "Cancel", variant: "ghost", href: "#" }), destructive: dialogTrigger({ dialog: "remove", href: "#remove", label: "Remove lead", variant: "danger" }) })}</form>
</section>`;
  const css = raw(`<link rel="stylesheet" href="../../tokens.css"><link rel="stylesheet" href="../../fonts.css"><link rel="stylesheet" href="../../components.css">`);
  return String(
    html`<!doctype html><html lang="en" data-product="appspring"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Lead</title>${css}</head><body><main id="main" class="wrap"><h1>Lead</h1>${ours}
${withActions}</main>${dialogScript()}
<script>if (new URLSearchParams(location.search).get("open") === "products") document.querySelector("details.product-switcher").open = true;</script></body></html>`,
  ) + "\n";
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
  confirmPages(out);
  orgPickerPages(out);
  out["pages/lead.en.html"] = leadPage();
  out["theme-preview.html"] = themePreviewPage();
  return out;
}

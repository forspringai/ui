// The demo page: every component, drawn with src/html.ts, in Danish. pnpm build writes it to
// dist/demo/index.html and pnpm demo serves it. The product and theme switches at the top are the
// only script, and only here: products set data-product and data-theme on the server.

import { button, card, field, googleButton, html, list, notice, orDivider, raw, shell, state, switchButton, table, tag } from "../src/html.ts";

const PRODUCTS = [
  ["forspring", "Forspring"],
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

// Reads ?product= and ?theme= too, so a screenshot can ask for a state by URL.
const SCRIPT = `<script>
(() => {
  const root = document.documentElement, form = document.querySelector(".demo-controls"), q = new URLSearchParams(location.search);
  const apply = () => {
    const p = form.product.value, t = form.theme.value;
    root.dataset.product = p;
    if (t === "system") delete root.dataset.theme; else root.dataset.theme = t;
    const name = form.querySelector('input[name=product]:checked').parentElement.textContent.trim();
    document.querySelectorAll(".brand .sub").forEach((e) => (e.textContent = p === "forspring" ? "konto" : name));
  };
  if (q.get("product")) form.product.value = q.get("product");
  if (q.get("theme")) form.theme.value = q.get("theme");
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

const signOut = html`<form class="inline" method="post" action="#"><button class="ghost small" type="submit">Log ud</button></form>`;

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
<p class="kicker">Komponenter</p>
<h1>Din Forspring-konto</h1>
<p class="lede">Logget ind som <b>mette@eksempel.dk</b>. Alt på siden er tegnet af @forspring/ui uden script.</p>

<section><h2>Beskeder</h2>
${notice({ text: "Vi sender en mail, når eksporten er klar." })}
${notice({ tone: "success", text: "Du har taget imod invitationen." })}
${notice({ tone: "warning", title: "Din prøveperiode udløber om 3 dage", text: "Vælg en plan for at beholde dine sider." })}
${notice({ tone: "error", text: "Det lykkedes ikke. Hent siden igen og prøv en gang til." })}
</section>

<section><h2>Knapper og mærker</h2>
<div class="demo-row">${button({ label: "Gem" })}${button({ label: "Annuller", variant: "ghost", type: "button" })}${button({ label: "Slet kunden", variant: "danger", type: "button" })}${button({ label: "Åbn SiteSpring", href: "#" })}${button({ label: "Ikke nu", disabled: true, type: "button" })}</div>
<div class="demo-row">${button({ label: "Tag imod", small: true })}${button({ label: "Afslå", variant: "ghost", small: true })}${button({ label: "Fjern", variant: "danger", small: true })}</div>
<div class="demo-row">${tag("platform")}${tag("Denne enhed")}${tag("Ny", "primary")}${tag("Aktiv", "success")}${tag("Afventer", "warning")}${tag("Spærret", "danger")}</div>
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

<section><h2>Log ind</h2>
<div style="max-width: 480px">${card(html`<h1>Log ind på Forspring</h1><p class="lede">Én konto til SiteSpring, DataSpring og Spring.</p>
<form method="post" action="#">${googleButton("Fortsæt med Google")}</form>
${orDivider("eller")}
<form class="form" method="post" action="#">${field({ label: "Mail", name: "signin-email", type: "email", autocomplete: "email" })}${button({ label: "Send mig et link", wide: true })}</form>
<p class="fine">Ved at logge ind accepterer du <a href="#">vilkårene</a>.</p>`)}</div>
</section>
${raw(SCRIPT)}`;

export function demoPage(): string {
  return String(
    shell({
      lang: "da",
      title: "Komponenter",
      productLabel: "konto",
      homeLabel: "Forspring konto, forside",
      head,
      switcher: {
        label: "Skift produkt",
        items: PRODUCTS.map(([key, name]) => ({ label: name, href: `?product=${key}`, current: key === "forspring" })),
      },
      user: { email: "mette@eksempel.dk", signOut },
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

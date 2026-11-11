# @forspring/ui

The Forspring suite's UI package: forspring.ai's family look with one accent per product. Design
tokens built from W3C DTCG 2025.10 JSON into CSS custom properties, a Tailwind v4 theme and
TypeScript; self-hosted fonts; every product's mark, logo and favicons (`brand/`); and a small
server-rendered component layer with typed HTML helpers.

The brand guideline (mark, colour, type, voice and the rest) is [brand/README.md](brand/README.md).
What Forspring and each product is, in words, lives in the hub's
[docs/brand/vision.md](https://github.com/forspringai/forspring/blob/main/docs/brand/vision.md).

## Install

By git tag; each product pins a version and upgrades on purpose (D-2):

```
pnpm add github:forspringai/ui#v0.16.0
```

Install with pnpm, or npm 11 or later (Node 24). npm 10 crashes while preparing a git dependency
("Cannot read properties of null (reading 'edgesOut')"), with this package and others; PulseSpring hit
it in CI and moved to Node 24.


## Server-rendered pages (plain CSS, no script)

Load three stylesheets, in this order, and set the product on `<html>`:

```html
<html lang="da" data-product="sitespring">   <!-- unset is Forspring -->
<link rel="stylesheet" href="…/tokens.css">
<link rel="stylesheet" href="…/fonts.css">
<link rel="stylesheet" href="…/components.css">
<link rel="stylesheet" href="…/google-button.css">  <!-- only on a page with Google's button -->
```

- With a bundler (Vite, Astro): `@import "@forspring/ui/tokens.css"; @import "@forspring/ui/fonts.css";
  @import "@forspring/ui/components.css";`. `fonts.css` points at `../fonts/*.woff2` in the package,
  which the bundler resolves and emits.
- On Workers with an inline `<style>` (the account): copy the package's `fonts/` into your static
  assets (the account serves them from `public/assets/fonts/`), and build the font faces for that
  path with `fontFaces("/assets/fonts/")` from `@forspring/ui/html`. Inline `tokens.css` and
  `components.css` as they are. Add `font-src 'self'` to the CSP. Nothing loads from a third party.
- Dark mode follows the system; `data-theme="light"` or `"dark"` on any element wins.

The helpers draw the markup, escaping everything they are given:

```ts
import { shell, list, button, notice, raw } from "@forspring/ui/html";

const page = shell({
  lang: "da", title: "Nøgler", product: "dataspring", productLabel: "DataSpring",
  head: raw(`<style>${css}</style>`),
  user: { email, signOut: raw(signOutForm) },
  body: [notice({ tone: "success", text: "Nøglen er gemt." }), list(keys.map((k) => ({ name: k.name, action: button({ label: "Slet", variant: "danger", small: true }) })))],
});
return new Response(String(page), { headers: { "content-type": "text/html; charset=utf-8" } });
```

`pnpm demo` serves the demo page with every component (http://127.0.0.1:4319/dist/demo/), with
switches for the product and the theme.

### Controls: one height, one line (0.5.0, D-14)

Inputs, selects and buttons share a height per size, so a row of them lines up on one baseline:
`--control-height` (44px) by default, `--control-height-small` (32px) with `class="small"` and for
every control in the bar, and `--control-touch` (44px) for all of them under 560px. Tailwind gets
the same as `h-control`, `h-control-small` and `min-h-control-touch`; code gets `control`.

The select draws its own chevron (`appearance: none` and two CSS gradients, no image, so a strict
`img-src 'self'` CSP is enough), in `--muted-foreground`, with room reserved for it at the end.
Keyboard, the phone's picker and the option list stay native.

```ts
shell({ ..., controls: html`<select aria-label="Organisation">…</select>`, body });   // a select in the bar
html`<form class="toolbar"><input type="search" aria-label="Søg">${button({ label: "Søg" })}</form>`;
```

**Upgrading from 0.4.x.** Every spacing in the component layer is now on the 4px scale, so drop
`--allow-spacing` from your `ui-audit` command; a value it still finds is your own CSS. Remove
overrides that resized controls to line them up (a `padding-block` on a select in the bar, say):
the package does it now, and a smaller padding than the package's moves the text off centre.
`.menu` rules now match `nav.menu` only, so a product's own `details.menu` is no longer a grid.
Expect small shifts: inputs are 44px (were 46), the switch's track 40 by 24 (was 38 by 22), list
rows 16/20 padding (were 14/18), paragraphs 16px apart (were 14) and h1 and h2 12px above what
follows (were 10 and 14).

### A console's menu, crumbs and signals (D-13)

```ts
shell({
  ...,
  menu: {
    label: "Main menu",
    toggle: "Menu",
    context: { label: "Organization", name: org.name, items: orgs.map((o) => ({ label: o.name, href: `/o/${o.slug}/`, current: o.slug === org.slug })) },
    groups: [
      { items: [{ label: "Overview", href: "/o/ops/", current: true, badge: { text: "2", signal: "down", label: "down" } }] },
      { label: "Projects", items: [{ label: "Hub", href: "/o/ops/projects/hub", current: "parent" }] },
    ],
  },
  body: [crumbs("Breadcrumb", [{ label: "Overview", href: "/o/ops/" }]), html`<h1>Nightly backup</h1>`, signal("Down", "down")],
});
```

A sidebar on a wide screen, folded under "Menu" on a phone, no script. `signal(word, "ok" | "warn" |
"down" | "off")` is a monitored state as a traffic light: a shaped mark in `--signal-*` and the word.
`notice({ signal: "down", title, text })` is the neutral card with that signal as its edge.

### The bar, the standard pages and refusals (0.8.0, D-17, hub D-99)

Every product's bar is the package's: the product's name, the org switcher, the product switcher and
the user menu, all `details` menus with no script.

```ts
import { shell, type BarOptions } from "@forspring/ui/html";
import { refusedPage, chooseOrgPage } from "@forspring/ui/pages";

const bar: BarOptions = {
  lang: "da", product: "dataspring", productLabel: "DataSpring",            // the wordmark leads to /o/<org>/
  org: {
    current: { slug: "noon", name: "Noon", role: "admin" },
    orgs: myOrgs,                         // [{ slug, name, role }]; the switcher shows with two or more
    path: url.pathname,                   // switching keeps the place: /o/noon/runs -> /o/spekta/runs
    peopleHref: "https://account.forspring.ai/o/noon/people",
  },
  products: { items: [{ name: "DataSpring", href: "/o/noon/", current: true }, { name: "SiteSpring", href: "https://…/o/noon/" }], accountHref: "https://account.forspring.ai/o/noon/" },
  userMenu: {
    name: "Peter Engelbrecht", email: "peter@…",
    accountHref: "https://account.forspring.ai/",
    agentsHref: "https://account.forspring.ai/o/noon/agents?product=dataspring",
    languages: { da: "?lang=da", en: "?lang=en" },
    signOut: { action: "/signout", fields: { csrf } },   // "Log ud af Forspring": ends every session
  },
};

return new Response(String(shell({ ...bar, title: "Kørsler", body })), { headers });

const page = refusedPage({ lang: "da", reason: "product_off", org: "Noon", people: admins });
return new Response(String(shell({ ...bar, ...page })), { status: page.status, headers });
```

Roles are the account's four, `owner`, `admin`, `member`, `viewer`, written as "ejer",
"administrator", "medlem", "læser" (`ROLE_NAMES`). With the org switcher in the bar, drop your menu's
`context`. `switcher` and `user` still work and are deprecated.

The pages (`@forspring/ui/pages`) each return `{ status, title, narrow, body }`:

| Helper | When | Status |
|---|---|---|
| `chooseOrgPage({ lang, orgs, product, lastHere })` | Signed in, several orgs, none in the URL | 200 |
| `noOrgPage({ lang, product, email, ask, accountHref })` | Signed in, in no org with this product | 200 |
| `refusedPage({ lang, reason, ... })` | Any refusal, with what fixes it | per reason |
| `accountUnavailablePage({ lang })` | The account did not answer | 503 |

The refusal vocabulary (`@forspring/ui/refusals`, no markup, for CLIs and MCP servers too):

```ts
import { REFUSALS, REFUSAL_REASONS, type Refusal } from "@forspring/ui/refusals";
REFUSALS.product_off;   // { status: 403, exit: 4, da: { title, text, fix }, en: { title, text, fix } }
```

| Reason | HTTP | Exit | Details `refusedPage` shows |
|---|---|---|---|
| `not_signed_in` | 401 | 4 | `signInHref`, `command` |
| `org_required` | 400 | 2 | `orgs` |
| `not_a_member` | 404 | 3 | `orgs`, `people` (never the org's name) |
| `product_off` | 403 | 4 | `org`, `people` (up to three admins) |
| `org_suspended` | 403 | 4 | `org`, `people` (owners), `billingHref` |
| `role_too_low` | 403 | 4 | `org`, `roleNeeded`, `people` |
| `org_mismatch` | 403 | 4 | `org`, `credentialOrg` |
| `account_unavailable` | 503 | 1 | `retryHref` |

**React** (rich apps; `react` is an optional peer dependency, nothing else is added):

```tsx
import { Bar, Refused } from "@forspring/ui/react";
<Bar {...bar} />
<Refused lang="da" reason="role_too_low" roleNeeded="admin" />
```

`Bar`, `ChooseOrg`, `NoOrg`, `Refused` and `AccountUnavailable` render exactly the helpers' markup,
so they need `components.css` like any page (or `theme.css` plus `components.css`). Set the refusal's
HTTP status on your server.

The demo shows the bar (`?open=org-switcher`, `product-switcher` or `user-menu` opens a menu) and every
standard page in DataSpring under `dist/demo/pages/<name>.<da|en>.html`.

### Marks, wordmarks and favicons (0.9.0, D-18, hub D-101)

Every bar shows the doll and a wordmark. A product's: its doll in its accent and its name in ink
("SiteSpring"), no Forspring mark or word. Forspring's own pages (`product` unset or `"forspring"`):
the ink doll (paper on dark), "Forspring" and the small label ("konto"). Nothing to do in the markup;
the doll's colour is the new `--mark` role, set by `data-product`. `spring` is a product key now
(Forspring's blue, `#2244FF` / `#6B83FF`). The rules and the files are in [brand/README.md](brand/README.md).

`pnpm build` generates, for each of `forspring`, `spring`, `sitespring`, `dataspring`, `appspring` and
`pulsespring`, into `dist/brand/<product>/` (and `brand/<product>/`): `mark.svg`, `favicon.svg` (both
with their dark variant inside), `favicon-32.png`, `favicon-16.png`, `apple-touch-icon-180.png`,
`icon-512.png`, `logo.svg` (wordmark outlined, no font needed) and `logo-1200x300.png`.
And `site.webmanifest` (D-28): the name and the two app icons, linked by `shell()` and `faviconLinks()`; serve it as `application/manifest+json`.

**Wiring the favicon in a product:**

1. Upgrade to `v0.9.0`.
2. Serve your product's folder of the package's `dist/brand/` at `/assets/ui/<version>/brand/`, beside
   the CSS and fonts you already copy there (account D-20), for example in the build step:
   `mkdir -p public/assets/ui/0.9.0/brand && cp -r node_modules/@forspring/ui/dist/brand/sitespring public/assets/ui/0.9.0/brand/`.
   Cache it like the rest of that path (a year, immutable): the version in the path changes with
   every release.
3. With `shell()` there is nothing else: it links `<link rel="icon" type="image/svg+xml">`, the two
   PNG sizes and `apple-touch-icon` for `product` from `/assets/ui/<version>/brand/` (the exported
   `DEFAULT_BRAND_BASE`). Served elsewhere: `shell({ …, brandBase: "/static/brand/" })` (the URL of the
   folder holding `<product>/`, ending in `/`). Your own files: `favicon: { svg, png32, png16, appleTouch }`.
   None: `favicon: false`.
4. Without `shell()` (your own layout, a React app's `index.html`): put
   `faviconLinks(faviconFor("sitespring", "/assets/ui/0.9.0/brand/"))` in `<head>`, or write the four
   tags by hand. A bundler can take the files from `@forspring/ui/brand/<product>/<file>`.
5. Optional: answer `/favicon.ico` with `favicon-32.png`, for clients that ask for it before reading
   the page. The CSP needs only `img-src 'self'` and `manifest-src 'self'`.

### Connect an agent (0.10.0, D-19, hub D-102)

The one "Connect an agent" panel for every product's console (and later the account's Agents page):
Claude Code, Claude.ai, other MCP clients and the CLI as tabs, each signing in interactively, and keys
only in a folded "Automatisering og CI" section. The words are the hub's (`docs/agent-connect-plan.md`
section 2), Danish and English, in the package.

```ts
import { connectPanel, connectScript } from "@forspring/ui/connect";

const panel = connectPanel({
  lang: "da",
  product: "sitespring",                       // the name comes from PRODUCT_NAMES; productName overrides
  org: { slug: org.slug, name: org.name },     // slug for --org, name for the words
  mcpUrl: "https://mcp.sitespring.app/mcp",    // bare /mcp now, /mcp/o/<org> once served; never ?org=
  multiOrg: myOrgs.length > 1,                 // the server's name becomes sitespring-<org>
  keysHref: `/o/${org.slug}/keys`,             // after tez: the account's /o/<org>/agents?product=sitespring
  createKey: { action: `/o/${org.slug}/keys`, fields: { csrf } },   // optional: your own form, field "name"
});
const page = shell({ ...bar, title: "Agenter", body: [panel, connectScript(nonce)] });
```

| Option | |
|---|---|
| `lang`, `product`, `org`, `mcpUrl` | required |
| `cliName` | the CLI's command and the stem of `<CLI>_ORG` and `<CLI>_API_KEY`; default the product key |
| `multiOrg` | the MCP server's name is `<cli>-<org slug>` rather than `<cli>` |
| `installUrl` | default `https://<cli>.app/install.sh` |
| `keysHref`, `createKey` | the folded "Automation and CI" section; with neither it is left out |
| `open` | the tab open at first: `claude-code` (default), `claude-ai`, `other`, `cli` |
| `headingLevel` | `1` when the panel is the page (title h1, clients h2); default `2` |
| `id` | prefix for ids and the radio group, when a page has two panels; default `connect` |

- **No script needed.** The tabs are radio buttons (arrow keys move between them) and CSS shows the
  chosen panel with `:has()`; a browser without `:has()` shows every panel under its heading.
  Commands are wrapped, selectable text (one click selects a whole command).
- **Copy buttons are progressive enhancement.** They stay hidden until `CONNECT_SCRIPT` has run (in a
  secure context with the async clipboard). `connectScript(nonce)` writes it as an inline
  `<script nonce>`; a page whose CSP allows no inline script can serve `CONNECT_SCRIPT` as a file of its
  own, or leave it out. It listens on the document, so once per page is enough, panels drawn later too.
- **The default tabs never show a key**, a key placeholder, `--header` or `?org=`; a test holds it.
- "Tilføj til Cursor" is Cursor's install deeplink, built from the server's name and URL
  (`cursorInstallUrl()`). There is no "Add to Claude" button until a URL scheme is confirmed (hub D-100).

React: `import { ConnectAgent } from "@forspring/ui/react"; <ConnectAgent {...sameOptions} />` renders
the same markup. Add `connectScript()`'s script to your `index.html` (or bundle `CONNECT_SCRIPT`) for
copy buttons. The demo shows it on the components page (`?tab=cli`, `&open=connect-ci`) and on its own
in SiteSpring under `dist/demo/pages/connect.<da|en>.html`.

### Dialog and the destructive-action confirm (D-23)

`dialog()` is a native `<dialog>`: a title (h2, `aria-labelledby`), a body, and a footer with the
close button first. `confirmDestructive()` is built on it for anything that cannot be undone: it
says what is lost, can ask for the thing's name, and puts the safe action first and in focus.

```ts
import { button, confirmDestructive, dialogScript, dialogTrigger } from "@forspring/ui/html";

const confirm = confirmDestructive({
  lang: "da",
  id: "delete-site",
  title: `Slet ${site.domain}?`,
  losses: ["181 sider", "4 formularer", "62 omdirigeringer"],   // up to four are one sentence, more a list
  text: "Domænet holder op med at svare med det samme.",
  irreversible: true,                                          // "Det kan ikke fortrydes."
  confirmName: site.domain,                                    // the field's pattern and required
  action: `/o/${org.slug}/sites/${site.id}/delete`,
  fields: { csrf },                                            // hidden inputs, as createKey's
  keepLabel: "Behold hjemmesiden",
  confirmLabel: "Slet hjemmesiden",
});
const body = [
  button({ label: "Udgiv ændringer" }),
  dialogTrigger({ dialog: "delete-site", href: `/o/${org.slug}/sites/${site.id}/delete`, label: "Slet hjemmesiden", variant: "danger" }),
  confirm,
  dialogScript(nonce),
];
```

- **With script,** `dialogScript(nonce)` (or `DIALOG_SCRIPT` as a file) turns a click on
  `[data-dialog-open="<id>"]` into `showModal()`. The browser makes the page inert, focuses the Keep
  button, and closes on Escape; Keep closes it through a `form method="dialog"`. The script puts focus
  back on the trigger and clears the typed name. A click on the backdrop does not close it.
- **Without script** the trigger is a link to `href`: answer it with the same confirm as a page,
  `confirmDestructive({ ...same, page: { keepHref } })`, in `shell({ narrow: true })`. Keep is then a
  link back, and the form posts the same way.
- **The name check needs no script:** the input is `required` with `pattern` set to the exact name
  (escaped for the browser's regular expressions with `regexEscape()`), so the browser holds the
  submit until it matches, and the destructive button looks unavailable until then. **The server must
  check the name again**, and the CSRF token, before it deletes anything.
- The words ("Behold", "Det fjerner …", "Skriv <navn> for at bekræfte") are the package's, in Danish
  and English; `keepLabel`, `confirmLabel` and `nameLabel` are the product's.
- `dialog({ id, title, body, close, actions, form, alert, page })` is the general one: `form` wraps the
  body and the actions in one POST form, `alert` makes it an alertdialog described by its body.

React: `<ConfirmDestructive {...sameOptions} />` and `<Dialog ... />` from `@forspring/ui/react`
draw the same markup; the trigger is a plain `<a className="button danger" data-dialog-open="…">`.
The demo shows SiteSpring's case beside "Udgiv ændringer" (`?open=delete-site` opens it), and the
fallback page under `dist/demo/pages/delete-site.<da|en>.html`.

### Agent approval, diff and "why it did that" (D-24)

When an agent wants to do something a person must allow, `approval()` draws the request: who asks and
for whom, what it wants to do, why and the rule it follows, what changes, what approving does, when it
lapses, and the decision as POST forms. Its words are Spring's Slack card's ("Asked by Maria via
Spring", "Why", "Expires", "What it does", "Approved by"), so a page and a channel say the same thing.

```ts
import { approval, diff, explain } from "@forspring/ui/html";

approval({
  lang: "da",
  id: `request-${r.id}`,
  agent: "Spring",
  onBehalfOf: "Maria (Økonomi)",                         // "Anmodet af: Maria (Økonomi) via Spring"
  title: "Spring vil sende 14 betalingspåmindelser",     // the section's heading (headingLevel: 2 or 3)
  summary: "Spring har gjort påmindelser klar til de forfaldne fakturaer og venter på godkendelse.",
  expires: r.expiresAt,                                  // a Date, in Copenhagen's time; or words
  why: { text: "Fakturaerne er mindst 14 dage forfaldne.", links: [{ label: "skillen Rykker for forfaldne fakturaer, trin 3", href }] },
  changes: { items: r.items.map((i) => [`${i.customer} #${i.number}`, `${i.days} dage`, i.amount]), total: r.count, moreHref },
  effects: [{ text: "Sender 14 mails fra finance@" }, { text: "Kan ikke fortrydes", tone: "warning" }],
  approve: { label: "Godkend og send", action: `/requests/${r.id}/approve`, fields: { csrf } },
  edit: { href: `/requests/${r.id}/edit` },              // "Ret først"
  reject: { action: `/requests/${r.id}/reject`, fields: { csrf } },
  draftHref: `/requests/${r.id}/draft`,                  // "Se udkastet"
  explain: explain({ lang: "da", agent: "Spring", steps, follows }),
  outcome: r.decided ? { status: "approved", by: r.decidedBy, at: r.decidedAt, note: "Påmindelserne er sendt." } : undefined,
});
```

- **Changes:** an item is one value or an array of parts written with " · " between them. The first
  `show` (3) are drawn, then "+11 flere" (the `total` less those drawn), linked to `moreHref`, so pass
  only the first few of a long list. No items: "Intet ændres."
- **Effects:** short facts; `tone: "warning"` or `"danger"` adds a triangle or diamond and bold words.
- **The decision is the server's.** Approve and reject are plain POST forms with your hidden fields.
  Check the CSRF token, that the person may decide, and that nobody decided first. Then draw every
  copy of the request with `outcome` ("Godkendt af Mette Kjær · 4. nov. 2026, 10.41", "Afvist",
  "Udløbet"), which replaces the buttons and the expiry, so nobody approves something already rejected.
- **`diff({ lang, label, fields, lines })`** shows a change the caller computed: `fields` as a table of
  field, "Før" and "Efter" (a missing value is "Ingen"); `lines` with `kind: "same" | "added" |
  "removed"`, each added or removed line with a + or − and the hidden words "Tilføjet:" / "Fjernet:".
  Pass only what differs.
- **`explain({ lang, agent, steps, follows })`** is "Hvorfor Spring gjorde det" / "Why Spring did
  this": a closed `details` with the steps as an ordered list, each `{ text, used?: { label, href? },
  at? }` ("Ud fra e-conomic: åbne fakturaer · 09.02"), and the rule or skill it followed.

React: `<Approval />`, `<Diff />` and `<Explain />` from `@forspring/ui/react` draw the same markup.
The demo's "Agentgodkendelse" section shows a waiting request with its trail, one already approved,
and a channel's setup before and after.

### A table at scale: search, filters, the order and paging (D-25)

`table()` takes an optional `controls` part that makes it a long list a person can work with: a
search box and filter chips above, the order the rows are in and Previous and Next below. The search
is a GET form and everything else is a link, so it works with no script and the URL is the state: the
server reads the query string, searches, filters, sorts and slices, and draws that page. Without
`controls`, `table()` draws exactly what it always did.

```ts
import { pageOf, signal, state, table } from "@forspring/ui/html";

const q = url.searchParams;
const page = pageOf(total, Number(q.get("side") ?? 1), 25);      // { page, from, to, total, pages, prev?, next? }
const link = (p: Record<string, string>) => `?${new URLSearchParams({ filter, sort, ...p })}`;

table({
  id: "checks",
  label: "Tjek",
  columns: [
    { label: "Tjek" },
    { label: "Tilstand", sort: { href: link({ sort: "state" }), dir: sort === "state" ? "desc" : undefined } },  // aria-sort and an arrow
    { label: "Oppetid 30 d", num: true, sort: { href: link({ sort: "uptime" }) } },
    { label: "Svartid", num: true },
  ],
  rows: rows.map((c) => [c.name, signal(c.word, c.signal), c.uptime, c.response]),
  controls: {
    lang: "da",
    search: { placeholder: `Søg i ${total} tjek`, value: q.get("q") ?? "" },  // name "q"; the label is hidden when the placeholder says it
    filters: [
      { label: "Kræver opmærksomhed", count: attention, href: link({ filter: "attention" }), current: filter === "attention" },
      { label: "Alle", count: all, href: link({ filter: "all" }), current: filter === "all" },
    ],
    sort: { label: "værst først" },                    // said in the footer: "1–25 af 248, værst først"
    keep: { filter, sort },                            // hidden inputs, so a search keeps them (and starts on page 1)
    paging: { ...page, prevHref: page.prev ? link({ side: String(page.prev) }) : undefined, nextHref: page.next ? link({ side: String(page.next) }) : undefined },
    empty: state({ kind: "empty", title: `Ingen tjek matcher “${q.get("q")}”`, text: `Der er ${all} tjek i alt.` }),
  },
});
```

- **`pagination({ lang, from, to, total, prevHref, nextHref, label, order })`** stands alone too:
  "1–6 af 248" / "1–6 of 248" in a `nav`, numbers in the page's language (1.248 in Danish, 1,248 in
  English), Previous and Next ("Forrige", "Næste") as links with `rel`. At an end the word stays as a
  span with `aria-disabled`. Pass its result as `paging` to put it under a table.
- **`pageOf(total, page, size)`** is the arithmetic, so the query and the links agree: page 0 is the
  first, a page past the end the last, and no rows one empty page (`0 af 0`).
- **Sorting is the server's.** A sortable header is a link to the page in that order; give the one in
  force `dir: "asc" | "desc"` and it carries `aria-sort` and an arrow. With no `sort.label`, the
  footer says "sorteret efter Tilstand, faldende".
- The controls take the small box (D-14), 44px on a phone, where the search takes its own row.

React: `<Table {...sameOptions} />` and `<Pagination />` from `@forspring/ui/react` draw the same
markup. The demo's "Tabel med mange rækker" section is the brand review's PulseSpring checks.

### Toast, tooltip and icons (D-26)

**A toast** is the message after a POST and its 303: "Ændringerne er gemt." It floats at the bottom of
the window with the tone's icon (a tick, a triangle, an octagon, an i) and, for a screen reader, the
tone's word ("Udført:", "Advarsel:", "Fejl:", "Bemærk:"). A danger toast is `role="alert"`; the rest
are `role="status"` with `aria-live="polite"`.

```ts
import { toast, toastRegion, toastScript } from "@forspring/ui/html";

// POST /o/noon/sites/42 saves, then 303 to /o/noon/sites/42?gemt=1, which draws:
const body = [
  toast({
    lang: "da",
    tone: "success",                                  // "success" | "warning" | "danger" | "info" (default)
    text: "Ændringerne er gemt.",
    dismissHref: "/o/noon/sites/42",                  // this page without the flash parameter
    action: { label: "Fortryd", href: "/o/noon/sites/42/undo" },  // optional, one link
  }),
  page,
  toastScript(nonce),                                 // optional
];
```

- **Dismiss works with no script:** it is a link to `dismissHref`, the page without the flash
  parameter (or the same URL when the flash was a one-time cookie). With `toastScript(nonce)` (or
  `TOAST_SCRIPT` as a file) Dismiss removes the toast at once and puts that URL in the address bar,
  so a reload does not bring it back.
- **Auto-hide is the script's, and narrow:** a success or info toast with no action hides after 8
  seconds, waiting while the pointer or focus is on it. A warning or danger toast never hides itself,
  whatever its markup, and under `prefers-reduced-motion` nothing does.
- **Not a notice.** A notice is part of the page and stays while what it says is true (a form's
  errors, a trial running out). A toast reports what the last request did, and goes. A form's errors
  are never a toast.
- Draw it at the start of `main`: a live region on a page that has just loaded is read in order, not
  announced, so it should come first. Several at once go in `toastRegion({ lang, toasts })`, a region
  named "Beskeder" / "Messages", each toast with its own `id`.

**A tooltip** is a short explanation beside something, for the curious. It is a button and a native
popover: pressing or tapping the button shows it, a press elsewhere or Escape hides it, with no
script. In Chromium, pointing at or focusing the button shows it too (`interestfor`). The button is
described by the text (`aria-describedby`), which is in the DOM throughout, not a `title`.

```ts
import { field, icon, tooltip } from "@forspring/ui/html";

field({
  label: "CVR-nummer",
  name: "cvr",
  hint: "Otte cifre, fx 12345678.",                  // what a person needs: always shown
  help: tooltip({ id: "cvr-tip", label: "Mere om CVR-nummer", trigger: icon("help-circle"), text: "Vi slår firmaets navn og adresse op i CVR-registret." }),
});
```

- **A tooltip never holds the only copy of something a person needs to act.** What a field needs is
  its hint, what a button does is its label, and what went wrong is a notice. Someone who never opens
  the tooltip must still be able to do the task.
- `help` on `field()` puts it beside the label, outside it, so the label names only the field.
- With anchor positioning (Baseline 2026) it opens above its button, or below when there is no room;
  an older browser shows it where it centres a popover.

**Icons:** `icon(name, { label? })` draws one of 32 icons, a subset of [Lucide](https://lucide.dev)
(ISC; its Feather-derived icons MIT) vendored into `src/icons/` with the licence beside it
(`dist/icons/LICENSE`). Inline SVG on a 24 grid, one stroke weight, `currentColor`, 1em of the text it
sits in (`.icon`). Without a label it is `aria-hidden` decoration, and the words beside it carry the
meaning; with one it is `role="img"` with that `aria-label`. Nothing is fetched.

```ts
import { button, html, icon, ICON_NAMES, type IconName } from "@forspring/ui/html";

button({ label: "Hent CSV", icon: "download", variant: "ghost" });            // the icon before the label
button({ label: "", icon: "trash", variant: "danger", small: true, ariaLabel: "Slet kunden" });
html`<p>${icon("clock")} Kører hver time</p>`;
```

The names (`IconName`, and `ICON_NAMES` at run time): check, x, alert-triangle, alert-octagon, info,
help-circle, chevron-left, chevron-right, chevron-up, chevron-down, arrow-up, arrow-down, search,
filter, plus, minus, edit, trash, external-link, copy, download, upload, settings, user, users,
log-out, eye, eye-off, clock, calendar, mail, more-horizontal. An unknown name throws. A new icon is
Lucide's own drawing added to `src/icons/lucide.ts` (its header says how), not one drawn here.

React: `<Toast />`, `<ToastRegion />`, `<Tooltip />` and `<Icon name="…" />` from
`@forspring/ui/react` draw the same markup. The demo's "Toast, værktøjstip og ikoner" section shows
one toast per tone, a tooltip beside a field's label (`?open=cvr-tip` opens it), buttons with icons
and every icon with its name.

## Tailwind v4 and shadcn

```css
@import "tailwindcss";
@import "@forspring/ui/theme.css";    /* bg-background, text-primary, rounded-card */
@import "@forspring/ui/fonts.css";
```

## Code

```ts
import { themeFor, chart } from "@forspring/ui";
themeFor("dataspring", "dark").primary; // "#2ba7ad"
themeFor("forspring", "light").mark;    // "#14151a", the doll's colour (marks has every product's)
```

## Run the audit in CI

`ui-audit` opens each page in Chromium at 1280 and 380 px wide, in light and dark, and checks it
against the tokens: contrast, type sizes and families, radii, spacing on the 4 px grid, colours,
touch targets, axe-core, third-party requests and the script budget (rules and severities: D-8).
It prints JSON (`--format text` for people) and exits 0 when there are no errors, 1 when there
are, 2 on an invalid value, 5 when Playwright or its browser is missing, 64 on a usage error.

Playwright is a peer dependency: the product installs it and the browser. axe-core comes with
this package and is injected from `node_modules`, never a CDN.

```
pnpm add -D playwright
pnpm exec playwright install chromium        # in CI: --with-deps chromium
pnpm exec ui-audit http://127.0.0.1:8787/ http://127.0.0.1:8787/settings \
  --product sitespring --format text
```

Options: `--budget-js 20kb` for a page with htmx (the default is 0: no script files), `--product
<key>` to accept only that product's accent, `--allow-spacing 6,10` while a page's own CSS still
carries off-grid values (the component layer has none since 0.5.0, D-14; don't pass it otherwise),
`--allow-status 403,503` to audit refusal pages (any other status of 400 or over is an error), and
`--cookie-env <NAME>` for signed-in pages (below). The audit
never fetches an off-origin request: it records it as a finding and answers it empty, so a run is
offline apart from the pages themselves. The one way past that is a redirect from the audited
origin to an IP address, which Chromium follows on its own; it is reported as a third-party error.
A page that itself redirects is a `page-load` error: give the URL it leads to (D-12).

A Worker, locally with wrangler:

```
pnpm exec wrangler dev --port 8787 &
until curl -sf http://127.0.0.1:8787/ >/dev/null; do sleep 1; done
pnpm exec ui-audit http://127.0.0.1:8787/ http://127.0.0.1:8787/keys --product dataspring --format text
kill %1
```

GitHub Actions (the repo is public, so the install needs no token, D-11):

```yaml
name: design audit
on: [pull_request]
jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install --with-deps chromium
      - name: audit the pages
        run: |
          pnpm exec wrangler dev --port 8787 &
          timeout 60 sh -c 'until curl -sf http://127.0.0.1:8787/ >/dev/null; do sleep 1; done'
          pnpm exec ui-audit http://127.0.0.1:8787/ http://127.0.0.1:8787/keys --product dataspring --format text
```

`wrangler dev` runs the Worker locally (local bindings, no deploy).

**Signed-in pages.** `--cookie-env <NAME>` sends the Cookie header value held in environment
variable `NAME` with every request to the audited origins, and nowhere else (every off-origin
request is answered by the audit and never leaves the browser). The cookie is never taken from the
command line, which other users on a host can read, and is redacted from everything the audit
prints. Seed a local session into the local database (the account signs one with its local
`.dev.vars` secret), then:

```
AUDIT_COOKIE="__Host-forspring.session_token=$token" \
  pnpm exec ui-audit http://127.0.0.1:8787/ --cookie-env AUDIT_COOKIE --format text
```

Use a local, throwaway session only; never a production one.

**Single-page apps.** The audit measures each page once it has settled: after the load event, no
request open and no network or DOM change for 300 ms, for at most 10 s (a page still changing then
is measured anyway, with a `page-load` review note). A static page costs 300 ms; a React app with
lazy routes is measured after it has drawn. Three flags help an app that needs more (D-16):

- `--wait-for <selector>`: wait until that element is visible before measuring. If it is not
  visible within `--wait-timeout <ms>` (default 30000), the page is a `page-load` error naming the
  selector and the page.
- `--settle <ms>`: wait that much longer after the page has settled (default 0), for a page that
  draws on a timer with nothing in flight.
- `--allow-origin <origin>`, repeatable: an origin the page may call, such as its API on another
  port. Its requests go through and are not `third-party` findings, its scripts count towards
  `--budget-js`, and `--cookie-env`'s cookie is sent to it as well as to the page's own origin.

```
AUDIT_COOKIE="session=$token" pnpm exec ui-audit http://127.0.0.1:5173/keys \
  --allow-origin http://127.0.0.1:8787 --cookie-env AUDIT_COOKIE --wait-for "main h1" \
  --budget-js 300kb --product dataspring --format text
```

The API must answer the page's cross-origin calls itself (CORS), as it does in the browser.
From code: `import { audit } from "@forspring/ui/audit"` with a Playwright `Browser` of your own. The
same options are `AuditOptions` fields: `cookie`, `allowOrigins`, `waitFor`, `waitTimeout`, `settle`
(and `budgetJs`, `product`, `allowSpacing`, `allowStatus`, `widths`, `themes`). Launch the browser
with `--host-resolver-rules` resolving only the audited and allowed hosts, as `cli.ts` does.

Products: `forspring`, `spring`, `sitespring`, `dataspring`, `appspring`, `pulsespring` (BrainSpring uses `spring`, hub D-116).
See [AGENTS.md](AGENTS.md) for the rules and [docs/decisions.md](docs/decisions.md) for why.

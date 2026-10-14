# @forspring/ui

The Forspring suite's UI package: forspring.ai's family look with one accent per product. Design
tokens built from W3C DTCG 2025.10 JSON into CSS custom properties, a Tailwind v4 theme and
TypeScript; self-hosted fonts; and a small server-rendered component layer with typed HTML helpers.

## Install

By git tag; each product pins a version and upgrades on purpose (D-2):

```
pnpm add github:forspringai/ui#v0.7.0
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

Products: `forspring`, `sitespring`, `dataspring`, `appspring`, `pulsespring`.
See [AGENTS.md](AGENTS.md) for the rules and [docs/decisions.md](docs/decisions.md) for why.

# Decisions

Numbered, newest last. The hub's log (`forspringai/forspring`, `docs/decisions.md`) holds the
suite-level decisions this repo follows, mainly D-90.

## D-1 — DTCG 2025.10 tokens, built by a small script of our own to three outputs (2026-10-10)

The tokens live in `tokens/*.json` in the W3C DTCG 2025.10 format: `$value` and `$type` on every
token, `{dot.path}` aliases, colours as `{ colorSpace, components, hex }` and dimensions as
`{ value, unit }`. Raw values (`palette`, `accent`, `status`, `chart`) are separate from the
semantic roles, which only alias them. Light and dark are two sets of the same role names,
`role.light.json` and `role.dark.json`, each read over the shared files: the set-per-theme shape
the DTCG resolver module formalises. A resolver document can be added when a tool needs one.

Three outputs, from hub ui-standard §2:

- `dist/tokens.css`: every role as a custom property on `:root` with `light-dark()` and
  `color-scheme: light dark`. `[data-theme="light"|"dark"]` only sets `color-scheme`, because
  `light-dark()` resolves where a role is used, so every role follows an explicit theme on any
  ancestor. `[data-product="<key>"]` sets `--primary`, `--primary-foreground` and `--ring`; unset
  means Forspring. Geometry and font stacks are plain properties.
- `dist/theme.css`: a Tailwind v4 `@theme inline` mapping each role to `--color-<role>`, plus a
  `dark:` variant that follows the system unless `data-theme` says otherwise. Radii, type and fonts
  carry literal values rather than `var()`, because Tailwind's namespaces use the same names as
  tokens.css and `--font-sans: var(--font-sans)` would refer to itself.
- `dist/tokens.js` and `dist/tokens.d.ts`: typed values (roles per theme, accents, chart slots,
  geometry in px, font stacks) and `themeFor(product, mode)`. Plain JS with a declaration file
  rather than a `.ts` file, so a product imports it without a TypeScript loader.

Role names are shadcn's (`background`, `foreground`, `card`, `muted`, `muted-foreground`,
`border`, `input`, `ring`, `primary`, `primary-foreground`, `chart-1..8`) plus `success`,
`warning`, `danger`, so React apps on shadcn work unchanged. shadcn's `popover`, `secondary`,
`accent` and `destructive` are aliases (note: shadcn's `accent` is a hover surface, not the
product accent, which is `primary`). One role is ours: `body-foreground`, the account's running
text, a step softer than `foreground`, which stays for headings and strong text.

`primary-foreground` is white on the light accents and the dark ground (`#111215`) on the dark
ones: the lifted dark accents are bright enough that white on them is under 4.5:1 (on `#6B83FF`
it is 3.33:1). The account's dark buttons today use white on `#4D68FF` (4.43:1); they change
with the move to this package.

**Build tool: a small TypeScript script, not Style Dictionary.** Style Dictionary 5.6 does read
DTCG 2025.10 colour objects (checked in its `lib/common/transforms.js`, 2026-10-10), so the format
was not the obstacle. The outputs were: `light-dark()` pairs across two sets, the per-product
selectors and the Tailwind `@theme` would each be a custom format, leaving Style Dictionary only
the reading and alias resolution, which `src/dtcg.ts` does in about 160 lines. The script has no
dependencies, runs with Node's own TypeScript support, and reports every invalid token with its
path. Because the tokens are standard DTCG, moving to Style Dictionary later changes the build,
not the source.

## D-2 — Consumed by git tag, with dist/ committed (2026-10-10)

Products depend on `github:forspringai/ui#v<version>` (hub D-90: "consumed by version", each
product pins and upgrades on purpose). A git dependency gets no build unless a `prepare` script
runs, which would need this repo's dev dependencies in every product's install. So `dist/` is
committed and the package is `private` (no registry). `test/build.test.ts` uses `dist/` as the
snapshot: a fresh build must match it byte for byte, so a token change without a rebuild fails,
and a rebuild shows up in review as a diff of the CSS and the types.

## D-3 — Status and chart colours (2026-10-10)

D-90 fixed the accents; this package had to choose the rest. Measured by `test/contrast.test.ts`
and `test/chart.test.ts`.

**Status**, used as text and icons with a word, never colour alone. Each at least 4.5:1 on
background, card and muted in its theme, and at least 10 apart (OKLab x100) from every accent:

| | Light | on paper | Dark | on ground | closest accent |
|---|---|---|---|---|---|
| success | `#26700F` | 6.00 | `#62D162` | 9.65 | DataSpring teal, 13.9 / 18.4 |
| warning | `#7A5200` | 6.74 | `#F2C14E` | 11.16 | SiteSpring terracotta, 12.8 / 20.0 |
| danger | `#9B1020` | 8.21 | `#FF3D5A` | 5.41 | SiteSpring terracotta, 10.6 / 10.2 |

The account's `#B42318` danger was 5 from terracotta and its `#1F7A4A` success 8 from teal, so
both moved: danger deeper and more crimson, success yellower. Success is green and PulseSpring's
accent is magenta for the reason D-90 gives.

**Chart**, eight categorical slots in a fixed order (blue, orange, green, gold, pink, olive,
violet, cyan), the same hue per slot in both themes:

- Light `#6A87F0 #EB681D #0DA26B #AA821E #D868AB #5F7630 #975AD1 #3097B3`
- Dark `#295FD4 #A25834 #3CA368 #B5820C #924D7D #5A7323 #824ACA #077FA8`

They pass the dataviz validator's gates in both themes against paper and card: lightness band,
chroma floor, adjacent protan/deutan separation at least 8 (worst 8.2), adjacent normal vision at
least 15, and every slot at least 3:1 on the surface (WCAG 1.4.11; worst 3.13 light, 3.19 dark).
No two slots are under 12 apart. DataSpring's palette (accent, then greys and teal tints) was the
starting point but is a brand set, not a categorical one: its greys fail the chroma floor and its
teals sit on DataSpring's accent. Eight hues cannot all avoid five accents and three status
colours, so the order and steps were searched to keep each slot clear of them; all but two are at
least 10 away, the closest being olive to success green in light (7.5) and green to DataSpring's
teal in dark (9.7). The test holds that floor at 7.

## D-4 — Two type ladders: Canonify's dense one for chrome, the account's for content (2026-10-10)

Hub ui-standard §2 asks for a type scale for the chrome and one for content, after Canonify's
two ladders. `text.chrome` is Canonify's dense ViewSpec ladder (11 label, 12 meta, 13 title, 14
body, 30 figure) for tables, tags, meta lines and controls. `text.content` is for pages (13 small,
15 body, 16 lede, 18, 21, 30 to 40 for h1). Its steps are the account's rather than Canonify's
product-chrome ladder (14 body), because the account is the reference D-90 builds from and must
move onto this package with no visual change. Nothing is under 11px.

## D-5 — The component layer keeps the account's plain class names, in two cascade layers (2026-10-10)

`css/components.css` is the account's `layout.ts` stylesheet turned into a shared file (hub
ui-standard §2), so its class names are the account's own, plain and unprefixed: `.bar`, `.brand`,
`.card`, `ul.list`, `.table-wrap`, `.button`, `.ghost`, `.small`, `.notice`, `.tag`, `.switch`,
`.or`, `.skip`, `.field`, `.field-error`. Modifiers are extra classes (`.notice.error`,
`.button.ghost`), not BEM. Why not BEM or a prefix (`.fs-button`): the account must move onto the
package with no visual change and as little markup change as possible, and server-rendered pages
are written by hand or by `src/html.ts`, where short names read best. The collision risk a prefix
guards against is small here: the React apps take `theme.css`, not this file. Additions follow
the same style; new blocks that would clash with a common word are compound (`.data-state`, after
the first draft's `.state` collided with the account's switch label `.switch .state`).

Bare elements are styled too, as in the account (a bare `button` is the primary action, inputs,
tables and headings have the family look). Everything sits in `@layer forspring.base` (elements)
and `@layer forspring.components` (classes), declared in that order, so a product's own unlayered
CSS wins without `!important` or specificity games.

Colours come only from the roles. The shades the account kept as extra tokens are mixes of roles,
declared on `:root`, `[data-product]` and `[data-theme]` so they follow the accent: links
(`--_link`, the accent 30% towards the foreground, `#1D36BA` for Forspring light against the
account's `#1D33B8`), hover (`--_hover`, 20% towards the ground in light and the ink in dark, so
the dark buttons' dark text keeps its contrast) and the status tints. The mark
takes the product's accent, as the account's mark takes its blue. The Google button keeps Google's
own colours and lives in `css/google-button.css`, outside the no-literal test.

Type sizes, radii and the main spacing are tokens. A handful of the account's small optical
values sit off the 4px scale and stay as px for parity (all on a 2px grid): heading and paragraph
margins 10 and 14, the list row padding 14/18, the tag padding 2/9, the field gap 6, the bar
padding 10, the switch track 38 by 22. The design audit (a later tick of epic 8f4) should treat
them as the reference, or they move to the scale in a decision of their own. Where the account
used a size off the ladders, the nearest step replaced it: field labels and legends 13.5 to 14,
the wordmark 22 to 21 (18 on a phone, was 20), a card's h1 28-34 to 30.

**The accent fills actions only.** An accent can be red-ish (SiteSpring's terracotta,
PulseSpring's magenta), so nothing that is not an action or the brand is drawn in the accent's hue
at strength: the plain (info) notice is the card surface with a `--border` hairline, foreground
text and a 3px accent rule at its left edge; `.tag.primary` ("Ny") is neutral text with a small
accent dot; the row a link points at (`tr:target`) is `--muted` with an accent edge rule, where
the account had an 8% accent tint. The first cut drew the info notice as an accent outline and
tint, which on SiteSpring was 10 (OKLab x100) from the error notice's border (controller review,
2026-10-10). `test/notice.test.ts` resolves the notice rules against the tokens for every product
in both themes and holds the plain notice at least 20 from the error notice's border and 4 from
its background (today 50.8 / 5.7 light, 43.4 / 4.7 dark). Success, warning and error notices are
unchanged. Buttons, the checked switch, the mark, the kicker and focus rings keep the accent.

**States** follow Canonify's DESIGN-SURFACE grammar: `.data-state` with `.empty` (by truth, or by
filter: the copy says which), `.loading` (skeleton lines, announced politely, pulse off under
reduced motion) and `.failed` (danger border and title; it says the read failed and never that
there is nothing). Each takes a card's footprint (at least 128px), so the page does not jump when
data arrives.

**Phone (560px and below):** the account's layout plus the standard's floors: buttons, small
buttons and the switcher are 44px tall, the switch's hit area 44px, standalone links (`.go`,
footer) 24px. On desktop the small buttons stay 32px, above the 24px floor. Nothing is under 11px.

**Tables** scroll inside `.table-wrap`, which the helper makes a labelled region with
`tabindex="0"`, and edge shadows (background-attachment local/scroll) show there is more. axe
reports the cells' contrast as "needs review" because of that background image; the text is on
`--card`, the same as the lists, which pass.

## D-6 — Typed HTML helpers that escape by default, compiled to dist/html.js (2026-10-10)

`src/html.ts` gives Workers products the shell and blocks without a framework: `shell`, `button`,
`field`, `notice`, `tag`, `card`, `list`, `table`, `switchButton`, `state`, `orDivider`,
`googleButton`, `mark`, plus `html`` `, `raw`, `esc`, `safeHref` and `fontFaces`. They return an
`Html` value, not a string: inside `html`` ` and every helper, a string is always text and is
escaped, and only `Html` passes through. A plain string could not tell markup from text at run
time, which is how double escaping or, worse, no escaping happens. `String(h)` gives the HTML.
`Html` is recognised by a registered symbol, not `instanceof`, so two copies of the module work
together. Hrefs pass `safeHref`, which turns any scheme but http(s) and mailto into `#`, after
dropping the whitespace and controls a browser would drop (`java\nscript:`).

The helpers carry no copy of their own except the skip link's ("Spring til indhold" / "Skip to
content") and the switch's default state words ("Til" / "Fra"); everything else comes from the
product's catalog.

The build compiles `src/html.ts` with `tsc` to `dist/html.js` and `dist/html.d.ts` (export
`@forspring/ui/html`), because Node will not strip types from a file in `node_modules`; the build
test compiles it again and compares.

## D-7 — Fonts ship as files with a CSS file and a function for other paths (2026-10-10)

`fonts/` holds the account's files (forspring.ai's own cuts) and their OFL licences: Archivo
(variable 100 to 900), Archivo Condensed (700 to 900), Space Mono 400, and Roboto Medium for
Google's button. `dist/fonts.css` points at `../fonts/`, which a bundler resolves inside the
package. A product that inlines its CSS (the account does, to save a request) cannot use relative
URLs, because they resolve against the page, so it copies `fonts/` into its own static assets and
calls `fontFaces("/assets/fonts/")`. Roboto's face is only in `google-button.css`, so it loads on
the sign-in page alone.

`unicode-range` matches what the files contain: Google Fonts' "latin" subset (Basic Latin,
Latin-1, the common punctuation and a few extras such as Œ and €), and Latin-1 for Roboto. The
account declared no range; the files have no Latin Extended glyphs, so declaring that range would
promise what they do not hold. A name with, say, ł or ő falls back to Arial for that letter, as it
does today. A Latin Extended cut is a new file (with a new name, account D-17) if it is wanted.

## D-8 — The design audit: what it checks, and what is an error (2026-10-10)

`ui-audit <url...>` is hub ui-standard §3's enforcement, Canonify's `design-audit` made generic:
instead of probes per selector it measures every rendered element of a page against the tokens.
Each URL runs at 1280 and 380 px wide, light and dark (`prefers-color-scheme` emulated), each a
fresh Chromium context through Playwright, which the product installs (a peer dependency; this
package carries no browser). axe-core is a dependency and is injected from `node_modules`, with
CSP bypassed for the audit only, so a page's strict CSP need not allow it.

| Rule | Checks | Severity |
|---|---|---|
| `contrast` | text colour, alpha composited, against the background found by walking up the ancestors (Chromium's canvas if none paints); 4.5:1, 3:1 for large text (24 px, or 18.66 px at 700); disabled controls exempt | error |
| `contrast` | text over a background image or gradient, which cannot be measured | review |
| `text-min` | text under 11 px | error |
| `font-size` | a size on neither ladder (`text.chrome`, `text.content`); h1 may sit anywhere between `h1-min` and `h1`, because it is fluid | error |
| `font-family` | the first family of every text element is Archivo, Archivo Condensed or Space Mono (Roboto only inside `.gsi`); every loaded font face is one of those | error |
| `radius` | every corner 0, a radius token (3, 6, 8, 10), 50% or a pill (999 px and over) | error |
| `spacing` | margins, paddings, and gaps on flex and grid containers, in px, on the 4 px grid or in `--allow-spacing`; `auto` and percentages skipped | error |
| `target-size` | `a[href]`, `button`, `input`, `select`, `[role=switch]`, `summary` at least 24 by 24 px, with SC 2.5.8's exceptions (a link inside a sentence; a control whose label is 24 by 24; an undersized target whose 24 px circle touches no other target or circle) | error |
| `target-primary` | below 560 px wide, `button`, `.button` and submit inputs at least 44 px tall (the switch and Google's 40 px button excepted, D-5) | error |
| `palette` | text, background and border colours match a token value within 2/255 per channel, any alpha; the tokens include every role for every product in both themes and every `color-mix()` and `light-dark()` components.css derives from them; `--product` narrows the accents to that product's | warning |
| `axe` | every violation of axe's WCAG 2.0, 2.1 and 2.2 A and AA rules | error |
| `third-party` | any request to an origin other than the page's (fonts, analytics, CDNs) | error |
| `js-budget` | script files per page against `--budget-js` (D-9) | error |
| `page-load` | the page did not load, or answered 400 or above | error |

Exit 0 with no errors, 1 with any; warnings and reviews never fail a build. **Palette is a warning**
because the rule is a match against measured colours: D-5 lets a product mix a shade from roles
(`color-mix()`), which is right but is not a token value, and a near miss after a browser's
rounding should not break a build. A product that wants it strict reads `severity` from the JSON.
**Everything the standard states as a floor is an error**, including spacing: geometry is fixed
(D-90), and drifting from the tokens "is a failing check, not a code review comment".

Google's button (`.gsi`) keeps Google's colours, Roboto, its 4 px radius and its 10 px gap, so its
subtree is exempt from palette, family, size, radius and spacing; contrast still applies.

**The parity spacings fail without the flag.** D-5 kept a handful of the account's optical values
off the 4 px scale. Measured on the demo, they are 2, 6, 9, 10, 14, 18 and 22 px: D-5's list
missed the 22 px (the margin under a heading before a list, `.back`, a card's phone padding) and
the 2 px before `.brand .sub`. The audit has no built-in exception for them, so the package's own
demo is audited with `--allow-spacing 2,6,9,10,14,18,22`, and so is every product on the
component layer until these values move to the scale, in a decision of their own. The flag names
the debt where everyone sees it, instead of hiding it in the audit.

What the audit does not see: hover, focus and open states (it measures the page at rest),
pseudo-elements, SVG fills, and text positioned over something other than its DOM ancestors.
Opacity other than `disabled` is not factored into contrast.

The first run found two real WCAG 2.5.3 (label in name) failures in the demo, through axe's
`label-content-name-mismatch`: the brand link's visible text read "Forspringkonto" (two spans with
nothing between them) against the label "Forspring-konto, forside", and a "Log ud her" button was
labelled "Log ud på Safari på iOS". The shell helper now puts a space between the word and the
product (invisible in the flex row, a word break to assistive technology), and the demo's labels
start with their visible text.

## D-9 — The script budget counts gzipped script files; off-origin requests are answered, not fetched (2026-10-10)

Hub ui-standard §3 sets the budgets in gzipped bytes: console pages 0 KB by default, about 20 KB
with htmx, a rich app's first route at most 300 KB. `--budget-js` takes the same unit (`0`,
`20kb`, `300kb`; 1 KB is 1024 bytes). For each same-origin script file the audit counts its
transferred body when the server compressed it, and what the body gzips to when it did not, so a
local `wrangler dev` (which may not compress) measures what production will send. Inline scripts
are part of the document and are not counted: the standard's second step, a few lines under a
nonce, stays possible at a budget of 0.

Off-origin requests are recorded as `third-party` findings and answered with an empty 204 by the
audit itself; they are never fetched. The CLI also resolves only the audited hosts in Chromium
(`--host-resolver-rules`), so DNS prefetch and preconnect cannot reach a third party either. A run
is then the same offline as online, a third party's speed or outage cannot change the result, and
the tests need no network. The cost: a third-party script's weight is not measured, which does not
matter, because the request alone fails.

## D-10 — The audit can be given a session and expected refusal statuses (2026-10-10)

The account's pages (its first consumer, account tick kts) are mostly signed in, and three of the
ones people see are refusals: not invited (403), product off (403) and sign-in unavailable (503).
`ui-audit` as first cut audited signed-out 200 pages only, so it gains two flags.

**`--cookie-env <NAME>`** sends the Cookie header value from environment variable `NAME`. A
session cookie is a credential, so: it is read from the environment only, never from argv (any
user on a host can read another's command line); a refusal names the variable, never the value,
and a value given where the name belongs is refused without being echoed; everything the CLI
prints, including an unexpected error's stack, passes a redactor that takes out the whole value and
each cookie's value, raw, URL-encoded, decoded and JSON-escaped. It travels as an extra HTTP
header on the page's browser context rather than as a cookie in the jar: `route.continue()` cannot
set `Cookie` in Chromium (it is dropped, checked with Playwright 1.64), and a jar cookie would need
Domain, Secure and `__Host-` handling over local http. It reaches the audited origin only, because
every other HTTP request is already answered by the audit inside the browser (D-9) and a WebSocket
to another host is closed unopened. Each URL runs in its own context, so two audited origins each
get it; audit one product's pages per run.

**`--allow-status <list>`** (400 to 599) lets a page answer with one of those statuses and still be
audited, instead of failing `page-load`. A refusal page is a page a person reads; it must meet the
standard as much as the home page. Any status not listed still fails, so a page that breaks into a
500 is not hidden by a flag meant for its 403.

## D-11 — The repo is public (2026-10-10)

Peter made `forspringai/ui` public so every product's build (Workers Builds, Google Cloud) installs
it by git tag with no token. It holds only tokens, CSS, fonts (SIL OFL) and the audit tool: no
secrets and no customer data.

Licence: **MIT**, copyright Writeflow ApS (Peter, 2026-10-10). The fonts keep their own SIL Open
Font License 1.1, as LICENSE says.

## D-12 — Redirects: a redirected page fails; an off-origin redirect hop is reported (2026-10-10)

Found in the final review of epic 8f4 (tick 8sn), checked with Playwright 1.64. A route sees only
the first URL of a redirect chain, so when an audited, same-origin URL answers 302 to another
origin, Chromium follows it itself and the route in D-9 never answers it. `--host-resolver-rules`
stops that for names, but an IP literal needs no resolving: a page whose `/r` redirects to
`http://192.0.2.1/` reaches that address. The audit cannot stop the hop from inside the browser,
so it records every redirect hop to another origin as a `third-party` error ("reached through a
same-origin redirect") rather than letting it pass unseen. The `--cookie-env` header was not sent on
any redirect hop, same-origin or not (measured at the receiving server), so the session does not
leak this way.

That second fact made a quieter failure possible: a signed-in URL that redirects is audited signed
out, and the page it lands on (a sign-in page, say) can pass in its place. A page whose own
navigation redirected is now a `page-load` error naming where it led; give the audit that URL. The
account's audited URLs answer directly (200, 403) and are unaffected.

## D-13 — A product menu, crumbs, and a traffic-light signal palette (2026-10-12)

Asked for by Peter reviewing PulseSpring's console: its navigation was rows of links (the org's
name, then the sections, then a breadcrumb) above every h1, and "down" read as the brand, because
the console showed it as a small `--danger` outline tag next to magenta links and buttons.

**Menu.** `shell({ menu })` gives a product's console a real menu: a sidebar beside main on a wide
screen, and the same menu folded under "Menu" (a `details`, no script) below 800px. On top sits the
context, the organisation the console is for, with a switcher when the person has more than one.
Then groups of items, optionally labelled ("Projects"). An item is the page (`current: true`,
`aria-current="page"`) or the page's parent (`current: "parent"`, `aria-current="true"`: a check
under its project); both get the muted surface, ink, and the accent only as a 2px edge rule (D-5).
An item can carry a badge, a count with a signal mark and words for a screen reader ("2", down).
With a menu the frame widens from 920px to 1120px and main keeps a 760px measure. The sidebar and
the fold are two renderings of one menu, so neither depends on `::details-content`; the hidden one
is `display: none` and out of the accessibility tree.

**Crumbs.** `crumbs(label, links)` is the page's parents, quiet (chrome meta size, mono, muted,
no underline until hover), before the h1. The page itself is the h1, never a crumb.

**Signal.** A monitored thing's state (a check up or down, a site reachable) is not a status in
D-3's sense: it is the whole point of a monitoring screen and must read at a glance, as a traffic
light, never as the brand. So it gets its own four colours, `--signal-ok`, `--signal-warn`,
`--signal-down`, `--signal-off`, and its own helper, `signal(word, s)`: a mark and the word, the
word in ink. The mark repeats the meaning in shape as well as colour, since red and green are the
pair colour-blind people confuse most: ok a dot, warn a triangle, down a diamond, off (paused, new,
not judged) a hollow ring. `notice({ signal })` is the neutral card with the signal as its edge
rule and its mark before the title, for "2 checks are down".

| | Light | Dark | mark on surfaces (min) | closest accent |
|---|---|---|---|---|
| ok | `#1E9E48` | `#3DD06A` | 3.07 / 8.54 | DataSpring teal, 15 / 17 |
| warn | `#B87503` | `#F5B830` | 3.32 / 9.65 | SiteSpring terracotta, 12 / 19 |
| down | `#EE0A32` | `#FF2D3F` | 3.92 / 4.67 | SiteSpring terracotta, 10.9 / 11 |
| off | `#7D808A` | `#7C7F88` | 3.48 / 4.30 | DataSpring teal, 11 / 12 |

A mark is a non-text graphic beside its word, so the floor is 3:1 (WCAG 1.4.11) on background,
card and muted, not text's 4.5:1; that is what lets the signals be vivid where `--danger` must be
deep enough to be read as text. Down is 18 from PulseSpring's magenta in both themes (`--danger`
is 13), and every signal is at least 10 from every accent (`test/contrast.test.ts`). `--danger`,
`--success` and `--warning` keep their jobs: an error, a destructive button, an outcome in words.

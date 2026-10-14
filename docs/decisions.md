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
them as the reference, or they move to the scale in a decision of their own. (They moved in D-14.) Where the account
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
the debt where everyone sees it, instead of hiding it in the audit. (Paid in D-14: the component layer has no off-grid
spacing since 0.5.0, and the demo is audited without the flag.)

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

## D-14 — Control geometry, the select's chevron, and every spacing on the 4px scale; 0.5.0 (2026-10-12)

Asked for by Peter from SiteSpring's console header on 0.3.1: the organisation `<select>` showed
the browser's own chevron jammed against its right border, with 12px of padding at the start and
none at the end, so the text and the arrow read as misaligned. The cause was general: a select
was styled as a text input and kept its native arrow, inputs were 46px tall and buttons 44px, and
nothing tied a control's height to the others'. 0.4.0 was already tagged (D-13), so this is 0.5.0;
an old version with new CSS would leave browsers on a year's cache (account D-20).

**Control heights are tokens.** `geometry.json` gains `control`: `height` 44px, `height-small`
32px and `touch` 44px, each an alias of a space step (`{space.11}`, `{space.8}`), so they are on
the grid by construction. They are emitted as `--control-height`, `--control-height-small`,
`--control-touch`, as Tailwind's `--spacing-control`, `-control-small`, `-control-touch`
(`h-control`) and as `control` in tokens.js. Inputs, selects, textareas and buttons all take
`min-height: var(--control-height)` and 12px of padding; small ones (`.small`) and every input or
select in the bar take the small height and 4px. A control's line-height is what the height
leaves after its padding and two 1px borders (`--_control-line`, 18px; 22px small), so the text of
every control of a size sits at the same height, and a row of them (the bar, `.toolbar`, a form)
shares one baseline whatever its alignment. min-height rather than height, so a long label still
wraps. Under 560px every input, select and button reaches `--control-touch`; a small one takes the
default box with its smaller type, so its text stays centred. A textarea keeps a 20px line for
reading.

**The select draws its own chevron.** `appearance: none`, and two `linear-gradient`s in 5px tiles,
each one diagonal stroke, make a 10 by 5 caret in `--muted-foreground`, 12px from the end, with
`padding-inline-end: 32px` reserving its room. Gradients, not a `url()` or data: SVG, because a
console's CSP is `img-src 'self'` and an image would need `data:` allowed; the stops are a pixel
soft each side so the strokes are antialiased. The control stays native: keyboard, the phone's
picker, the option list in the page's color-scheme. `:dir(rtl)` moves the caret to the start; a
list box (`multiple`, `size` over 1) has none. Disabled inputs and selects are the muted surface
with muted text. `appearance: base-select` (a customisable picker) is left for later.
`shell({ controls })` places controls in the bar after the switcher, and `.toolbar` lays a row of
controls out with a text input taking the room.

**The audit and the chevron.** A background image under text is "review" in the contrast rule
(D-8), and the chevron is a background image, so every select would have become a review item.
The audit now measures a select's text against its own background colour when the select's own
background image is only gradients: the chevron sits in the padding, beside the text. Any other
image, or one on an ancestor, is still a review.

**Every spacing is on the scale.** D-5 kept the account's optical values (2, 6, 9, 10, 14, 18, 22)
for parity, and D-8 made every consumer pass `--allow-spacing` for them. They move to the nearest
step, chosen per place: h1 and h2 to 12 below (were 10 and 14), paragraphs and `.fine` to 16 (14),
`.fine + .fine` and the field gap to 8 (6), the kicker to 12 (10), the bar's padding to 8 (10; the
bar stays 64px), the brand's divider to 12 each side (the 8px gap and 4, then 12; were 8 and 2, then 10), the switcher's
gap to 8 (6), the menu's item and context gaps and the badge's gap to 4 (2, 2, 6), the fieldset row
gap and the list's row gap to 12 (10), list rows to 16/20 (14/18) and 12/16 on a phone (14), the
skip link to 12/16 (10/14), the `h1 + list` and `.back` margins to 24 (22), the tag to 0/8 with a
20px min-height (2/9), the switch to 4px padding and a 40 by 24 track with its thumb 4px in (6,
38 by 22, 3), and on a phone the card and state padding to 24/20 (22/18, 24/18) and table cells to
8/12 (10/12). `test/components.test.ts` now fails on any px literal in a margin, padding, gap or
inset that is not a multiple of 4 (the skip link's -9999px aside), and the demo passes the audit
with no `--allow-spacing` for all five products, at 1280 and 380px, light and dark.

What stays in px, because it is not spacing: 1px borders and hairlines, the 2px focus outline and
its 2 to 3px offsets, the 2 to 3px accent and signal edge rules, the text underline offset, the
marks' own sizes (the 6px chevrons and tag dot, the 10 and 11px signal marks, the 18px checkbox),
the chevrons' 1.5px strokes, and the optical nudges done with `transform`. The audit does not
measure any of them as spacing.

**`.menu` is `nav.menu`.** D-13's `.menu` rule made any element of that class a grid with a 24px
gap; SiteSpring's own `details.menu` (its account menu in the bar) became 68px tall and its avatar
sat off the bar's line. The rules now match `nav.menu`, which is what `shell` writes. The class is
unchanged, so no markup changes.

## D-15 — A product's bar carries only its own name; 0.6.0 (2026-10-14)

Hub D-98 (Peter): a product is its own brand, like Word signed in with an Office account. `shell()`
with a `product` other than `forspring` shows the product's name alone as the wordmark ("SiteSpring"),
with no Forspring mark or name, and titles end in " · <product>". Forspring's own pages (product unset
or `forspring`: the account, forspring.ai) keep the mark, "Forspring" and the small label ("konto").
"Sign in with Forspring" and the account stay Forspring-branded, since the account is the shared one.
Products upgrade to 0.6.0; nothing else changes.

## D-16 — The audit waits for single-page apps, and can allow an API origin; 0.7.0 (2026-10-14)

Asked for by DataSpring, whose console is a React single-page app with lazy routes and its API on
another local port. The audit measured each page at the load event, when such an app has drawn
nothing, and every call to the API was a `third-party` error answered empty, so the app never drew
at all.

**Every page waits until it has settled.** After load, the audit waits until no request is open
and neither the network nor the DOM (a MutationObserver over the document) has changed for 300 ms,
for at most 10 s; then it measures. A static page is quiet at once and costs 300 ms per run (four
runs per URL). A page still changing at 10 s (a poll, a ticking clock) is measured anyway with a
`page-load` review finding, so the run stays bounded and a half-drawn page is visible in the output
without failing it. This is the default rather than a flag, so an app works with no flags, and
Playwright's own `networkidle` (500 ms, network only) was not used because an app draws after its
last response.

**`--wait-for <selector>`** waits for that element to be visible (Playwright's `visible` state)
before the settle step. Not visible within `--wait-timeout <ms>` (default 30000, the same as the
page load's) is a `page-load` error whose selector is the selector and whose value names it and the
page, and the page is not measured, since measuring a sign-in screen or an error state in its place
would pass the wrong page (D-12's reasoning). **`--settle <ms>`** (default 0) is a fixed wait after
the settle step, for a page that draws on a timer with nothing in flight before it.

**`--allow-origin <origin>`** (repeatable, an http(s) origin with no path) lets the page's requests
to that origin through: they are not `third-party` findings, the CLI lets the host resolve, a
WebSocket to it stays open, and its scripts count towards `--budget-js` (they are the product's
code). Everything else off-origin is still answered by the audit and never fetched.

**The cookie goes to the allowed origins too**, rather than through a separate `--cookie-origin`.
`--cookie-env`'s value is an extra header on the browser context (D-10), so it is on every request
the audit lets through; an allowed origin gets the same cookie as the page. That is the simpler
choice and fits the case: a local app and its local API share one session. A run that must not send
the session to an origin does not allow that origin. The API answers the page's CORS itself, as in
a browser; with the header injected below the page, a plain `fetch` with no credentials carries it
(checked with Playwright 1.64 and Chromium, test/audit.test.ts). The same options are fields on the
exported `audit()`: `allowOrigins`, `waitFor`, `waitTimeout`, `settle`.

The tests use `test/fixtures/spa.html`, a page that draws only after an API on a second port
answers, with the session, 600 ms after load.

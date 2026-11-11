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

## D-17 — One bar with org, product and user menus, the standard pages, the refusal vocabulary and React wrappers; 0.8.0 (2026-10-14)

Hub D-99 (one way in, approved by Peter) makes the bar and the screens around signing in the
package's, so no product can drift: hub tick f0t, `docs/one-way-in.md` "The bar, in every product",
"Every screen around signing in" and "One vocabulary for refusals".

**The bar.** `shell()` (and `bar()` alone, for a rich app's own frame) takes three new options:
`org` (the org switcher), `products` (the product switcher) and `userMenu`. Each is a `details`
element like the switcher, so it opens with no script, a keyboard reaches it with Tab and opens it
with Enter or Space. The wordmark stays the product's name alone (D-15, hub D-98) and leads to the
org's home, `/o/<org>/`, when `home` is unset.

- **Org switcher:** the customer's name in the bar; the panel lists every org with the person's role
  ("ejer", "administrator", "medlem", "læser", as the account writes them) and "Administrer folk i
  <org>" to the account's people page. Hidden with one org; the org then shows only in the user
  menu's head. Each link keeps the person's place: `orgPath("/o/noon/runs", "spekta")` is
  `/o/spekta/runs` (a query or hash kept, a path outside `/o/` the org's home); a page that does not
  exist there is the product's to send home. `href` per org overrides it.
- **Product switcher:** "Produkter"; the panel is "<org> har", the org's products with the current one
  marked "her", and "Alt for <org> hos Forspring" to the account's org page.
- **User menu:** an avatar with the person's initials (`initials()`), its accessible name the
  initials then the name and "din konto" (WCAG 2.5.3: the visible text first). The panel: name,
  address, "<role> i <org>", "Din Forspring-konto", "Agenter og nøgler i <org>", Dansk / English (this
  page in each language, the current one marked and `lang`/`hreflang` set), and "Log ud af Forspring"
  as a small, wide ghost button in a POST form to the product's sign-out with its hidden fields
  (the CSRF token). Sign-out signs out of Forspring (hub D-99 item 3); the product does the redirect.
- `switcher` and `user` still work and are marked deprecated; a product moves to `products` and
  `userMenu` when it adopts the account's org pages. With the bar's org switcher, a product drops its
  menu's `context`: the hub's rule is that org and people are not repeated in the menu.

**The bar's words are the package's.** D-6 kept the helpers free of copy apart from the skip link
and the switch's words. The bar and the standard pages are the exception, in Danish and English:
the point of D-99 is that every product says "Log ud af Forspring" and "Organisationen findes ikke,
eller du er ikke med i den" the same way, and a catalog per product is how they drifted.

**Phone.** At 560px and below every summary is 44px (D-5's touch floor), the avatar 44 by 44, and a
panel's links 44px tall. The panels open full width under the bar (the menus become `position:
static` and the panel is placed against `.bar-inner`, now `position: relative`), so none runs off a
380px screen. At 380 the bar wraps to a second row when it must, and the org's name ends in an
ellipsis past 11rem (16rem on a wide screen); the panel shows it whole.
Panels take `--popover`, the switcher's shadow and radius; the current item has the accent only as
an edge rule (D-5); `.switcher a[aria-current]` replaces `[aria-current="page"]` for that.

**The refusal vocabulary** is `@forspring/ui/refusals`, with no markup and no dependency, so a CLI or
an MCP server imports it alone: `REFUSALS[reason]` gives `status` (HTTP), `exit` (suite-standards
§6) and `da`/`en` `{ title, text, fix }`; `REFUSAL_REASONS` lists the eight in the hub's order and
`isRefusal()` checks a string. The statuses: `not_signed_in` 401, `org_required` 400,
`not_a_member` 404 (the same as an org that does not exist, so names cannot be probed; its words
say "does not exist, or you are not in it" and the page never shows the org's name),
`product_off`, `org_suspended`, `role_too_low` and `org_mismatch` 403, `account_unavailable` 503.
Exit codes 4, 2, 3, 4, 4, 4, 4 and 1.

**The standard pages** are `@forspring/ui/pages`: `chooseOrgPage`, `noOrgPage`, `refusedPage` and
`accountUnavailablePage` return `{ status, title, narrow: true, body }`, to spread into `shell()`
and answer with `status`. Choose an organisation lists each org with the role and when it was last
used (a `Date` is written in the page's language, Copenhagen time), the one this browser used last
(`lastHere`, the product's own cookie, never server state) first, tagged "Sidst brugt her" and the
primary action. No organisation yet says who you are signed in as and who to ask. A refusal is one
card: the reason as a kicker (so an agent or support reads the stable code), the title, the text,
what is specific (the org, the role needed, the credential's org, your orgs, up to three people
who can fix it as mailto links), the fix, the one action that fixes it (sign in, billing, try
again) and the exact command for an agent. The account not answering is 503 with "Nothing is lost;
try again in a minute", never a guess. Classes: `.std-page` plus `.choose-org`, `.no-org` or
`.refused` and `data-reason`, `.std-label`, `.std-people`; `code` is now Space Mono.

**React wrappers** are `@forspring/ui/react`: `Bar`, `ChooseOrg`, `NoOrg`, `Refused`,
`AccountUnavailable`, and `fromHtml()`. Each renders the helper's outer element with its
attributes as props and its inner HTML through `dangerouslySetInnerHTML`, so the markup is the
helpers' own, byte for byte (`test/bar.test.ts` compares `renderToStaticMarkup` with the helper for
every page and reason), and escaping is the helpers'. Rewriting the markup as JSX would have been
a second copy to keep in step, which is what this package exists to prevent. The menus need no
handlers; their links are plain links, so switching org or product is a full navigation, which it
is anyway (another org's data, another product's origin). React is an optional peer dependency
(`>=18`); no JSX, so the file needs no build step of its own. A rich app sets the HTTP status of a
refusal on its server, since the wrapper only draws.

**Build.** `src/html.ts`, `refusals.ts`, `pages.ts` and `react.ts` compile together to `dist/`, with
`rewriteRelativeImportExtensions` so the sources keep their `.ts` imports for Node and the output
says `.js`. The demo shows the new bar (with `?open=org-switcher|product-switcher|user-menu` to open
a panel for a screenshot or the audit), and every standard page as its own page in DataSpring, in
Danish and English, under `dist/demo/pages/`; all twenty pass the audit at 1280 and 380, light and
dark, with no findings.

## D-18 — Marks and wordmarks: the doll in every bar, brand files per product, favicons from shell(); 0.9.0 (2026-10-15)

Hub D-101 (Peter, wordmark option A, all ink). Amends D-15: a product's bar now has a mark, its own.

**The bar.** Every bar is the doll plus the wordmark. A product's: its doll in its accent and its name
in ink, still no Forspring mark or word (hub D-98). Forspring's own pages (`product` unset or
`"forspring"`): the doll in ink (paper on dark), "Forspring" and the small label. The wordmark is
unchanged, Archivo Condensed 900 in `--foreground` at the existing sizes. The React `Bar` is `bar()`'s
markup (D-17), so it follows with no change of its own.

**The doll's colour is a role, `--mark`**, rather than `--primary`: Forspring's buttons and links
stay blue while its doll is ink. `role.mark` is ink in both role files and becomes the accent in
every product's `[data-product]` block, except `forspring`, which keeps ink; `marks` in tokens.js and
`themeFor(...).mark` carry it. A test holds every doll at 3:1 on the page and the card (WCAG 1.4.11).

**`spring` is a product** in `Product`, the tokens and `PRODUCT_NAMES`, its accent an alias of
Forspring's blue (`#2244FF` / `#6B83FF`), so the suite has one blue. The audit and the demo run six
products. The older forspring.ai blue is gone from the repository (a test greps for it).

**Brand files are generated** from the tokens by `pnpm build` into `dist/brand/<product>/` (what
products serve; exported as `@forspring/ui/brand/*`) and the same into `brand/<product>/` for people:
`mark.svg` and `favicon.svg` (cropped to the doll, so 16 px is all doll), each with its dark variant in
a `prefers-color-scheme` rule; `logo.svg`, the lockup with the wordmark as outlined paths and the clear
space as its margin; and PNGs rendered from them in Chromium (favicon 16 and 32, apple-touch 180 and
icon-512 on paper, logo 1200 × 300 transparent). The PNGs make Chromium a build dependency, as it
already was for the tests; it renders the SVGs exactly as browsers will, which no pure JS rasteriser
we could add would promise. The SVGs are part of the dist snapshot (D-2); the PNGs are checked for
their sizes and their pixels' token colours instead, since a renderer update may shift an
anti-aliased edge.

**The wordmark outlines** are `brand/wordmarks.json`, written by `scripts/wordmarks.py` with
fontTools and HarfBuzz from our own `archivo-condensed.woff2` at wght 900, kerned, with the bar's
-0.01em tracking. Python, run by hand when a name changes, because instancing a variable font
correctly is what those two tools do; the build itself stays Node and reads the JSON. The old
`forspring-*` files are removed; nothing referenced them, and `brand/forspring/` replaces them.

**Favicons.** `shell()` writes the PNG icons (with `sizes`, first), the SVG icon and the
apple-touch icon for `product` (Forspring when unset) from `brandBase`, default
`/assets/ui/<version>/brand/` (`DEFAULT_BRAND_BASE`), the versioned path products already copy the
package's files to (account D-20). `favicon` names other files, or `false` leaves them out.
`faviconFor()` and `faviconLinks()` give the same tags to a page not drawn by `shell()`. `VERSION` in
html.ts carries the version for that path; a test holds it to package.json's.

The rules (one mark, colour only in the mark, ink wordmark, the lockup, clear space a quarter of the
doll's height, the smallest doll 16 px) are in `brand/README.md`.

## D-19 — Connect an agent: one panel, interactive sign-in first, keys folded; 0.10.0 (2026-10-16)

Hub D-102 (Peter: the main way to authenticate MCP and the CLI is interactive, headless CLI included;
predefined keys stay supported but are secondary) and hub tick 6h0. The audit behind it,
`docs/agent-connect-plan.md` in the hub, found SiteSpring's console the one surface still leading with
a pasted key, DataSpring with no panel and PulseSpring with no MCP setup anywhere. Three products and
the account's Agents page writing the same four tabs would drift the way they already had, so the
panel is the package's, with its words, as the bar's are (D-17).

**The API** is `@forspring/ui/connect`: `connectPanel({ lang, product, org: { slug, name }, mcpUrl,
cliName?, multiOrg?, installUrl?, keysHref?, createKey?, open?, headingLevel?, id? })` returns `Html`,
a `section.connect`. `connectServerName()` is the client name rule from the plan (`<cli>`, or
`<cli>-<org>` for a person with several orgs, so connections to two orgs sit side by side), and
`cursorInstallUrl()` Cursor's documented deeplink with `{"url": …}` as base64 JSON. The React
`ConnectAgent` is `fromHtml(connectPanel(props))`, the same markup byte for byte, as D-17's wrappers.

**The copy is the hub's, word for word**, in Danish and English; a test checks every sentence. Claude's
own interface words (Customize → Connectors, Authenticate, Connect) stay English inside the Danish,
because Claude has no Danish interface and a person must find the same words on screen; they carry
`lang="en"`. The `{org}` of the sentences is the org's name; `--org` takes its slug.

**No key in the default tabs.** Claude Code is `claude mcp add --transport http --scope user <name>
<url>` with no `--header`, Claude.ai the three connector steps, other clients the URL, the CLI
`curl … | sh` and `<cli> auth login`. A test holds the four tabs free of `Bearer`, `Authorization`,
`API_KEY`, `<nøgle>`/`<key>`, `--header` and `?org=` (the one URL form strict OAuth discovery
refuses, RFC 9728 and Claude.ai's exact `resource` match). Keys are under a `details` "Automatisering
og CI", closed, drawn only when the product passes `keysHref` (its keys page now, the account's
`/o/<org>/agents?product=<p>` after tez) or `createKey` (its own POST form, CSRF fields hidden). The
link reads "Se og tilbagekald alle agenter i {org}", the plan's words for that page.

**Tabs with no script.** Radio buttons, visually hidden, with their labels as the tabs, in a fieldset
with a hidden legend; CSS shows the checked client's panel with `.connect-tabs:has(input[value=…]:checked)`.
Radios rather than an ARIA tablist because a tablist needs script for its keys; a radio group already
gives Tab into the group and arrows across it, and a screen reader says "1 of 4". Rather than `details`
per client because four disclosures read as an accordion and allow none or all open; the person picks
one client. Each panel keeps a heading (hidden when the tabs work); the tabs' rules sit in `@supports
selector(:has(*))`, so in a browser without `:has()` every panel shows under its heading and the tab
row is gone, and nothing is lost. The chosen tab has the accent only as its edge rule (D-5), drawn as an inset shadow so the row
needs no negative margin (D-14). On a phone the labels are 44 px and all four fit one row at 380.

**Copy buttons are progressive enhancement.** Each command or URL is a `pre` with wrapping (a phone sees
the whole command, and no scrolled region needs a tab stop) and `user-select: all` on its `code`, so
with no script one click selects it. The buttons are in the markup but `display: none` until
`CONNECT_SCRIPT` has set `data-forspring-copy` on `<html>`, which it does only with the async clipboard
in a secure context: no button that cannot work. The script is a string the product places itself
(`connectScript(nonce)` writes it as an inline tag with the CSP nonce, stripped to base64 characters),
listens on the document so React panels drawn later work, and announces "Kopieret" in the panel's
status region. Buttons are "Kopiér" with a hidden "kommandoen" or "adressen", the visible word first
(WCAG 2.5.3). The audit's script budget counts files only, so the inline script costs a product nothing
against `--budget-js 0`.

**Not here yet:** an "Add to Claude" button (hub D-100 item 4 waits for a confirmed URL scheme), the
"Forbindelser og nøgler" list (the product's or, after tez, the account's), and the path form
`/mcp/o/<org>` (the product passes whichever URL it serves). The Claude Code steps were checked against
Claude Code's documentation, not run; the hub's plan asks for one clean-machine run before a product
ships them.

The demo shows the panel on the components page (`?tab=claude-ai|other|cli`, `?open=connect-ci`) and
on pages of its own in SiteSpring, `dist/demo/pages/connect.da.html` and `.en.html`, which
test/audit.test.ts audits at 1280 and 380, light and dark, with no findings.

## D-20 — Accents apart from each other and readable on the soft grey; 0.10.1 (2026-11-11)

Peter's brand and design review (hub `docs/brand/review-2026-11-11.md`, hub ticks ok6 and 857) found
two gaps in the colour tests. Accents were tested against the status and signal colours but never
against each other: AppSpring's plum and PulseSpring's magenta are 8.8 apart in light and 7.7 in dark.
Accents were also tested on the page and the card but not on the soft grey (`muted`), where
DataSpring's teal was 4.39:1.

1. **Every pair of distinct product accents is at least 10 apart** (OKLab x100), the bar status
   colours already meet. Spring and Forspring share one blue (hub D-101) and count as one accent. A
   pair waiting for a hub decision sits in the test's `PENDING` set and must still be too close, so the
   exception fails once the fix lands. Today only appspring/pulsespring is pending (hub queue
   brand-2).
2. **Every accent is at least 4.5:1 on every surface,** soft included, and every doll at least 3:1
   on every surface.
3. **DataSpring's light teal is `#0b7a7f`** (was `#0b7c82`), the smallest darkening that passes on
   soft (4.52:1). The two are 0.7 apart, under any visible difference. Hub D-90's table is amended to
   match.

## D-21 — AppSpring is violet; the pending pair is cleared; 0.10.2 (2026-11-11)

Hub D-116 (Peter, on the brand review's option page, queue brand-2). AppSpring's accent moves from plum
`#7b3f8c` / `#b57cc6` to violet **`#5d2eb8` / `#b09af5`**: 14.1 (light) and 11.9 (dark) from its nearest
accent, Spring's blue, against 8.8 and 7.7 from PulseSpring's magenta before. It is 7.27:1 on the soft
grey in light and 7.20:1 in dark, and at least 8.6 from every other accent under protanopia and
deuteranopia. The dolls, favicons and lockup are regenerated. The `PENDING` set in
test/contrast.test.ts (D-20) is now empty, so every pair of accents must be at least 10 apart with no
exception. BrainSpring keeps no token and wears Spring's doll (hub D-116 item 2).

## D-22 — A third type ladder for marketing pages, and the brand templates; 0.11.0 (2026-11-11)

Peter's brand review (hub `docs/brand/review-2026-11-11.md`, hub tick xl9) asked for a marketing type
scale, imagery rules and email, deck and social templates. Content's ladder tops out at a 40 px h1,
which is right for the account's pages and too small for a landing page's hero; the retired
forspring.ai site set its own sizes in CSS (a 48 to 116 px hero), outside any token.

`text.marketing` in `tokens/geometry.json`, beside `chrome` and `content`: eyebrow 13, lede 20, h3 24,
h2 30 to 36, h1 48 to 72. A fluid step is two tokens, `-min` for the phone and the plain name for wide
screens, as content's h1 already is, and a page writes `clamp(var(--text-marketing-h1-min), <vw>,
var(--text-marketing-h1))`. The hero stops at 72 rather than the old site's 116, so a two-line
headline (about 150 px at line-height 1.05), the lede and the call to action fit the first screen at
1280 × 720 under the bar. Running text on a marketing
page stays on content's body (15 px), so a page reads the same as the account. The ladder flows
through the existing build with no change to `src/emit.ts`: `--text-marketing-*` in tokens.css and
theme.css (`text-marketing-h1` in Tailwind) and `text.marketing` in tokens.js. Nothing is under 11 px.

The rules for using it, imagery, the doll in marketing and share images are `brand/marketing.md`; the
templates are `brand/templates/` (email, a 16:9 deck, 1200 × 630 and 1080 × 1080 social images), static
files on the token values, and test/templates.test.ts holds them to the tokens and to no third-party
requests. The design audit's scale still knows the chrome and content ladders only; teaching it the
marketing ladder (and the marketing h1's range) is its own change.

## D-23 — A native dialog, and the destructive-action confirm; 0.12.0 (2026-11-11)

Peter's brand review (hub `docs/brand/review-2026-11-11.md`, hub tick ah0): "No dialog; delete is one
click beside publish." In SiteSpring, "Delete site" sat next to "Publish changes" with only a notice
under it. `@forspring/ui/html` now has `dialog()`, `dialogTrigger()`, `dialogScript()` /
`DIALOG_SCRIPT`, `confirmDestructive()` and `regexEscape()`; `@forspring/ui/react` has `Dialog` and
`ConfirmDestructive`. `field()` takes `pattern`, `title`, `autocapitalize`, `autocorrect` and
`spellcheck`.

**A native `<dialog>`, opened with `showModal()`.** The browser does the hard parts: the rest of the
page is inert (no focus trap of our own to get wrong), focus goes to the `autofocus` element, Escape
closes, and the dialog sits in the top layer above the bar's menus. A `form method="dialog"` closes it
with no request. What the package adds is small: the close button is first in the footer and carries
`autofocus`, so the safe action has focus on open; the script returns focus to the trigger on close
(browsers do this too, but Safari not after a mouse click on a link, which never takes focus) and
resets the dialog's forms. A backdrop click does not close it: a destructive choice is left by a button
or Escape, never a stray click. No entry animation, so prefers-reduced-motion has nothing to stop. A
hand-built ARIA dialog would have needed all of this in script, and every product's copy of it.

**Progressive enhancement.** Opening a modal needs script, so the trigger is a link (`dialogTrigger({
dialog, href })`) to a server-rendered confirm page, and `DIALOG_SCRIPT` turns the click into
`showModal()` (it leaves a modified click, a new tab, to the link). The same helper draws that page
with `page: { keepHref }`: a section with the title as the page's h1, Keep a link back, the same POST
form. The script is a string the product places itself, as `CONNECT_SCRIPT` is (D-19); it listens on
the document, so dialogs React draws later open too.

**The typed name is checked by `pattern` and `required`, with no script.** The input's `pattern` is the
exact name, escaped for a regular expression, and the browser blocks the submit until the value
matches. Browsers compile `pattern` with the v flag, where an unneeded escape (`\-`) is a syntax error
and the browser then ignores the whole pattern, so `regexEscape()` escapes exactly the syntax
characters and `/`, and a test compiles the result as a browser does. Autocapitalize, autocorrect and
spellcheck are off, so a phone does not turn "banegaarden.dk" into "Banegaarden.dk". Until the name
matches, `.dialog-form:has(:invalid)` draws the destructive button in muted words on a hairline rather
than in danger; it stays a live button, so pressing it makes the browser say what is missing, and its
words keep their contrast (a faded button would fail the audit, which cannot know it is unavailable).
Disabling it outright would need script to enable it again.

**The server checks again.** A pattern is the browser's; a request can come from anywhere. The
product's handler compares the submitted name (field `confirm` by default) with the thing's name, and
the CSRF token, before it deletes anything. The helper's doc comment and the README say so.

**The confirm's words are the package's,** as the bar's are (D-17): "Behold" / "Keep", "Det fjerner A,
B og C." / "This removes A, B and C.", "Det kan ikke fortrydes." / "It can't be undone.", and the
field's label names what to type, "Skriv banegaarden.dk for at bekræfte" / "Type banegaarden.dk to
confirm", rather than the review's "Type the site name to confirm", because the helper serves more than
sites and the person should see the exact string. The title, the losses, `keepLabel` and
`confirmLabel` are the product's ("Behold hjemmesiden", "Slet hjemmesiden"). The dialog is an
`alertdialog` described by its body, so a screen reader reads what is lost with the title. Losses up to
four are a sentence; more are a list.

**Look.** `.dialog` is the card's surface at the panel radius with the popovers' shadow, 32rem wide,
`--space-7` of padding (`--space-5` on a phone), the backdrop the foreground (light) or the ground
(dark) at 45%. The footer is a wrapping row of ordinary buttons, so they share one box (D-14); the
destructive one is `button()`'s existing danger variant. The demo shows SiteSpring's case beside
"Udgiv ændringer", with `?open=delete-site` to open it for a screenshot or the audit, and the fallback
page as `dist/demo/pages/delete-site.<da|en>.html`; both pass the audit for SiteSpring and Forspring at
1280 and 380, light and dark, open and closed.

## D-24 — Agent approval, diff and "why it did that"; 0.13.0 (2026-11-11)

Peter's brand review (hub `docs/brand/review-2026-11-11.md`, hub tick sm9): "No agent-interaction
patterns: approvals, diffs and 'why did it do that' live in Spring's code, not the shared standard."
Until now a product asking a person to allow an agent's action had a card and two buttons.
`@forspring/ui/html` now has `approval()`, `diff()` and `explain()`; `@forspring/ui/react` has
`Approval`, `Diff` and `Explain`. No version bump in this change; the next release carries it.

**Why these three.** They are the three questions a person has when an agent acts for them: what does
it want to do (and may it), what exactly changes, and why did it decide this. `approval()` answers the
first and carries the decision; `diff()` the second, for a change to text or settings rather than a
list of items; `explain()` the third, folded away until asked, so it costs a line. Each works alone:
`explain()` also goes under something an agent already did, `diff()` in a review page.

**One request, the same words on a page and in Slack.** Spring already asks for approval in Slack
(Spring's `apps/harness/src/approval-message.ts`, cards built with `cards.ts`). The page reuses its
vocabulary so a person who saw the card in a channel and opens the page reads the same request:

| Spring's Slack card | `approval()` |
|---|---|
| Card title ("Connect a system", "SiteSpring: change something live") | the section's heading, `title`; the agent on the kicker line with "Waiting for approval" |
| Fact "Asked by: Maria via Spring" | dt "Asked by" / "Anmodet af", dd "Maria (Finance) via Spring" (`onBehalfOf`, `agent`) |
| Fact "Why" (and "Why:" on the skill card) | dt "Why" / "Hvorfor", with "Follows <the skill, linked>" |
| Fact "Expires" | dt "Expires" / "Udløber", a Date in Copenhagen's time, or words |
| Fact "What it does" and the closing sentence ("Approving sends exactly this at once …") | dt "What it does" / "Hvad det gør", the `effects`, a warning one marked |
| The diff, or the channel card's "only what changes" lines, "Nothing changes." | dt "What changes" / "Hvad ændres", the items with "+k more"; `diff()` for field and text changes; "Nothing changes." / "Intet ændres." |
| Buttons Approve (primary) and Reject | POST forms: approve (primary, "Approve" by default, the product's "Approve and send"), "Edit first" as a link, reject (ghost), and "See the draft" |
| Decision record "Approved by", "Rejected by", "Already decided" on the other copies | `outcome`: "Approved by Mette Kjær · 4 Nov 2026, 10:41", "Rejected by …", "Expired …", with a note |

The facts are a description list, one row per fact in the card's order, because the card's facts are
label and value pairs; that keeps the two in step when one gains a fact. The labels are the package's,
in Danish and English, as the bar's and the confirm's are (D-17, D-23); the title, summary, items,
effects and button labels are the product's. Reject is a ghost button, not danger: Slack's red marks
the choice that is not the primary one, but in this package danger means something is lost (D-23), and
rejecting loses nothing.

**Spring's Block Kit cards are unchanged.** This tick adds the web side only. Aligning the card's words
with the page where they differ (the card says "Approve" where a product page says "Approve and send",
has no "What changes" label, no "Edit first" and no draft link) is a Spring tick, not this one.

**A decision closes every copy.** Spring sends a request to several approvers, and once one decides it
redraws the others (`otherCopies()`, Spring's D-52), so nobody approves what someone else rejected. The
page does the same with `outcome`: it replaces the buttons and the expiry with a signal and the words
(approved a dot, rejected a hollow ring, expired a triangle; D-13's marks, each with its word), and
keeps the request's facts as the record of what was decided. The decision is the server's: the forms
post to the product, which checks the CSRF token, that the person may decide and that nobody decided
first, then draws `outcome`. The helper's doc comment says so.

**Diffs are the caller's.** `diff()` has no diffing algorithm: the server knows what changed (Spring's
`configChanges()` already compares the fields it cares about) and passes before and after pairs, or
lines with a kind. Field changes are a table of field, before and after (`table()`, so a wide one
scrolls on a phone); a missing value is "None" / "Ingen". Lines are `ins` and `del` with a visible +
or −, the hidden words "Added:" / "Removed:" for a screen reader, and a wash of the success or danger
colour behind them. That is the one place a status colour stands for something other than a status:
added and removed are the state of a line, and the sign and the words carry it, so the colour only
repeats them, as AGENTS.md asks of every status colour.

**"Why Spring did this" is closed by default.** A native `details`, no script, its summary a full
control's height, titled from `agent` ("Hvorfor Spring gjorde det"). The steps are an ordered list:
what it did, what it was based on ("Based on" is the skill card's "Based on" fact), linked when it can
be opened, and the time of day, since a trail is minutes long. The rule or skill it followed closes
it, in the same "Follows" words as the approval's why. `approval({ explain })` draws one inside the
request, between the facts and the buttons.

**Look.** The approval is a card (`--radius-card`, `--space-7` of padding, `--space-6` / `--space-5` on
a phone), its title the content h3 size in the display face, the labels in the mono meta size beside
their values on a wide screen and over them on a phone. The changes are a ruled list in tabular
figures; each effect has a mark (a dot, or a warning's triangle and a danger's diamond in the status
colour, beside bold words). The buttons are ordinary buttons in one wrapping row, so they share one
box (D-14), and on a phone they share the row's width with the draft link on its own line. The demo's
"Agentgodkendelse" section shows the brand review's payment-reminders case waiting, with its trail, one
already approved, and a channel's setup before and after.

## D-25 — A table at scale: search, filters, the stated order and paging; 0.14.0 (2026-11-11)

Peter's brand review (hub `docs/brand/review-2026-11-11.md`, hub tick tiu): "The table helper lists
every row. The pattern adds search, a filter, a sort order and paging." The review's mock-up is
PulseSpring's checks: "Search 248 checks", the chips "Needs attention 2" and "All 248", the columns
Check, State (a signal with its word), Uptime 30d and Response, and the footer "1-6 of 248, worst
first" with Previous and Next. `table()` now takes an optional `controls` part and `Column` an optional
`sort`; `@forspring/ui/html` has `pagination()` and `pageOf()`; `@forspring/ui/react` has `Table` and
`Pagination`. No version bump in this change; the next release carries it.

**Added, not changed (D-5).** `table()` is the API every product already calls. Without `controls` and
without a sorting column it draws the same bytes as before, and a test pins them. With `controls` it
wraps the frame in `.data-table` with the controls above and the footer below.

**A GET form and links, so the URL holds the state.** The search is a `form method="get"` with no
action (it goes to this page) and the filters, the sortable headers and Previous and Next are links.
So the page works with no script, a person can bookmark, share or reload a filtered, sorted page and
get the same rows, Back goes to the page before, and the server, which has the data, does the work.
A GET form replaces the whole query string, so `keep` writes the other parameters in force (the
filter, the sort) as hidden inputs; the page is left out on purpose, so a new search starts on page
1. The filter links are the caller's URLs, so a product decides whether a filter keeps the search.
Filters are links rather than a select or checkboxes because each one is a page you can link to, and
it takes no submit; the current one is `aria-current="true"`, drawn filled with the ink, a change of
fill rather than hue.

**No client-side sort.** A table at this scale is one page of many: sorting the rows in the browser
would sort six of 248 and look right while being wrong. Sorting is a query the server answers, so a
sortable header is a link to the page in that order. The header in force has `aria-sort` and an arrow
beside its word (↑ or ↓, hidden from a screen reader, which has `aria-sort`), so the order is never
told by colour. The order is also said in words in the footer, as the review's "worst first": the
caller's `sort.label`, or, without one, the sorted column ("sorteret efter Tilstand, faldende").
"Worst first" is an order no column header can say, which is why the words come first and the arrow
second.

**Paging is links too, and its arithmetic is shared.** `pagination()` draws "1–6 af 248" / "1–6 of
248" in a labelled nav, the numbers in the page's language (Danish 1.248, English 1,248), and Previous
and Next ("Forrige", "Næste") as links with `rel`. At an end the word stays where it was, a span with
`aria-disabled`, so the row does not shift and a screen reader hears there is no next page. The range
takes an en dash, the range sign in both languages, where the review's mock-up typed a hyphen.
`pageOf(total, page, size)` is the arithmetic the product's query and the links both use: page 0 or
less is the first, a page past the end the last (an old link still shows rows), a broken number the
first, and no rows one empty page ("0 af 0"). It returns the clamped page, so a product can redirect
`?side=999` if it wants a canonical URL. Numbered page links are left out: at 42 pages they are noise,
and a person looking for one check searches.

**The words are the package's,** as the bar's, the confirm's and the approval's are (D-17, D-23,
D-24): "Søg" / "Search", "af" / "of", "Forrige" / "Previous", "Næste" / "Next", "sorteret efter" /
"sorted by", "stigende" / "ascending", "faldende" / "descending", and the landmarks' names "Filtre for
<table>" and "Sider i <table>", so two lists on one page are told apart. The placeholder, the filter
labels and the stated order are the product's. The search's label is the placeholder unless the
caller gives another, and is visually hidden when it says the same.

**Look.** The search and the chips share one row and take the small control box (D-14), as the bar's
controls do, so the field, its button and the chips line up; on a phone they grow to the touch floor
and the search takes its own row. A chip is a pill in the small box with its count in mono, the
current one filled. The footer is the range and the order in the mono meta size, Previous and Next as
small ghost buttons. `empty` draws a `state()` in place of the table when no row matches, as Canonify's
DESIGN-SURFACE asks: say there is nothing matching, and which. The demo's "Tabel med mange rækker"
section is the review's checks in Danish: 248 in all, the first six worst first, with a down, a late
and four up, and passes the audit for PulseSpring and SiteSpring.

## D-26 — Toast, tooltip and an icon set; 0.15.0 (2026-11-11)

Peter's brand review (hub `docs/brand/review-2026-11-11.md`, hub tick vt2): "A chrome kit, not a
library: about 18 helpers, no dialog, toast, tooltip, pagination or icon set." D-23 and D-25 did the
dialog and the paging; this does the other three. `@forspring/ui/html` has `toast()`, `toastRegion()`,
`toastScript()` / `TOAST_SCRIPT`, `tooltip()`, `icon()` with `ICON_NAMES` and the `IconName` union;
`button()` takes an optional `icon` and `field()` an optional `help`, both added, nothing renamed (D-5);
`@forspring/ui/react` has `Toast`, `ToastRegion`, `Tooltip` and `Icon`. No version bump in this change;
the next release carries it.

**A toast is the flash after a POST and its 303.** It floats at the bottom of the window (the end
corner on a wide screen, between the gutters on a phone), the card's surface with the tone as its edge
rule and its icon's colour. The tone is never colour alone: each has its own shape (a tick for
success, a triangle for a warning, an octagon for danger, an i for a fact) and a visually hidden word
read before the text ("Udført:", "Advarsel:", "Fejl:", "Bemærk:"). A danger toast is `role="alert"`;
the others are `role="status"` with `aria-live="polite"`. A page that has just loaded announces no
live region, so the README says to draw the toast at the start of `main`, where a screen reader meets
it first. The tones are those of `tag()` (success, warning, danger) plus info, not `notice()`'s
"error": a toast reports something the last request did, while a notice is part of the page and stays
while it is true (a form's errors, a trial running out). A form's errors are never a toast, so the two
do not overlap.

**Dismiss is a link, not a details or popover trick.** `dismissHref` is the page without the flash
parameter (or the same URL for a one-time cookie flash), so Dismiss works with no script, and after it
a reload, Back or a copied URL no longer shows the message, which only dropping the parameter does.
The alternatives were weighed: a `details` whose summary is "Luk" is announced as an expanded
disclosure, not a close button, and its content cannot follow its summary; a `popover` cannot start
open without script; a `<dialog open>` closed by `form method="dialog"` works with no script and no
request, but makes every toast a dialog to a screen reader. The cost of the link is a request when
there is no script, which is the cost every other no-script control here pays (D-23's confirm page,
D-25's paging). So `dismissHref` is required, an addition to the brief's signature. `toastScript()`
follows `dialogScript()`'s pattern: a nonce, one document listener, a modified click left to the
link. It removes the toast in place and writes `dismissHref` into the address bar with
`history.replaceState`.

**Auto-hide is narrow.** Only `toastScript()` hides anything, and only a success or info toast with
no action (`data-toast-autohide`, which `toast()` writes for exactly those), after 8 seconds, waiting
while the pointer or focus is on it. A warning or danger toast never hides itself: the script checks
the class and the alert role itself, so a hand-written attribute cannot make it, and a test runs the
script to prove it. A toast with an action stays because an "Undo" that vanishes before a person
reaches it is a time limit (WCAG 2.2.1). Under `prefers-reduced-motion` the script hides nothing and
only makes Dismiss instant. There is no entry animation, as the dialog has none.

**A tooltip is a button and a native popover.** `popover="auto"` with `popovertarget` and
`popovertargetaction="show"` opens it on a press or a tap and closes it on a press elsewhere or
Escape, with no script; "show" rather than "toggle" so a press after a hover has opened it does not
close it again. The trigger is `aria-describedby` the text, which is markup in the DOM throughout
(closed it is `display: none`, which a description still reads), not a `title`, which touch screens
never show. Hover is progressive through `interestfor`, not CSS: content shown by CSS `:hover` or
`:focus-visible` cannot be hidden with Escape, which WCAG 1.4.13 asks of content on hover or focus,
while an interest invoker is the browser's own and hides on Escape. Baseline, as of this change:
`popover`, `popovertarget` and `popovertargetaction` are widely available (newly in April 2024);
CSS anchor positioning, with a popover's invoker as its implicit anchor, is newly available (January
2026, Firefox 147), so the tooltip opens above its button with `position-area: top` and flips below
when there is no room, behind `@supports`, and an older browser shows it where it centres a popover;
`interestfor` is Chromium only (142) and not Baseline, so elsewhere a tooltip opens by press alone.
The rule is in the doc comment and the README: **a tooltip never holds the only copy of something a
person needs to act.** What a field needs is its hint, which is always shown; the tooltip is for the
curious. `field()`'s `help` draws it beside the label and outside it, because a button inside a label
is invalid and would join the field's name.

**The icons are Lucide's, vendored, not drawn here.** 32 icons, the names the suite's screens use
(check, x, alert-triangle, alert-octagon, info, help-circle, the four chevrons, arrow-up and down,
search, filter, plus, minus, edit, trash, external-link, copy, download, upload, settings, user,
users, log-out, eye, eye-off, clock, calendar, mail, more-horizontal); alert-octagon and help-circle
are beyond the brief's list, for the danger toast's shape and the tooltip's trigger. Drawing our own
would mean thirty drawings to keep consistent and review; Lucide is already one stroke weight on a 24
grid with round caps, which is the look asked for, and DataSpring's React screens already use it, so
the server pages and the boards now draw the same pencil. The paths are copied from lucide-react
1.46.0 with the React keys dropped and some renamed to the suite's words (Lucide's triangle-alert,
octagon-alert, circle-question-mark, funnel, pencil and ellipsis). **Licence:** Lucide is ISC
(Copyright 2026 Lucide Icons and Contributors), and its icons derived from Feather, most of these, are
MIT (Copyright 2013-present Cole Bemis). Lucide's LICENSE, both notices, sits beside the code in
`src/icons/LICENSE`, the build copies it to `dist/icons/LICENSE`, and `src/icons/lucide.ts` carries the
same text as a `/*! @license` comment, which bundlers keep, so a product that bundles `html.js` keeps
the notice too. Nothing loads from a CDN: the paths are in the markup (account D-17).

**`icon(name, { label? })`** writes an `<svg class="icon">` with the stroke attributes set once,
`currentColor`, `viewBox="0 0 24 24"`; without a label it is `aria-hidden` and the words beside it
carry the meaning, with one it is `role="img"` with that `aria-label`. An unknown name throws rather
than drawing nothing. `.icon` is 1em square, set a little below the baseline as a capital sits, so
its size comes from the type ladder of the text it is in; no new size. In a button the icon goes
before the label, and a `button` holding one is a flex row with the link button's gap. `fromHtml`
now reads attribute names with a capital (an svg's `viewBox`) and maps the stroke attributes to
React's names, so `Icon` draws the same bytes.

**Look and the rules.** The toast's buttons are the small ghost box (D-14), 44px on a phone; Dismiss
shows only its x, with "Luk" / "Dismiss" hidden and the toast's text as its description. The
tooltip's trigger is the small control box, square, the icon at the h3 size, 44px on a phone; the
bubble is the popover role with the chrome body size. Every spacing is a `--space-*` token and every
colour a role. The demo's "Toast, værktøjstip og ikoner" section shows one toast per tone in place,
the CVR field's tooltip, buttons with icons and every icon with its name, and passes the audit for
Forspring and DataSpring.

## D-27 — Motion, shadow, breakpoint and line-height tokens, and the chart rules; 0.16.0 (2026-11-11)

Peter's brand review (hub `docs/brand/review-2026-11-11.md`, hub tick sbb): "Thin token coverage: no
motion, shadow, breakpoint or line-height tokens. Charts get 8 colours and no rules." components.css
wrote `0.15s` and `1.4s`, two shadows built by hand, some forty unitless line-heights and the 560 and
800 px media queries as literals, so a product copying the look had to copy the numbers. No version
bump in this change; the next release carries it.

**Motion** (`tokens/motion.json`, DTCG `duration` and `cubicBezier`): `motion.duration.fast` 150 ms
(what every transition used), `base` 250 ms (something moving across a product's screen), `slow` 600
ms (marketing, inside brand/README.md section 10's 0.4 to 1.2 s band), and `pulse` 1400 ms, the
skeleton's loop. pulse was not in the brief's three: the skeleton's 1.4 s is a loop's period, not a
transition's length, and folding it into slow would have changed the skeleton or broken the band.
`motion.ease.standard` is CSS's own `ease` (0.25, 0.1, 0.25, 1), so the transitions look exactly as
before; `motion.ease.out` (0.22, 1, 0.36, 1) is for things arriving and for marketing's ease-out. The
skeleton keeps the `ease-in-out` keyword, a symmetric pulse no token needs to name. Out as
`--motion-duration-*` and `--motion-ease-*` in tokens.css, `--ease-*` and Tailwind's default
transition duration and curve in theme.css, and `motion` (seconds, control points) in tokens.js.
Under reduced motion every duration is 0: tokens.css sets each `--motion-duration-*` to 0s in a
`prefers-reduced-motion` block, so a product's own animation on the tokens stops too, and
components.css keeps its `transition: none; animation: none` block for anything not on them.

**Shadow** (`tokens/shadow.json`, DTCG `shadow`): `shadow.raised` 0 1 2 px for the switch's thumb and
`shadow.overlay` 0 4 16 px for the bar's menus, popovers, the dialog, toasts and tooltips, its offset
and blur aliases of `space.1` and `space.4` (the reader now follows aliases inside a composite). Each
has a light and a dark value because `--_shadow` differs by theme: ink at 25% in light, the dark
ground at 25% in dark. The shadow file states those colours as components with `alpha: 0.25`
(DTCG cannot alias a colour and change its alpha), and test/tokens.test.ts holds them to the
`foreground` and `background` roles. `light-dark()` takes colours only, so the build pairs the colour
and keeps the geometry outside (`0px 4px 16px 0px light-dark(...)`), and refuses a shadow whose light
and dark geometry differ. The computed value is the same `rgba(20, 21, 26, 0.25)` as the old
`color-mix()`. `--_shadow` stays for the table's scroll shadows and the dialog's backdrop, which are
gradients and a tint, not elevation. Cards keep no shadow (brand/README.md section 6).

**Breakpoints** (`breakpoint` in geometry.json, DTCG `dimension`): phone 560 (D-5's, the audit's
`PHONE_WIDTH`), tablet 800 (where an app's sidebar folds, already in components.css) and wide 1280
(full width, the width the audit and reviews use). A custom property cannot be read in a media query,
so they go to tokens.js (`breakpoint`) and theme.css (`--breakpoint-*`, Tailwind's `phone:` and
`max-phone:`), not tokens.css; components.css keeps `@media (max-width: 560px)` and `800px` as
literals, and test/components.test.ts fails on a media query width that is not a breakpoint, and on
`PHONE_WIDTH` differing from `breakpoint.phone`.

**Line-height** (`leading` in geometry.json, DTCG `number`): a parallel group, `leading.<ladder>.
<step>` beside `text.<ladder>.<step>`, because the emitter reads every `text` step as a px dimension;
the build fails when a step lacks a leading or a leading lacks a step. Chrome: label 1.3, meta 1.4,
title 1.3, body 1.3, figure 1.1. Content: small 1.4, body 1.55, lede 1.4, h3 1.3, h2 1.15, h1 1.05.
Marketing: the deck template's values, eyebrow and lede 1.5, h3 1.2, h2 and h1 1.05. `leading.solid`
(1) is for one line in a box of its own. Out as `--leading-*` in tokens.css and theme.css (Tailwind's
`leading-*`), as the `--text-*--line-height` companion so `text-content-body` sets both, and as
`leading` in tokens.js. Every font shorthand and line-height in components.css now names its step's
leading. Where a rule had used another value at that step, it takes the step's: chrome meta at 1.2
(the person's address, the switcher, a bar item's meta), 1.3 (table heads, a user's role) and 1.5
(the footer) are 1.4; chrome body at 1.2 (signals, the table search's label, the phone's menu fold)
and the tooltip's 1.45 are 1.3; the approval title's 1.25 is h3's 1.3. Each is a pixel or two on one
line; the audit passes. The 1s (the wordmark and its sub-line, initials, count badges, the "or" rule, the tooltip's
icon) are `leading.solid`. The connect panel's code at 1.85 was a 24px line to sit level with the
copy button, so it is now `calc(var(--control-height-small) - 2 * var(--space-1))`, geometry rather
than a leading. test/components.test.ts fails on a bare duration, a box-shadow that is not a token,
none or an edge rule, and a line-height that is not a leading, a control's line box or a calc.

What stays literal, and why: control line boxes (`--_control-line*`, D-14), which are what a control's
height leaves, not type; the textarea's `var(--space-5)` line, a reading line on the grid; the 2 to 3
px inset edge rules (`box-shadow: inset 2px 0 0 var(--primary)`), which are borders drawn without
moving the box (D-14's kept px), not elevation; the media query widths, held by the test; the
skeleton's `ease-in-out`; and brand/templates/, static files whose line-heights already equal the
marketing leading.

**Charts** get their rules in `brand/charts.md`, linked from brand/README.md section 4: which chart for
which question (a line for change over time, bars for comparison, a stat tile for one number, a table
for exact values; no pie past three parts, never 3D), the slots in fixed order with a ninth as Other in
`muted-foreground`, the accent only for a single-series chart, status and signal colours never a
series, direct labels over legends, bars from zero, unit and source on every chart, the dark slots on
dark surfaces, and a text summary or table beside every chart with series told apart by more than
colour. The 3:1 rule is test/chart.test.ts's, unchanged.

## D-28 — A web manifest per product, in the brand files; 0.17.0 (2026-11-11)

Hub tick 5nx. The package generates every product's favicons and app icons (hub D-101 item 6, D-18)
but no web manifest, so AppSpring's shell wrote its own, naming the icons and colours by hand. The
build now writes `site.webmanifest` into `dist/brand/<product>/` and `brand/<product>/` beside the
icons it names, from `PRODUCT_NAMES` and the tokens, so a product drops its own copy. No version bump
in this change; the next release carries it.

- **`name` and `short_name`** are the product's name ("AppSpring"); every name is short enough for a
  home screen, so the two are the same.
- **`icons`**: `icon-512.png` (512x512, purpose `any`) and `apple-touch-icon-180.png` (180x180). The
  paths are relative to the manifest, which a browser resolves against the manifest's own URL, so the
  folder works under `/assets/ui/<version>/brand/<product>/` or wherever a product serves it.
- **`background_color`** is paper (light), the ground the app icons are rendered on.
- **`display` is `browser`**, not `standalone`. The consoles are pages opened in a tab, signed in
  through the account and moving between products by link; an installed shortcut in a standalone
  window would lose the address bar and the back button. Nothing in the repo asks for an app window,
  and Chromium offers no install prompt for a `browser` manifest, which is what a console wants.
- **No `theme_color`.** Browsers paint their own chrome with it. The family's chrome is paper, never
  the accent alone (brand/README.md), and a manifest has one value with no dark variant, so any colour
  set here would be wrong in one of the two themes. No test or browser behaviour here needs it.

`faviconFor()` names the manifest too (`manifest`), and `faviconLinks()`, so `shell()`, writes
`<link rel="manifest" href=".../site.webmanifest">` after the icons; a `favicon` a product names itself
gets the link only when it gives `manifest`. Products serve the file as `application/manifest+json`,
and a strict CSP needs `manifest-src 'self'` beside `img-src 'self'` (README).

## D-29 — The audit knows the marketing ladder, when the run asks; 0.17.0 (2026-11-11)

Hub tick pg3. D-22 added `text.marketing` (eyebrow 13, lede 20, h3 24, h2 30 to 36, h1 48 to 72) and
left the audit for later: its `font-size` rule knew the chrome and content ladders only, so a marketing
page built on the tokens failed on its lede, its h3 and its hero. Consoles must keep the strict check,
where a 48 px heading is a mistake, not a hero. No version bump in this change; the next release
carries it.

**The opt-in is a flag, `--marketing`** (`marketing: true` in `AuditOptions`), and only a flag. A page
attribute such as `data-ui-scale="marketing"` was the other choice; it was left out because it would
let any page loosen its own audit, a console included, with nothing in the CI configuration to show
it. The audit is the standard made executable (D-8): what a run accepts is stated where the run is,
beside `--allow-spacing` and `--allow-status`. A product with both kinds of page runs the audit twice,
once over its marketing URLs with the flag and once over the rest without.

**With the flag**, the marketing steps join the scale, and each fluid step is a range: a step with a
`-min` token (D-22's shape) accepts any measured px from the `-min` value to the plain one, because a
page clamps between them on the viewport's width and the audit measures the computed size. The ranges
apply to any element, not only h1 and h2, because marketing markup puts the hero size on whatever
element carries the headline; content's own h1 range stays on h1 only, as before. A size between the
ranges (42 px, say) still fails. **Without it** nothing changes: the same scale, the same note.

test/fixtures/marketing.html uses every marketing step, the fluid ones at 5vw and 2.6vw so the measured
size sits between the tokens at 1280; test/audit.test.ts holds that it passes with `--marketing` at
both widths and themes and fails without it, naming each off-scale size.

## D-30 — The helpers do what docs/usage.md says: an error summary, required words, the ref; 0.18.0 (2026-11-11)

Hub tick qs6. Writing docs/usage.md (hub tick tdg) found the helpers short of the guidance in five
places: `button()` takes `disabled` and the demo drew a disabled "Ikke nu" (against D-23); there was no
error summary and `notice()` cannot take an id, tabindex or autofocus, so usage.md told products to wrap
it by hand; nothing showed hub D-88's `ref`; `field({ required })` wrote no word, and the demo labelled
an optional field with the placeholder "Valgfri"; and `notice()` had two stacked doc comments. Nothing
is renamed or removed (D-5); no version bump in this change, the next release carries it.

- **`errorSummary({ lang, errors, title?, id? })`**, and `ErrorSummary` in React: the error notice
  (`.notice.error`, plus `.error-summary`) with `role="alert"`, `tabindex="-1"`, `autofocus` and an id
  (`error-summary` by default), an h2 ("Ret disse felter" / "Fix these fields") at the notice title's
  size, and a list of links to `#<field id>`, one per error. Nothing for an empty list, so a product can
  always call it. The words are the package's, in a catalog beside the field's. It takes focus on a page
  load (`autofocus`) and, in React, on mount (`autoFocus`, which `fromHtml()` now passes as a boolean);
  React writes it as `autofocus=""`, so the helper does too and the two stay byte for byte the same.
  The demo drops only the autofocus, since the summary sits mid-gallery and would scroll every visit.
- **`field()` writes the word.** `required: true` now adds "(påkrævet)" / "(required)" inside the label,
  as `.field-mark` (regular weight, `--muted-foreground`), so it is in the accessible name; new
  `optional: true` adds "(valgfri)" / "(optional)". **This changes visible output for every field
  passed `required: true`**, a deliberate fix (usage.md: required is said in words) for the release
  notes; no test pinned the old label. A form marks whichever is rarer, so new `requiredWord: false`
  keeps the attribute (the browser's check, the screen reader's "required") without the word, for a
  form that marks its optional fields or says once that all are required. `confirmDestructive()` uses
  it: its label already says what to type, so its output is unchanged. New `lang` picks the words,
  Danish by default like `switchButton()`'s, so a caller that passes none keeps compiling. The words are
  "påkrævet", as the brief asked, rather than usage.md's earlier "skal udfyldes": one word reads as a
  quiet mark beside a label, where a clause reads as part of it.
- **The `ref` (hub D-88)** is `ref` on `notice()`, `state()` (failed only), `refusedPage()` and
  `accountUnavailablePage()`, and `errorRef({ lang, ref })` alone: "Fejlkode: 4bf92f35" / "Reference:
  4bf92f35", the ref in `<code>` with `user-select: all` so one click selects it for a copy, and under it
  "Nævn den, hvis du skriver til os." / "Quote it if you contact us." Escaped like everything else. A
  plain refusal needs none (its reason is the stable code); the account not answering is upstream, so
  the demo's account_unavailable pages carry one. `state()` was not in the brief; usage.md section 5 asks
  for the ref there too, and its text is a `<p>`, where `errorRef()` could not go.
- **`disabled` stays** on `button()` (D-5), with a doc comment saying not to use it and why; the demo's
  "Ikke nu" is replaced by the pattern usage.md describes: no button, and the reason in words.
- **`notice()`** has one doc comment and a named options type, `NoticeOptions`.

usage.md now names `errorSummary()` and `errorRef()` (test/usage.test.ts requires it) and no longer
tells products to wrap a notice, write the ref or mark required fields by hand. The demo's form shows the
summary over two field errors with the required fields marked; the tooltip's form shows the other
convention, an optional field marked and a required one with `requiredWord: false`.


## D-31 — CI: a ui-ci Workers Build on every push, and the browser checks before the push (2026-11-11)

Every product pins this package, and until now nothing ran its tests but the person releasing it.
GitHub Actions cannot run for the `forspringai` org, so CI follows the suite's recipe (hub
`docs/suite-infrastructure.md`, "CI on Cloudflare"), shaped like `forspringai/account`'s (account
D-41) with PulseSpring's branch trigger so a PR gets the check.

- **`ui-ci`**, a Workers Build with two triggers, `ui-ci main` and `ui-ci branches` (every other
  branch), every path except `.tick/*`. Build command `bash infra/ci-worker/build.sh`: install,
  typecheck, `pnpm test:ci` with two workers (`CI_TEST_WORKERS` overrides), ending in a `VERDICT`
  line. Deploy command: the inert stub in `infra/ci-worker/`. `NODE_VERSION=24`.
- **The builder has no browser**, so `test/audit.test.ts` (Chromium: the design audit over the demo
  for every product) is not in `test:ci`. It is `pnpm test:browser`, run by `.githooks/pre-push`
  when a push touches what it checks, and part of the full `pnpm test` before a release. The visual
  tests (hub tick 860) join it there.
- `pnpm ci:log` (copied from the account) reads a build's whole log.
- Made 2026-11-11 through the Workers Builds API with `forspring`/`prd_deploy` (no dashboard): stub
  Worker `ui-ci` (script tag `588774dad9c2433fba8912f14cd74a2b`), repo connection
  `04f5c066-a838-4afc-938b-8745122faf3b`, triggers `ui-ci main` `e432ae85-764d-4542-8be5-c3b72ea5c704`
  and `ui-ci branches` `62e7d0f8-c259-4fbf-a829-1e3f9f70b4a3`, the suite's build token, `NODE_VERSION=24`.
  First build on main: 46601624, green, 704 tests, 74 s.

Not chosen: a self-hosted runner with a browser on the shared dev host (it would compete with the
agents' work), and Cloudflare Browser Rendering (it would change how the audit drives Chromium for
one CI job).

## D-32 — Visual regression tests over the demo, against PNG baselines made on the dev host (2026-11-11)

Hub tick 860, from Peter's brand review: the audit (D-8) checks every value against the tokens, not
whether a layout broke. A padding that moves a button by 4 px is on the grid, in a token and
passes; so does a wrapper that collapses. `test/visual.test.ts` catches those.

- **What it shoots.** Every top-level section of the built demo (found by its heading and named in
  the test, so a new section without a name fails), the bar, the open explain fold (`?open=explain`,
  the approval card) and the open dialog (`?open=delete-site`, the window over its backdrop): 18
  shots at 1280 and 380 px, light and dark, for Forspring (the ink mark) and SiteSpring (a coloured
  accent). 144 baselines, `test/visual/<shot>-<product>-<width>-<theme>.png`, 6.3 MB. Element
  screenshots, not the whole page, so a change shows up in the sections it touches and the failure
  names them. One product with an accent is enough: the products differ only in the accent, which
  the audit and the contrast tests check for all six.
- **How.** The demo is served and Chromium launched as in `test/audit.test.ts` (no host but
  127.0.0.1 resolves). Device scale factor 1, emulated `prefers-color-scheme` and reduced motion,
  Playwright's `animations: "disabled"` and `caret: "hide"`, and `document.fonts.ready` before the
  first shot. Plain `playwright`: `@playwright/test`'s `toHaveScreenshot` is not installed, and
  neither are `pngjs` or `pixelmatch`, so the test carries a small PNG reader and writer on
  `node:zlib` (no new dependency).
- **The threshold.** A pixel differs when any channel moves by more than 16 of 255; a shot fails when
  more than 0.1% of its pixels differ, or its size changes. On the baselines' own Chromium the
  render is deterministic (a second run passed every shot), so both numbers are margins for
  antialiasing jitter, not a budget for change. They are low enough that a 4 px padding change on
  `.tag` failed the buttons (2.2 to 2.7%), lists (0.2 to 0.45%) and tables (2%) shots, and nothing
  else. A one-glyph text change can fall under 0.1% in a large section; the test is for layout,
  and the words are reviewed in the diff of the helpers and the demo.
- **On failure** the actual shot and a diff (the baseline faded, differing pixels red) are written to
  `test/visual/__diff__/` (gitignored), and the message names each shot, its share and both files.
- **Baselines are made on the dev host (ralph)**, Linux x64, with the pinned Playwright's Chromium
  (1.64.0, Chromium 156.0.8078.4, in `test/visual/meta.json`). Another OS or Chromium renders text
  differently, so the test skips there and says why, rather than failing on pixels nobody changed.
  A Playwright upgrade therefore means new baselines, on the dev host, in the same commit.
- **New baselines are a deliberate step**: `pnpm test:visual:update` (`UPDATE_VISUAL=1`) rewrites
  them, removes the ones for shots that no longer exist and rewrites `meta.json`; every changed PNG
  is looked at in the diff before the commit.
- **Where it runs.** In `pnpm test:browser` with the audit, so in `.githooks/pre-push` and the full
  `pnpm test`, and not in `test:ci` (ui-ci's builder has no browser, D-31). About 45 s. The hook's
  paths now include `fonts/` (a font change moves every glyph, and the audit checks the families
  too) and the browser tests themselves (`test/audit.test.ts`, `test/visual*`), so a push that only
  changes a baseline is checked.

Not chosen: whole-page screenshots (one failure for any change, and a long page's tail shifts with
every section above it); `@playwright/test` for `toHaveScreenshot` (a second test runner for one
assertion); all six products (the accents are covered elsewhere, and the baselines would triple).

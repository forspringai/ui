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
the dark buttons' dark text keeps its contrast), the target-row tint and status tints. The mark
takes the product's accent, as the account's mark takes its blue. The Google button keeps Google's
own colours and lives in `css/google-button.css`, outside the no-literal test.

Type sizes, radii and the main spacing are tokens. A handful of the account's small optical
values sit off the 4px scale and stay as px for parity (all on a 2px grid): heading and paragraph
margins 10 and 14, the list row padding 14/18, the tag padding 2/9, the field gap 6, the bar
padding 10, the switch track 38 by 22. The design audit (a later tick of epic 8f4) should treat
them as the reference, or they move to the scale in a decision of their own. Where the account
used a size off the ladders, the nearest step replaced it: field labels and legends 13.5 to 14,
the wordmark 22 to 21 (18 on a phone, was 20), a card's h1 28-34 to 30.

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

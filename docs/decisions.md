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

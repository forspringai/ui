# @forspring/ui

The Forspring suite's shared UI package (hub decision D-90, hub `docs/ui-standard.md`,
suite-standards §12, in `forspringai/forspring`). One family look for every product's chrome:
forspring.ai's paper and ink, Archivo, Archivo Condensed and Space Mono, fixed geometry, and one
accent per product. Products pin a version by git tag and upgrade on purpose.

Decisions for this repo: `docs/decisions.md` (D-n). The hub's log holds the suite-level ones.

## What is here

```
tokens/            the one source: W3C DTCG 2025.10 JSON
  palette.json     raw values, light and dark (private to the package)
  accent.json      the product accents, light and dark (D-90; spring added by hub D-101)
  status.json      success, warning, danger
  chart.json       chart-1..8, categorical
  role.light.json  semantic roles, light theme (aliases into the files above)
  role.dark.json   the same roles, dark theme
  geometry.json    radii, the 4px space scale, control heights (D-14), the two type ladders, font families
fonts/             Archivo, Archivo Condensed, Space Mono (and Roboto Medium for Google's button),
                   woff2, Latin subset, with their OFL licences (account D-17)
css/
  components.css   the component layer, on the roles only (D-5)
  google-button.css  Google's button, with Google's colours (optional)
src/dtcg.ts        reads and validates DTCG: groups, inherited $type, aliases, 2025.10 value shapes
src/emit.ts        writes the token outputs
src/assets.ts      writes fonts.css, the component CSS and the demo page
src/html.ts        typed, escaping HTML helpers for server-rendered pages (D-6), the bar (D-17), the
                   doll and the favicon links (D-18)
src/brand.ts       the brand SVGs from the tokens and brand/wordmarks.json (D-18, hub D-101)
src/refusals.ts    the refusal vocabulary, Danish and English, no markup (D-17)
src/pages.ts       the standard pages: choose an org, no org, refused, account unavailable (D-17)
src/react.ts       React wrappers drawing the helpers' own markup (D-17)
src/color.ts       WCAG contrast and OKLab distance (normal and colour-blind vision)
src/audit/         the design audit, ui-audit (D-8 to D-10): cli.ts (bin), args.ts (flags, refusals,
                   the cookie redactor), audit.ts (rules, Playwright runs), page.ts
                   (measurements inside Chromium)
demo/index.ts      the demo page and the standard pages, drawn with src/html.ts and src/pages.ts
demo/account-home.html  parity fixture: the account's home markup on this package's CSS
scripts/build.ts   pnpm build: tokens/, css/, src/html.ts -> dist/; brand files to dist/brand/ and brand/
scripts/brand-png.ts  renders the brand PNGs from the SVGs in Chromium (Playwright)
scripts/wordmarks.py  outlines the product names into brand/wordmarks.json (run by hand, D-18)
brand/             README.md (the rules), wordmarks.json, <product>/ the generated brand files
scripts/demo.ts    pnpm demo: serves the repo at http://127.0.0.1:4319/dist/demo/
dist/              committed build output (D-2)
  tokens.css       roles as custom properties (light-dark()), [data-theme], [data-product]
  theme.css        Tailwind v4 @theme over the same roles, and a dark: variant
  tokens.js/.d.ts  typed values for code, charts and MCP Apps
  fonts.css        @font-face rules pointing at ../fonts/
  components.css, google-button.css
  html, refusals, pages, react (.js/.d.ts)  the helpers, compiled, so a product needs no TypeScript loader
  audit/           src/audit/ compiled; dist/audit/cli.js is the ui-audit bin
  brand/<product>/ mark, favicon and logo SVGs and their PNGs, what products serve (D-18)
  demo/index.html  every component, every product, light and dark; demo/pages/ the standard pages
test/              vitest: contrast, chart palette, DTCG validity, dist snapshot, component CSS
                   rules, HTML escaping, the bar and the brand files (brand.test.ts), the audit
                   (demo passes, test/fixtures/broken.html fails)
```

## Commands

```
pnpm install --frozen-lockfile
pnpm build        # tokens/ -> dist/
pnpm typecheck
pnpm test         # fails if dist/ is stale: run pnpm build and commit dist/ with the sources
pnpm demo         # the demo page, for a look or an agent-browser screenshot and axe run
pnpm audit <url>  # the design audit (dist/audit/cli.js); see README "Run the audit in CI"
```

Node 22.18 or later (the build runs TypeScript directly). The build's brand PNGs and the audit tests need Chromium:
`pnpm exec playwright install chromium` once per machine.

## Using it in a product

```
"@forspring/ui": "github:forspringai/ui#v0.8.0"
```

- Server-rendered pages: `tokens.css`, `fonts.css`, `components.css` in that order (plus
  `google-button.css` on a sign-in page), markup from `@forspring/ui/html`. A product that inlines
  its CSS serves the package's `fonts/` itself and uses `fontFaces("/its/path/")` (README).
- Plain CSS: link or inline `@forspring/ui/tokens.css`, set `data-product="<key>"` on `<html>`
  (unset means Forspring), and write `var(--primary)`, `var(--radius-button)` and so on.
- Tailwind v4 / shadcn: `@import "tailwindcss"; @import "@forspring/ui/theme.css";` then
  `bg-background`, `text-muted-foreground`, `rounded-card`, `text-content-body`, `dark:`.
- Code: `import { themeFor, chart, radius } from "@forspring/ui"`.
- Dark mode follows the system; `data-theme="light"` or `"dark"` on any element wins.

## Rules

- **The tokens are the only source.** Change `tokens/*.json`, run `pnpm build`, commit both.
  Never edit `dist/` by hand.
- **Roles, not raw values.** Products use `--background`, `--primary`, `--chart-3`. The raw palette
  (`palette.*`) never leaves the package; no output names `--paper` or `--blue`.
- **Geometry is fixed.** Radii 3/6/8/10, spacing on 4px, the two type ladders, nothing under 11px.
  Products choose values, never geometry (Canonify's seam). A new size is a token here first.
- **Every margin, padding, gap and inset in components.css is a `--space-*` token, 0 or auto**
  (D-14; test/components.test.ts greps for px). The kept exceptions are not spacing: 1px borders
  and hairlines, 2 to 3px outlines and edge rules, the marks' own sizes (6, 10, 11px, the
  checkbox's 18px) and the optical nudges done with `transform`. Don't add a px spacing; if a
  design needs a step the scale lacks, it is a token and a decision first.
- **Controls share one box per size** (D-14): inputs, selects and buttons take `min-height` from
  `--control-height` / `--control-height-small` / `--control-touch`, and their line-height is what
  the height leaves after padding and borders (`--_control-line`), so a row shares a baseline. A
  new control takes the same tokens; never size one with its own padding.
- **Only the accent varies per product.** A new accent needs a hub decision and must pass the
  contrast test in both themes (at least 4.5:1 on the page, and its label on it).
- **One mark, colour in the mark only** (D-18, hub D-101). The doll's colour is `--mark`: the accent
  in a product, ink on Forspring's own pages. The wordmark is always ink, Archivo Condensed 900. The
  brand files are generated: change the tokens or `scripts/wordmarks.py`, never the files. A new
  product is an accent in `tokens/accent.json`, its key in `Product` and `PRODUCT_NAMES`, its name in
  `scripts/wordmarks.py`, then `pnpm build`.
- **Status colours mean status.** success, warning and danger are never a chart series or a brand
  colour, and always come with a word or icon. Chart slots encode identity only, in fixed order.
- **No third-party requests.** Nothing in this package, or in a page built from it, loads fonts,
  scripts or styles from a CDN or any outside origin (account D-17).
- **Components use roles only.** No hex, rgb() or named colour in `css/components.css` (a test
  greps for them), type sizes from the two ladders, radii from the tokens. A shade the roles lack
  is a `color-mix()` of roles (`--_link`, `--_hover`, `--_tint`). Google's button is the one
  exception and lives in its own file.
- **The account's class names are the API** (D-5). Renaming one breaks every product's markup;
  add, don't rename, and record a removal as a decision.
- **The helpers escape everything.** Strings are text; only `Html` from a helper or `raw()` passes
  through. Never call `raw()` on anything a person or another system wrote.
- **After a component change**, run `pnpm demo` and look at it with agent-browser at 1280 and
  380 px, light and dark, and run `agent-browser a11y` on it: zero violations.
- **No text under 11px; touch targets at least 24px, primary controls 44px under 560px; focus
  visible with --ring; motion off under prefers-reduced-motion.**
- Run the contrast and chart tests after any colour change; don't lower a test threshold to make
  a colour pass.
- **The audit is the standard made executable.** After a component or token change, `pnpm demo`
  and `pnpm audit http://127.0.0.1:4319/dist/demo/` must exit 0 with no `--allow-spacing`, for
  every product (`?product=<key>` with `--product <key>`; test/audit.test.ts runs all six). Don't loosen a rule, add an allowlist value or demote a
  severity to make a page pass; fix the page, or record the change as a decision (D-8).
- **A session given to the audit stays a secret** (D-10): `--cookie-env` reads it from the
  environment only, sends it to the audited origins only, and everything the CLI prints passes the
  redactor. A new output path must go through it too, and a test must show the value absent.
- **The audit never fetches off-origin.** It answers every off-origin request itself and resolves
  only the audited hosts, apart from origins the run names with `--allow-origin` (D-16); tests must stay offline the same way. Redirect hops bypass the route
  (D-12): they are recorded, never trusted to be answered. Something on the dev host probes
  new localhost ports, so a test server never counts its requests.
- **page.ts runs inside Chromium.** `collect()` is sent as source text: it must not call anything
  outside its own body, and it measures only; verdicts and token values live in audit.ts.
- Copy and comments: plain words, no em dashes. Comments explain why.
- **A release bumps `package.json`'s version and `VERSION` in src/html.ts (a test checks they agree;
  the default favicon path carries it), and the tag is `v<that version>`.** Products serve
  the files under the version (account D-20) and cache them for a year, so a new tag with the old
  version would leave browsers on the old CSS.
- Commit messages: `tick <id>: <summary>`, a body explaining why.

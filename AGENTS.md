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
  geometry.json    radii, the 4px space scale, control heights (D-14), breakpoints (D-27), the three type
                   ladders (D-4, D-22) and their leading (D-27), font families
  motion.json      durations and easings (D-27); 0 under reduced motion
  shadow.json      the two elevations, raised and overlay, light and dark (D-27)
fonts/             Archivo, Archivo Condensed, Space Mono (and Roboto Medium for Google's button),
                   woff2, Latin subset, with their OFL licences (account D-17)
css/
  components.css   the component layer, on the roles only (D-5)
  shadcn.css       a shadcn app's geometry on its data-slot attributes, above Tailwind's utilities (D-33)
  google-button.css  Google's button, with Google's colours (optional)
src/dtcg.ts        reads and validates DTCG: groups, inherited $type, aliases, 2025.10 value shapes
src/emit.ts        writes the token outputs
src/assets.ts      writes fonts.css, the component CSS and the demo page
src/html.ts        typed, escaping HTML helpers for server-rendered pages (D-6), the bar (D-17), the
                   doll and the favicon links (D-18), the dialog and the destructive confirm (D-23),
                   agent approval, diff and explain (D-24), the table at scale and pagination (D-25),
                   toast, tooltip and icon() (D-26)
src/icons/         lucide.ts, the vendored Lucide subset icon() draws, and Lucide's LICENSE (ISC, Feather's MIT)
src/brand.ts       the brand SVGs from the tokens and brand/wordmarks.json (D-18, hub D-101)
src/refusals.ts    the refusal vocabulary, Danish and English, no markup (D-17)
src/pages.ts       the standard pages: choose an org, no org, refused, account unavailable (D-17)
src/connect.ts     "Connect an agent": tabs per client, folded keys, the copy script (D-19, hub D-102)
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
brand/             README.md (the rules), voice.md, marketing.md (D-22), charts.md (D-27), wordmarks.json, <product>/ the
                   generated brand files, templates/ email, deck and social templates on the token values
scripts/demo.ts    pnpm demo: serves the repo at http://127.0.0.1:4319/dist/demo/
dist/              committed build output (D-2)
  tokens.css       roles as custom properties (light-dark()), [data-theme], [data-product]
  theme.css        Tailwind v4 @theme over the same roles, and a dark: variant
  tokens.js/.d.ts  typed values for code, charts and MCP Apps
  fonts.css        @font-face rules pointing at ../fonts/
  components.css, shadcn.css, google-button.css
  html, refusals, pages, connect, react (.js/.d.ts)  the helpers, compiled, so a product needs no TypeScript loader
  icons/           lucide.js/.d.ts, imported by html.js, and the icons' LICENSE
  audit/           src/audit/ compiled; dist/audit/cli.js is the ui-audit bin
  brand/<product>/ mark, favicon and logo SVGs, their PNGs and site.webmanifest, what products serve (D-18, D-28)
  demo/index.html  every component, every product, light and dark; demo/pages/ the standard pages
test/              vitest: contrast, chart palette, DTCG validity, dist snapshot, component CSS
                   rules, HTML escaping, the bar and the brand files (brand.test.ts), the audit
                   (demo passes, test/fixtures/broken.html fails; shadcn.html passes --rich-app,
                   shadcn-drift.html fails it), the brand templates (templates.test.ts),
                   visual regression over the demo (visual.test.ts, baselines in test/visual/, D-32)
```

## Commands

```
pnpm install --frozen-lockfile
pnpm build        # tokens/ -> dist/
pnpm typecheck
pnpm test         # fails if dist/ is stale: run pnpm build and commit dist/ with the sources
pnpm test:ci      # what ui-ci runs: all but the browser tests
pnpm test:browser # the browser tests: the design audit and the visual tests over the demo (pre-push runs them)
pnpm test:visual:update  # rewrites test/visual/ baselines on purpose (D-32); look at every PNG it changes
pnpm ci:log --watch  # ui-ci's verdict for HEAD
pnpm demo         # the demo page, for a look or an agent-browser screenshot and axe run
pnpm audit <url>  # the design audit (dist/audit/cli.js); see README "Run the audit in CI"
```

Node 22.18 or later (the build runs TypeScript directly). The build's brand PNGs and the audit tests need Chromium:
`pnpm exec playwright install chromium` once per machine.

## CI (ui D-31)

GitHub Actions cannot run for the `forspringai` org, so CI is a Cloudflare Workers Build, on the
suite's model (hub `docs/suite-infrastructure.md`, "CI on Cloudflare"). Two halves:

- **After the push: `ui-ci`**, a Workers Build on every push to `main` and to every other branch (so
  a PR shows the check `Workers Builds: ui-ci`), every path except `.tick/*`. Its build command is
  `bash infra/ci-worker/build.sh`: install, typecheck, and `pnpm test:ci` (the whole vitest suite
  except `test/audit.test.ts` and `test/visual.test.ts`, which need a browser; `test/build.test.ts` fails if `dist/` is
  stale). The log ends in a `──── VERDICT …` line. Its deploy command ships an inert stub Worker
  (`infra/ci-worker/`, no routes). Nothing requires the check (branch protection is a paid GitHub
  feature for private repos), so look before merging: `gh pr checks <n>`, or
  `pnpm ci:log --watch` (under `forspring`/`prd_deploy`; exits 0 green, 1 red, 3 no build, 4 running;
  `--retrigger` starts a build if the push webhook was dropped).
- **Before the push: `.githooks/pre-push`**, installed by `pnpm install`. It runs `pnpm typecheck`,
  and, when the pushed commits touch tokens, CSS, helpers, the demo, brand files or `dist/`,
  `pnpm test:browser` (the design audit over the demo for every product, the audit's browser
  tests, and the visual regression tests, D-32). The builder has no browser, so this is the only place they run before a merge.
  `SKIP_GATE=1 git push` skips it, consciously. Before a release, run the full `pnpm test` as well.

The trigger, the stub and the repo connection were made through the Workers Builds API with the
`prd_deploy` token, no dashboard (hub recipe; ids in docs/decisions.md D-31).

## Using it in a product

```
"@forspring/ui": "github:forspringai/ui#v0.18.0"
```

- Server-rendered pages: `tokens.css`, `fonts.css`, `components.css` in that order (plus
  `google-button.css` on a sign-in page), markup from `@forspring/ui/html`. A product that inlines
  its CSS serves the package's `fonts/` itself and uses `fontFaces("/its/path/")` (README).
- Plain CSS: link or inline `@forspring/ui/tokens.css`, set `data-product="<key>"` on `<html>`
  (unset means Forspring), and write `var(--primary)`, `var(--radius-button)` and so on.
- Tailwind v4 / shadcn: `@import "tailwindcss"; @import "@forspring/ui/theme.css";` then
  `bg-background`, `text-muted-foreground`, `rounded-card`, `text-content-body`, `dark:`. A shadcn
  app adds `@import "@forspring/ui/shadcn.css";` and leaves its copied components' radii, heights and
  text sizes alone; `ui-audit --rich-app` checks them (D-33).
- Code: `import { themeFor, chart, radius } from "@forspring/ui"`.
- Dark mode follows the system; `data-theme="light"` or `"dark"` on any element wins.

## Rules

- **The tokens are the only source.** Change `tokens/*.json`, run `pnpm build`, commit both.
  Never edit `dist/` by hand.
- **Roles, not raw values.** Products use `--background`, `--primary`, `--chart-3`. The raw palette
  (`palette.*`) never leaves the package; no output names `--paper` or `--blue`.
- **Geometry is fixed.** Radii 3/6/8/10, spacing on 4px, the type ladders (chrome, content, marketing), nothing under 11px.
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
- **Motion, elevation and leading are tokens too** (D-27): every transition and animation takes a
  `--motion-duration-*`, every box-shadow is `--shadow-raised`, `--shadow-overlay`, none or a 2 to 3px
  inset edge rule, and every line-height a `--leading-*` or a control's line box (`--_control-line*`).
  Media queries are px literals (a custom property cannot be read there) at a `breakpoint` value;
  test/components.test.ts checks all four.
- **Components use roles only.** No hex, rgb() or named colour in `css/components.css` or
  `css/shadcn.css` (a test greps both), type sizes from the chrome and content ladders, radii from the tokens. A shade the roles lack
  is a `color-mix()` of roles (`--_link`, `--_hover`, `--_tint`). Google's button is the one
  exception and lives in its own file.
- **The account's class names are the API** (D-5). Renaming one breaks every product's markup;
  add, don't rename, and record a removal as a decision.
- **The helpers escape everything.** Strings are text; only `Html` from a helper or `raw()` passes
  through. Never call `raw()` on anything a person or another system wrote.
- **The visual baselines change only on purpose** (D-32). When `test/visual.test.ts` fails, open
  the `.diff.png` it names in `test/visual/__diff__/`. A regression is fixed in the CSS; a meant
  change is `pnpm test:visual:update` on the dev host, and every changed PNG is looked at before the
  commit. Never raise the threshold to make a shot pass.
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
- **shadcn.css and the audit's `RICH_SLOTS` agree** (D-33): a slot given a radius, min-height or
  font-size in one is in the other with the same token; test/components.test.ts checks both ways.
- **page.ts runs inside Chromium.** `collect()` is sent as source text: it must not call anything
  outside its own body, and it measures only; verdicts and token values live in audit.ts.
- **Connecting an agent is interactive first** (D-19, hub D-102). The connect panel's default tabs
  never show a key, a key placeholder, `--header` or `?org=`; keys live only in the folded
  "Automatisering og CI" section. Its words are the hub's `docs/agent-connect-plan.md` section 2;
  change them there first. The copy buttons stay progressive enhancement: the panel works with no script.
- Copy and comments: plain words, no em dashes. Comments explain why.
- **A release bumps `package.json`'s version and `VERSION` in src/html.ts (a test checks they agree;
  the default favicon path carries it), and the tag is `v<that version>`.** Products serve
  the files under the version (account D-20) and cache them for a year, so a new tag with the old
  version would leave browsers on the old CSS.
- Commit messages: `tick <id>: <summary>`, a body explaining why.

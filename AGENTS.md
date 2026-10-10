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
  accent.json      the five product accents, light and dark (D-90)
  status.json      success, warning, danger
  chart.json       chart-1..8, categorical
  role.light.json  semantic roles, light theme (aliases into the files above)
  role.dark.json   the same roles, dark theme
  geometry.json    radii, the 4px space scale, the two type ladders, font families
src/dtcg.ts        reads and validates DTCG: groups, inherited $type, aliases, 2025.10 value shapes
src/emit.ts        writes the outputs
src/color.ts       WCAG contrast and OKLab distance (normal and colour-blind vision)
scripts/build.ts   pnpm build: tokens/ -> dist/
dist/              committed build output (D-2)
  tokens.css       roles as custom properties (light-dark()), [data-theme], [data-product]
  theme.css        Tailwind v4 @theme over the same roles, and a dark: variant
  tokens.js/.d.ts  typed values for code, charts and MCP Apps
test/              vitest: contrast, chart palette, DTCG validity, dist snapshot
```

Coming in later ticks of epic 8f4: self-hosted font files, the server-rendered component layer
with a demo page, and the design audit CLI.

## Commands

```
pnpm install --frozen-lockfile
pnpm build        # tokens/ -> dist/
pnpm typecheck
pnpm test         # fails if dist/ is stale: run pnpm build and commit dist/ with the tokens
```

Node 22.18 or later (the build runs TypeScript directly).

## Using it in a product

```
"@forspring/ui": "github:forspringai/ui#v0.1.0"
```

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
- **Only the accent varies per product.** A new accent needs a hub decision and must pass the
  contrast test in both themes (at least 4.5:1 on the page, and its label on it).
- **Status colours mean status.** success, warning and danger are never a chart series or a brand
  colour, and always come with a word or icon. Chart slots encode identity only, in fixed order.
- **No third-party requests.** Nothing in this package, or in a page built from it, loads fonts,
  scripts or styles from a CDN or any outside origin (account D-17).
- Run the contrast and chart tests after any colour change; don't lower a test threshold to make
  a colour pass.
- Copy and comments: plain words, no em dashes. Comments explain why.
- Commit messages: `tick <id>: <summary>`, a body explaining why.

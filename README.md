# @forspring/ui

The Forspring suite's design tokens: forspring.ai's family look with one accent per product,
built from W3C DTCG 2025.10 JSON into CSS custom properties, a Tailwind v4 theme and TypeScript.

```
pnpm add github:forspringai/ui#v0.1.0
```

```css
@import "@forspring/ui/tokens.css";   /* plain CSS: var(--background), var(--primary) */
/* or, with Tailwind v4: */
@import "tailwindcss";
@import "@forspring/ui/theme.css";    /* bg-background, text-primary, rounded-card */
```

```html
<html data-product="sitespring">       <!-- the product's accent; unset is Forspring -->
<div data-theme="dark">               <!-- optional: overrides the system theme -->
```

```ts
import { themeFor, chart } from "@forspring/ui";
themeFor("dataspring", "dark").primary; // "#2ba7ad"
```

Products: `forspring`, `sitespring`, `dataspring`, `appspring`, `pulsespring`.
See [AGENTS.md](AGENTS.md) for the rules and [docs/decisions.md](docs/decisions.md) for why.

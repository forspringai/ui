# @forspring/ui

The Forspring suite's UI package: forspring.ai's family look with one accent per product. Design
tokens built from W3C DTCG 2025.10 JSON into CSS custom properties, a Tailwind v4 theme and
TypeScript; self-hosted fonts; and a small server-rendered component layer with typed HTML helpers.

## Install

By git tag; each product pins a version and upgrades on purpose (D-2):

```
pnpm add github:forspringai/ui#v0.2.0
```

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

Products: `forspring`, `sitespring`, `dataspring`, `appspring`, `pulsespring`.
See [AGENTS.md](AGENTS.md) for the rules and [docs/decisions.md](docs/decisions.md) for why.

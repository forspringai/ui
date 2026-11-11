# Forspring brand guideline

## 1. What this is

The one brand guideline for Forspring and its products: the mark, the wordmark, colour, type, layout,
voice, components, accessibility and marketing pages. Other guideline files point here; they do not
repeat values. If another document disagrees with this one, this one and the tokens win, and the other
document is fixed.

- **Values live in the tokens** (`tokens/*.json`). This file names them and cites the file; it never
  sets a value of its own. Change a value in the tokens, run `pnpm build`, commit both.
- **Texts live in the hub**: what Forspring and each product is, the one-liners and the words table are in
  [docs/brand/vision.md](https://github.com/forspringai/forspring/blob/main/docs/brand/vision.md)
  (forspringai/forspring). Copy them word for word; don't write your own version.
- **Decisions live in the logs**: the hub's
  [docs/decisions.md](https://github.com/forspringai/forspring/blob/main/docs/decisions.md) for the
  suite, this repo's [docs/decisions.md](../docs/decisions.md) for the package. Section 11 lists the ones
  behind this file.

**Brand architecture.** Each product is its own brand, as Word is Word whoever's office account you
sign in with; Forspring is the account and the company behind them (hub D-98). One mark for all of them,
the doll, in each product's colour, with the wordmark always in ink (hub D-101).

## 2. The mark: the doll

- **One mark, the doll** (head and coil). Only its colour changes. Never redraw, stretch, outline,
  rotate or add to it, and never swap in generic AI imagery (circuits, robots, sparkles).
- **A product's doll is its accent** from `tokens/accent.json`, light and dark (section 4).
- **Forspring's doll is ink**, `#14151A`, and paper `#EDEDEA` on dark grounds (`role.mark` in
  `tokens/role.light.json` and `tokens/role.dark.json`): the colourless parent, while the products are in
  colour.
- **Spring's doll is the blue**, its Slack avatar. **BrainSpring uses Spring's blue doll**; it is part of
  Spring and has no colour or token of its own (hub D-116, amending D-101 item 3).
- **Clear space is a quarter of the doll's height** on every side; nothing else enters it.
  `logo.svg` and `logo-1200x300.png` carry it as their margin.
- **The smallest doll is 16 px tall** on a screen.
- **The favicon is the full doll, scaled down** and cropped to itself so it fills the square. There is no
  separate small-size drawing (hub D-116).
- **The doll is generated, never edited by hand.** The files come from the tokens (below); a new colour
  is a token change.

### The files, in `brand/<product>/`

`<product>` is `forspring`, `spring`, `sitespring`, `dataspring`, `appspring` or `pulsespring`. Products
serve the same files from `dist/brand/` (see the package README, "Marks, wordmarks and favicons").

| File | What | Use |
|---|---|---|
| `mark.svg` | The doll on its own, with room around it; the dark variant inside a `prefers-color-scheme` rule | Small spaces, app icons, documents |
| `favicon.svg` | The doll cropped to itself, light and dark | The tab icon (`shell()` links it) |
| `favicon-32.png`, `favicon-16.png` | The doll, transparent | Browsers without SVG icons |
| `apple-touch-icon-180.png` | The doll on paper `#FCFCFA` | iOS home screen |
| `icon-512.png` | The doll, 512 × 512, on paper | Stripe icon, social avatars, app stores |
| `logo.svg` | Doll plus wordmark, the wordmark as outlined paths (renders without the font), light and dark, with its clear space | Headers, email, documents |
| `logo-1200x300.png` | The lockup, light, 1200 × 300, transparent, centred | Stripe logo, places that take only a PNG |

The PNGs are the light variant. On a dark ground use the SVG, which switches by itself.

## 3. The wordmark and the lockup

- **The wordmark is always ink** (the foreground colour), never the accent, never split by colour or
  weight (hub D-101 item 4).
- **Archivo Condensed 900**, written Forspring, Spring, SiteSpring, DataSpring, AppSpring, PulseSpring
  (and BrainSpring in text). One word with a capital S in the middle; never lowercase, never another
  face. Lower case belongs only in repo names, domains and CLI commands (hub D-86).
- **The lockup is the doll plus the wordmark** everywhere: console bars, marketing sites, the account,
  email and documents (hub D-101 item 5). The doll comes first, the name's cap height centred on it,
  12 px apart at a 56 px doll box (8 px at the bar's 28 px).
- **In a product's console bar:** its own doll and its own name, no Forspring mark or word (hub D-98).
- **On the account:** the ink doll, "Forspring", then the small label "konto".
- `wordmarks.json` holds each name outlined from `fonts/archivo-condensed.woff2` at weight 900 with its
  kerning and the bar's -0.01em tracking. A new product's name goes into `scripts/wordmarks.py`; run it
  (`uv run --with fonttools --with brotli --with uharfbuzz scripts/wordmarks.py`), then `pnpm build`.

## 4. Colour

### The family palette

One palette for every product, from forspring.ai (`tokens/palette.json`). Products use the roles, never
the raw names (`--background`, not `--paper`).

| Palette | Role | Light | Dark | Use |
|---|---|---|---|---|
| paper | `background` | `#FCFCFA` | `#111215` | The page ground |
| soft | `muted` | `#F1F1EC` | `#1A1B1F` | A quiet surface: table heads, hover rows, alternating sections |
| card | `card` | `#FFFFFF` | `#17181C` | Cards, fields, popovers |
| ink | `foreground` | `#14151A` | `#EDEDEA` | Headings, strong text, the wordmark, Forspring's doll |
| body | `body-foreground` | `#3C3E46` | `#C8C9CE` | Running text |
| muted | `muted-foreground` | `#5B5E68` | `#9D9FA8` | Secondary text |
| faint | (no role yet) | `#6A6D76` | `#8B8E97` | Tertiary text, still 4.5:1 on paper |
| line | `border` | `#E4E5E1` | `#2A2C32` | Hairlines between things |
| line-strong | `input` | `#C6C8C2` | `#42454D` | Field borders, ghost buttons, tags |

### Product accents

One accent per product, the only value that varies between products (`tokens/accent.json`, hub D-90).

| Product | Light | Dark |
|---|---|---|
| Forspring and the account (buttons, links, focus; the doll is ink) | `#2244FF` | `#6B83FF` |
| Spring (and BrainSpring) | `#2244FF` | `#6B83FF` |
| SiteSpring, terracotta | `#B8442A` | `#E0714F` |
| DataSpring, deep teal | `#0B7A7F` | `#2BA7AD` |
| AppSpring, violet | `#5D2EB8` | `#B09AF5` |
| PulseSpring, magenta | `#A3237A` | `#E06DBA` |

DataSpring's light teal was `#0B7C82` until 0.10.1 (ui D-20). AppSpring's accent was plum (`#7B3F8C`)
until 2026-11-11 (hub D-116, ui D-21, amending hub D-90 and D-101), because plum sat 8.8 from
PulseSpring's magenta.

- **One accent per product, one blue for the suite.** Spring shares Forspring's blue; the older
  forspring.ai blue is retired.
- **In the lockup, colour lives in the mark only.** In the chrome the accent is the primary action,
  links and the focus ring (`primary` and `ring`); everything else is the family palette.
- **The accent is for one thing per view:** the action or the key word. Never decoration.
- **Every pair of accents is at least 10 apart** (OKLab x100), and **every accent is at least 4.5:1 on
  every surface** (background, card and muted, both themes); every doll at least 3:1 (ui D-20,
  `test/contrast.test.ts`). Never lower a test threshold to make a colour pass.
- **Text on a filled accent** is `primary-foreground`: white on the light accents, the dark ground on
  the dark ones, where white is under 4.5:1.
- **A new accent needs a hub decision** and must pass the tests in both themes.

### Status and signal

| | Light | Dark | Meaning |
|---|---|---|---|
| `success` | `#26700F` | `#62D162` | An outcome went well |
| `warning` | `#7A5200` | `#F2C14E` | Something needs care |
| `danger` (`destructive`) | `#9B1020` | `#FF3D5A` | An error or a destructive action |
| `signal-ok`, a dot | `#1E9E48` | `#3DD06A` | A monitored thing is up |
| `signal-warn`, a triangle | `#B87503` | `#F5B830` | Late or degraded |
| `signal-down`, a diamond | `#EE0A32` | `#FF2D3F` | Down, needs action now |
| `signal-off`, a hollow ring | `#7D808A` | `#7C7F88` | Paused, new or not judged |

Values from `tokens/status.json` and `tokens/signal.json` (ui D-3, D-13; hub D-95).

- **Never colour alone.** Status is text or an icon with a word; a signal is a shaped mark beside a word.
- **Never a brand colour.** Status and signal colours are never an accent, a chart series or decoration,
  and each sits at least 10 apart from every accent.
- **Signals are for monitored state** (up, late, down, not judged); status colours are for errors,
  destructive actions and outcomes. Never show monitored state in `danger` or the accent.

### Charts

Eight categorical slots, `chart-1` to `chart-8`, in `tokens/chart.json` (ui D-3): identity only,
assigned in a fixed order and never cycled; a ninth series folds into Other. Status meaning wears the
status tokens, never a chart slot. When to use which chart, series order and Other, labels and axes,
units and sources, and the accessible summary beside every chart are in [charts.md](charts.md) (hub
tick sbb, ui D-27).

## 5. Type

- **Three families, self-hosted** from `fonts/` (woff2, Latin subset, OFL; `tokens/geometry.json`
  `font`): Archivo for text, Archivo Condensed for display, Space Mono for labels, meta and code. Never
  from a font CDN or any third party.
- **Archivo Condensed is for display only:** headings at 700 to 900 and the wordmark at 900. Never
  running text.
- **Space Mono is for small labels** (tags, meta lines, table heads). Never paragraphs.
- **Three ladders** (`tokens/geometry.json` `text`, ui D-4 and D-22): chrome and content below, and
  marketing for landing pages. Hierarchy comes from weight on these steps, not from colour.

| Chrome (dense UI) | px | Content (pages) | px |
|---|---|---|---|
| label: table heads, tags, group labels | 11 | small | 13 |
| meta: meta lines, chips, counts, footer | 12 | body: running text | 15 |
| title: block titles, small buttons, hints | 13 | lede | 16 |
| body: table cells, list rows | 14 | h3 | 18 |
| figure: metric values | 30 | h2 | 21 |
| | | h1 (phone to wide) | 30 to 40 |

- **Nothing under 11 px.** A new size is a token and a decision first.
- **Every step has its line-height** (`leading.<ladder>.<step>`, `--leading-content-body`, ui D-27):
  running text at 1.55, chrome at 1.3 to 1.4, headings tightening to 1.05 as they grow, and `leading.solid`
  (1) for one line in a box of its own (the wordmark, a count, an icon). In Tailwind, `text-content-body`
  sets both.
- **Marketing** (landing pages, share images, decks; ui D-22): eyebrow 13, lede 20, h3 24, h2 30 to 36,
  h1 48 to 72. Running text stays on content's body. When to use which step is in
  [marketing.md](marketing.md).

## 6. Layout and geometry

Fixed across the suite (`tokens/geometry.json`, hub ui-standard §2). Products choose values, never
geometry.

- **Radii:** button 3 px, card 6 px, input 8 px, panel 10 px.
- **Spacing:** a 4 px base on an 8 px grid: 4, 8, 12, 16, 20, 24, 28, 32, 40, 44, 48, 64 px
  (`space.1` to `space.16`). Every margin, padding and gap is a step of the scale (ui D-14).
- **Control heights:** 44 px for inputs, selects and buttons (`control.height`), 32 px for small ones and
  every control in the bar (`control.height-small`), and 44 px as the floor for primary controls under
  560 px (`control.touch`). A row of controls shares one height and one baseline.
- **Cards** are the card surface with a 1 px `border`; no drop shadows.
- **Elevation is for what floats** (`tokens/shadow.json`, ui D-27): `shadow.overlay` (0 4 16 px) for
  menus, popovers, the dialog, toasts and tooltips, `shadow.raised` (0 1 2 px) for a switch's thumb.
  Ink at 25% in light, the ground at 25% in dark. Never on a card or a section.
- **Breakpoints** (`breakpoint`, ui D-27): phone 560 px (the phone floors, one column), tablet 800 px (a
  sidebar folds), wide 1280 px (full width). Each is the widest the smaller layout goes:
  `@media (max-width: 560px)` is "on a phone"; in Tailwind, `max-phone:`.
- **Motion** (`tokens/motion.json`, ui D-27): `motion.duration.fast` 0.15 s for a control's state,
  `base` 0.25 s for something moving in a product, `slow` 0.6 s for marketing, `pulse` 1.4 s for a
  loading loop; `motion.ease.standard` (CSS's ease) and `motion.ease.out` for things arriving. Every
  duration is 0 under reduced motion.

For marketing pages, kept from the retired forspring.ai site (its `site/DESIGN.md`):

- **Alternate section backgrounds** between background and muted; never two muted sections in a row.
- **At most one dark surface on a light page**, so it stands out.
- **Content width about 1200 px**, long reading (FAQ, articles) at most about 860 px; grids collapse to
  one column on narrow screens.

## 7. Voice and tone

From the [founders' letter](https://github.com/forspringai/forspring/blob/main/docs/founders-letter.md).
Where this section and the letter disagree, the letter wins.

- **Warm and direct.** We write as people who built their own businesses and like helping others grow
  theirs.
- **First person plural** ("we"), to "you": in Danish, "I/jer" for the customer company in marketing and sales, "du" for the person on product screens, never "De" (hub D-118).
- **Plain words, short sentences.** Explain a technical word in the body or leave it out of the headline.
- **Results, not licences.** We deliver a result and get paid for it; we don't sell a licence the
  customer is left to make work.
- **The castle, not the Lego blocks.** The products are building blocks our people put together; the
  customer buys what we build.
- **For small and mid-sized companies** (hub D-115), not necessarily Danish ones.
- **No hype.** No "revolutionary", no superlatives, no promises we can't show.
- **No invented proof:** no made-up clients, numbers, logos, quotes or scarcity. Every figure has a
  source (publisher, year, a live link), and every claim matches a decision.
- **In product chrome:** no em dashes (use a full stop, comma, colon or parentheses; an en dash in a range
  is fine), no exclamation marks, no emoji.
- **Customer-facing copy is Danish** (hub D-7), with English available on customer screens; one language
  per page. Internal docs and operator screens may be English.
- **Words:** use the words table in hub
  [docs/brand/vision.md](https://github.com/forspringai/forspring/blob/main/docs/brand/vision.md#words)
  for what to say and what to avoid (product names, retired names, "AI colleague" for Spring only).

The full voice and messaging guide, with the message, copy rules, before-and-after examples and Danish, is
[voice.md](voice.md).

## 8. Components and patterns

What exists, in this package:

- **Server-rendered helpers** in `@forspring/ui/html`: `shell()` (the bar with org, product and user
  menus, the menu and favicons), `button`, `field`, `notice`, `signal`, `crumbs`, `tag`, `card`, `list`,
  `table`, `switchButton`, `state` (empty states), `googleButton`, and `dialog` with the
  destructive-action confirm `confirmDestructive` (ui D-23: says what is lost, asks for the name, the
  safe action first and in focus), and the agent-interaction patterns `approval`, `diff` and `explain`
  (ui D-24: what an agent wants to do, for whom, why and what changes, approve or reject, the outcome on
  every copy, and "why did it do that", in the words of Spring's Slack cards), and the table at scale,
  `table` with `controls`, `pagination` and `pageOf` (ui D-25: a search, filter chips with counts, the
  order stated in words, Previous and Next, all links and a GET form so the URL holds the state), and
  `toast`, `tooltip` and `icon` (ui D-26: the flash after a POST, dismissed by a link with no script and
  never hidden by itself when it reports a danger; a short explanation in a native popover, never the
  only copy of what a person needs; 32 of Lucide's icons, ISC, inline in currentColor); the
  standard pages in `@forspring/ui/pages`; the refusal words in `@forspring/ui/refusals`; the
  "Connect an agent" panel in `@forspring/ui/connect`; React wrappers in `@forspring/ui/react` that
  draw the same markup.
- **The CSS layer** `css/components.css`, on the roles only.
- **The demo page:** `pnpm demo`, then http://127.0.0.1:4319/dist/demo/ shows every component, every
  product (`?product=<key>`), light and dark, and the standard pages under `dist/demo/pages/`.
- The package README shows how to use each one; [docs/usage.md](../docs/usage.md) says when to use
  which, and how forms, errors and empty, loading and failed states behave (hub tick tdg).

Everything the brand review (hub `docs/brand/review-2026-11-11.md`) listed as missing now exists.

## 9. Accessibility

From this repo's AGENTS.md rules and hub ui-standard §3. The audit (`ui-audit`) checks them in CI.

- **WCAG 2.2 AA on every surface,** both themes. Text at least 4.5:1, marks and other non-text graphics
  at least 3:1.
- **Targets:** at least 24 px; primary controls 44 px under 560 px.
- **Focus is always visible,** drawn with `--ring`. A skip link on every page.
- **Motion off under `prefers-reduced-motion`:** tokens.css sets every `--motion-duration-*` to 0s there.
- **Every chart has a text summary or a table beside it,** and never tells series apart by colour alone
  ([charts.md](charts.md)).
- **Status is never colour alone:** a word or an icon with it.
- **Nothing a person needs lives only in a tooltip,** and nothing that reports a failure hides itself
  (ui D-26).
- **No text under 11 px.**
- **Links inside running text are underlined,** not told apart by colour alone.
- **Headings in order:** one h1 per page.
- **Nothing clipped** without a keyboard-reachable scroll.
- **axe finds zero violations** on every changed page (`agent-browser a11y` after a component change);
  `pnpm audit` exits 0 for every product.

## 10. Marketing pages

Marketing sites are built on SiteSpring on the same tokens (hub ui-standard §1), use the token colours
for every product (hub D-101 item 7), and follow everything above. Kept from the retired forspring.ai
site, as rules:

- **Lighthouse 100 in all four categories** is a hard requirement; every visual idea fits inside it.
- **Show the message, don't decorate.** An animation tells part of the story or goes.
- **Performance:** prerendered static HTML with inlined CSS; no client framework; small plain script
  modules. Fonts self-hosted, subset, `font-display: swap`, with metric-matched fallbacks (no layout
  shift). Images as SVG where possible, otherwise WebP at the display size.
- **Nothing third-party on page load:** no font CDNs, no third-party analytics, no tracking cookies. A
  third-party widget (a captcha, say) loads only when a person starts using the form that needs it.
- **Share images and canonical URLs:** every page has its own 1200 × 630 share image; canonical and
  `og:url` use the clean path (no `.html`, no `/index`), matching the sitemap; each meta description is
  unique and 160 characters or fewer.
- **Motion:** start an animation only when its section is near the viewport and stop it off screen;
  resize a canvas on resize only, never per frame; under reduced motion draw one static end frame;
  durations 0.4 to 1.2 s, ease-out. A canvas is `aria-hidden` and its message is in the page as text. No
  3D or WebGL libraries.
- **One call to action per page,** said the same way everywhere it appears.
- **Every comparison and statistic is verifiable,** with its sources kept and rechecked before an edit.

The marketing rules (the marketing type ladder, landing-page layout, imagery, the doll in marketing, share
images) and the email, deck and social templates are in [marketing.md](marketing.md) and
[templates/](templates/README.md) (hub tick xl9, ui D-22).

## 11. Where things are decided

| Decision | What |
|---|---|
| hub D-90 | One family look, one accent per product, `@forspring/ui` |
| hub D-95 | Consoles get a menu; monitored state is a traffic light |
| hub D-98 | Products are their own brands; Forspring is the account |
| hub D-101 | Marks and wordmarks: one doll, colour in the mark, the ink wordmark, the lockup, favicons |
| hub D-103 | Canonify becomes AppSpring; its chrome wears the family look, customer surfaces the customer's brand |
| hub D-115 | `docs/brand/vision.md` is the one text set; who Forspring is for |
| hub D-116 | AppSpring is violet; BrainSpring wears Spring's blue doll; the favicon stays the full doll |
| hub D-117 | AppSpring customer themes: Default, Brand, and later a narrow Guideline level |
| ui D-18 | The doll in every bar, brand files per product, favicons from `shell()` |
| ui D-20 | Accents 10 apart from each other and 4.5:1 on the soft grey; DataSpring's teal darkened |
| ui D-21 | AppSpring's accent becomes violet |
| ui D-22 | The marketing type ladder, the marketing rules and the brand templates |

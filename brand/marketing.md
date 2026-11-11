# Forspring marketing rules

How Forspring and its products look outside the product: landing pages, share images, email, decks and
social posts. The [brand guideline](README.md) holds the rules everything follows (the doll, colour, type,
voice, accessibility, section 10's marketing pages); this file adds what only marketing needs. Values live in
the tokens; the words are in [voice.md](voice.md) and the hub's
[docs/brand/vision.md](https://github.com/forspringai/forspring/blob/main/docs/brand/vision.md). The templates
are in [templates/](templates/README.md). From Peter's brand review, hub tick xl9 (ui D-22).

## 1. The marketing type ladder

`tokens/geometry.json` `text.marketing`, as `--text-marketing-*` in `tokens.css`, `text-marketing-*` in
Tailwind and `text.marketing` in `tokens.js`. It sits above content's ladder (README section 5) and is for
display only.

| Step | px | Family and weight | Use |
|---|---|---|---|
| `eyebrow` | 13 | Space Mono 400, upper case | The short label above a section heading |
| `lede` | 20 | Archivo 400, `body-foreground` | The sentence or two under the hero or a section heading |
| `h3` | 24 | Archivo Condensed 700 | Card and feature headings; the label under a figure |
| `h2` (phone to wide) | 30 to 36 | Archivo Condensed 800 | Section headings |
| `h1` (phone to wide) | 48 to 72 | Archivo Condensed 900 | The hero headline, once per page; the figures on a numbers row |

- **A fluid step is two tokens:** `clamp(var(--text-marketing-h1-min), 7vw, var(--text-marketing-h1))`,
  and the same for h2 with about 4vw. The `vw` sets where it grows; the two ends are the tokens.
- **Running text stays on content's ladder:** body 15, small 13. A landing page reads like the rest of the
  family; only the headings get bigger.
- **Line height:** 1.05 for h1 and h2, 1.2 for h3, 1.5 for the lede and body. Headings track at -0.01em.
- **Hierarchy comes from size and weight,** not colour. Headings are `foreground`, running text
  `body-foreground`, the eyebrow `muted-foreground`.
- **The accent marks one thing per view** (README section 4): the call to action, or in a view without one,
  one key word underlined in the accent. Never a whole heading in the accent.
- **Nothing under 11 px,** and no size outside the ladders. A new size is a token and a decision first.
- **Product pages** use the same ladder; only the accent changes (`data-product`).

## 2. Layout for landing pages

From README sections 6 and 10, with the spacing they need.

- **Content width about 1200 px;** long reading (FAQ, articles) at most about 860 px. Grids collapse to one
  column under 560 px.
- **A section is padded `space.16` (64 px) top and bottom on wide screens, `space.10` (40 px) on a phone,**
  with `space.6` (24 px) at the sides on a phone. Gaps in a grid are `space.6` or `space.8`.
- **Alternate section grounds** between `background` and `muted`; never two muted sections in a row.
- **At most one dark surface on a light page** (`data-theme="dark"` on that section), so it stands out.
- **The hero:** eyebrow, h1, lede, the one call to action. No carousel, no video that starts by itself.
- **Cards** are the card surface with a 1 px `border` and `radius.card`; no drop shadows, no gradients.
- **Motion and performance** follow README section 10: Lighthouse 100, nothing third-party on load, motion
  that tells the story or goes, a static end frame under reduced motion.

## 3. Imagery

- **Real over staged.** Real work, real screens and real people (with their written permission) before stock
  photos or AI-generated scenes. A stock photo of people at a laptop says nothing about us; leave the space
  empty instead.
- **No AI clichés:** no robots, circuits, glowing brains, sparkles, neural webs or blue light trails. AI is
  the means, never the picture (voice.md section 3).
- **Product screenshots are the real product** on real or demo data. Never a customer's real data without
  their written permission; blur nothing, use demo data instead. Crop to the part that makes the point and
  show it at 1x or 2x pixel density, never upscaled.
- **Screenshots in the light theme** unless the section is the page's one dark surface. Frame them with a
  1 px `border` and `radius.panel`, no device mock-ups.
- **Diagrams in the family palette:** ink lines on paper, `muted` fills, one accent for the thing that
  matters. Series are `chart-1` to `chart-8` in order; status colours only for status. Archivo for labels.
  Draw them as SVG.
- **Alt text says what the image shows,** in the page's language: "DataSpring's overview with this month's
  revenue by product", not "screenshot" or "dashboard". A decorative image has `alt=""`.
- **Formats:** SVG where possible, otherwise WebP at the display size (README section 10).
- **No invented proof in an image either:** no made-up customer logos, quotes or numbers in a screenshot.

## 4. The doll in marketing

From hub D-101 and README sections 2 and 3.

- **The lockup is the doll plus the wordmark**, from `brand/<product>/logo.svg` (or `logo-1200x300.png`
  where only a PNG works). Never typeset the name next to a doll yourself.
- **Colour lives in the doll only.** A product's doll is its accent; Forspring's doll is ink (paper on
  dark). The wordmark is always ink.
- **Clear space is a quarter of the doll's height** on every side: no text, edge or other logo inside it.
  The files carry it as their margin.
- **The smallest doll is 16 px tall** on screen.
- **One lockup per surface.** A product's page shows its own lockup and says it is part of Forspring in
  words (vision.md); it does not add Forspring's lockup next to its own.
- **On a photo,** only where the ground behind the whole lockup is calm and at least 3:1 against the doll.
  Otherwise put it on paper.
- **Never** redraw, stretch, outline, rotate, animate or add to the doll, and never put it in a shape.

## 5. Share images

- **Every page has its own 1200 × 630 share image** (README section 10), the page's h1 as the headline, in
  the light theme. Start from [social-1200x630.svg](templates/social-1200x630.svg).
- **`og:image` and `twitter:card` come from the page's path,** so a new page needs an image before it ships.
- **Canonical and `og:url` use the clean path** (no `.html`, no `/index`), matching the sitemap.
- **Each meta description is unique** and 160 characters or fewer.
- **Render it to PNG** in a browser at 1200 × 630 with the package's fonts loaded; the SVG reads
  `../../fonts/` itself.

## 6. Email

[email.html](templates/email.html): one shell for announcements and transactional mail.

- **600 px wide at most,** a table layout and inline styles, because many clients drop `<style>`.
- **The lockup is the product's `logo-1200x300.png`** at an absolute URL the product serves. No SVG; most
  clients won't show it.
- **Archivo first, then the system fonts:** most clients won't load a web font, so the fallback is what
  most people see.
- **One heading, a short body, one button** in the product's light accent with `primary-foreground` text.
- **The footer** says "En del af Forspring.", the company's name and address, and how to unsubscribe from
  anything that is not a receipt.
- **Danish** (hub D-7), in the voice: the point first, no hype, no exclamation marks.

## 7. Decks

[deck.html](templates/deck.html): 16:9 slides at 1920 × 1080 that print to PDF one slide per page.

- **Five kinds of slide:** title (with the lockup), statement, two columns, numbers, closing.
- **The marketing ladder only,** roles only: no hex in a slide.
- **One idea per slide,** a heading that says it, and at most about 30 words of body.
- **Numbers carry their source** on the slide (publisher, year), as everything else we publish does.
- **Light theme** for print; a deck shown on a screen may use the dark theme for one statement slide.

## 8. Social posts

[social-1080x1080.svg](templates/social-1080x1080.svg) for a square post, the 1200 × 630 image for a link.

- **One headline,** set from the ladder, on paper. No more than about 12 words.
- **The lockup at the bottom,** with its clear space, the domain beside it in Space Mono.
- **The same imagery rules** as section 3. No stock, no AI scenes, no emoji in the image.

## 9. One call to action

- **One call to action per page, email and deck,** said the same way everywhere it appears: the same verb,
  the same words, the same destination.
- **It is the accent's one use** in its view: a filled button in `primary` with `primary-foreground` text.
- **Verb first, saying what happens** (voice.md section 6); never "Klik her" or "Læs mere".
- **The words come from the page's owner** (vision.md or offer.md). This file does not set them.

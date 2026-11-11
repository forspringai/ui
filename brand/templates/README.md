# Brand templates

Static starting points for email, decks and social images, on the token values (hub tick xl9, ui D-22). The
rules they follow are in [../marketing.md](../marketing.md); this file says what each one is for and how to fill
it. Copy a template, fill it, and keep the copy where the work lives; don't edit these in place for one use.

Placeholders are written `{{name}}`, and each file lists its own in a comment at the top. The rest of the text
is a Danish sample in the voice ([../voice.md](../voice.md)): rewrite it, and copy approved texts from the hub's
[docs/brand/vision.md](https://github.com/forspringai/forspring/blob/main/docs/brand/vision.md) word for word.
Figures are placeholders on purpose: every number needs a source (voice.md section 3).

| File | For | Size |
|---|---|---|
| [email.html](email.html) | Announcements and transactional mail from a product or Forspring | 600 px wide |
| [deck.html](deck.html) | Talks and sales decks: title, statement, two columns, numbers, closing | 1920 × 1080 slides |
| [social-1200x630.svg](social-1200x630.svg) | A page's share image (`og:image`), a link post | 1200 × 630 |
| [social-1080x1080.svg](social-1080x1080.svg) | A square social post | 1080 × 1080 |

## email.html

- **Placeholders:** `subject`, `preheader`, `logo_url`, `product_name`, `org_name`, `accent`, `button_url`,
  `company_name`, `company_address`, `unsubscribe_url`.
- **`logo_url`** is an absolute URL to the product's `logo-1200x300.png`, which every product serves from
  `dist/brand/<product>/` (Forspring's own mail uses `forspring`). An email can't load a relative path.
- **`accent`** is the product's light accent from `tokens/accent.json` (Forspring and Spring `#2244ff`,
  SiteSpring `#b8442a`, DataSpring `#0b7a7f`, AppSpring `#5d2eb8`, PulseSpring `#a3237a`). The button's
  text stays white, which is at least 4.5:1 on every light accent.
  Until it is filled, a browser reads the literal `{{accent}}` in `bgcolor` as a stray green; that is expected.
- **Fill it with a template engine** that escapes what it inserts (the product's own, or `@forspring/ui/html`
  for the strings). Keep the tables and the inline styles; many clients drop `<style>`.
- **Keep it light.** The logo PNG has an ink wordmark on a transparent ground, so the template asks clients
  not to recolour it. Test in the clients the product's customers use before a send.
- **A receipt** has no unsubscribe line; everything else keeps it.

## deck.html

- **Placeholders:** `dato`, `tal_1` to `tal_3`, `kilde`, `call_to_action`, `call_to_action_url`, `kontakt`.
- **Open it from a checkout of this repo** (`brand/templates/deck.html`): it links `../../dist/tokens.css` and
  `../../dist/fonts.css` relatively, so the fonts and roles load with nothing from another origin. A copy kept
  elsewhere needs those two files and `fonts/` at the same relative places.
- **A product deck:** set `data-product` on `<html>` to the product's key and paste the paths from
  `brand/<product>/logo.svg` into the two lockups. The doll follows `--mark`, the button `--primary`.
- **Slides are sections.** Copy a `<section class="slide">` to add one of the same kind; keep one idea per
  slide.
- **To PDF:** print from Chromium with margins off and background graphics on. `@page` is 1920 × 1080, one
  slide per page.

## social-1200x630.svg and social-1080x1080.svg

- **No placeholders:** replace the headline's `<tspan>` lines (one line each; about 33 characters at
  1200 × 630, about 28 at 1080 × 1080) and the domain. The headline is the page's h1 for a share image.
- **A product image:** paste the paths from `brand/<product>/logo.svg` in place of the lockup and set
  `.fill` and `.coil` to the product's light accent. Forspring's doll stays ink (hub D-101).
- **Render to PNG** at the file's own size in a browser, opened from this folder so the fonts in `../../fonts/`
  load, for example with Playwright: `page.goto("file://…/social-1200x630.svg")` then
  `page.screenshot({ path, clip: { x: 0, y: 0, width: 1200, height: 630 } })`.
- **Light theme only:** paper ground, ink text. A share image never switches with the viewer's theme.

## Keeping them true

`test/templates.test.ts` checks every template on each run: every hex colour is a token value, nothing loads
from another origin, no em dashes (here and in marketing.md), the email is at most 600 px wide, every type
size is on a ladder, and the lockups are the generated paths from `brand/<product>/logo.svg`. If the tokens or
the wordmarks change, the test says which template to update.

// shareImage() (D-70, hub tick ayt): the family's share image as SVG, pure, from a page's h1.
import { expect, test } from "vitest";
import { headlineWidth, shareImage, tokens } from "../src/share-image.ts";
import { ROLES } from "../src/family.ts";
import { LOCKUPS } from "../src/lockups.ts";

const lines = (svg: string) => [...svg.matchAll(/<tspan[^>]*>([^<]*)<\/tspan>/g)].map((m) => m[1]!);
const size = (svg: string) => Number(/<text class="headline" font-size="(\d+)"/.exec(svg)![1]);

test("the template's look: 1200 x 630, the paper ground, ink headline, muted domain, the product's lockup", () => {
  const svg = shareImage({ headline: "Agenter i trin, du kan se", domain: "flowspring.ai", product: "flowspring" });
  expect(svg).toMatch(/^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" viewBox="0 0 1200 630" width="1200" height="630">/);
  expect(svg).toContain(`fill="${ROLES.light.background}"`);
  expect(svg).toContain(`fill: ${ROLES.light.foreground}`);
  expect(svg).toContain(`fill: ${ROLES.light["muted-foreground"]}`);
  expect(svg).toContain(`aria-label="FlowSpring"`);
  expect(svg).toContain(LOCKUPS.flowspring.body);
  expect(svg).toContain('<text class="domain" x="1136" y="514" text-anchor="end">flowspring.ai</text>');
  expect(lines(svg)).toEqual(["Agenter i trin, du kan se"]);
  expect(size(svg)).toBe(72);
});

test("Forspring's lockup by default, the doll in ink; a product's doll in its light accent", () => {
  expect(shareImage({ headline: "x", domain: "forspring.ai" })).toContain('aria-label="Forspring"');
  expect(LOCKUPS.forspring.body).toContain(`fill="${ROLES.light.foreground}"`);
  expect(LOCKUPS.sitespring.body).not.toContain('class="fill"');
});

test("a long h1 wraps by words within the margins, at most three lines, and steps down from 72 to fit", () => {
  const h = "Byg en hjemmeside, der bliver fundet af søgemaskiner og citeret af svarmaskiner, uden at skrive en eneste linje kode selv";
  const svg = shareImage({ headline: h, domain: "sitespring.app", product: "sitespring" });
  const ls = lines(svg);
  expect(ls.length).toBeLessThanOrEqual(3);
  expect(ls.join(" ")).toBe(h);
  expect(size(svg)).toBeLessThan(72);
  for (const l of ls) expect(headlineWidth(l, size(svg))).toBeLessThanOrEqual(1200 - 2 * 64);
});

test("one that cannot fit three lines at 48 px ends in an ellipsis; a word wider than a line is cut too", () => {
  const svg = shareImage({ headline: "ord ".repeat(80).trim(), domain: "x.example" });
  expect(lines(svg)).toHaveLength(3);
  expect(lines(svg).at(-1)!.endsWith("…")).toBe(true);
  expect(size(svg)).toBe(48);
  const one = shareImage({ headline: "Donaudampfschifffahrtsgesellschaftskapitänswitwenrentenversicherungsanstalt", domain: "x.example" });
  expect(lines(one)[0]!.endsWith("…")).toBe(true);
});

test("the square has four lines and the square's layout", () => {
  const svg = shareImage({ headline: "Et sandt billede af forretningen og mindre manuelt arbejde, hver eneste dag i ugen", domain: "dataspring.ai", product: "dataspring", size: "1080x1080" });
  expect(svg).toContain('viewBox="0 0 1080 1080"');
  expect(svg).toContain('<text class="domain" x="1016" y="964"');
  expect(lines(svg).length).toBeLessThanOrEqual(4);
  for (const l of lines(svg)) expect(headlineWidth(l, size(svg))).toBeLessThanOrEqual(1080 - 2 * 64);
});

test("a customer: their logo (https: or data:image/ only) or their name; text is escaped", () => {
  const logo = shareImage({ headline: "Brød <i>hver</i> dag & mere", domain: "bakery.example", logo: { href: "https://bakery.example/logo.svg", aspect: 3, alt: "Example Bakery" } });
  expect(logo).toContain('<image x="64" y="446" width="360" height="120" href="https://bakery.example/logo.svg"');
  expect(logo).toContain("Brød &lt;i&gt;hver&lt;/i&gt; dag &amp; mere");
  expect(logo).not.toContain("<i>");
  const bad = shareImage({ headline: "x", domain: "x.example", logo: { href: "javascript:alert(1)", aspect: 3, alt: "x" }, name: "Example Bakery" });
  expect(bad).not.toContain("javascript:");
  expect(bad).toContain(">Example Bakery</text>");
});

test("fontBase loads the package's faces; without it nothing loads from anywhere", () => {
  expect(shareImage({ headline: "x", domain: "x.example" })).not.toMatch(/url\(|https?:\/\/(?!www\.w3\.org)/);
  expect(shareImage({ headline: "x", domain: "x.example", fontBase: "/fonts/" })).toContain('src: url("/fonts/archivo-condensed.woff2")');
});

// D-72: dates, prices and times are never split, and the lines are balanced (cos, SiteSpring's first cards).
test("a date stays whole: 'Koncert: Anker & Ankerkæde, 9. november' no longer ends a line on '9.'", () => {
  const ls = lines(shareImage({ headline: "Koncert: Anker & Ankerkæde, 9. november", domain: "x.example" }));
  expect(ls.some((l) => l.endsWith(" 9.") || l === "november")).toBe(false);
  expect(ls.at(-1)).toContain("9. november");
});

test("numbers keep their unit, month or next number; months keep their day; short abbreviations their word", () => {
  expect(tokens("Billetter fra 120 kr. lørdag den 12. december kl. 19")).toEqual(["Billetter", "fra", "120 kr.", "lørdag", "den", "12. december", "kl. 19"]);
  expect(tokens("Spar 30 % i 3 dage fra 1. december 2026")).toEqual(["Spar", "30 %", "i", "3 dage", "fra", "1. december 2026"]);
  expect(tokens("Doors open November 9 at 7 pm, from €15")).toEqual(["Doors", "open", "November 9", "at", "7 pm,", "from", "€15"]);
  expect(tokens("1.200 kr. pr. måned i 12 måneder")).toEqual(["1.200 kr.", "pr.", "måned", "i", "12 måneder"]);
  // A number before an ordinary word may break after it.
  expect(tokens("Top 10 tips for spring")).toEqual(["Top", "10", "tips", "for", "spring"]);
});

test("for every date, price and time in a headline, no line breaks inside it, at every size", () => {
  const cases: [string, string[]][] = [
    ["Billetter fra 120 kr. til koncerten lørdag den 12. december kl. 19 på Store Vega", ["120 kr.", "12. december", "kl. 19"]],
    ["Spar 30 % på alle abonnementer i 3 dage fra 1. december 2026, kun for nye kunder", ["30 %", "3 dage", "1. december 2026"]],
    ["Doors open November 9 at 7 pm, tickets from €15 at the door or online in advance", ["November 9", "7 pm,"]],
  ];
  for (const [h, keep] of cases)
    for (const size of ["1200x630", "1080x1080"] as const) {
      const ls = lines(shareImage({ headline: h, domain: "x.example", size }));
      for (const k of keep) expect(ls.some((l) => l.includes(k.replace(/&/g, "&amp;"))), `${size}: "${k}" in ${JSON.stringify(ls)}`).toBe(true);
    }
});

test("balanced: two lines are about even, not a full line and a stub", () => {
  const svg = shareImage({ headline: "Koncert: Anker & Ankerkæde, 9. november", domain: "x.example" });
  const n = size(svg);
  const widths = lines(svg).map((l) => headlineWidth(l.replace(/&amp;/g, "&"), n));
  expect(widths).toHaveLength(2);
  expect(Math.min(...widths) / Math.max(...widths)).toBeGreaterThan(0.6);
  const long = shareImage({ headline: "Et sandt billede af forretningen og mindre manuelt arbejde.", domain: "x.example" });
  const w2 = lines(long).map((l) => headlineWidth(l, size(long)));
  expect(Math.min(...w2) / Math.max(...w2)).toBeGreaterThan(0.6);
});

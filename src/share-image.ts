// shareImage() (D-70, hub tick ayt): a page's share image (og:image) as SVG in the family's template,
// brand/templates/social-1200x630.svg: the page's h1 as the headline, the lockup, the domain. Pure: no
// file, no network, no font engine, so a build step (SiteSpring renders it to PNG per page) or a Worker
// can call it. The headline is wrapped and sized with the condensed face's own advance widths, measured
// from fonts/archivo-condensed.woff2 at weight 800; the renderer draws the text with the fonts it has
// (fontBase points @font-face at the package's fonts/ when it renders in a browser).

import { ROLES } from "./family.ts";
import { LOCKUPS } from "./lockups.ts";
import type { Product } from "./html.ts";
import { safeLogo } from "./logo.ts";

export type ShareImageOptions = {
  /** The page's h1. Wrapped onto at most three lines (four in the square), sized down to fit. */
  headline: string;
  /** The domain under the lockup, as people type it: "flowspring.ai", "bakery.example". */
  domain: string;
  /** A family product's lockup (the default, Forspring's). */
  product?: Product;
  /** A customer's logo instead of a product's: an https: or data:image/ URL and its aspect (width / height). */
  logo?: { href: string; aspect: number; alt: string };
  /** A customer's name in the headline face, when they have no logo. */
  name?: string;
  /** 1200 x 630 (og:image, the default) or the 1080 x 1080 square post. */
  size?: "1200x630" | "1080x1080";
  /** Where the package's fonts/ are served, ending in "/", to load the faces with @font-face. */
  fontBase?: string;
};

// The face's advance per character in thousandths of an em (Archivo Condensed 800). Anything else counts
// as a wide letter, so a headline is never set wider than it measures.
export const ADVANCE: Record<string, number> = {"0":494,"1":452,"2":489,"3":493,"4":487,"5":494,"6":495,"7":464,"8":487,"9":495," ":142,"!":277,"\"":402,"#":529,"$":446,"%":800,"&":631,"'":221,"(":369,")":369,"*":382,"+":557,",":248,"-":272,".":248,"/":282,":":260,";":260,"<":557,"=":557,">":557,"?":479,"@":790,"A":584,"B":572,"C":589,"D":589,"E":537,"F":479,"G":629,"H":601,"I":273,"J":496,"K":594,"L":483,"M":758,"N":604,"O":634,"P":550,"Q":634,"R":584,"S":537,"T":532,"U":594,"V":560,"W":797,"X":573,"Y":566,"Z":538,"[":357,"\\":282,"]":357,"^":557,"_":419,"`":204,"a":490,"b":495,"c":475,"d":495,"e":484,"f":294,"g":478,"h":490,"i":238,"j":237,"k":490,"l":238,"m":733,"n":491,"o":493,"p":495,"q":495,"r":320,"s":446,"t":305,"u":491,"v":447,"w":685,"x":482,"y":444,"z":425,"{":375,"|":220,"}":375,"~":557,"æ":742,"ø":493,"å":490,"Æ":813,"Ø":634,"Å":584,"é":484,"ü":491,"ö":493,"ä":490,"É":537,"Ü":594,"Ö":634,"Ä":584,"–":375,"—":750,"’":226,"“":400,"”":400,"…":755};
const WIDE = 640;
const TRACKING = -0.01; // the template's letter-spacing, in em

/** The headline's width at a size, in px, as the condensed face sets it. */
export function headlineWidth(text: string, size: number): number {
  let units = 0;
  for (const ch of text) units += ADVANCE[ch] ?? WIDE;
  return (units / 1000 + TRACKING * [...text].length) * size;
}

// Words that stay on one line together (D-72): no break between a number and its unit, month or the next
// number ("9. november", "12 kr", "3 dage", "1. december 2026"), none between a month and its day
// ("November 9"), none after a short abbreviation
// ("kl. 19", "nr. 4", "ca. 30"). cos saw "Koncert: Anker & Ankerkæde, 9." / "november" on SiteSpring's first
// live cards.
const NUMBER = /^[(#€$£]?\d[\d.,:/–-]*\.?(?:[%€$£)]|kr\.?)?[,;:]?$/i;
const MONTHS = /^(januar|februar|marts|april|maj|juni|juli|august|september|oktober|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|okt|oct|nov|dec|january|february|march|may|june|july|october)\.?,?$/i;
const ABBREVIATION = /^(kl|nr|ca|fx|pkt|tlf|no|st|dr|mr|ms|mrs)\.$/i;
// What a number keeps beside it: a unit, a currency, a month, another number ("1. december 2026").
const UNIT = /^(kr|dkk|eur|usd|nok|sek|kr\.|%|‰|€|\$|£|dage?|døgn|timer?|min|minutter|sek|uger?|måneder?|år|km|m|cm|kg|g|l|ml|stk\.?|pers\.?|personer|gange|days?|hours?|mins?|minutes?|weeks?|months?|years?|times|am|pm|h|x)[.,;:!?)]?$/i;

// A line never ends on a joiner (D-72, cos): "og", "and", "+", "–" go with the word after them; "&" holds
// both its neighbours, since it is usually inside a name ("Anker & Ankerkæde", "Æble & Co").
const JOINER = /^(og|and|eller|or|\+|–|—|-)$/i;
const AMPERSAND = /^&$/;

/** The headline as tokens: words, and the groups that must not break inside. */
export function tokens(headline: string): string[] {
  const words = headline.trim().split(/\s+/).filter(Boolean);
  const out: string[] = [];
  for (const w of words) {
    const prev = out.at(-1);
    const prevLast = prev?.split(" ").at(-1);
    const glue =
      prevLast !== undefined &&
      ((NUMBER.test(prevLast) && (UNIT.test(w) || MONTHS.test(w) || NUMBER.test(w))) ||
        ABBREVIATION.test(prevLast) ||
        (MONTHS.test(prevLast) && /^\d/.test(w)) ||
        JOINER.test(prevLast) ||
        AMPERSAND.test(prevLast) ||
        AMPERSAND.test(w));
    if (glue) out[out.length - 1] = prev + " " + w;
    else out.push(w);
  }
  return out;
}

/** Tokens onto lines no wider than width, greedily; a token wider than a line is cut to fit with an ellipsis. */
function greedy(toks: readonly string[], size: number, width: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const t of toks) {
    const next = line ? line + " " + t : t;
    if (headlineWidth(next, size) <= width) line = next;
    else {
      if (line) lines.push(line);
      line = headlineWidth(t, size) <= width ? t : clip(t, size, width);
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * Balanced, as text-wrap: balance sets a heading: the fewest lines the greedy wrap needs, made as even
 * as they can be. The narrowest width that still gives that many lines, found by halving (D-72).
 */
function wrap(toks: readonly string[], size: number, width: number): string[] {
  const lines = greedy(toks, size, width);
  if (lines.length < 2) return lines;
  let [lo, hi] = [Math.max(...toks.map((t) => Math.min(headlineWidth(t, size), width))), width];
  let best = lines;
  for (let i = 0; i < 20 && hi - lo > 0.5; i++) {
    const mid = (lo + hi) / 2;
    const l = greedy(toks, size, mid);
    if (l.length <= lines.length) [best, hi] = [l, mid];
    else lo = mid;
  }
  return best;
}

function clip(text: string, size: number, width: number): string {
  let t = text;
  while (t.length > 1 && headlineWidth(t + "…", size) > width) t = t.slice(0, -1).trimEnd();
  return t + "…";
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const SIZES = {
  "1200x630": { w: 1200, h: 630, pad: 64, maxLines: 3, top: 176, lockupY: 446, lockupH: 120, domainY: 514 },
  "1080x1080": { w: 1080, h: 1080, pad: 64, maxLines: 4, top: 184, lockupY: 896, lockupH: 120, domainY: 964 },
} as const;

// The marketing h1's steps (text.marketing.h1, 48 to 72), the line at 76/72 of the size as in the template.
const STEPS = [72, 64, 56, 48];

/** The share image as an SVG document, light theme only (a share image never follows a viewer's theme). */
export function shareImage(o: ShareImageOptions): string {
  const s = SIZES[o.size ?? "1200x630"];
  const width = s.w - 2 * s.pad;
  const words = tokens(o.headline);
  // The largest step at which the headline fits its lines; at the smallest, the last line is cut.
  let size: number = STEPS[STEPS.length - 1]!;
  let lines = wrap(words, size, width);
  for (const step of STEPS) {
    const l = wrap(words, step, width);
    if (l.length <= s.maxLines) {
      size = step;
      lines = l;
      break;
    }
  }
  if (lines.length > s.maxLines) lines = [...lines.slice(0, s.maxLines - 1), clip(lines.slice(s.maxLines - 1).join(" "), size, width)];
  const lead = Math.round((size * 76) / 72);
  const tspans = lines.map((l, i) => `<tspan x="${s.pad}" y="${s.top - (72 - size) + i * lead}">${esc(l)}</tspan>`).join("");

  let brand: string;
  if (o.logo && safeLogo(o.logo.href) && /^(https:|data:image\/)/.test(o.logo.href)) {
    const w = Math.round(s.lockupH * Math.max(0.2, Math.min(o.logo.aspect, 8)));
    brand = `<image x="${s.pad}" y="${s.lockupY}" width="${w}" height="${s.lockupH}" href="${esc(o.logo.href)}" preserveAspectRatio="xMinYMid meet"><title>${esc(o.logo.alt)}</title></image>`;
  } else if (o.name) {
    brand = `<text class="headline" x="${s.pad}" y="${s.lockupY + 84}" font-size="64">${esc(o.name)}</text>`;
  } else {
    const l = LOCKUPS[o.product ?? "forspring"];
    brand = `<svg x="${s.pad}" y="${s.lockupY}" width="${Math.round(s.lockupH * l.aspect)}" height="${s.lockupH}" viewBox="${l.viewBox}" aria-label="${esc(l.name)}">${l.body}</svg>`;
  }

  const faces = o.fontBase
    ? `@font-face { font-family: "Archivo Condensed"; src: url("${esc(o.fontBase)}archivo-condensed.woff2") format("woff2"); font-weight: 700 900; } @font-face { font-family: "Space Mono"; src: url("${esc(o.fontBase)}space-mono.woff2") format("woff2"); font-weight: 400; } `
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${s.w} ${s.h}" width="${s.w}" height="${s.h}"><title>${esc(o.headline.trim())}</title><style>${faces}.headline { font-family: "Archivo Condensed", "Arial Narrow", Arial, sans-serif; font-weight: 800; letter-spacing: ${TRACKING}em; fill: ${ROLES.light.foreground}; } .domain { font-family: "Space Mono", "Courier New", monospace; font-size: 24px; fill: ${ROLES.light["muted-foreground"]}; }</style><rect width="${s.w}" height="${s.h}" fill="${ROLES.light.background}"/><text class="headline" font-size="${size}">${tspans}</text>${brand}<text class="domain" x="${s.w - s.pad}" y="${s.domainY}" text-anchor="end">${esc(o.domain)}</text></svg>\n`;
}

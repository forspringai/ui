// shareImage() (D-70, hub tick ayt): a page's share image (og:image) as SVG in the family's template,
// brand/templates/social-1200x630.svg: the page's h1 as the headline, the lockup, the domain. Pure: no
// file, no network, no font engine, so a build step (SiteSpring renders it to PNG per page) or a Worker
// can call it. The headline is wrapped and sized with the condensed face's own advance widths, measured
// from fonts/archivo-condensed.woff2 at weight 800; the renderer draws the text with the fonts it has
// (fontBase points @font-face at the package's fonts/ when it renders in a browser).
import { ROLES } from "./family.js";
import { LOCKUPS } from "./lockups.js";
import { safeLogo } from "./logo.js";
// The face's advance per character in thousandths of an em (Archivo Condensed 800). Anything else counts
// as a wide letter, so a headline is never set wider than it measures.
export const ADVANCE = { "0": 494, "1": 452, "2": 489, "3": 493, "4": 487, "5": 494, "6": 495, "7": 464, "8": 487, "9": 495, " ": 142, "!": 277, "\"": 402, "#": 529, "$": 446, "%": 800, "&": 631, "'": 221, "(": 369, ")": 369, "*": 382, "+": 557, ",": 248, "-": 272, ".": 248, "/": 282, ":": 260, ";": 260, "<": 557, "=": 557, ">": 557, "?": 479, "@": 790, "A": 584, "B": 572, "C": 589, "D": 589, "E": 537, "F": 479, "G": 629, "H": 601, "I": 273, "J": 496, "K": 594, "L": 483, "M": 758, "N": 604, "O": 634, "P": 550, "Q": 634, "R": 584, "S": 537, "T": 532, "U": 594, "V": 560, "W": 797, "X": 573, "Y": 566, "Z": 538, "[": 357, "\\": 282, "]": 357, "^": 557, "_": 419, "`": 204, "a": 490, "b": 495, "c": 475, "d": 495, "e": 484, "f": 294, "g": 478, "h": 490, "i": 238, "j": 237, "k": 490, "l": 238, "m": 733, "n": 491, "o": 493, "p": 495, "q": 495, "r": 320, "s": 446, "t": 305, "u": 491, "v": 447, "w": 685, "x": 482, "y": 444, "z": 425, "{": 375, "|": 220, "}": 375, "~": 557, "æ": 742, "ø": 493, "å": 490, "Æ": 813, "Ø": 634, "Å": 584, "é": 484, "ü": 491, "ö": 493, "ä": 490, "É": 537, "Ü": 594, "Ö": 634, "Ä": 584, "–": 375, "—": 750, "’": 226, "“": 400, "”": 400, "…": 755 };
const WIDE = 640;
const TRACKING = -0.01; // the template's letter-spacing, in em
/** The headline's width at a size, in px, as the condensed face sets it. */
export function headlineWidth(text, size) {
    let units = 0;
    for (const ch of text)
        units += ADVANCE[ch] ?? WIDE;
    return (units / 1000 + TRACKING * [...text].length) * size;
}
/** Words onto lines no wider than width; a word wider than a line is cut to fit with an ellipsis. */
function wrap(words, size, width) {
    const lines = [];
    let line = "";
    for (const w of words) {
        const next = line ? line + " " + w : w;
        if (headlineWidth(next, size) <= width)
            line = next;
        else {
            if (line)
                lines.push(line);
            line = headlineWidth(w, size) <= width ? w : clip(w, size, width);
        }
    }
    if (line)
        lines.push(line);
    return lines;
}
function clip(text, size, width) {
    let t = text;
    while (t.length > 1 && headlineWidth(t + "…", size) > width)
        t = t.slice(0, -1).trimEnd();
    return t + "…";
}
const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const SIZES = {
    "1200x630": { w: 1200, h: 630, pad: 64, maxLines: 3, top: 176, lockupY: 446, lockupH: 120, domainY: 514 },
    "1080x1080": { w: 1080, h: 1080, pad: 64, maxLines: 4, top: 184, lockupY: 896, lockupH: 120, domainY: 964 },
};
// The marketing h1's steps (text.marketing.h1, 48 to 72), the line at 76/72 of the size as in the template.
const STEPS = [72, 64, 56, 48];
/** The share image as an SVG document, light theme only (a share image never follows a viewer's theme). */
export function shareImage(o) {
    const s = SIZES[o.size ?? "1200x630"];
    const width = s.w - 2 * s.pad;
    const words = o.headline.trim().split(/\s+/).filter(Boolean);
    // The largest step at which the headline fits its lines; at the smallest, the last line is cut.
    let size = STEPS[STEPS.length - 1];
    let lines = wrap(words, size, width);
    for (const step of STEPS) {
        const l = wrap(words, step, width);
        if (l.length <= s.maxLines) {
            size = step;
            lines = l;
            break;
        }
    }
    if (lines.length > s.maxLines)
        lines = [...lines.slice(0, s.maxLines - 1), clip(lines.slice(s.maxLines - 1).join(" "), size, width)];
    const lead = Math.round((size * 76) / 72);
    const tspans = lines.map((l, i) => `<tspan x="${s.pad}" y="${s.top - (72 - size) + i * lead}">${esc(l)}</tspan>`).join("");
    let brand;
    if (o.logo && safeLogo(o.logo.href) && /^(https:|data:image\/)/.test(o.logo.href)) {
        const w = Math.round(s.lockupH * Math.max(0.2, Math.min(o.logo.aspect, 8)));
        brand = `<image x="${s.pad}" y="${s.lockupY}" width="${w}" height="${s.lockupH}" href="${esc(o.logo.href)}" preserveAspectRatio="xMinYMid meet"><title>${esc(o.logo.alt)}</title></image>`;
    }
    else if (o.name) {
        brand = `<text class="headline" x="${s.pad}" y="${s.lockupY + 84}" font-size="64">${esc(o.name)}</text>`;
    }
    else {
        const l = LOCKUPS[o.product ?? "forspring"];
        brand = `<svg x="${s.pad}" y="${s.lockupY}" width="${Math.round(s.lockupH * l.aspect)}" height="${s.lockupH}" viewBox="${l.viewBox}" aria-label="${esc(l.name)}">${l.body}</svg>`;
    }
    const faces = o.fontBase
        ? `@font-face { font-family: "Archivo Condensed"; src: url("${esc(o.fontBase)}archivo-condensed.woff2") format("woff2"); font-weight: 700 900; } @font-face { font-family: "Space Mono"; src: url("${esc(o.fontBase)}space-mono.woff2") format("woff2"); font-weight: 400; } `
        : "";
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${s.w} ${s.h}" width="${s.w}" height="${s.h}"><title>${esc(o.headline.trim())}</title><style>${faces}.headline { font-family: "Archivo Condensed", "Arial Narrow", Arial, sans-serif; font-weight: 800; letter-spacing: ${TRACKING}em; fill: ${ROLES.light.foreground}; } .domain { font-family: "Space Mono", "Courier New", monospace; font-size: 24px; fill: ${ROLES.light["muted-foreground"]}; }</style><rect width="${s.w}" height="${s.h}" fill="${ROLES.light.background}"/><text class="headline" font-size="${size}">${tspans}</text>${brand}<text class="domain" x="${s.w - s.pad}" y="${s.domainY}" text-anchor="end">${esc(o.domain)}</text></svg>\n`;
}

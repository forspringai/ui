/// <reference lib="dom" />
// Alignment red-lines (D-66). The vendored measurer (vendor/alignment-measure.js, raphaelsalaja/skill
// at aa9f452, MIT) runs in the audited page and reports what the eye catches as "off": text that starts
// a few px from the edge its neighbours share, two sizes of text in one row on different baselines,
// and more. On the family's demo, checked by eye on 2x crops (brand, 2026-11-27), only two of its rules
// held up as faults, so only those can fail a run, and only from 2 px:
//   alignment-shared-edge      text 2 to 4 px off the start edge the other text in its surface shares
//   alignment-shared-baseline  a row of single-line text whose baselines are 2 px or more apart, but
//                              less than half the smaller text's size (more is two lines, not a fault)
// Three more are reported for a person to look at (severity review): ink-centre (the vertical case
// only), padding-over-gap and even-gaps. The rest were false on the demo (icon-only buttons, items in
// closed menus, left-aligned headers, Google's own button) and are dropped until one proves itself.
// D-74: what a sighted reader sees is what is measured: labels only a screen reader reads are hidden
// while it runs, each closed menu is measured (and cropped) on its own with only it open, and
// ink-centre keeps only a box with a surface of its own holding one line of text.
import { readFileSync } from "node:fs";
const NOTE = "measured by the alignment skill's measure.js (raphaelsalaja/skill aa9f452); see the red-line report (--redlines)";
export function measureSource() {
    return readFileSync(new URL("./vendor/alignment-measure.js", import.meta.url), "utf8");
}
/** measure.js's findings as the audit's: the two gated rules as errors from 2 px, three as review, the rest dropped. */
export function alignmentFindings(raw) {
    const out = [];
    for (const r of raw) {
        const base = { selector: r.where, value: r.detail, note: NOTE, box: r.rect, measured: r.measured };
        if (r.rule === "alignment-shared-edge") {
            const off = Math.abs(Number(r.measured.offset));
            out.push({ ...base, rule: r.rule, severity: off >= 2 ? "error" : "review", expected: "text on the edge its neighbours share (under 2 px off)" });
        }
        else if (r.rule === "alignment-shared-baseline") {
            const spread = Number(r.measured.spread);
            const sizes = r.measured.sizes ?? [];
            const oneLine = sizes.length > 0 && spread < Math.min(...sizes) / 2;
            out.push({ ...base, rule: r.rule, severity: oneLine && spread >= 2 ? "error" : "review", expected: "one baseline for text in one row (under 2 px apart)" });
        }
        else if (r.rule === "alignment-ink-centre" && r.detail.startsWith("Ink sits")) {
            out.push({ ...base, rule: r.rule, severity: "review", expected: "the ink centred in its box" });
        }
        else if (r.rule === "alignment-padding-over-gap" || r.rule === "alignment-even-gaps") {
            out.push({ ...base, rule: r.rule, severity: "review", expected: r.rule === "alignment-even-gaps" ? "even gaps between repeated siblings" : "padding at least the gap between its children" });
        }
    }
    return out;
}
/** Outlines each finding's box in red (and the shared edge it missed, as a red line), crops it, and takes the marks away. */
export async function redlineCrops(page, found, viewport) {
    const out = [];
    for (const f of found) {
        const line = f.rule === "alignment-shared-edge" ? Number(f.measured.line) : null;
        await page.evaluate(({ box, line }) => {
            document.querySelectorAll("[data-ui-audit-redline]").forEach((e) => e.remove());
            const mark = (css) => {
                const d = document.createElement("div");
                d.setAttribute("data-ui-audit-redline", "");
                Object.assign(d.style, { position: "absolute", pointerEvents: "none", zIndex: "2147483647", boxSizing: "border-box" }, css);
                document.body.append(d);
            };
            mark({ left: `${box.x + scrollX}px`, top: `${box.y + scrollY}px`, width: `${box.width}px`, height: `${box.height}px`, outline: "1px dashed #ff0033" });
            if (line !== null)
                mark({ left: `${line + scrollX}px`, top: `${box.y + scrollY - 12}px`, width: "1px", height: `${box.height + 24}px`, background: "#ff0033" });
        }, { box: f.box, line });
        const x = Math.max(0, f.box.x - 24), y = Math.max(0, f.box.y - 24);
        const width = Math.max(1, Math.min(f.box.width + 48, viewport - x));
        try {
            out.push({ finding: f, cssWidth: Math.round(width), png: await page.screenshot({ fullPage: true, clip: { x, y, width, height: Math.min(f.box.height + 48, 600) } }) });
        }
        catch {
            // A box outside the page (a closed menu's item) has nothing to crop; the finding still stands in the JSON.
        }
    }
    await page.evaluate(() => document.querySelectorAll("[data-ui-audit-redline]").forEach((e) => e.remove()), undefined);
    return out;
}
/**
 * What a sighted reader sees is what is measured (D-74). measure.js takes every text node as ink, so a
 * label only a screen reader reads (.visually-hidden: 1 px, clipped) counted as text: the toast's
 * "Luk" behind its ×, a table's "Vælg" column, the language row's "Language:". On the 0.50.0 demo
 * those were 70 of the 178 findings, and none was a fault. These hide such labels (display: none,
 * which moves nothing, since they are out of flow) while measure.js runs, and bring them back.
 */
export function hideUnseen() {
    // All reads first, then the writes: a write between reads would make the browser lay out again each time.
    const unseen = [...document.querySelectorAll("body *")].filter((el) => {
        const s = getComputedStyle(el);
        if (s.position !== "absolute" && s.position !== "fixed")
            return false;
        const r = el.getBoundingClientRect();
        const clipped = s.clipPath === "inset(50%)" || /rect\(0(px)?,? 0(px)?,? 0(px)?,? 0(px)?\)/.test(s.clip) || (r.width <= 1 && r.height <= 1 && s.overflow === "hidden");
        return clipped && !!(el.textContent ?? "").trim();
    });
    for (const el of unseen) {
        el.setAttribute("data-ui-audit-unseen", el.style.getPropertyValue("display"));
        el.style.setProperty("display", "none", "important");
    }
    return unseen.length;
}
/** measure.js measures within window.__alignmentOptions.root: one details element (its index), or the body. */
export function measureWithin(i) {
    window.__alignmentOptions = i === null ? undefined : { root: document.querySelectorAll("details")[i] };
}
export function showUnseen() {
    for (const el of document.querySelectorAll("[data-ui-audit-unseen]")) {
        const was = el.getAttribute("data-ui-audit-unseen");
        if (was)
            el.style.setProperty("display", was);
        else
            el.style.removeProperty("display");
        el.removeAttribute("data-ui-audit-unseen");
    }
}
/**
 * The page's closed menus and disclosures (D-74): each closed details element that is not inside
 * another closed one. Their items are laid out but not painted, so measured with the menu closed a
 * finding had a box and a blank crop. The audit measures each with only it open.
 */
export function closedDetails() {
    const all = [...document.querySelectorAll("details")];
    return all.flatMap((d, i) => (!d.open && !d.parentElement?.closest("details:not([open])") ? [i] : []));
}
export function setDetails({ i, open }) {
    const d = document.querySelectorAll("details")[i];
    if (d)
        d.open = open;
}
/**
 * For each box, the index of the closed details element (of closedDetails' list, or of `only` when
 * given, open or not) whose content holds an element with that box, or -1. The summary is outside:
 * it shows when the details is closed.
 */
export function boxesInDetails({ boxes, only }) {
    const near = (a, b) => Math.abs(a - b) < 0.6;
    const all = [...document.querySelectorAll("details")];
    const which = only === undefined ? all.map((d, i) => (!d.open ? i : -1)).filter((i) => i >= 0) : [only];
    const content = which.map((i) => ({ i, rects: [...all[i].querySelectorAll("*")].filter((e) => !e.closest("summary") || e.closest("details") !== all[i]).map((e) => e.getBoundingClientRect()) }));
    return boxes.map((b) => {
        for (const { i, rects } of content)
            if (rects.some((r) => near(r.x, b.x) && near(r.y, b.y) && near(r.width, b.width) && near(r.height, b.height)))
                return i;
        return -1;
    });
}
/**
 * Whether each ink-centre finding's box is one the eye centres text in (D-74): a box with a surface of
 * its own (a fill, a shadow, or a border all round: a button, a chip, a badge) holding one line of
 * text. A panel's foot or sign-out row is a section under a divider, not a box: the reader weighs the
 * text against the divider and the panel's edge, which measure.js does not see (12 findings on the
 * 0.50.0 demo, none a fault); wrapped text is weighed by its first line (the diff's lines).
 */
export function inkBoxes(boxes) {
    const near = (a, b) => Math.abs(a - b) < 0.6;
    const rects = [...document.querySelectorAll("body *")].map((e) => ({ e, r: e.getBoundingClientRect() }));
    return boxes.map((box) => {
        const el = rects.find(({ r }) => near(r.x, box.x) && near(r.y, box.y) && near(r.width, box.width) && near(r.height, box.height))?.e;
        if (!el)
            return true;
        const s = getComputedStyle(el);
        const borders = ["top", "right", "bottom", "left"].every((side) => parseFloat(s.getPropertyValue(`border-${side}-width`)) > 0);
        const surface = borders || s.backgroundColor !== "rgba(0, 0, 0, 0)" || s.backgroundImage !== "none" || s.boxShadow !== "none";
        if (!surface)
            return false;
        // Lines: text rects that do not overlap vertically (rects of one line, at two sizes, overlap).
        const lines = [];
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
            const node = walker.currentNode;
            if (!node.textContent.trim())
                continue;
            const range = document.createRange();
            range.selectNodeContents(node);
            for (const r of range.getClientRects())
                if (r.width > 0 && r.height > 0)
                    lines.push(r);
        }
        lines.sort((a, b) => a.top - b.top);
        return lines.every((r, k) => k === 0 || r.top < lines[k - 1].bottom - 2);
    });
}
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
export function redlineReport(shots, when, pages = []) {
    const files = new Map();
    const groups = new Map();
    for (const s of shots) {
        const k = `${s.url} at ${s.width} px, ${s.theme}`;
        groups.set(k, [...(groups.get(k) ?? []), s]);
    }
    const errors = shots.filter((s) => s.finding.severity === "error").length;
    let n = 0;
    const sections = [...groups].map(([k, list]) => `<section><h2>${esc(k)}</h2>${list
        .sort((a, b) => (a.finding.severity === "error" ? 0 : 1) - (b.finding.severity === "error" ? 0 : 1))
        .map((s) => {
        const name = `${++n}.png`;
        files.set(name, s.png);
        return `<figure class="${s.finding.severity}"><figcaption><b>${s.finding.severity === "error" ? "Fails the run" : "To look at"}</b> · ${esc(s.finding.rule.replace("alignment-", ""))} · <code>${esc(s.finding.selector)}</code><br>${esc(s.finding.value)}</figcaption><img src="${name}" alt="${esc(s.finding.value)}" loading="lazy" width="${s.cssWidth}"></figure>`;
    })
        .join("")}</section>`);
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Alignment red-lines</title><style>
:root { color-scheme: light dark; font: 15px/1.5 system-ui, sans-serif; }
body { margin: 0 auto; max-width: 70rem; padding: 24px 16px 64px; }
h1 { font-size: 28px; margin: 0 0 8px; } h2 { font-size: 17px; margin: 40px 0 12px; overflow-wrap: anywhere; }
figure { margin: 0 0 24px; padding: 12px; border: 1px solid #8884; border-radius: 6px; }
figure.error { border-color: #ff0033; }
figcaption { margin-bottom: 8px; } img { display: block; height: auto; max-width: 100%; }
code { overflow-wrap: anywhere; }
</style></head><body><h1>Alignment red-lines</h1>
<p>${shots.length} finding${shots.length === 1 ? "" : "s"}, ${errors} that fail${errors === 1 ? "s" : ""} the run. Measured ${esc(when)} by ui-audit with the alignment skill's measure.js (raphaelsalaja/skill aa9f452, MIT). Red: the box measured, and for a shared edge, the edge the text missed. Crops are at 2x.</p>
<p>Only a shared edge or a single-line shared baseline 2 px or more off fails the run (ui D-66). The rest are for a person to judge.</p>
${sections.join("\n") || "<p>Nothing to show.</p>"}
${pages.length ? `<h2 id="pages">The pages as audited</h2><p>Each page at each width, light, as the audit measured it: the picture for a finding that has no crop of its own (spacing, a button's size, a menu's inset).</p>${pages.map((p, i) => { const name = `page-${i + 1}.jpg`; files.set(name, p.jpeg); return `<figure><figcaption><code>${esc(p.url)}</code> at ${p.width} px</figcaption><a href="${name}"><img src="${name}" alt="${esc(p.url)} at ${p.width} px" loading="lazy" width="${Math.min(p.width, 640)}"></a></figure>`; }).join("")}` : ""}
</body></html>
`;
    return { html, files };
}
/**
 * A shared-baseline error stands only for plain text (D-66). measure.js compares the first text of
 * each child of a flex row, so a bar's wordmark is measured against the label inside the org
 * switcher's bordered summary; a control centres its label in its own box, and that is not a fault.
 * This re-measures the row (found by its box) with text inside a control or a surface left out, and
 * returns the plain texts' baseline spread, or null when fewer than two texts of two sizes are left.
 */
export function plainBaselineSpread(box) {
    const near = (a, b) => Math.abs(a - b) < 0.6;
    const row = [...document.querySelectorAll("*")].find((el) => {
        const r = el.getBoundingClientRect();
        return near(r.x, box.x) && near(r.y, box.y) && near(r.width, box.width) && near(r.height, box.height) && /flex/.test(getComputedStyle(el).display);
    });
    if (!row)
        return null;
    const control = (el) => {
        const s = getComputedStyle(el);
        return el.matches("button, input, select, textarea, summary, [role=button], .button") || s.backgroundColor !== "rgba(0, 0, 0, 0)" || s.boxShadow !== "none" || parseFloat(s.borderTopWidth) > 0 || parseFloat(s.borderBottomWidth) > 0;
    };
    const canvas = document.createElement("canvas").getContext("2d");
    const texts = [];
    for (const kid of row.children) {
        const r = kid.getBoundingClientRect();
        if (!r.width || !r.height)
            continue;
        const walker = document.createTreeWalker(kid, NodeFilter.SHOW_TEXT);
        let node = null;
        while (walker.nextNode())
            if (walker.currentNode.textContent.trim() && (walker.currentNode.parentElement.getBoundingClientRect().width > 0)) {
                node = walker.currentNode;
                break;
            }
        if (!node)
            continue;
        let plain = true;
        for (let el = node.parentElement; el && el !== row; el = el.parentElement)
            if (control(el))
                plain = false;
        if (!plain)
            continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        const rects = range.getClientRects();
        if (rects.length !== 1)
            continue;
        const s = getComputedStyle(node.parentElement);
        canvas.font = `${s.fontStyle} ${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
        texts.push({ baseline: rects[0].top + canvas.measureText(node.textContent.trim()).fontBoundingBoxAscent, size: parseFloat(s.fontSize) });
    }
    if (texts.length < 2)
        return null;
    const sizes = texts.map((t) => t.size);
    if (Math.max(...sizes) - Math.min(...sizes) < 2)
        return null;
    const b = texts.map((t) => t.baseline);
    return Math.max(...b) - Math.min(...b);
}
/**
 * Symbols with words (D-69): every icon (svg.icon) or signal mark (.signal-mark) that leads or trails
 * words in a row sits with its centre on the cap centre of the words' first line, the line beside it.
 * measure.js's icon-with-label sees only SVG icons in controls under 56 px with a surface of their own,
 * so it missed Peter's case (a signal's diamond above a notice's title, review of 0.47.1). The cap centre
 * is the baseline less half the cap height, from the font's own metrics, as measure.js reads it.
 */
export function collectSymbols(within = null) {
    // One closed menu's pass (D-74) looks only inside that menu.
    const root = within === null ? document : document.querySelectorAll("details")[within];
    const canvas = document.createElement("canvas").getContext("2d");
    const visible = (el) => {
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height)
            return false;
        for (let n = el; n; n = n.parentElement) {
            const s = getComputedStyle(n);
            if (s.visibility === "hidden" || s.display === "none" || Number(s.opacity) < 0.05)
                return false;
            if (n.tagName === "DETAILS" && !n.open && n !== el && !el.closest("summary"))
                return false;
        }
        return !el.closest("[inert], [hidden], .sr-only, .visually-hidden");
    };
    const path = (el) => {
        const parts = [];
        for (let n = el; n && n !== document.body && parts.length < 3; n = n.parentElement)
            parts.unshift(n.tagName.toLowerCase() + (n.id ? `#${n.id}` : "") + [...n.classList].slice(0, 2).map((c) => `.${c}`).join(""));
        return parts.join(" > ");
    };
    // The first line of words after (or before) the symbol in its row: a text node's first client rect.
    const firstLine = (row, symbol) => {
        const walker = document.createTreeWalker(row, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
            const node = walker.currentNode;
            if (!node.textContent.trim() || symbol.contains(node))
                continue;
            const parent = node.parentElement;
            if (!visible(parent) || parent.closest(".sr-only, .visually-hidden, [aria-hidden=true]"))
                continue;
            // Words inside a control of their own (a notice's action button) are not this symbol's line.
            if (parent.closest("button, .button, a.button, input, select, textarea") !== symbol.closest("button, .button"))
                continue;
            const range = document.createRange();
            range.selectNodeContents(node);
            const rect = [...range.getClientRects()].find((r) => r.width > 0);
            if (!rect)
                continue;
            const s = getComputedStyle(parent);
            canvas.font = `${s.fontStyle} ${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
            const m = canvas.measureText(node.textContent.trim());
            const cap = canvas.measureText("H").actualBoundingBoxAscent;
            const baseline = rect.top + m.fontBoundingBoxAscent;
            return { text: node.textContent.trim().slice(0, 40), left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, capCentre: baseline - cap / 2 };
        }
        return null;
    };
    const out = [];
    for (const symbol of root.querySelectorAll("svg.icon, .signal-mark")) {
        if (!visible(symbol))
            continue;
        // The row: the nearest ancestor that lays the symbol beside other content (flex row, or inline).
        let row = symbol.parentElement;
        while (row && row.children.length < 2 && !(row.textContent ?? "").trim())
            row = row.parentElement;
        if (!row)
            continue;
        const line = firstLine(row, symbol);
        if (!line)
            continue;
        const r = symbol.getBoundingClientRect();
        // Leading the words, not above or below them (a stacked icon is not on a line). A trailing symbol (a
        // list row's chevron) centres on the row, as lists do, so only a leading one is held to the line.
        const beside = r.right <= line.left + 1;
        if (!beside || r.bottom < line.top - 24 || r.top > line.bottom + 24)
            continue;
        out.push({ selector: path(symbol), text: line.text, symbol: { x: r.x + scrollX, y: r.y + scrollY, width: r.width, height: r.height }, offset: Math.round((r.top + r.height / 2 - line.capCentre) * 10) / 10 });
    }
    return out;
}
/** A symbol 1.5 px or more off its line's cap centre is an error (D-69); under that, nothing. */
export function symbolFindings(obs) {
    return obs
        .filter((o) => Math.abs(o.offset) >= 1.5)
        .map((o) => ({
        rule: "alignment-symbol-line",
        severity: "error",
        selector: o.selector,
        value: `centre ${Math.abs(o.offset)}px ${o.offset > 0 ? "below" : "above"} the cap centre of "${o.text}"`,
        expected: "the symbol centred on the cap centre of its words' first line (within 1.5 px)",
        note: "an icon or signal mark beside words (D-69); see the red-line report (--redlines)",
        box: o.symbol,
        measured: { offset: o.offset },
    }));
}

// A chart as one SVG string, for a place that has no browser: a Slack image, an email, a PDF (rich answers v1, the `Chart` shape of
// the presentation contract). Pure and deterministic: the same input gives the same string, no clock, no random, no locale of the
// machine (months and number marks are tables here, never Intl).
//
// It is built for a rasteriser such as resvg, not a browser, so it uses only plain presentation attributes: no script, no
// foreignObject, no external href, no <style>, no CSS variables, no filter, no gradient. Every colour is a token value,
// copied in at build time (the roles of src/family.ts, so the chart slots, border, muted-foreground and the surface are the
// package's own and a customer theme is not applied).
//
// FONTS. The text is set in Archivo with an Arial / generic sans fallback (`font-family="Archivo, Arial, sans-serif"`).
// A rasteriser with no system fonts (resvg-wasm in a Worker) draws NO text unless a font is loaded into it: load Archivo as
// TTF or OTF (regular 400 and bold 700; resvg reads TTF/OTF/TTC, not the package's woff2) and set `defaultFontFamily` to
// "Archivo". Nothing here loads a font.
//
// Marks never rely on colour alone (brand/charts.md section 4): a series also has its own marker shape (circle, square,
// triangle, diamond) when the line has 31 points or fewer, and the legend shows the same swatch. Gaps (a null or NaN value)
// break a line and leave no bar. Nothing throws: input outside the contract is clamped (4 series, 400 points) and said so in
// a small note, and a chart with nothing to draw says so calmly.
import { ROLES } from "./family.js";
export const CHART_MAX_SERIES = 4;
export const CHART_MAX_POINTS = 400;
export const CHART_FONT_FAMILY = "Archivo, Arial, sans-serif";
const WORDS = {
    da: {
        noData: "Ingen data",
        clampSeries: (shown, all) => `Viser de første ${shown} serier af ${all}.`,
        clampPoints: (shown, all) => `Viser de første ${shown} punkter af ${all}.`,
        months: ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"],
        source: "Kilde",
    },
    en: {
        noData: "No data",
        clampSeries: (shown, all) => `Showing the first ${shown} of ${all} series.`,
        clampPoints: (shown, all) => `Showing the first ${shown} of ${all} points.`,
        months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        source: "Source",
    },
};
const NBSP = " ";
function esc(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
/** A number for an attribute: at most 2 decimals, no exponent, no "-0". */
function n(v) {
    const r = Math.round(v * 100) / 100;
    return String(Object.is(r, -0) ? 0 : r);
}
/** A finite number from a cell, else null (a string that is a plain number counts). */
function num(v) {
    if (typeof v === "number")
        return Number.isFinite(v) ? v : null;
    if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)))
        return Number(v);
    return null;
}
/** A number in the reader's marks: Danish "12.345,6", English "12,345.6". */
export function formatNumber(v, decimals, lang) {
    const d = Math.max(0, Math.min(10, Math.trunc(decimals)));
    const fixed = Math.abs(v).toFixed(d);
    const [int = "0", frac] = fixed.split(".");
    const group = lang === "da" ? "." : ",";
    const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, group);
    const body = frac === undefined ? grouped : `${grouped}${lang === "da" ? "," : "."}${frac}`;
    return (v < 0 && Number(fixed) !== 0 ? "-" : "") + body;
}
/** A date as "17. nov 2026" (da) or "17 Nov 2026" (en); text that is not an ISO date comes back as it is. */
export function formatDate(s, lang) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
    if (m === null)
        return s;
    const month = Number(m[2]);
    if (month < 1 || month > 12)
        return s;
    const day = Number(m[3]);
    const name = WORDS[lang].months[month - 1];
    return lang === "da" ? `${day}. ${name} ${m[1]}` : `${day} ${name} ${m[1]}`;
}
function dayNumber(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
    if (m === null)
        return null;
    const t = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return Number.isFinite(t) ? t / 86_400_000 : null;
}
/** Ticks on 1, 2 or 5 times a power of ten, covering [lo, hi], about `target` of them. */
export function niceTicks(lo, hi, target) {
    if (!(Number.isFinite(lo) && Number.isFinite(hi)))
        return [0, 1];
    if (hi < lo)
        [lo, hi] = [hi, lo];
    if (hi === lo) {
        if (lo === 0)
            return [0, 1];
        const pad = Math.abs(lo) / 2;
        lo -= pad;
        hi += pad;
    }
    const raw = (hi - lo) / Math.max(1, target);
    const mag = 10 ** Math.floor(Math.log10(raw));
    const f = raw / mag;
    const step = (f <= 1.5 ? 1 : f <= 3 ? 2 : f <= 7 ? 5 : 10) * mag;
    const first = Math.floor(lo / step + 1e-9) * step;
    const out = [];
    for (let i = 0; i < 1000; i++) {
        const t = Math.round((first + i * step) / step) * step;
        out.push(Number(t.toPrecision(12)));
        if (t >= hi - step * 1e-9)
            break;
    }
    return out;
}
function stepDecimals(ticks) {
    if (ticks.length < 2)
        return 0;
    const step = Math.abs(ticks[1] - ticks[0]);
    for (let d = 0; d <= 6; d++)
        if (Math.abs(step * 10 ** d - Math.round(step * 10 ** d)) < 1e-6)
            return d;
    return 6;
}
const MARKERS = ["circle", "square", "triangle", "diamond"];
function marker(shape, x, y, fill, bg) {
    const r = 3.5;
    const common = `fill="${fill}" stroke="${bg}" stroke-width="1"`;
    switch (shape) {
        case "circle":
            return `<circle cx="${n(x)}" cy="${n(y)}" r="${r}" ${common}/>`;
        case "square":
            return `<rect x="${n(x - r)}" y="${n(y - r)}" width="${n(2 * r)}" height="${n(2 * r)}" ${common}/>`;
        case "triangle":
            return `<polygon points="${n(x)},${n(y - r - 1)} ${n(x + r + 1)},${n(y + r)} ${n(x - r - 1)},${n(y + r)}" ${common}/>`;
        case "diamond":
            return `<polygon points="${n(x)},${n(y - r - 1)} ${n(x + r + 1)},${n(y)} ${n(x)},${n(y + r + 1)} ${n(x - r - 1)},${n(y)}" ${common}/>`;
    }
}
function text(x, y, s, o) {
    const anchor = o.anchor === undefined || o.anchor === "start" ? "" : ` text-anchor="${o.anchor}"`;
    const weight = o.weight === undefined ? "" : ` font-weight="${o.weight}"`;
    return `<text x="${n(x)}" y="${n(y)}" font-family="${CHART_FONT_FAMILY}" font-size="${o.size}"${weight}${anchor} fill="${o.fill}">${esc(s)}</text>`;
}
/** A rough width of `s` at `size` px in Archivo (about 0.56 em a character), to place labels without measuring. */
const textWidth = (s, size) => s.length * size * 0.56;
/** Cut `s` to about `max` px with an ellipsis. */
function fit(s, size, max) {
    if (textWidth(s, size) <= max)
        return s;
    const keep = Math.max(1, Math.floor(max / (size * 0.56)) - 1);
    return `${s.slice(0, keep)}…`;
}
const defaultDecimals = (s) => s.decimals !== undefined && Number.isFinite(s.decimals) ? Math.max(0, Math.trunc(s.decimals)) : s.type === "money" ? 2 : 0;
/** A value as its label shows it: the number in the reader's marks, with the percent sign for a percent. */
function valueText(v, s, lang) {
    const body = formatNumber(v, defaultDecimals(s), lang);
    return s.type === "percent" ? `${body}${NBSP}%` : body;
}
/**
 * The chart as an SVG document string, `width` by `height` px. See the header for what the output promises and for the font
 * the rasteriser must load.
 */
export function chartSvg(chart, opts) {
    const lang = opts?.lang === "en" ? "en" : "da";
    const mode = opts?.theme === "dark" ? "dark" : "light";
    const W = Number.isFinite(opts?.width) ? Math.max(160, Math.round(opts.width)) : 800;
    const H = Number.isFinite(opts?.height) ? Math.max(120, Math.round(opts.height)) : 400;
    const c = ROLES[mode];
    const words = WORDS[lang];
    const body = [];
    const bg = c.card;
    const ink = c["card-foreground"];
    const muted = c["muted-foreground"];
    const grid = c.border;
    const all = chart !== null && typeof chart === "object" ? chart : {};
    const allSeries = Array.isArray(all.y) ? all.y.filter((s) => s !== null && typeof s === "object" && typeof s.key === "string") : [];
    const allRows = Array.isArray(all.rows) ? all.rows.filter((r) => r !== null && typeof r === "object") : [];
    const series = allSeries.slice(0, CHART_MAX_SERIES);
    const rows = allRows.slice(0, CHART_MAX_POINTS);
    const xKey = all.x?.key ?? "";
    const xType = all.x?.type === "date" || all.x?.type === "number" ? all.x.type : "text";
    const notes = [];
    if (allSeries.length > series.length)
        notes.push(words.clampSeries(series.length, allSeries.length));
    if (allRows.length > rows.length)
        notes.push(words.clampPoints(rows.length, allRows.length));
    const kind = all.type === "bar" ? "bar" : "line";
    // data: values[s][i] a finite number or null
    const values = series.map((s) => rows.map((r) => num(r[s.key])));
    const hasData = values.some((vs) => vs.some((v) => v !== null));
    const names = series.map((x) => x.label).join(", ");
    const kindWord0 = lang === "da" ? (kind === "bar" ? "Søjlediagram" : "Linjediagram") : kind === "bar" ? "Bar chart" : "Line chart";
    const describe = () => {
        const parts = [kindWord0 + "."];
        if (names !== "")
            parts.push(`${lang === "da" ? "Serier" : "Series"}: ${names}.`);
        if (rows.length > 0) {
            const at = (i) => {
                const v = rows[i]?.[xKey];
                return v === null || v === undefined ? "" : xType === "date" && typeof v === "string" ? formatDate(v, lang) : String(v);
            };
            const a = at(0);
            const b = at(rows.length - 1);
            if (a !== "" && b !== "")
                parts.push(lang === "da" ? `${all.x?.label ?? ""} fra ${a} til ${b}.` : `${all.x?.label ?? ""} from ${a} to ${b}.`);
        }
        if (!hasData)
            parts.push(words.noData + ".");
        else
            series.forEach((x, si) => {
                const fl = values[si].filter((v) => v !== null);
                if (fl.length === 0)
                    return;
                const [lo, hi] = [Math.min(...fl), Math.max(...fl)].map((v) => valueText(v, x, lang));
                parts.push(lang === "da" ? `${x.label}: laveste ${lo}, højeste ${hi}.` : `${x.label}: lowest ${lo}, highest ${hi}.`);
            });
        return parts.join(" ");
    };
    // header: title, then legend (2+ series)
    const left = 16;
    const right = W - 16;
    let top = 16;
    if (typeof all.title === "string" && all.title !== "") {
        body.push(text(left, top + 13, fit(all.title, 14, right - left), { size: 14, fill: ink, weight: 700 }));
        top += 26;
    }
    if (series.length >= 2) {
        let x = left;
        let y = top + 10;
        series.forEach((s, i) => {
            const label = s.unit !== undefined && s.unit !== "" && s.type !== "percent" ? `${s.label} (${s.unit})` : s.label;
            const t = fit(label, 12, right - left - 24);
            const w = 22 + textWidth(t, 12) + 16;
            if (x + w > right && x > left) {
                x = left;
                y += 18;
            }
            const hue = c[`chart-${i + 1}`];
            if (kind === "bar")
                body.push(`<rect x="${n(x)}" y="${n(y - 9)}" width="10" height="10" rx="2" fill="${hue}"/>`);
            else
                body.push(`<line x1="${n(x)}" y1="${n(y - 4)}" x2="${n(x + 14)}" y2="${n(y - 4)}" stroke="${hue}" stroke-width="2"/>` +
                    marker(MARKERS[i], x + 7, y - 4, hue, bg));
            body.push(text(x + 20, y, t, { size: 12, fill: ink }));
            x += w;
        });
        top = y + 12;
    }
    // footer: source and notes
    let bottom = H - 12;
    const foot = [];
    if (typeof all.source === "string" && all.source !== "")
        foot.push(`${words.source}: ${all.source}`);
    foot.push(...notes);
    if (foot.length > 0) {
        const line = fit(foot.join(" · "), 11, right - left);
        body.push(text(left, bottom, line, { size: 11, fill: muted }));
        bottom -= 20;
    }
    if (!hasData) {
        body.push(text(W / 2, (top + bottom) / 2 + 4, words.noData, { size: 14, fill: muted, anchor: "middle" }));
        return doc(W, H, bg, body, describe(), typeof all.title === "string" && all.title !== "" ? all.title : names === "" ? kindWord0 : `${kindWord0}: ${names}`, `cs-${hash(JSON.stringify([chart ?? null, opts ?? null]))}`);
    }
    // y domain
    const flat = values.flat().filter((v) => v !== null);
    let lo = Math.min(...flat);
    let hi = Math.max(...flat);
    if (kind === "bar" || (lo >= 0 && lo <= hi * 0.5))
        lo = Math.min(lo, 0);
    if (kind === "bar")
        hi = Math.max(hi, 0);
    const plotH0 = bottom - top - 28;
    const ticks = niceTicks(lo, hi, Math.max(2, Math.min(6, Math.floor(plotH0 / 44))));
    const yMin = ticks[0];
    const yMax = ticks[ticks.length - 1];
    const stepDec = stepDecimals(ticks);
    const tickDec = stepDec;
    const units = new Set(series.map((s) => (s.type === "percent" ? "" : (s.unit ?? ""))));
    const unitLabel = units.size === 1 ? [...units][0] : "";
    const allPercent = series.every((s) => s.type === "percent");
    const tickLabel = (v) => allPercent ? `${formatNumber(v, tickDec, lang)}${NBSP}%` : formatNumber(v, tickDec, lang);
    const labelW = Math.max(...ticks.map((t) => textWidth(tickLabel(t), 12)));
    // unit above the axis
    if (unitLabel !== "") {
        body.push(text(left, top + 10, unitLabel, { size: 11, fill: muted }));
        top += 16;
    }
    const plotL = left + labelW + 10;
    const plotR = right - 4;
    const plotT = top + 6;
    const plotB = bottom - 22;
    const yAt = (v) => plotB - ((v - yMin) / (yMax - yMin || 1)) * (plotB - plotT);
    // grid and y labels
    for (const t of ticks) {
        const y = yAt(t);
        body.push(`<line x1="${n(plotL)}" y1="${n(y)}" x2="${n(plotR)}" y2="${n(y)}" stroke="${grid}" stroke-width="1"/>`, text(plotL - 8, y + 4, tickLabel(t), { size: 12, fill: muted, anchor: "end" }));
    }
    // x positions
    const count = rows.length;
    const xs = [];
    const xValues = rows.map((r) => {
        const v = r[xKey];
        if (xType === "date")
            return typeof v === "string" ? dayNumber(v) : null;
        if (xType === "number")
            return num(v);
        return null;
    });
    const proportional = kind === "line" && xType !== "text" && xValues.every((v) => v !== null) && count > 1;
    if (kind === "bar") {
        const band = (plotR - plotL) / count;
        for (let i = 0; i < count; i++)
            xs.push(plotL + band * (i + 0.5));
    }
    else if (proportional) {
        const vs = xValues;
        const a = Math.min(...vs);
        const b = Math.max(...vs);
        const inset = 8;
        for (const v of vs)
            xs.push(b === a ? (plotL + plotR) / 2 : plotL + inset + ((v - a) / (b - a)) * (plotR - plotL - 2 * inset));
    }
    else {
        const inset = 8;
        for (let i = 0; i < count; i++)
            xs.push(count === 1 ? (plotL + plotR) / 2 : plotL + inset + (i / (count - 1)) * (plotR - plotL - 2 * inset));
    }
    // x labels: as many as fit, evenly by index, never overlapping
    const xLabel = (i) => {
        const v = rows[i]?.[xKey];
        if (v === null || v === undefined)
            return "";
        if (xType === "date" && typeof v === "string")
            return formatDate(v, lang);
        if (xType === "number") {
            const k = num(v);
            return k === null ? String(v) : formatNumber(k, Number.isInteger(k) ? 0 : 2, lang);
        }
        return String(v);
    };
    const labels = rows.map((_, i) => xLabel(i));
    const widest = Math.max(1, ...labels.map((l) => textWidth(l, 12)));
    const room = plotR - plotL;
    const slots = Math.max(1, Math.floor(room / (widest + 16)));
    // bars name every category (cut to its band); a line thins its labels so none overlap
    const every = kind === "bar" ? Math.max(1, Math.ceil(count / Math.max(1, Math.floor(room / 40)))) : Math.max(1, Math.ceil(count / slots));
    const maxLabelW = kind === "bar" ? Math.max(24, (room / count) * every - 6) : widest;
    for (let i = 0; i < count; i += every) {
        const l = labels[i];
        if (l === "")
            continue;
        const x = xs[i];
        const anchor = i === 0 && kind === "line" && x - textWidth(l, 12) / 2 < plotL - labelW ? "start" : "middle";
        body.push(text(x, plotB + 16, fit(l, 12, maxLabelW), { size: 12, fill: muted, anchor }));
    }
    // baseline at zero when the axis crosses it
    if (yMin < 0 && yMax > 0) {
        body.push(`<line x1="${n(plotL)}" y1="${n(yAt(0))}" x2="${n(plotR)}" y2="${n(yAt(0))}" stroke="${muted}" stroke-width="1"/>`);
    }
    if (kind === "bar") {
        const band = (plotR - plotL) / count;
        const groupW = Math.min(band * 0.7, 56 * series.length);
        const barW = groupW / series.length;
        const zero = yAt(Math.max(yMin, Math.min(0, yMax)));
        series.forEach((_, si) => {
            const hue = c[`chart-${series.length === 1 ? 1 : si + 1}`];
            values[si].forEach((v, i) => {
                if (v === null)
                    return;
                const x = xs[i] - groupW / 2 + si * barW;
                const y = yAt(v);
                const top2 = Math.min(y, zero);
                const h = Math.max(1, Math.abs(zero - y));
                body.push(`<rect x="${n(x + 0.5)}" y="${n(top2)}" width="${n(Math.max(1, barW - 1))}" height="${n(h)}" fill="${hue}"/>`);
                // the value on the bar when it fits the bar's own width
                const t = valueText(v, series[si], lang);
                if (count <= 12 && textWidth(t, 11) <= barW + 2 && (v >= 0 ? top2 - 4 > plotT - 4 : true))
                    body.push(text(x + barW / 2, v >= 0 ? top2 - 4 : top2 + h + 12, t, { size: 11, fill: ink, anchor: "middle" }));
            });
        });
    }
    else {
        const labelYs = [];
        series.forEach((_, si) => {
            const hue = c[`chart-${si + 1}`];
            let d = "";
            let pen = false;
            values[si].forEach((v, i) => {
                if (v === null) {
                    pen = false;
                    return;
                }
                d += `${pen ? "L" : "M"}${n(xs[i])} ${n(yAt(v))}`;
                pen = true;
            });
            if (d !== "")
                body.push(`<path d="${d}" fill="none" stroke="${hue}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`);
            const lastAt = values[si].reduce((acc, v, i) => (v === null ? acc : i), -1);
            if (lastAt >= 0) {
                const lv = values[si][lastAt];
                // above the point, or below it when the line arrives from above (so the label never sits on the segment)
                const before = values[si].slice(0, lastAt).reverse().find((v) => v !== null);
                const ly = before !== undefined && before > lv ? yAt(lv) + 17 : yAt(lv) - 8;
                const clash = labelYs.some((y) => Math.abs(y - ly) < 13);
                if (!clash) {
                    labelYs.push(ly);
                    body.push(text(Math.min(xs[lastAt], plotR), ly, valueText(lv, series[si], lang), { size: 11, fill: ink, anchor: "end" }));
                }
            }
            if (count <= 31) {
                values[si].forEach((v, i) => {
                    if (v !== null)
                        body.push(marker(MARKERS[si], xs[i], yAt(v), hue, bg));
                });
            }
        });
    }
    return doc(W, H, bg, body, describe(), typeof all.title === "string" && all.title !== "" ? all.title : names === "" ? kindWord0 : `${kindWord0}: ${names}`, `cs-${hash(JSON.stringify([chart ?? null, opts ?? null]))}`);
}
/** A short deterministic id part from the input (FNV-1a, base 36). */
function hash(s) {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++)
        h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
    return h.toString(36);
}
/** The document: role img named by its title and described by its desc (both elements carry deterministic ids). */
function doc(W, H, bg, body, desc, title, id) {
    return (`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="${id}-t ${id}-d">` +
        `<title id="${id}-t">${esc(title)}</title><desc id="${id}-d">${esc(desc)}</desc>` +
        `<rect x="0" y="0" width="${W}" height="${H}" fill="${bg}"/>` +
        body.join("") +
        `</svg>`);
}

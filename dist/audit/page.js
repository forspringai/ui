/// <reference lib="dom" />
// What the audit measures inside the page. collect() runs in Chromium through page.evaluate, so it
// is one self-contained function: Playwright sends its source text, and nothing it calls may live
// outside it. It returns measurements, not verdicts; audit.ts holds the rules and the token values.
export function collect() {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    // Computed colours come back as rgb(), rgba() or, for color-mix() and the wide-gamut spaces,
    // color(srgb ...) and oklch(). The first two are parsed; the rest are painted on a canvas and read.
    const parse = (s) => {
        let m = /^rgba?\(([^)]+)\)$/.exec(s);
        if (m) {
            const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
            return [p[0], p[1], p[2], p[3] ?? 1];
        }
        m = /^color\(srgb ([^)]+)\)$/.exec(s);
        if (m) {
            const p = m[1].split(/[\s/]+/).filter(Boolean).map(Number);
            return [p[0] * 255, p[1] * 255, p[2] * 255, p[3] ?? 1];
        }
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = "#000";
        ctx.fillStyle = s;
        ctx.fillRect(0, 0, 1, 1);
        const d = ctx.getImageData(0, 0, 1, 1).data;
        return [d[0], d[1], d[2], d[3] / 255];
    };
    const selector = (el) => {
        const parts = [];
        for (let n = el; n && n !== document.documentElement && parts.length < 3; n = n.parentElement) {
            let seg = n.tagName.toLowerCase();
            if (n.id) {
                parts.unshift(`${seg}#${n.id}`);
                break;
            }
            const classes = [...n.classList].slice(0, 2);
            if (classes.length)
                seg += "." + classes.join(".");
            parts.unshift(seg);
        }
        return parts.join(" > ");
    };
    const skipTags = new Set(["SCRIPT", "STYLE", "TEMPLATE", "NOSCRIPT", "LINK", "META", "TITLE", "BR", "WBR", "OPTION", "OPTGROUP"]);
    const rendered = (el) => el.checkVisibility({ visibilityProperty: true });
    // Off the page (the skip link at -9999px until focused) or a 1px visually-hidden box.
    const onScreen = (r) => r.width > 1 && r.height > 1 && r.right + scrollX > 0 && r.bottom + scrollY > 0;
    const textInputs = new Set(["text", "email", "password", "search", "number", "tel", "url", "submit", "button", "reset", "date", "time", "datetime-local", "month", "week"]);
    const dark = (() => {
        const scheme = getComputedStyle(document.documentElement).colorScheme;
        if (scheme === "dark")
            return true;
        return scheme.includes("dark") && matchMedia("(prefers-color-scheme: dark)").matches;
    })();
    // Chromium's canvas behind a page that paints no background of its own.
    const canvasColour = dark ? [18, 18, 18] : [255, 255, 255];
    const background = (el) => {
        const layers = [];
        for (let n = el; n; n = n.parentElement) {
            const s = getComputedStyle(n);
            if (s.backgroundImage !== "none")
                return { bg: null, imageOn: selector(n) };
            const c = parse(s.backgroundColor);
            if (c[3] > 0) {
                layers.push(c);
                if (c[3] >= 1)
                    break;
            }
        }
        let out = canvasColour;
        for (const [r, g, b, a] of layers.reverse())
            out = [r * a + out[0] * (1 - a), g * a + out[1] * (1 - a), b * a + out[2] * (1 - a)];
        return { bg: out };
    };
    const texts = [];
    const boxes = [];
    const all = [document.body, ...document.body.querySelectorAll("*")];
    for (const el of all) {
        if (skipTags.has(el.tagName) || el instanceof SVGElement || !rendered(el))
            continue;
        const s = getComputedStyle(el);
        const gsi = el.closest(".gsi") !== null;
        const isInput = el instanceof HTMLInputElement ? textInputs.has(el.type) : el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement;
        const hasText = isInput || [...el.childNodes].some((c) => c.nodeType === Node.TEXT_NODE && (c.textContent ?? "").trim() !== "");
        if (hasText && onScreen(el.getBoundingClientRect())) {
            const fg = parse(s.color);
            if (fg[3] > 0) {
                texts.push({
                    selector: selector(el),
                    size: parseFloat(s.fontSize),
                    weight: Number(s.fontWeight) || 400,
                    family: (s.fontFamily.split(",")[0] ?? "").trim().replace(/^["']|["']$/g, ""),
                    h1: el.closest("h1") !== null,
                    gsi,
                    disabled: el.closest(':disabled, [aria-disabled="true"]') !== null,
                    fg,
                    ...background(el),
                });
            }
        }
        const map = el.computedStyleMap();
        const spacing = [];
        const flexOrGrid = /flex|grid/.test(s.display);
        for (const prop of ["margin-top", "margin-right", "margin-bottom", "margin-left", "padding-top", "padding-right", "padding-bottom", "padding-left", "row-gap", "column-gap"]) {
            if (prop.endsWith("gap") && !flexOrGrid)
                continue;
            // The typed OM gives computed values, so auto margins stay "auto" (getComputedStyle would
            // give the used px of a centred box) and percentages stay percentages.
            const v = map.get(prop);
            if (v instanceof CSSUnitValue && v.unit === "px" && v.value !== 0)
                spacing.push({ prop, px: v.value });
        }
        const colours = [];
        const bg = parse(s.backgroundColor);
        if (bg[3] > 0)
            colours.push({ prop: "background-color", rgba: bg });
        for (const side of ["top", "right", "bottom", "left"]) {
            const width = s.getPropertyValue(`border-${side}-width`);
            const style = s.getPropertyValue(`border-${side}-style`);
            if (width === "0px" || style === "none" || style === "hidden")
                continue;
            const c = parse(s.getPropertyValue(`border-${side}-color`));
            if (c[3] > 0)
                colours.push({ prop: `border-${side}-color`, rgba: c });
        }
        if (hasText) {
            const fg = parse(s.color);
            if (fg[3] > 0)
                colours.push({ prop: "color", rgba: fg });
        }
        boxes.push({
            selector: selector(el),
            gsi,
            radii: [s.borderTopLeftRadius, s.borderTopRightRadius, s.borderBottomRightRadius, s.borderBottomLeftRadius],
            spacing,
            colours,
        });
    }
    const targets = [];
    for (const el of document.querySelectorAll('a[href], button, input:not([type="hidden"]), select, [role="switch"], summary')) {
        if (!rendered(el) || el.matches(":disabled"))
            continue;
        const r = el.getBoundingClientRect();
        if (!onScreen(r))
            continue;
        targets.push({ el, r, small: r.width < 23.5 || r.height < 23.5 });
    }
    const centre = (r) => [r.left + r.width / 2, r.top + r.height / 2];
    const distToRect = (x, y, r) => Math.hypot(Math.max(r.left - x, 0, x - r.right), Math.max(r.top - y, 0, y - r.bottom));
    const inSentence = (el) => el.tagName === "A" && el.parentElement !== null && [...el.parentElement.childNodes].some((c) => c.nodeType === Node.TEXT_NODE && (c.textContent ?? "").trim() !== "");
    const labelOf = (el) => {
        const wrap = el.closest("label");
        if (wrap)
            return wrap;
        return el.id ? document.querySelector(`label[for="${CSS.escape(el.id)}"]`) : null;
    };
    const smallTargets = [];
    for (const t of targets) {
        if (!t.small || inSentence(t.el))
            continue;
        const label = labelOf(t.el)?.getBoundingClientRect();
        if (label && label.width >= 23.5 && label.height >= 23.5)
            continue;
        const [x, y] = centre(t.r);
        const clash = targets.some((o) => {
            if (o === t || o.el.contains(t.el) || t.el.contains(o.el))
                return false;
            if (distToRect(x, y, o.r) < 12)
                return true;
            if (!o.small)
                return false;
            const [ox, oy] = centre(o.r);
            return Math.hypot(x - ox, y - oy) < 24;
        });
        if (clash)
            smallTargets.push({ selector: selector(t.el), width: Math.round(t.r.width * 10) / 10, height: Math.round(t.r.height * 10) / 10 });
    }
    const primaries = [];
    for (const el of document.querySelectorAll('button, .button, input[type="submit"], input[type="button"], input[type="reset"]')) {
        // The switch is a control with its own 44 px hit area; Google's button is 40 px by Google's
        // guidelines (D-5).
        if (el.matches('[role="switch"], .switch') || el.closest(".gsi") || !rendered(el))
            continue;
        const r = el.getBoundingClientRect();
        if (onScreen(r))
            primaries.push({ selector: selector(el), width: Math.round(r.width * 10) / 10, height: Math.round(r.height * 10) / 10 });
    }
    const fonts = [...new Set([...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family.replace(/^["']|["']$/g, "")))];
    return { texts, boxes, smallTargets, primaries, fonts };
}

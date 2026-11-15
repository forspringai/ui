/// <reference lib="dom" />
// What the audit measures inside the page. collect() runs in Chromium through page.evaluate, so it
// is one self-contained function: Playwright sends its source text, and nothing it calls may live
// outside it. It returns measurements, not verdicts; audit.ts holds the rules and the token values.

export type Rgba = [number, number, number, number];

export type TextObservation = {
  selector: string;
  size: number;
  weight: number;
  family: string;
  h1: boolean;
  gsi: boolean;
  disabled: boolean;
  fg: Rgba;
  /** The composited background, or null when a background image sits under the text. */
  bg: [number, number, number] | null;
  /** The element carrying the background image, when bg is null. */
  imageOn?: string;
};

export type BoxObservation = {
  selector: string;
  gsi: boolean;
  /** Computed border-*-radius, one string per corner ("3px", "50%", "3px 6px"). */
  radii: string[];
  /** Margins, paddings and (on flex and grid containers) gaps that are lengths in px. */
  spacing: { prop: string; px: number }[];
  /** Background and visible border colours (text colour is on the text observations). */
  colours: { prop: string; rgba: Rgba }[];
};

/** An element shadcn marked with data-slot, measured for the rich-app check (D-33). */
export type SlotObservation = {
  selector: string;
  slot: string;
  /** data-size, which shadcn sets on buttons and select triggers ("default", "sm", "icon"), or null. */
  size: string | null;
  radii: string[];
  /** Computed min-height in px; 0 for auto or none. */
  minHeight: number;
  /** The rendered height in px. */
  height: number;
  fontSize: number;
};

export type TargetObservation = { selector: string; width: number; height: number };

export type Observations = {
  texts: TextObservation[];
  boxes: BoxObservation[];
  /** Targets under 24 by 24 px that no exception (inline link, label, spacing) covers. */
  smallTargets: TargetObservation[];
  /** Buttons, for the 44 px floor on phones. */
  primaries: TargetObservation[];
  /** Families of the font faces the page loaded. */
  fonts: string[];
  /** Every rendered element with a data-slot; audit.ts checks the known ones under --rich-app. */
  slots: SlotObservation[];
};

export function collect(): Observations {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

  // Computed colours come back as rgb(), rgba() or, for color-mix() and the wide-gamut spaces,
  // color(srgb ...) and oklch(). The first two are parsed; the rest are painted on a canvas and read.
  const parse = (s: string): Rgba => {
    let m = /^rgba?\(([^)]+)\)$/.exec(s);
    if (m) {
      const p = m[1]!.split(/[\s,/]+/).filter(Boolean).map(Number);
      return [p[0]!, p[1]!, p[2]!, p[3] ?? 1];
    }
    m = /^color\(srgb ([^)]+)\)$/.exec(s);
    if (m) {
      const p = m[1]!.split(/[\s/]+/).filter(Boolean).map(Number);
      return [p[0]! * 255, p[1]! * 255, p[2]! * 255, p[3] ?? 1];
    }
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = "#000";
    ctx.fillStyle = s;
    ctx.fillRect(0, 0, 1, 1);
    const d = ctx.getImageData(0, 0, 1, 1).data;
    return [d[0]!, d[1]!, d[2]!, d[3]! / 255];
  };

  const selector = (el: Element): string => {
    const parts: string[] = [];
    for (let n: Element | null = el; n && n !== document.documentElement && parts.length < 3; n = n.parentElement) {
      let seg = n.tagName.toLowerCase();
      if (n.id) {
        parts.unshift(`${seg}#${n.id}`);
        break;
      }
      const classes = [...n.classList].slice(0, 2);
      if (classes.length) seg += "." + classes.join(".");
      parts.unshift(seg);
    }
    return parts.join(" > ");
  };

  const skipTags = new Set(["SCRIPT", "STYLE", "TEMPLATE", "NOSCRIPT", "LINK", "META", "TITLE", "BR", "WBR", "OPTION", "OPTGROUP"]);
  const rendered = (el: Element) => el.checkVisibility({ visibilityProperty: true });
  // Off the page (the skip link at -9999px until focused) or a 1px visually-hidden box.
  const onScreen = (r: DOMRect) => r.width > 1 && r.height > 1 && r.right + scrollX > 0 && r.bottom + scrollY > 0;
  const textInputs = new Set(["text", "email", "password", "search", "number", "tel", "url", "submit", "button", "reset", "date", "time", "datetime-local", "month", "week"]);

  const dark = (() => {
    const scheme = getComputedStyle(document.documentElement).colorScheme;
    if (scheme === "dark") return true;
    return scheme.includes("dark") && matchMedia("(prefers-color-scheme: dark)").matches;
  })();
  // Chromium's canvas behind a page that paints no background of its own.
  const canvasColour: [number, number, number] = dark ? [18, 18, 18] : [255, 255, 255];

  const background = (el: Element): { bg: [number, number, number] | null; imageOn?: string } => {
    const layers: Rgba[] = [];
    for (let n: Element | null = el; n; n = n.parentElement) {
      const s = getComputedStyle(n);
      // A select's own background image is its chevron, drawn in the padding beside the text and
      // never under it (components.css, D-14), so its text is measured on its background colour.
      const chevron = n === el && n instanceof HTMLSelectElement && /^(linear-gradient\([^]*\)(, )?)+$/.test(s.backgroundImage);
      if (s.backgroundImage !== "none" && !chevron) return { bg: null, imageOn: selector(n) };
      const c = parse(s.backgroundColor);
      if (c[3] > 0) {
        layers.push(c);
        if (c[3] >= 1) break;
      }
    }
    let out = canvasColour;
    for (const [r, g, b, a] of layers.reverse()) out = [r * a + out[0] * (1 - a), g * a + out[1] * (1 - a), b * a + out[2] * (1 - a)];
    return { bg: out };
  };

  const texts: TextObservation[] = [];
  const boxes: BoxObservation[] = [];
  const all = [document.body, ...document.body.querySelectorAll("*")];
  for (const el of all) {
    if (skipTags.has(el.tagName) || el instanceof SVGElement || !rendered(el)) continue;
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
    const spacing: { prop: string; px: number }[] = [];
    const flexOrGrid = /flex|grid/.test(s.display);
    for (const prop of ["margin-top", "margin-right", "margin-bottom", "margin-left", "padding-top", "padding-right", "padding-bottom", "padding-left", "row-gap", "column-gap"]) {
      if (prop.endsWith("gap") && !flexOrGrid) continue;
      // The typed OM gives computed values, so auto margins stay "auto" (getComputedStyle would
      // give the used px of a centred box) and percentages stay percentages.
      const v = map.get(prop);
      if (v instanceof CSSUnitValue && v.unit === "px" && v.value !== 0) spacing.push({ prop, px: v.value });
    }
    const colours: { prop: string; rgba: Rgba }[] = [];
    const bg = parse(s.backgroundColor);
    if (bg[3] > 0) colours.push({ prop: "background-color", rgba: bg });
    for (const side of ["top", "right", "bottom", "left"]) {
      const width = s.getPropertyValue(`border-${side}-width`);
      const style = s.getPropertyValue(`border-${side}-style`);
      if (width === "0px" || style === "none" || style === "hidden") continue;
      const c = parse(s.getPropertyValue(`border-${side}-color`));
      if (c[3] > 0) colours.push({ prop: `border-${side}-color`, rgba: c });
    }
    if (hasText) {
      const fg = parse(s.color);
      if (fg[3] > 0) colours.push({ prop: "color", rgba: fg });
    }
    boxes.push({
      selector: selector(el),
      gsi,
      radii: [s.borderTopLeftRadius, s.borderTopRightRadius, s.borderBottomRightRadius, s.borderBottomLeftRadius],
      spacing,
      colours,
    });
  }

  // Targets, by WCAG 2.2 SC 2.5.8 (target size, minimum) with its exceptions: a link inside a
  // sentence, a control whose label is the bigger target, and an undersized target whose 24 px circle
  // touches no other target.
  type T = { el: Element; r: DOMRect; small: boolean };
  const targets: T[] = [];
  for (const el of document.querySelectorAll('a[href], button, input:not([type="hidden"]), select, [role="switch"], summary')) {
    if (!rendered(el) || el.matches(":disabled")) continue;
    const r = el.getBoundingClientRect();
    if (!onScreen(r)) continue;
    targets.push({ el, r, small: r.width < 23.5 || r.height < 23.5 });
  }
  const centre = (r: DOMRect) => [r.left + r.width / 2, r.top + r.height / 2] as const;
  const distToRect = (x: number, y: number, r: DOMRect) => Math.hypot(Math.max(r.left - x, 0, x - r.right), Math.max(r.top - y, 0, y - r.bottom));
  const inSentence = (el: Element) =>
    el.tagName === "A" && el.parentElement !== null && [...el.parentElement.childNodes].some((c) => c.nodeType === Node.TEXT_NODE && (c.textContent ?? "").trim() !== "");
  const labelOf = (el: Element): Element | null => {
    const wrap = el.closest("label");
    if (wrap) return wrap;
    return el.id ? document.querySelector(`label[for="${CSS.escape(el.id)}"]`) : null;
  };
  const smallTargets: TargetObservation[] = [];
  for (const t of targets) {
    if (!t.small || inSentence(t.el)) continue;
    const label = labelOf(t.el)?.getBoundingClientRect();
    if (label && label.width >= 23.5 && label.height >= 23.5) continue;
    const [x, y] = centre(t.r);
    const clash = targets.some((o) => {
      if (o === t || o.el.contains(t.el) || t.el.contains(o.el)) return false;
      if (distToRect(x, y, o.r) < 12) return true;
      if (!o.small) return false;
      const [ox, oy] = centre(o.r);
      return Math.hypot(x - ox, y - oy) < 24;
    });
    if (clash) smallTargets.push({ selector: selector(t.el), width: Math.round(t.r.width * 10) / 10, height: Math.round(t.r.height * 10) / 10 });
  }

  const primaries: TargetObservation[] = [];
  for (const el of document.querySelectorAll('button, .button, input[type="submit"], input[type="button"], input[type="reset"]')) {
    // The switch is a control with its own 44 px hit area; Google's button is 40 px by Google's
    // guidelines (D-5).
    if (el.matches('[role="switch"], .switch') || el.closest(".gsi") || !rendered(el)) continue;
    const r = el.getBoundingClientRect();
    if (onScreen(r)) primaries.push({ selector: selector(el), width: Math.round(r.width * 10) / 10, height: Math.round(r.height * 10) / 10 });
  }

  // shadcn's parts (data-slot), measured whatever the run; only --rich-app turns them into findings.
  const slots: SlotObservation[] = [];
  for (const el of document.body.querySelectorAll("[data-slot]")) {
    if (el instanceof SVGElement || !rendered(el)) continue;
    const r = el.getBoundingClientRect();
    if (!onScreen(r)) continue;
    const s = getComputedStyle(el);
    const slot = el.getAttribute("data-slot")!;
    slots.push({
      selector: `${selector(el)}[data-slot="${slot}"]`,
      slot,
      size: el.getAttribute("data-size"),
      radii: [s.borderTopLeftRadius, s.borderTopRightRadius, s.borderBottomRightRadius, s.borderBottomLeftRadius],
      minHeight: parseFloat(s.minHeight) || 0,
      height: Math.round(r.height * 10) / 10,
      fontSize: parseFloat(s.fontSize),
    });
  }

  const fonts = [...new Set([...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family.replace(/^["']|["']$/g, "")))];
  return { texts, boxes, smallTargets, primaries, fonts, slots };
}

// --- Layout: the spacing, alignment, popover and surface checks (D-41) ----------------------------

/** A border box in page coordinates (viewport ones for popovers), px. */
export type Box = { x: number; y: number; w: number; h: number };

export type ControlBox = {
  selector: string;
  box: Box;
};

export type ControlText = {
  selector: string;
  /** The union of the label's line boxes, top and bottom. */
  textTop: number;
  textBottom: number;
  lines: number;
  /** The content box: the border box less borders and padding. */
  contentTop: number;
  contentBottom: number;
};

export type StackChild = {
  selector: string;
  box: Box;
  /** An auto margin on the start side of the stack axis: a deliberate separation (an action row's far end). */
  autoBefore: boolean;
  autoAfter: boolean;
};

export type StackObservation = {
  selector: string;
  axis: "block" | "inline";
  children: StackChild[];
};

export type PopoverObservation = {
  selector: string;
  /** null when no trigger was found: no popovertarget, aria-controls, summary or anchor names it. */
  trigger: string | null;
  /** Viewport coordinates, measured with the trigger in view. */
  box: Box;
  triggerBox: Box | null;
  viewport: { w: number; h: number };
};

export type RegionObservation = {
  selector: string;
  /** The region's own fill composited on the surface behind it, or null when it paints none. */
  fill: [number, number, number] | null;
  /** The nearest painted ancestor ground, composited; the page's when none paints. */
  behind: [number, number, number];
  /** The border colour composited on the surface behind, when all four sides show; else null. */
  border: [number, number, number] | null;
};

export type LayoutObservations = {
  controls: ControlBox[];
  /** Index pairs into controls that are one composite control and never measured against each other. */
  composite: [number, number][];
  texts: ControlText[];
  stacks: StackObservation[];
  regions: RegionObservation[];
};

/**
 * The layout measurements (D-41), as collect(): one self-contained function sent to Chromium as
 * source, measuring only. The controls and composites are lead-bench's definitions
 * (D-41); audit.ts holds the thresholds.
 */
export function collectLayout(): LayoutObservations {
  const selector = (el: Element): string => {
    const parts: string[] = [];
    for (let n: Element | null = el; n && n !== document.documentElement && parts.length < 3; n = n.parentElement) {
      let seg = n.tagName.toLowerCase();
      if (n.id) {
        parts.unshift(`${seg}#${n.id}`);
        break;
      }
      const classes = [...n.classList].slice(0, 2);
      if (classes.length) seg += "." + classes.join(".");
      parts.unshift(seg);
    }
    return parts.join(" > ");
  };
  const page = (r: DOMRect): Box => ({ x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height });
  const view = (r: DOMRect): Box => ({ x: r.left, y: r.top, w: r.width, h: r.height });
  const visible = (el: Element): boolean => {
    if (!el.checkVisibility({ visibilityProperty: true, opacityProperty: true })) return false;
    if (el.closest("[inert], [aria-hidden='true']")) return false;
    const r = el.getBoundingClientRect();
    return r.width > 1 && r.height > 1;
  };
  // The part of a box that shows: clipped by every ancestor that clips its overflow.
  const shown = (el: Element): DOMRect | null => {
    const r = el.getBoundingClientRect();
    let [l, t, rt, b] = [r.left, r.top, r.right, r.bottom];
    for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
      const s = getComputedStyle(n);
      if (s.overflowX === "visible" && s.overflowY === "visible" && s.clipPath === "none") continue;
      const c = n.getBoundingClientRect();
      if (s.overflowX !== "visible" || s.clipPath !== "none") [l, rt] = [Math.max(l, c.left), Math.min(rt, c.right)];
      if (s.overflowY !== "visible" || s.clipPath !== "none") [t, b] = [Math.max(t, c.top), Math.min(b, c.bottom)];
    }
    // Off the page sideways (the skip link at -9999px) or clipped to nothing.
    if (rt - l < 2 || b - t < 2 || rt + scrollX <= 0 || l >= document.documentElement.clientWidth) return null;
    return new DOMRect(l, t, rt - l, b - t);
  };

  // Controls. A checkbox or radio with its own label is one control, measured by its label.
  const CONTROL = 'button, a[href].button, a[href][role="button"], input:not([type="hidden"]), select, textarea, summary, [role="button"], [role="combobox"], [role="switch"], [role="checkbox"], [role="radio"], [role="tab"], [role="menuitem"]';
  const labelOf = (el: Element): Element | null => {
    if (!(el instanceof HTMLInputElement) || !["checkbox", "radio"].includes(el.type)) return null;
    return el.closest("label") ?? (el.id ? document.querySelector(`label[for="${CSS.escape(el.id)}"]`) : null);
  };
  const els: Element[] = [];
  const controls: ControlBox[] = [];
  for (const el of document.querySelectorAll(CONTROL)) {
    if (el.parentElement?.closest(CONTROL) && el.parentElement.closest(CONTROL) !== el) {
      // A control inside another (an input's own clear button) is part of it.
      if (!labelOf(el)) continue;
    }
    const target = labelOf(el) ?? el;
    if (!visible(el) && !(target !== el && visible(target))) continue;
    const r = shown(target);
    if (!r) continue;
    els.push(el);
    controls.push({ selector: selector(target), box: page(r) });
  }
  // A parent that draws one frame round its controls (a segmented group): a border on all four sides.
  const framed = (el: Element | null): boolean => {
    if (!el) return false;
    const fs = getComputedStyle(el);
    return ["top", "right", "bottom", "left"].every((side) => parseFloat(fs.getPropertyValue(`border-${side}-width`)) >= 1 && !["none", "hidden"].includes(fs.getPropertyValue(`border-${side}-style`)) && !fs.getPropertyValue(`border-${side}-color`).endsWith(", 0)") && fs.getPropertyValue(`border-${side}-color`) !== "transparent");
  };
  const inside = (a: Box, b: Box) => a.x >= b.x - 1 && a.y >= b.y - 1 && a.x + a.w <= b.x + b.w + 1 && a.y + a.h <= b.y + b.h + 1;
  const gapOf = (a: Box, b: Box) => Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w), b.y - (a.y + a.h), a.y - (b.y + b.h));
  const composite: [number, number][] = [];
  for (let i = 0; i < els.length; i++)
    for (let j = i + 1; j < els.length; j++) {
      const [a, b] = [els[i]!, els[j]!];
      const [la, lb] = [labelOf(a) ?? a, labelOf(b) ?? b];
      const [ba, bb] = [controls[i]!.box, controls[j]!.box];
      const tabs = a.getAttribute("role") === "tab" && b.getAttribute("role") === "tab" && a.closest('[role="tablist"]') !== null && a.closest('[role="tablist"]') === b.closest('[role="tablist"]');
      // Radios of one name are one choice, a segmented control when drawn as one box.
      const radios = a instanceof HTMLInputElement && b instanceof HTMLInputElement && a.type === "radio" && b.type === "radio" && a.name !== "" && a.name === b.name && a.form === b.form;
      // One control drawn inside another's box (an input's clear or reveal button, a date field's
      // calendar button, an icon button in a combobox's wrapper), wherever it sits in the DOM.
      const within = inside(ba, bb) || inside(bb, ba);
      // Siblings in one framed group with nothing between them: a segmented control.
      const group = la.parentElement !== null && la.parentElement === lb.parentElement && framed(la.parentElement) && gapOf(ba, bb) < 1;
      if (la.contains(lb) || lb.contains(la) || tabs || radios || within || group) composite.push([i, j]);
    }

  // The label's text box in each button-like control: buttons, links drawn as buttons, summaries, tabs.
  const texts: ControlText[] = [];
  for (const el of document.querySelectorAll('button, a[href].button, a[href][role="button"], summary, [role="button"], [role="tab"], [role="menuitem"]')) {
    if (!visible(el) || !shown(el)) continue;
    // Only what shows: words for a screen reader alone (a visually-hidden span, clipped to nothing),
    // zero-size, invisible or aria-hidden text are not the label. When no words show, the glyph
    // (an icon's svg) is the visible content and is measured instead.
    const hidden = (n: Element): boolean => {
      for (let e: Element | null = n; e && e !== el.parentElement; e = e.parentElement) {
        if (!e.checkVisibility({ visibilityProperty: true, opacityProperty: true })) return true;
        if (e !== el && e.getAttribute("aria-hidden") === "true") return true;
        const es = getComputedStyle(e);
        if (/inset\(50%/.test(es.clipPath) || (es.clip !== "auto" && es.clip !== "")) return true;
        const er = e.getBoundingClientRect();
        if (er.width <= 1 || er.height <= 1) return true;
      }
      return false;
    };
    const rects: DOMRect[] = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!(n.textContent ?? "").trim() || hidden(n.parentElement!)) continue;
      const range = document.createRange();
      range.selectNodeContents(n);
      for (const r of range.getClientRects()) if (r.width > 0 && r.height > 0) rects.push(r);
    }
    if (!rects.length)
      for (const svg of el.querySelectorAll("svg")) {
        const r = svg.getBoundingClientRect();
        // An aria-hidden icon is still what the eye sees; only an invisible or clipped one is not.
        const p = svg.parentElement === el ? null : svg.parentElement;
        if (r.width > 1 && r.height > 1 && svg.checkVisibility({ visibilityProperty: true }) && !(p && hidden(p))) rects.push(r);
      }
    if (!rects.length) continue;
    const tops = [...new Set(rects.map((r) => Math.round(r.top)))];
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    texts.push({
      selector: selector(el),
      textTop: Math.min(...rects.map((x) => x.top)),
      textBottom: Math.max(...rects.map((x) => x.bottom)),
      lines: tops.length,
      contentTop: r.top + parseFloat(s.borderTopWidth) + parseFloat(s.paddingTop),
      contentBottom: r.bottom - parseFloat(s.borderBottomWidth) - parseFloat(s.paddingBottom),
    });
  }

  // Stacks: one-axis flex and grid containers, and ui's flow and stack containers (components.css).
  const FLOW = "main, section:not([class]), .card, .dialog-body, form:not([class]), .stack";
  const stacks: StackObservation[] = [];
  for (const el of document.body.querySelectorAll("*")) {
    if (!visible(el)) continue;
    const s = getComputedStyle(el);
    let axis: "block" | "inline" | null = null;
    if (/flex/.test(s.display)) axis = s.flexDirection.startsWith("column") ? "block" : "inline";
    else if (/grid/.test(s.display)) {
      const cols = s.gridTemplateColumns.split(" ").filter(Boolean).length;
      const rows = s.gridTemplateRows.split(" ").filter(Boolean).length;
      axis = cols <= 1 ? "block" : rows <= 1 ? "inline" : null;
    } else if (el.matches(FLOW)) axis = "block";
    if (!axis) continue;
    const kids: Element[] = [];
    const take = (p: Element) => {
      for (const c of p.children) {
        if (getComputedStyle(c).display === "contents") take(c);
        else kids.push(c);
      }
    };
    take(el);
    const children: StackChild[] = [];
    // An empty child that grows (the bar's spacer) parts its neighbours on purpose, as an auto margin does.
    let spacer = false;
    for (const c of kids) {
      if (["SCRIPT", "STYLE", "TEMPLATE", "DIALOG"].includes(c.tagName)) continue;
      const cs = getComputedStyle(c);
      if (!visible(c)) {
        if (/flex/.test(s.display) && parseFloat(cs.flexGrow) > 0 && cs.display !== "none") spacer = true;
        continue;
      }
      if (cs.position === "absolute" || cs.position === "fixed") continue;
      const map = c.computedStyleMap();
      const auto = (prop: string) => String(map.get(prop)) === "auto";
      children.push({
        selector: selector(c),
        box: page(c.getBoundingClientRect()),
        autoBefore: spacer || (axis === "inline" ? auto("margin-left") : auto("margin-top")),
        autoAfter: axis === "inline" ? auto("margin-right") : auto("margin-bottom"),
      });
      spacer = false;
    }
    if (children.length >= 3) stacks.push({ selector: selector(el), axis, children });
  }

  // Regions: panes that must read apart from the ground behind them.
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  const rgba = (c: string): [number, number, number, number] => {
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = "#000";
    ctx.fillStyle = c;
    ctx.fillRect(0, 0, 1, 1);
    const d = ctx.getImageData(0, 0, 1, 1).data;
    return [d[0]!, d[1]!, d[2]!, d[3]! / 255];
  };
  const over = (top: [number, number, number, number], under: [number, number, number]): [number, number, number] => {
    const a = top[3];
    return [top[0] * a + under[0] * (1 - a), top[1] * a + under[1] * (1 - a), top[2] * a + under[2] * (1 - a)];
  };
  const dark = matchMedia("(prefers-color-scheme: dark)").matches && getComputedStyle(document.documentElement).colorScheme !== "light";
  const ground = (el: Element | null): [number, number, number] => {
    const layers: [number, number, number, number][] = [];
    for (let n = el; n; n = n.parentElement) {
      const c = rgba(getComputedStyle(n).backgroundColor);
      if (c[3] > 0) {
        layers.push(c);
        if (c[3] >= 1) break;
      }
    }
    let out: [number, number, number] = dark ? [18, 18, 18] : [255, 255, 255];
    for (const l of layers.reverse()) out = over(l, out);
    return out;
  };
  // A section is a region only when it paints a fill or a border of its own: a plain section with a
  // heading and flow content is a part of the page, not a pane.
  const REGION = '.card, .panel, aside, [role="region"], dialog, section';
  const regions: RegionObservation[] = [];
  for (const el of document.querySelectorAll(REGION)) {
    if (!visible(el)) continue;
    // A region inside a region card is the nested-card rule's: the fix there is to flatten it.
    let outer = el.parentElement?.closest(REGION) ?? null;
    while (outer && outer.tagName === "SECTION" && !outer.matches('.card, .panel, [role="region"]') && rgba(getComputedStyle(outer).backgroundColor)[3] === 0 && !framed(outer)) outer = outer.parentElement?.closest(REGION) ?? null;
    if (outer && rgba(getComputedStyle(outer).backgroundColor)[3] > 0) continue;
    const s = getComputedStyle(el);
    // An open modal dialog sits over the page; the page's ground is behind it.
    const behind = ground(el instanceof HTMLDialogElement ? document.body : el.parentElement);
    const own = rgba(s.backgroundColor);
    const sides = ["top", "right", "bottom", "left"].map((side) => ({ w: parseFloat(s.getPropertyValue(`border-${side}-width`)), style: s.getPropertyValue(`border-${side}-style`), c: rgba(s.getPropertyValue(`border-${side}-color`)) }));
    const all = sides.every((x) => x.w >= 1 && x.style !== "none" && x.style !== "hidden" && x.c[3] > 0);
    // A section with a rule on one side is divided, not framed: it is a region only with a fill or a
    // border on all four sides.
    if (el.tagName === "SECTION" && !el.matches('.card, .panel, [role="region"]') && own[3] === 0 && !all) continue;
    regions.push({ selector: selector(el), fill: own[3] > 0 ? over(own, behind) : null, behind, border: all ? over(sides[0]!.c, behind) : null });
  }

  return { controls, composite, texts, stacks, regions };
}

/**
 * The open popovers and menus, each with its trigger, in viewport coordinates (D-41): a details
 * element's positioned panel, and a native popover with the button that opens it. Self-contained,
 * like collect(). probePopovers() in audit.ts opens each trigger and calls it; a probe of its own
 * (the screens bench's) can do the same.
 */
export function collectPopovers(): PopoverObservation[] {
  const selector = (el: Element): string => {
    const parts: string[] = [];
    for (let n: Element | null = el; n && n !== document.documentElement && parts.length < 3; n = n.parentElement) {
      let seg = n.tagName.toLowerCase();
      if (n.id) {
        parts.unshift(`${seg}#${n.id}`);
        break;
      }
      const classes = [...n.classList].slice(0, 2);
      if (classes.length) seg += "." + classes.join(".");
      parts.unshift(seg);
    }
    return parts.join(" > ");
  };
  const box = (r: DOMRect): Box => ({ x: r.left, y: r.top, w: r.width, h: r.height });
  const visible = (el: Element) => el.checkVisibility({ visibilityProperty: true }) && el.getBoundingClientRect().width > 1;
  const vp = { w: document.documentElement.clientWidth, h: innerHeight };
  const panels: [Element, Element][] = [];
  for (const d of document.querySelectorAll("details[open]")) {
    const summary = d.querySelector(":scope > summary");
    if (!summary) continue;
    for (const c of d.children) {
      if (c === summary) continue;
      const pos = getComputedStyle(c).position;
      if ((pos === "absolute" || pos === "fixed") && visible(c)) panels.push([c, summary]);
    }
  }
  // A popover's trigger: the button that names it (popovertarget, or aria-controls on a script-driven
  // menu), else the element its CSS anchors it to (position-anchor's anchor-name).
  const triggerOf = (p: Element): Element | null => {
    if (p.id) {
      const id = CSS.escape(p.id);
      const named = document.querySelector(`[popovertarget="${id}"], [aria-controls~="${id}"]`);
      if (named) return named;
    }
    const anchor = getComputedStyle(p).getPropertyValue("position-anchor").trim();
    if (anchor && anchor !== "auto" && anchor !== "none")
      for (const e of document.querySelectorAll("*")) if (e !== p && getComputedStyle(e).getPropertyValue("anchor-name").split(",").map((n) => n.trim()).includes(anchor)) return e;
    return null;
  };
  const panels2: [Element, Element | null][] = [...panels];
  for (const p of document.querySelectorAll(":popover-open")) if (visible(p)) panels2.push([p, triggerOf(p)]);
  return panels2.map(([p, t]) => ({ selector: selector(p), trigger: t ? selector(t) : null, box: box(p.getBoundingClientRect()), triggerBox: t ? box(t.getBoundingClientRect()) : null, viewport: vp }));
}

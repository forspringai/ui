/*
 * alignment measure.js, vendored unchanged below this header (ui D-66).
 * Source: https://github.com/raphaelsalaja/skill/blob/aa9f452b1de4c8fb22168a73c8024787200d94d7/skills/alignment/measure.js
 *
 * MIT License
 *
 * Copyright (c) 2026 Raphael Salaja
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
// Run in the page: pass this file's contents to Runtime.evaluate or page.evaluate.
// Returns { findings } measured from the rendered layout and the glyph ink.
// Checks shared-edge, even-gaps, on-scale, padding-over-gap, icon-side-padding, ink-centre, icon-with-label,
// optical-glyph, shared-baseline, whole-pixels, concentric-radius and concentric-floor.
// Options: set window.__alignmentOptions = { root, scale, tolerance } before running.
((options = {}) => {
  const root = options.root ?? document.body;
  const scale = options.scale ?? 4;
  const tolerance = options.tolerance ?? 4;
  const findings = [];
  const canvas = document.createElement("canvas").getContext("2d");

  const round = (value) => Math.round(value * 10) / 10;

  const isVisible = (el) => {
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    if (!rect.width || !rect.height || style.visibility === "hidden") return false;
    if (el.closest("[inert]")) return false;
    for (let node = el; node; node = node.parentElement) {
      if (Number(getComputedStyle(node).opacity) < 0.05) return false;
    }
    return true;
  };

  const hasSurface = (el) => {
    const style = getComputedStyle(el);
    return (
      style.backgroundColor !== "rgba(0, 0, 0, 0)" ||
      style.boxShadow !== "none" ||
      Number.parseFloat(style.borderTopWidth) > 0
    );
  };

  const describe = (el) => {
    const parts = [];
    let node = el;
    while (node && node !== document.body && parts.length < 3) {
      let part = node.tagName.toLowerCase();
      const name = [...node.classList]
        .map((value) => value.split("__").pop())
        .find((value) => value.length > 1);
      if (node.id) part += `#${node.id}`;
      else if (name) part += `.${name}`;
      parts.unshift(part);
      node = node.parentElement;
    }
    const text = el.textContent.trim().replace(/\s+/g, " ").slice(0, 40);
    return text ? `${parts.join(" > ")} "${text}"` : parts.join(" > ");
  };

  const seen = new Set();
  const add = (rule, el, detail, measured) => {
    const key = `${rule} ${describe(el)} ${detail}`;
    if (seen.has(key)) return;
    seen.add(key);
    const rect = el.getBoundingClientRect();
    findings.push({
      rule,
      where: describe(el),
      detail,
      measured,
      rect: {
        x: round(rect.x + scrollX),
        y: round(rect.y + scrollY),
        width: round(rect.width),
        height: round(rect.height),
      },
    });
  };

  const fontOf = (style) =>
    `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;

  // Ink box of a text node: where the glyphs draw, not the line box.
  // The range starts at the first glyph, so leading whitespace counts only where it renders.
  const textInk = (node) => {
    const raw = node.textContent;
    const lead = /^[ \t\n\r\f]*/.exec(raw)[0].length;
    const trail = /[ \t\n\r\f]*$/.exec(raw.slice(lead))[0].length;
    const text = raw.slice(lead, raw.length - trail);
    if (!text) return null;
    const range = document.createRange();
    range.setStart(node, lead);
    range.setEnd(node, raw.length - trail);
    const rects = [...range.getClientRects()];
    if (rects.length !== 1) return null;
    const [box] = rects;
    const style = getComputedStyle(node.parentElement);
    canvas.font = fontOf(style);
    const metrics = canvas.measureText(text);
    const cap = canvas.measureText("H").actualBoundingBoxAscent;
    const baseline = box.top + metrics.fontBoundingBoxAscent;
    return {
      left: box.left - metrics.actualBoundingBoxLeft,
      right: box.left + metrics.actualBoundingBoxRight,
      top: baseline - cap,
      bottom: baseline,
      centerY: baseline - cap / 2,
    };
  };

  // Ink box of an inline SVG: the painted shapes mapped to screen pixels. A shape with no fill and no
  // stroke, such as a full-viewBox `M0 0h24v24H0z` spacer, draws nothing and is left out.
  // centroid is the mean of points sampled evenly along every painted outline, where the glyph's weight sits.
  const painted = (shape) => {
    if (shape.closest("defs, clipPath, mask, symbol, pattern, marker")) return false;
    const style = getComputedStyle(shape);
    if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return false;
    if (shape.matches("use, image")) return true;
    const clear = (paint) => paint === "none" || /^rgba\(.*,\s*0\)$/.test(paint) || paint === "transparent";
    const fill = !clear(style.fill) && Number(style.fillOpacity) > 0;
    const stroke = !clear(style.stroke) && Number(style.strokeOpacity) > 0 && (Number.parseFloat(style.strokeWidth) || 0) > 0;
    return fill || stroke;
  };
  const svgInk = (svg) => {
    try {
      const shapes = [...svg.querySelectorAll("path, circle, ellipse, line, polyline, polygon, rect, text, use, image")].filter(painted);
      let left = Infinity;
      let right = -Infinity;
      let top = Infinity;
      let bottom = -Infinity;
      let sumX = 0;
      let sumY = 0;
      let samples = 0;
      let sampled = true;
      for (const shape of shapes) {
        const box = shape.getBBox();
        const matrix = shape.getScreenCTM();
        if (!matrix || (!box.width && !box.height)) continue;
        const style = getComputedStyle(shape);
        const stroke = style.stroke === "none" ? 0 : (Number.parseFloat(style.strokeWidth) || 0) * Math.hypot(matrix.a, matrix.b) * 0.5;
        for (const [x, y] of [[box.x, box.y], [box.x + box.width, box.y], [box.x, box.y + box.height], [box.x + box.width, box.y + box.height]]) {
          const point = new DOMPoint(x, y).matrixTransform(matrix);
          left = Math.min(left, point.x - stroke);
          right = Math.max(right, point.x + stroke);
          top = Math.min(top, point.y - stroke);
          bottom = Math.max(bottom, point.y + stroke);
        }
        if (typeof shape.getTotalLength !== "function") {
          sampled = false;
          continue;
        }
        const length = shape.getTotalLength();
        const count = Math.max(8, Math.round(length * 4));
        for (let i = 0; i < count; i++) {
          const point = shape.getPointAtLength((length * (i + 0.5)) / count).matrixTransform(matrix);
          sumX += point.x;
          sumY += point.y;
          samples += 1;
        }
      }
      if (left === Infinity) return null;
      return {
        left,
        right,
        top,
        bottom,
        centerY: (top + bottom) / 2,
        centerX: (left + right) / 2,
        centroid: sampled && samples ? { x: sumX / samples, y: sumY / samples } : null,
      };
    } catch {
      return null;
    }
  };

  const contentBox = (el) => {
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    const px = (value) => Number.parseFloat(value) || 0;
    return {
      left: rect.left + px(style.borderLeftWidth),
      right: rect.right - px(style.borderRightWidth),
      top: rect.top + px(style.borderTopWidth),
      bottom: rect.bottom - px(style.borderBottomWidth),
      padding: {
        left: px(style.paddingLeft),
        right: px(style.paddingRight),
        top: px(style.paddingTop),
        bottom: px(style.paddingBottom),
      },
    };
  };

  const textNodes = (el) => {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node.textContent.trim() && isVisible(node.parentElement)) nodes.push(node);
    }
    return nodes;
  };

  const elements = [...root.querySelectorAll("*")].filter(
    (el) => !["SCRIPT", "STYLE", "TEMPLATE", "svg"].includes(el.tagName) &&
      !el.closest("svg") &&
      isVisible(el),
  );

  // 1. Shared edges: text start lines inside one surface that miss by a few px.
  const nearestSurface = (el) => {
    for (let node = el; node && node !== root; node = node.parentElement) {
      if (hasSurface(node)) return node;
    }
    return root;
  };

  for (const surface of elements.filter(hasSurface)) {
    const boxes = [];
    for (const node of textNodes(surface)) {
      if (nearestSurface(node.parentElement) !== surface) continue;
      const style = getComputedStyle(node.parentElement);
      if (style.textAlign === "center" || style.textAlign === "right") continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      const [first] = range.getClientRects();
      if (first) boxes.push({ x: first.left, top: first.top, bottom: first.bottom, node });
    }
    // Only the first text on each line forms a left edge.
    const starts = boxes.filter((a) =>
      !boxes.some((b) => b !== a && b.x < a.x - 1 && b.top < a.bottom && b.bottom > a.top),
    );
    if (starts.length < 2) continue;
    const counts = new Map();
    for (const { x } of starts) counts.set(round(x), (counts.get(round(x)) ?? 0) + 1);
    const [line] = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0];
    for (const { x, node } of starts) {
      const off = x - line;
      if (Math.abs(off) >= 1 && Math.abs(off) <= tolerance) {
        add("alignment-shared-edge", node.parentElement,
          `Text starts ${round(Math.abs(off))}px ${off > 0 ? "right" : "left"} of the line the other text in this surface shares`,
          { offset: round(off), line: round(line) });
      }
    }
  }

  // 2. Even gaps: repeated siblings stacked or in a row with uneven spacing.
  for (const parent of elements) {
    const kids = [...parent.children].filter(isVisible);
    if (kids.length < 3) continue;
    const rects = kids.map((kid) => kid.getBoundingClientRect());
    const column = rects.every((rect, i) => i === 0 || rect.top >= rects[i - 1].bottom - 1);
    const row = rects.every((rect, i) => i === 0 || rect.left >= rects[i - 1].right - 1);
    if (!column && !row) continue;
    const tags = new Set(kids.map((kid) => kid.tagName + kid.className));
    if (tags.size > 2) continue;
    const gaps = rects.slice(1).map((rect, i) =>
      column ? rect.top - rects[i].bottom : rect.left - rects[i].right,
    );
    // A gap at least twice the usual one is a deliberate group break, not a miss.
    const tally = new Map();
    for (const gap of gaps) tally.set(round(gap), (tally.get(round(gap)) ?? 0) + 1);
    const [usual] = [...tally.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0];
    const kept = usual > 0 ? gaps.filter((gap) => gap < usual * 2) : gaps;
    const spread = Math.max(...kept) - Math.min(...kept);
    if (spread >= 1 && spread <= 24) {
      add("alignment-even-gaps", parent,
        `${column ? "Stacked" : "Row of"} ${kids.length} siblings with gaps from ${round(Math.min(...gaps))} to ${round(Math.max(...gaps))}px`,
        { gaps: gaps.map(round) });
    }
  }

  // 3. On scale: spacing values that are not a multiple of the scale.
  // The icon side of a control may sit 2px under an on-scale text side, as alignment-icon-side-padding asks.
  const opposite = { paddingLeft: "paddingRight", paddingRight: "paddingLeft" };
  const offScale = new Map();
  for (const el of elements) {
    const style = getComputedStyle(el);
    const hasIcon = [...el.children].some((kid) => kid.tagName.toLowerCase() === "svg" || kid.querySelector(":scope > svg"));
    for (const prop of ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "rowGap", "columnGap", "marginTop", "marginBottom"]) {
      const value = Number.parseFloat(style[prop]);
      if (!value || value <= 2 || value % scale === 0) continue;
      if (hasIcon && opposite[prop] && Number.parseFloat(style[opposite[prop]]) === value + 2 && (value + 2) % scale === 0) continue;
      const key = `${prop} ${round(value)}px`;
      if (!offScale.has(key)) offScale.set(key, []);
      offScale.get(key).push(el);
    }
  }
  for (const [key, els] of offScale) {
    add("alignment-on-scale", els[0], `${key} is off the ${scale}px scale (${els.length} elements)`, { count: els.length });
  }

  // Padding over gap: a surface's padding on the axis its gap separates is at least that gap.
  for (const el of elements.filter(hasSurface)) {
    if (el.closest("table")) continue;
    const style = getComputedStyle(el);
    if (!/flex|grid/.test(style.display)) continue;
    if ([...el.children].filter(isVisible).length < 2) continue;
    const { padding } = contentBox(el);
    const axes = style.display.includes("grid")
      ? ["row", "column"]
      : [style.flexDirection.startsWith("column") ? "row" : "column"];
    for (const axis of axes) {
      const gap = Number.parseFloat(axis === "row" ? style.rowGap : style.columnGap) || 0;
      const pad = axis === "row"
        ? Math.min(padding.top, padding.bottom)
        : Math.min(padding.left, padding.right);
      // Zero padding is a full-bleed list, which the rule exempts.
      if (gap > 0 && pad > 0 && pad < gap) {
        add("alignment-padding-over-gap", el,
          `Padding ${round(pad)}px is smaller than the ${round(gap)}px gap between its children`,
          { padding: round(pad), gap: round(gap) });
      }
    }
  }

  // 4–6. Controls: ink centred in its box, icons level with labels, icon-only centring.
  const controls = elements.filter((el) => {
    const rect = el.getBoundingClientRect();
    return rect.height <= 56 && hasSurface(el) &&
      (el.matches("button, a, [role=button], [role=tab], [role=radio], label, input") ||
        el.children.length <= 3);
  });
  for (const el of controls) {
    const box = contentBox(el);
    const texts = textNodes(el).map(textInk).filter(Boolean);
    const icons = [...el.querySelectorAll("svg")].filter(isVisible).map(svgInk).filter(Boolean);
    if (texts.length > 1) continue;
    const parts = [...texts, ...icons];
    if (!parts.length) continue;
    const ink = {
      left: Math.min(...parts.map((p) => p.left)),
      right: Math.max(...parts.map((p) => p.right)),
      top: Math.min(...parts.map((p) => p.top)),
      bottom: Math.max(...parts.map((p) => p.bottom)),
    };
    // A lone asymmetric icon moved toward its light side carries the nudge alignment-optical-glyph asks for.
    const lone = !texts.length && icons.length === 1 && icons[0].centroid ? icons[0] : null;
    const lean = lone && {
      x: lone.centroid.x - lone.centerX,
      y: lone.centroid.y - lone.centerY,
      offX: lone.centerX - (box.left + box.right) / 2,
      offY: lone.centerY - (box.top + box.bottom) / 2,
      leansX: Math.abs(lone.centroid.x - lone.centerX) >= Math.max(1, (lone.right - lone.left) * 0.04),
      leansY: Math.abs(lone.centroid.y - lone.centerY) >= Math.max(1, (lone.bottom - lone.top) * 0.04),
    };
    const nudgedY = lean && lean.leansY && Math.abs(lean.offY) >= 0.5 && Math.sign(lean.offY) !== Math.sign(lean.y);
    const topInset = ink.top - box.top;
    const bottomInset = box.bottom - ink.bottom;
    if (Math.abs(topInset - bottomInset) >= 2 && !nudgedY) {
      add("alignment-ink-centre", el,
        `Ink sits ${round(Math.abs(topInset - bottomInset) / 2)}px ${topInset > bottomInset ? "low" : "high"}: ${round(topInset)}px above, ${round(bottomInset)}px below`,
        { above: round(topInset), below: round(bottomInset) });
    }
    // Equal side padding: beside an icon, the icon's empty edge leaves its side wider; text alone sits off centre.
    if (box.padding.left === box.padding.right && texts.length === 1) {
      const left = ink.left - box.left;
      const right = box.right - ink.right;
      if (icons.length === 1 && left < 48 && right < 48) {
        const leading = icons[0].centerX < texts[0].left;
        const iconSide = leading ? left : right;
        const textSide = leading ? right : left;
        if (iconSide - textSide >= 1) {
          add("alignment-icon-side-padding", el,
            `Equal padding beside a ${leading ? "leading" : "trailing"} icon: ${round(iconSide)}px of space on the icon side and ${round(textSide)}px on the text side`,
            { iconSide: round(iconSide), textSide: round(textSide), padding: round(box.padding.left) });
        }
      } else if (!icons.length && Math.abs(left - right) >= 2 && left < 48 && right < 48) {
        add("alignment-ink-centre", el,
          `Equal padding but ${round(left)}px of space on the left and ${round(right)}px on the right`,
          { left: round(left), right: round(right) });
      }
    }
    if (texts.length === 1 && icons.length === 1) {
      const off = icons[0].centerY - texts[0].centerY;
      if (Math.abs(off) >= 1) {
        add("alignment-icon-with-label", el,
          `Icon centre ${round(Math.abs(off))}px ${off > 0 ? "below" : "above"} the label's cap centre`,
          { offset: round(off) });
      }
    }
    // Optical glyph: a lone icon whose ink box is centred while its weight sits to one side, such as a play
    // triangle. The centroid comes from the outline, so a candidate is confirmed on the screenshot.
    if (lean) {
      const unnudgedX = lean.leansX && Math.abs(lean.offX) < 0.5;
      const unnudgedY = lean.leansY && Math.abs(lean.offY) < 0.5;
      if (unnudgedX || unnudgedY) {
        const toward = unnudgedX ? (lean.x < 0 ? "right" : "left") : (lean.y < 0 ? "down" : "up");
        add("alignment-optical-glyph", el,
          `Asymmetric glyph centred by its ink box, its weight ${round(Math.abs(unnudgedX ? lean.x : lean.y))}px off centre. Nudge it ${toward}`,
          { weightX: round(lean.x), weightY: round(lean.y), offsetX: round(lean.offX), offsetY: round(lean.offY) });
      }
    }
  }

  // Shared baseline: single-line text of two sizes side by side in a flex row that is not baseline-aligned.
  for (const row of elements) {
    const style = getComputedStyle(row);
    if (!/flex/.test(style.display) || style.flexDirection.startsWith("column")) continue;
    if (/baseline/.test(style.alignItems)) continue;
    const texts = [...row.children]
      .filter((kid) => isVisible(kid) && !hasSurface(kid) && !kid.matches("button, input, select, textarea, [role=button]"))
      .map((kid) => {
        const [node] = textNodes(kid);
        const ink = node && textInk(node);
        return ink && { kid, baseline: ink.bottom, size: Number.parseFloat(getComputedStyle(node.parentElement).fontSize) };
      })
      .filter(Boolean);
    if (texts.length < 2) continue;
    const sizes = texts.map((text) => text.size);
    if (Math.max(...sizes) - Math.min(...sizes) < 2) continue;
    const baselines = texts.map((text) => text.baseline);
    const spread = Math.max(...baselines) - Math.min(...baselines);
    if (spread >= 1) {
      add("alignment-shared-baseline", row,
        `Text at ${sizes.map(round).join(", ")}px in one row with baselines ${round(spread)}px apart`,
        { sizes: sizes.map(round), spread: round(spread) });
    }
  }

  // Whole pixels: a translated box off the pixel grid blurs its text and hairlines at 1x.
  const offGrid = (value) => Math.abs(value - Math.round(value)) >= 0.25;
  const fractional = elements.filter((el) => {
    const style = getComputedStyle(el);
    if (style.transform === "none" && style.translate === "none") return false;
    if (style.rotate !== "none" || style.scale !== "none") return false;
    if (style.transform !== "none") {
      const matrix = new DOMMatrixReadOnly(style.transform);
      if (matrix.a !== 1 || matrix.b !== 0 || matrix.c !== 0 || matrix.d !== 1) return false;
    }
    const rect = el.getBoundingClientRect();
    return offGrid(rect.left + scrollX) || offGrid(rect.top + scrollY);
  });
  for (const el of fractional) {
    if (fractional.some((other) => other !== el && other.contains(el))) continue;
    const rect = el.getBoundingClientRect();
    add("alignment-whole-pixels", el,
      `Translated box at x ${round(rect.left + scrollX)}, y ${round(rect.top + scrollY)}, off the whole-pixel grid`,
      { x: round(rect.left + scrollX), y: round(rect.top + scrollY), width: round(rect.width), height: round(rect.height) });
  }

  // 7. Concentric radius: a nested surface's radius should be the outer radius minus the inset,
  // held at a 2px floor when that falls below 2px.
  for (const outer of elements.filter(hasSurface)) {
    const outerRadius = Number.parseFloat(getComputedStyle(outer).borderTopLeftRadius);
    if (!outerRadius) continue;
    const o = outer.getBoundingClientRect();
    for (const inner of [...outer.querySelectorAll("*")].filter((el) => hasSurface(el) && isVisible(el))) {
      const i = inner.getBoundingClientRect();
      if (i.width < o.width * 0.5) continue;
      const inset = Math.min(i.left - o.left, i.top - o.top);
      if (inset < 1 || inset > 16 || Math.abs(i.left - o.left - (i.top - o.top)) > 1) continue;
      const innerRadius = Number.parseFloat(getComputedStyle(inner).borderTopLeftRadius);
      if (innerRadius >= Math.min(i.width, i.height) / 2) continue;
      const expected = Math.max(outerRadius - inset, 2);
      if (outerRadius - inset < 2 && innerRadius < 2) {
        add("alignment-concentric-floor", inner,
          `Radius ${round(innerRadius)}px inside a ${round(outerRadius)}px corner at ${round(inset)}px inset, under the 2px floor`,
          { radius: round(innerRadius), expected: 2 });
      } else if (Math.abs(innerRadius - expected) > 2) {
        add("alignment-concentric-radius", inner,
          `Radius ${round(innerRadius)}px inside a ${round(outerRadius)}px corner at ${round(inset)}px inset, expected about ${round(expected)}px`,
          { radius: round(innerRadius), expected: round(expected) });
      }
    }
  }

  return {
    findings: findings.map((finding, index) => ({ id: index + 1, ...finding })),
  };
})(window.__alignmentOptions);

// D-66: the vendored alignment measurer's findings as the audit's. Only a shared edge, or a single-line
// shared baseline, 2 px or more off is an error; three rules are for a person to look at; the rest drop.
import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { alignmentFindings, measureSource, type RawAlignment } from "../src/audit/alignment.ts";
import { parseArgs } from "../src/audit/args.ts";

const rect = { x: 0, y: 0, width: 10, height: 10 };
const raw = (rule: string, detail: string, measured: Record<string, unknown>): RawAlignment => ({ id: 1, rule, where: "div", detail, rect, measured });

test("shared-edge is an error from 2 px, and for review under it", () => {
  const [a, b] = alignmentFindings([raw("alignment-shared-edge", "Text starts 3px right", { offset: 3, line: 16 }), raw("alignment-shared-edge", "Text starts 1px right", { offset: -1.5, line: 16 })]);
  expect([a!.severity, b!.severity]).toEqual(["error", "review"]);
});

test("shared-baseline is an error from 2 px on one line; half the smaller size or more apart is two lines, for review", () => {
  const f = alignmentFindings([
    raw("alignment-shared-baseline", "Text at 21, 12px", { sizes: [21, 12], spread: 2.5 }),
    raw("alignment-shared-baseline", "Text at 15, 13px", { sizes: [15, 13], spread: 10.5 }),
    raw("alignment-shared-baseline", "Text at 21, 12px", { sizes: [21, 12], spread: 1.5 }),
  ]);
  expect(f.map((x) => x.severity)).toEqual(["error", "review", "review"]);
});

test("ink-centre (vertical only), padding-over-gap and even-gaps are for review; the rest drop", () => {
  const f = alignmentFindings([
    raw("alignment-ink-centre", "Ink sits 2px low", {}),
    raw("alignment-ink-centre", "Equal padding but 12px of space on the left", {}),
    raw("alignment-padding-over-gap", "Padding 8px", {}),
    raw("alignment-even-gaps", "Row of 3", {}),
    raw("alignment-on-scale", "rowGap 10px", {}),
    raw("alignment-icon-with-label", "Icon centre", {}),
    raw("alignment-concentric-radius", "Radius 0px", {}),
  ]);
  expect(f.map((x) => `${x.rule} ${x.severity}`)).toEqual(["alignment-ink-centre review", "alignment-padding-over-gap review", "alignment-even-gaps review"]);
});

test("the measurer is vendored unchanged under its MIT licence, at aa9f452", () => {
  const src = measureSource();
  expect(src).toContain("Copyright (c) 2026 Raphael Salaja");
  expect(src).toContain("raphaelsalaja/skill/blob/aa9f452b1de4c8fb22168a73c8024787200d94d7/skills/alignment/measure.js");
  expect(src.trimEnd().endsWith("})(window.__alignmentOptions);")).toBe(true);
  expect(src).not.toMatch(/\bfetch\(|XMLHttpRequest|WebSocket|import\(/);
  expect(readFileSync(new URL("../src/audit/vendor/alignment-measure.js", import.meta.url), "utf8")).toBe(src);
});

test("--redlines takes a directory", () => {
  const p = parseArgs(["http://127.0.0.1:1/", "--redlines", "out/alignment"], ["forspring"]);
  expect("opts" in p && p.opts.redlines).toBe("out/alignment");
  const bad = parseArgs(["http://127.0.0.1:1/", "--redlines", " "], ["forspring"]);
  expect("refusal" in bad && bad.refusal.reason).toBe("invalid_redlines");
});

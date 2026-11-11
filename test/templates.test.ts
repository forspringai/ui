// The brand templates (D-22, hub tick xl9) are static files, so nothing regenerates them when a token
// or a wordmark changes. This holds them to the tokens instead: colours, type sizes and lockups must be
// the package's own, nothing may load from another origin, and the email stays inside 600 px.

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { model } from "../src/emit.ts";

const root = join(import.meta.dirname, "..");
const dir = join(root, "brand", "templates");
const files = readdirSync(dir).sort();
const read = (f: string) => readFileSync(join(dir, f), "utf8");
// The files a browser or mail client loads; README.md is for people and may link anywhere.
const loaded = files.filter((f) => /\.(html|svg)$/.test(f));

// Every colour the brand may use: the palette, the accents and the status colours.
const TOKEN_HEX = new Set(
  ["palette.json", "accent.json", "status.json"].flatMap((f) => [...readFileSync(join(root, "tokens", f), "utf8").matchAll(/"hex": "(#[0-9a-f]{6})"/g)].map((x) => x[1]!)),
);
const m = model(join(root, "tokens"));
const LADDER = new Set(Object.values(m.text).flatMap((steps) => Object.values(steps)));
// The doll and wordmark paths of every generated lockup (hub D-101): a template copies one, never draws one.
const LOGO_PATHS = new Set(
  readdirSync(join(root, "brand"), { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== "templates")
    .flatMap((d) => [...readFileSync(join(root, "brand", d.name, "logo.svg"), "utf8").matchAll(/\sd="([^"]+)"/g)].map((x) => x[1]!)),
);

const withoutComments = (s: string) => s.replace(/<!--[\s\S]*?-->/g, "");

test("the templates are there", () => {
  expect(files).toEqual(["README.md", "deck.html", "email.html", "social-1080x1080.svg", "social-1200x630.svg"]);
});

describe.each(files)("brand/templates/%s", (f) => {
  test("every hex colour is a token value", () => {
    const hexes = [...read(f).matchAll(/#[0-9a-f]{3,8}\b/gi)].map((x) => x[0].toLowerCase());
    for (const h of hexes) expect(TOKEN_HEX, `${f}: ${h}`).toContain(h);
  });

  test("no em dash", () => expect(read(f)).not.toContain("\u2014"));
});

describe.each(loaded)("brand/templates/%s loads nothing from another origin", (f) => {
  test("no http(s) URL but the SVG namespace, which is a name and never fetched", () => {
    const s = read(f).replace(/\sxmlns="http:\/\/www\.w3\.org\/2000\/svg"/g, "");
    expect(s).not.toMatch(/https?:\/\//i);
    expect(s).not.toMatch(/@import/i);
  });

  test("every src, href and url() is a relative path or a {{placeholder}}", () => {
    const s = withoutComments(read(f));
    const refs = [...s.matchAll(/\s(?:src|href)="([^"]*)"/g), ...s.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)].map((x) => x[1]!);
    expect(refs.length).toBeGreaterThan(0);
    for (const r of refs) expect(r, `${f}: ${r}`).toMatch(/^(\{\{\w+\}\}|(?![a-z][a-z0-9+.-]*:)(?!\/)[^\s]+)$/i);
  });

  test("every px type size is a step of a ladder", () => {
    const s = withoutComments(read(f));
    for (const x of s.matchAll(/font-size(?::\s*|=")(\d+)(?:px)?/g)) expect(LADDER, `${f}: ${x[0]}`).toContain(Number(x[1]));
  });

  test("every path is copied from a generated logo.svg", () => {
    for (const x of read(f).matchAll(/\sd="([^"]+)"/g)) expect(LOGO_PATHS.has(x[1]!), `${f}: a path not in any brand/<product>/logo.svg`).toBe(true);
  });

  test("every {{placeholder}} it uses is listed in its top comment", () => {
    const s = read(f);
    const top = /<!--([\s\S]*?)-->/.exec(s)?.[1] ?? "";
    const names = (t: string) => new Set([...t.matchAll(/\{\{(\w+)\}\}/g)].map((x) => x[1]!));
    for (const n of names(withoutComments(s))) expect(names(top), `${f}: {{${n}}}`).toContain(n);
  });
});

test("the deck, the share image and the post carry Forspring's lockup", () => {
  const forspring = [...readFileSync(join(root, "brand", "forspring", "logo.svg"), "utf8").matchAll(/\sd="([^"]+)"/g)].map((x) => x[1]!);
  for (const f of ["deck.html", "social-1200x630.svg", "social-1080x1080.svg"]) for (const d of forspring) expect(read(f), f).toContain(d);
});

test("deck.html uses the roles and the marketing ladder, no raw colours or sizes", () => {
  const s = withoutComments(read("deck.html"));
  expect(s).toContain('href="../../dist/tokens.css"');
  expect(s).toContain('href="../../dist/fonts.css"');
  expect(s).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  const sizes = [...s.matchAll(/var\(--text-([a-z]+)-/g)].map((x) => x[1]);
  expect(new Set(sizes)).toEqual(new Set(["marketing"]));
  expect(s).toMatch(/@page \{ size: 1920px 1080px; margin: 0; \}/);
});

test("email.html is at most 600 px wide", () => {
  // The <style> holds a viewport media query, which is not the email's width.
  const s = withoutComments(read("email.html")).replace(/<style>[\s\S]*?<\/style>/g, "");
  const widths = [...s.matchAll(/\swidth="(\d+)"/g), ...s.matchAll(/(?:max-)?width:\s*(\d+)px/g)].map((x) => Number(x[1]));
  expect(widths).toContain(600);
  for (const w of widths) expect(w).toBeLessThanOrEqual(600);
});

test("brand/marketing.md has no em dash", () => {
  expect(readFileSync(join(root, "brand", "marketing.md"), "utf8")).not.toContain("\u2014");
});

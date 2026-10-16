// The built outputs as a snapshot. The snapshot files are dist/ itself, which is committed (D-2): a
// token change shows up in review as a diff of the CSS and the types, and a dist/ that was not rebuilt
// fails here. Run pnpm build after changing tokens.

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { assets } from "../src/assets.ts";
import { build } from "../src/emit.ts";
import * as tokens from "../dist/tokens.js";

const root = join(import.meta.dirname, "..");
const files = { ...build(join(root, "tokens")), ...assets(root) };

describe.each(Object.keys(files))("dist/%s", (name) => {
  test("matches a fresh build", async () => {
    await expect(files[name]).toMatchFileSnapshot(join(root, "dist", name));
  });
});

test("dist/html, refusals, pages, connect and react (.js, .d.ts) match a fresh compile of src/", () => {
  const out = mkdtempSync(join(tmpdir(), "forspring-ui-html-"));
  execFileSync(join(root, "node_modules/.bin/tsc"), ["-p", join(root, "tsconfig.html.json"), "--outDir", out]);
  for (const f of ["html", "refusals", "pages", "connect", "react"].flatMap((n) => [`${n}.js`, `${n}.d.ts`])) expect(readFileSync(join(out, f), "utf8")).toBe(readFileSync(join(root, "dist", f), "utf8"));
});

test("dist/audit/ matches a fresh compile of src/audit/", () => {
  const out = mkdtempSync(join(tmpdir(), "forspring-ui-audit-"));
  execFileSync(join(root, "node_modules/.bin/tsc"), ["-p", join(root, "tsconfig.audit.json"), "--outDir", out]);
  const built = readdirSync(join(out, "audit")).sort();
  expect(readdirSync(join(root, "dist/audit")).sort()).toEqual(built);
  for (const f of built) expect(readFileSync(join(out, "audit", f), "utf8")).toBe(readFileSync(join(root, "dist/audit", f), "utf8"));
});

test("fonts.css points at the package's fonts/ folder, swaps, and covers the files' Latin subset", () => {
  const css = files["fonts.css"]!;
  for (const f of ["archivo.woff2", "archivo-condensed.woff2", "space-mono.woff2"]) expect(css).toContain(`url("../fonts/${f}")`);
  expect(css.match(/font-display: swap;/g)).toHaveLength(3);
  expect(css.match(/unicode-range: U\+0000-00FF/g)).toHaveLength(3);
  expect(css).not.toContain("Roboto");
  expect(files["google-button.css"]).toContain('url("../fonts/roboto-medium.woff2")');
});

test("tokens.css: roles pair light and dark, the theme override sets color-scheme, every product swaps primary", () => {
  const css = files["tokens.css"]!;
  expect(css).toMatch(/:root \{\n {2}color-scheme: light dark;/);
  expect(css).toContain("--background: light-dark(#fcfcfa, #111215);");
  expect(css).toContain('[data-theme="dark"] {\n  color-scheme: dark;\n}');
  expect(css).toContain('[data-theme="light"] {\n  color-scheme: light;\n}');
  for (const p of tokens.products) expect(css).toContain(`[data-product="${p}"] {\n  --primary: light-dark(${tokens.accents[p].light}, ${tokens.accents[p].dark});`);
  // The raw palette stays private.
  expect(css).not.toMatch(/--(paper|ink|blue|line-strong|soft):/);
});

test("theme.css maps every role into Tailwind's colour namespace", () => {
  const css = files["theme.css"]!;
  for (const r of Object.keys(tokens.roles.light)) expect(css).toContain(`--color-${r}: var(--${r});`);
  expect(css).toContain("@theme inline {");
  expect(css).not.toMatch(/--font-sans: var\(--font-sans\)/);
});

test("tokens.js: themeFor gives a product its accent over the shared roles", () => {
  const t = tokens.themeFor("sitespring", "dark");
  expect(t.primary).toBe("#e0714f");
  expect(t.ring).toBe("#e0714f");
  expect(t.background).toBe(tokens.roles.dark.background);
  expect(tokens.chart.light).toHaveLength(8);
  expect(() => tokens.themeFor("nope" as never, "light")).toThrow(/unknown product/);
});

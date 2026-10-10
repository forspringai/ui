// The built outputs as a snapshot. The snapshot files are dist/ itself, which is committed (D-2): a
// token change shows up in review as a diff of the CSS and the types, and a dist/ that was not rebuilt
// fails here. Run pnpm build after changing tokens.

import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { build } from "../src/emit.ts";
import * as tokens from "../dist/tokens.js";

const root = join(import.meta.dirname, "..");
const files = build(join(root, "tokens"));

describe.each(Object.keys(files))("dist/%s", (name) => {
  test("matches a fresh build", async () => {
    await expect(files[name]).toMatchFileSnapshot(join(root, "dist", name));
  });
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

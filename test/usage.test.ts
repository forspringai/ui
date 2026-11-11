// Usage guidance for every helper (hub tick tdg): each function and constant a product calls from
// html, pages, connect and refusals must be named in docs/usage.md, in backticks, so a new helper
// without guidance on when to use it fails CI. The exports are read from the modules at run time, so
// the list cannot fall behind the code; the few left out are internals, each with its reason.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import * as connect from "../src/connect.ts";
import * as htmlModule from "../src/html.ts";
import * as pages from "../src/pages.ts";
import * as refusals from "../src/refusals.ts";

const usage = readFileSync(join(import.meta.dirname, "..", "docs", "usage.md"), "utf8");

/** Exports a product does not choose between, so usage.md need not name them. */
const INTERNAL: Record<string, string> = {
  Html: "the value every helper returns; products build it with html`` or raw(), never construct it",
  esc: "the escaping primitive under html``; its rules are AGENTS.md's and the README's",
  raw: "vouches for markup; its one rule (never on what a person wrote) is AGENTS.md's",
  html: "the escaping template tag every helper is built on, not a component",
  safeHref: "applied by every helper to every href already",
  regexEscape: "confirmDestructive() calls it for the name's pattern",
  VERSION: "the release number, read by DEFAULT_BRAND_BASE and checked against package.json",
  MARK_VIEWBOX: "the doll's geometry, for the brand build (src/brand.ts)",
  MARK_PATHS: "the doll's paths, for the brand build (src/brand.ts)",
  googleFontFace: "the build writes it into google-button.css (src/assets.ts)",
};

const modules = { html: htmlModule, pages, connect, refusals };

describe("docs/usage.md names every helper a product calls", () => {
  for (const [file, mod] of Object.entries(modules)) {
    const names = Object.keys(mod).filter((n) => !Object.hasOwn(INTERNAL, n));
    test.each(names)(`src/${file}.ts: %s`, (name) => {
      expect(usage, `docs/usage.md says nothing about ${name}; add when to use it`).toMatch(new RegExp("`" + name + "[`(]"));
    });
  }

  test("every internal left out is still exported, so the list stays true", () => {
    const exported = new Set(Object.values(modules).flatMap((m) => Object.keys(m)));
    for (const name of Object.keys(INTERNAL)) expect(exported, name).toContain(name);
  });
});

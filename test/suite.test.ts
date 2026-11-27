// The suite (D-73, hub tick q2v): the list once, the footer row and llms.txt's section from it, the same as
// the five sites served by hand before.
import { expect, test } from "vitest";
import { FORSPRING, SUITE, suiteLlms, suiteRow } from "../src/suite.ts";

test("the products with a site, in vision.md's order, each with both languages' address and its one line", () => {
  expect(SUITE.map((p) => p.name)).toEqual(["DataSpring", "SiteSpring", "AppSpring", "PulseSpring", "FlowSpring"]);
  for (const p of SUITE) {
    expect(p.url.da).toMatch(/^https:\/\//);
    expect(p.url.en).toMatch(/^https:\/\/.*\/en\/?$/);
    expect(p.line).toMatch(/^[A-Z].*\.$/);
  }
  expect(FORSPRING.url).toBe("https://forspring.ai");
});

test("the footer row: what pulsespring.app/en/ served, and the Danish one with the page's own product plain", () => {
  expect(suiteRow({ lang: "en", current: "pulsespring" })).toBe(
    '<p class="suite-row">Part of <a href="https://forspring.ai">Forspring</a>: <a href="https://dataspring.app/en" hreflang="en">DataSpring</a> · <a href="https://sitespring.app/en" hreflang="en">SiteSpring</a> · <a href="https://appspring.app/en/" hreflang="en">AppSpring</a> · <span aria-current="page">PulseSpring</span> · <a href="https://www.flowspring.app/en/" hreflang="en">FlowSpring</a></p>',
  );
  const da = suiteRow({ lang: "da", current: "flowspring" });
  expect(da).toMatch(/^<p class="suite-row">En del af <a href="https:\/\/forspring.ai">Forspring<\/a>: /);
  expect(da).toContain('<a href="https://appspring.app" hreflang="da">AppSpring</a>');
  expect(da).toContain('<span aria-current="page">FlowSpring</span>');
  // Forspring's own site (no current product) links every product.
  expect(suiteRow({ lang: "da" })).not.toContain("aria-current");
});

test("llms.txt's section: what appspring.app/llms.txt served, with the site's own product unlinked", () => {
  expect(suiteLlms({ current: "appspring" })).toBe(`## The Forspring suite

AppSpring is part of Forspring (https://forspring.ai), a Danish company that delivers results, not licences.

- [DataSpring](https://dataspring.app): One true set of numbers, from the systems you already run.
- [SiteSpring](https://sitespring.app): A fast website that agents build and keep up to date.
- AppSpring: The building blocks for your own internal tools.
- [PulseSpring](https://pulsespring.app): It checks that everything we run for you is alive, and opens a case when it isn't.
- [FlowSpring](https://www.flowspring.app): The processes a company repeats, run on their own, step by step.
`);
});

test("self-contained: the module imports nothing, so a site can vendor the one file", async () => {
  const { readFileSync } = await import("node:fs");
  expect(readFileSync(new URL("../src/suite.ts", import.meta.url), "utf8")).not.toMatch(/^import /m);
});

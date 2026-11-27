// shareImage() in a browser with the package's fonts (D-70): the advance table it wraps with matches the
// face as Chromium sets it, so no line runs past the margin.
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";
import { expect, test } from "vitest";
import { headlineWidth, shareImage } from "../src/share-image.ts";

const fonts = pathToFileURL(join(import.meta.dirname, "..", "fonts")).href + "/";

test("every line sits inside the margin and measures within 3% of the table", async () => {
  const dir = mkdtempSync(join(tmpdir(), "share-image-"));
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
    for (const headline of [
      "Et sandt billede af forretningen og mindre manuelt arbejde.",
      "Byg en hjemmeside, der bliver fundet af søgemaskiner og citeret af svarmaskiner, uden at skrive en eneste linje kode selv",
      "ÆBLE & CO EXAMPLE: ÅRSREGNSKAB, MOMS OG LØN I ÉT OVERBLIK",
      "Agents that work in steps you can see, approve and replay",
    ]) {
      const file = join(dir, "x.svg");
      writeFileSync(file, shareImage({ headline, domain: "forspring.ai", fontBase: fonts }));
      await page.goto(pathToFileURL(file).href);
      await page.evaluate(() => document.fonts.ready);
      const got = await page.evaluate(() => {
        const size = Number(document.querySelector("text.headline")!.getAttribute("font-size"));
        return { size, lines: [...document.querySelectorAll("tspan")].map((t) => ({ text: t.textContent!, right: t.getBoundingClientRect().right, width: t.getBoundingClientRect().width })) };
      });
      for (const l of got.lines) {
        expect(l.right, l.text).toBeLessThanOrEqual(1200 - 64 + 1);
        expect(Math.abs(headlineWidth(l.text, got.size) - l.width) / l.width, l.text).toBeLessThan(0.03);
      }
    }
  } finally {
    await browser.close();
    rmSync(dir, { recursive: true, force: true });
  }
}, 60_000);

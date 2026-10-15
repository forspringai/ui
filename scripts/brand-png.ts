// Renders the brand PNGs (hub D-101) from the generated SVGs in Chromium, the light variant: the
// favicons and the logo on a transparent ground, the apple-touch icon and icon-512 on paper. Called
// by scripts/build.ts; needs Playwright's Chromium (pnpm exec playwright install chromium).

import type { Model } from "../src/emit.ts";
import { PNGS } from "../src/brand.ts";

export async function renderPngs(svgs: Record<string, string>, m: Model): Promise<Record<string, Buffer>> {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch();
  const out: Record<string, Buffer> = {};
  try {
    const page = await browser.newPage({ colorScheme: "light", deviceScaleFactor: 1 });
    for (const p of m.products) {
      for (const png of PNGS) {
        const svg = svgs[`brand/${p}/${png.from}`]!;
        const src = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
        // The app icons get a margin of an eighth on paper; the logo fits inside its frame, centred.
        const pad = png.paper ? Math.round(png.width / 8) : 0;
        await page.setViewportSize({ width: png.width, height: png.height });
        await page.setContent(
          `<!doctype html><html><body style="margin:0;width:${png.width}px;height:${png.height}px;display:grid;place-items:center;background:${png.paper ? m.colors.background!.light : "transparent"}"><img src="${src}" style="display:block;width:${png.width - 2 * pad}px;height:${png.height - 2 * pad}px;object-fit:contain"></body></html>`,
        );
        await page.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0));
        out[`brand/${p}/${png.file}`] = await page.screenshot({ omitBackground: !png.paper, type: "png" });
      }
    }
  } finally {
    await browser.close();
  }
  return out;
}

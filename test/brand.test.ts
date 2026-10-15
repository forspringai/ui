// Marks and wordmarks (D-18, hub D-101): every bar has a doll and a wordmark, the doll in the
// product's accent (ink for Forspring), the brand files are generated from the tokens and present
// for every product, shell() links the favicon, and the retired blue is gone.

import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { inflateSync } from "node:zlib";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { CLEAR, DOLL_HEIGHT, PNGS, lockup, readWordmarks } from "../src/brand.ts";
import { model } from "../src/emit.ts";
import { DEFAULT_BRAND_BASE, PRODUCT_NAMES, VERSION, bar, faviconFor, shell, type Product } from "../src/html.ts";
import { Bar } from "../src/react.ts";
import * as tokens from "../dist/tokens.js";

const root = join(import.meta.dirname, "..");
const m = model(join(root, "tokens"));
const PRODUCTS = tokens.products as readonly Product[];
const FILES = ["mark.svg", "favicon.svg", "logo.svg", ...PNGS.map((p) => p.file)].sort();
const ink = m.colors.foreground!;

describe.each(PRODUCTS)("the bar in %s", (p) => {
  const own = p === "forspring";
  const label = own ? "konto" : PRODUCT_NAMES[p];
  const out = String(bar({ lang: "da", product: p, productLabel: label }));
  const brand = /<a class="brand"[^>]*>(.*?)<\/a>/.exec(out)![1]!;

  test("shows the doll and the wordmark", () => {
    expect(brand).toMatch(/^<svg class="mark" viewBox="-184 -160 368 368" aria-hidden="true" focusable="false">/);
    expect(brand).toMatch(own ? /<\/svg><span class="word">Forspring<\/span> <span class="sub">konto<\/span>$/ : new RegExp(`</svg><span class="word">${PRODUCT_NAMES[p]}</span>$`));
    if (!own) expect(out).not.toMatch(/forspring/i);
  });

  test("its doll takes the product's mark colour: the accent, ink for Forspring", () => {
    const css = readFileSync(join(root, "dist/tokens.css"), "utf8");
    const want = own ? ink : m.product[p]!.primary;
    expect(css).toContain(`[data-product="${p}"] {\n  --primary: light-dark(${m.product[p]!.primary.light}, ${m.product[p]!.primary.dark});`);
    expect(css).toMatch(new RegExp(`\\[data-product="${p}"\\] \\{[^}]*--mark: light-dark\\(${want.light}, ${want.dark}\\);`));
    expect(tokens.themeFor(p, "dark").mark).toBe(want.dark);
  });

  test("the React Bar renders the same", () => {
    expect(renderToStaticMarkup(createElement(Bar, { lang: "da", product: p, productLabel: label }))).toBe(out);
  });
});

test("Forspring's own pages (product unset) get the ink doll: --mark is foreground at :root", () => {
  const css = readFileSync(join(root, "dist/tokens.css"), "utf8");
  expect(css).toMatch(new RegExp(`:root \\{[^}]*--mark: light-dark\\(${ink.light}, ${ink.dark}\\);`));
  expect(ink).toEqual({ light: "#14151a", dark: "#ededea" });
  const components = readFileSync(join(root, "css/components.css"), "utf8");
  expect(components).toMatch(/\.brand \.mark \.fill \{\s*fill: var\(--mark\);/);
  expect(components).toMatch(/\.brand \.mark \.coil \{\s*stroke: var\(--mark\);/);
  // The wordmark is always ink, Archivo Condensed 900.
  expect(components).toMatch(/\.brand \{[^}]*color: var\(--foreground\);/);
  expect(components).toMatch(/\.brand \.word \{\s*font: 900 [^;]* var\(--font-display\);/);
});

describe("favicons in shell()", () => {
  const page = (o: object = {}) => String(shell({ lang: "en", title: "t", productLabel: "Spring", product: "spring", body: "", ...o }));

  test("from the product, under the package's versioned path by default", () => {
    expect(DEFAULT_BRAND_BASE).toBe(`/assets/ui/${VERSION}/brand/`);
    const b = `/assets/ui/${VERSION}/brand/spring/`;
    expect(page()).toContain(
      `<link rel="icon" type="image/png" sizes="32x32" href="${b}favicon-32.png"><link rel="icon" type="image/png" sizes="16x16" href="${b}favicon-16.png"><link rel="icon" type="image/svg+xml" href="${b}favicon.svg"><link rel="apple-touch-icon" sizes="180x180" href="${b}apple-touch-icon-180.png">`,
    );
  });

  test("brandBase moves them; Forspring's own pages get Forspring's", () => {
    expect(page({ brandBase: "/static/ui/" })).toContain('<link rel="icon" type="image/svg+xml" href="/static/ui/spring/favicon.svg">');
    expect(String(shell({ lang: "da", title: "t", productLabel: "konto", body: "", brandBase: "/b/" }))).toContain('href="/b/forspring/favicon.svg"');
  });

  test("favicon names the files itself, or false leaves them out; hrefs are made safe", () => {
    expect(page({ favicon: { svg: "/icon.svg" } })).toMatch(/<\/title><link rel="icon" type="image\/svg\+xml" href="\/icon.svg"><\/head>/);
    expect(page({ favicon: false })).not.toContain("rel=\"icon\"");
    expect(page({ favicon: { svg: "javascript:alert(1)" } })).toContain('href="#"');
  });

  test("faviconFor names the generated files", () => {
    const f = faviconFor("pulsespring", "/x/");
    for (const url of Object.values(f)) expect(FILES).toContain(url.replace("/x/pulsespring/", ""));
  });
});

// A small PNG reader: 8-bit RGB or RGBA, not interlaced, as Chromium writes them.
function readPng(buf: Buffer) {
  expect(buf.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  let o = 8;
  let width = 0, height = 0, type = 0;
  const idat: Buffer[] = [];
  while (o < buf.length) {
    const len = buf.readUInt32BE(o);
    const kind = buf.toString("ascii", o + 4, o + 8);
    const data = buf.subarray(o + 8, o + 8 + len);
    if (kind === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      expect(data[8]).toBe(8);
      type = data[9]!;
      expect(data[12]).toBe(0);
    } else if (kind === "IDAT") idat.push(data);
    o += 12 + len;
  }
  const bpp = type === 6 ? 4 : type === 2 ? 3 : 0;
  expect(bpp).toBeGreaterThan(0);
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * bpp;
  const px = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const f = raw[y * (stride + 1)]!;
    for (let x = 0; x < stride; x++) {
      const v = raw[y * (stride + 1) + 1 + x]!;
      const a = x >= bpp ? px[y * stride + x - bpp]! : 0;
      const b = y > 0 ? px[(y - 1) * stride + x]! : 0;
      const c = x >= bpp && y > 0 ? px[(y - 1) * stride + x - bpp]! : 0;
      const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
      const pred = [0, a, b, (a + b) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? b : c][f]!;
      px[y * stride + x] = (v + pred) & 255;
    }
  }
  const at = (x: number, y: number) => {
    const i = y * stride + x * bpp;
    const hex = "#" + [0, 1, 2].map((k) => px[i + k]!.toString(16).padStart(2, "0")).join("");
    return { hex, alpha: bpp === 4 ? px[i + 3]! : 255 };
  };
  return { width, height, at };
}

describe.each(PRODUCTS)("brand/%s/", (p) => {
  const dir = join(root, "brand", p);
  const mark = m.product[p]!.mark;

  test("has every file, the same as dist/brand/", () => {
    expect(readdirSync(dir).sort()).toEqual(FILES);
    for (const f of FILES) expect(readFileSync(join(dir, f)).equals(readFileSync(join(root, "dist/brand", p, f))), f).toBe(true);
  });

  test("the SVGs use the token colours, with the dark variant in a prefers-color-scheme rule", () => {
    for (const f of ["mark.svg", "favicon.svg", "logo.svg"]) {
      const svg = readFileSync(join(dir, f), "utf8");
      expect(svg).toContain(`<title>${PRODUCT_NAMES[p]}</title>`);
      expect(svg).toMatch(new RegExp(`<style>\\.fill\\{fill:${mark.light}\\}\\.coil\\{stroke:${mark.light}\\}.*@media \\(prefers-color-scheme: dark\\)\\{\\.fill\\{fill:${mark.dark}\\}\\.coil\\{stroke:${mark.dark}\\}`));
    }
    const logo = readFileSync(join(dir, "logo.svg"), "utf8");
    // The wordmark is ink (paper on dark), outlined: a path, no text, no font.
    expect(logo).toContain(`.word{fill:${ink.light}}`);
    expect(logo).toContain(`.word{fill:${ink.dark}}`);
    expect(logo).toMatch(/<path class="word" transform="[^"]+" d="M[^"]+"\/>/);
    expect(logo).not.toMatch(/<text|font-family/);
  });

  test("the lockup keeps a quarter of the doll's height clear on every side", () => {
    const l = lockup(readWordmarks(root), p);
    expect(CLEAR).toBe(DOLL_HEIGHT / 4);
    expect(l.box.x).toBe(-160 - CLEAR);
    expect(l.box.y).toBeLessThanOrEqual(-160 - CLEAR);
  });

  test("the PNGs have their sizes and the token colours", () => {
    for (const png of PNGS) {
      const img = readPng(readFileSync(join(dir, png.file)));
      expect([img.width, img.height], png.file).toEqual([png.width, png.height]);
      // A corner is paper on the app icons, transparent elsewhere.
      const corner = img.at(0, 0);
      if (png.paper) expect(corner.hex, png.file).toBe(m.colors.background!.light);
      else expect(corner.alpha, png.file).toBe(0);
    }
    // The doll's forehead, in the light colour.
    const icon = readPng(readFileSync(join(dir, "icon-512.png")));
    expect(icon.at(256, 127).hex).toBe(mark.light);
    const touch = readPng(readFileSync(join(dir, "apple-touch-icon-180.png")));
    expect(touch.at(90, 45).hex).toBe(mark.light);
  });
});

test("the old blue, #2B4BF2, is retired everywhere (hub D-101)", () => {
  const files = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { cwd: root, encoding: "utf8" })
    .split("\n")
    .filter((f) => f && !/\.(png|woff2)$/.test(f) && f !== "test/brand.test.ts");
  for (const f of files) {
    let text: string;
    try {
      text = readFileSync(join(root, f), "utf8");
    } catch {
      continue; // deleted in the working tree
    }
    expect(text.toLowerCase().includes("2b4bf2"), f).toBe(false);
  }
});

test("VERSION is package.json's, and the package ships dist/brand/", () => {
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  expect(VERSION).toBe(pkg.version);
  expect(pkg.exports["./brand/*"]).toBe("./dist/brand/*");
});

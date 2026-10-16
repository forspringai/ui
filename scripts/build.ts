// pnpm build: tokens/*.json, css/, src/html.ts and brand/wordmarks.json -> dist/, and the brand
// files to brand/<product>/ as well. dist/ is committed, because products install this package from a
// git tag and a git install runs no build (D-2); test/build.test.ts fails when dist/ is stale. The
// brand PNGs need Playwright's Chromium.

import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { assets } from "../src/assets.ts";
import { TokenProblems, build, model } from "../src/emit.ts";
import { renderPngs } from "./brand-png.ts";

const root = join(import.meta.dirname, "..");
try {
  const files: Record<string, string | Buffer> = { ...build(join(root, "tokens")), ...assets(root) };
  // The brand PNGs, rendered from the SVGs in Chromium (hub D-101).
  Object.assign(files, await renderPngs(files as Record<string, string>, model(join(root, "tokens"))));
  rmSync(join(root, "dist", "brand"), { recursive: true, force: true });
  for (const [name, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, "dist", name)), { recursive: true });
    writeFileSync(join(root, "dist", name), text);
  }
  // brand/<product>/ is the same files beside brand/README.md, for people; dist/brand/ is what products serve.
  for (const p of model(join(root, "tokens")).products) {
    rmSync(join(root, "brand", p), { recursive: true, force: true });
    cpSync(join(root, "dist", "brand", p), join(root, "brand", p), { recursive: true });
  }
  // html, refusals, pages, connect and react (.js and .d.ts), so a product imports the helpers with no TypeScript loader (Node will not
  // strip types inside node_modules).
  execFileSync(join(root, "node_modules/.bin/tsc"), ["-p", join(root, "tsconfig.html.json")], { stdio: "inherit" });
  // The design audit's bin, ui-audit, for the same reason.
  execFileSync(join(root, "node_modules/.bin/tsc"), ["-p", join(root, "tsconfig.audit.json")], { stdio: "inherit" });
  console.log(`dist/: ${[...Object.keys(files), "html, refusals, pages, connect, react (.js, .d.ts)", "audit/", "brand/<product>/ (3 SVG, 5 PNG)"].filter((n) => !n.startsWith("brand/") || n.includes("<")).join(", ")}`);
} catch (e) {
  if (!(e instanceof TokenProblems)) throw e;
  console.error(e.message);
  process.exit(1);
}

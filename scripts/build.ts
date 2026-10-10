// pnpm build: tokens/*.json, css/ and src/html.ts -> dist/. dist/ is committed, because products
// install this package from a git tag and a git install runs no build (D-2); test/build.test.ts
// fails when dist/ is stale.

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { assets } from "../src/assets.ts";
import { TokenProblems, build } from "../src/emit.ts";

const root = join(import.meta.dirname, "..");
try {
  const files = { ...build(join(root, "tokens")), ...assets(root) };
  for (const [name, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, "dist", name)), { recursive: true });
    writeFileSync(join(root, "dist", name), text);
  }
  // html.js and html.d.ts, so a product imports the helpers with no TypeScript loader (Node will not
  // strip types inside node_modules).
  execFileSync(join(root, "node_modules/.bin/tsc"), ["-p", join(root, "tsconfig.html.json")], { stdio: "inherit" });
  // The design audit's bin, ui-audit, for the same reason.
  execFileSync(join(root, "node_modules/.bin/tsc"), ["-p", join(root, "tsconfig.audit.json")], { stdio: "inherit" });
  console.log(`dist/: ${[...Object.keys(files), "html.js", "html.d.ts", "audit/"].join(", ")}`);
} catch (e) {
  if (!(e instanceof TokenProblems)) throw e;
  console.error(e.message);
  process.exit(1);
}

// pnpm build: tokens/*.json -> dist/. dist/ is committed, because products install this package
// from a git tag and a git install runs no build (D-2); test/build.test.ts fails when dist/ is stale.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { TokenProblems, build } from "../src/emit.ts";

const root = join(import.meta.dirname, "..");
try {
  const files = build(join(root, "tokens"));
  mkdirSync(join(root, "dist"), { recursive: true });
  for (const [name, text] of Object.entries(files)) writeFileSync(join(root, "dist", name), text);
  console.log(`dist/: ${Object.keys(files).join(", ")}`);
} catch (e) {
  if (!(e instanceof TokenProblems)) throw e;
  console.error(e.message);
  process.exit(1);
}

// name-guard: this repository is public, so no live customer or org name may appear in it (D-55, D-57).
//
//   node scripts/name-guard.ts                 scan every tracked text file; exit 1 on a match
//   node scripts/name-guard.ts --hash < names  print one hash per input line, for the list's keeper
//
// The names never live here, not even as hashes: UI_NAME_GUARD (a secret variable on the ui-ci trigger) holds the
// comma-separated SHA-256 of each normalized name, made by whoever may read the account's customer list
// (`--hash` on their machine). A match prints only the file and line, never the name, so the CI log does not leak it
// either. Without UI_NAME_GUARD the scan says it is skipped and passes, so a fork or a laptop is not blocked.
// Normalizing: lower case, accents folded (Blåbær -> blabaer), anything not a letter or digit a single space.
// Names of one to four words are matched as whole words.

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const FOLD: Record<string, string> = { æ: "ae", ø: "oe", å: "aa", ß: "ss" };

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[æøåß]/g, (c) => FOLD[c]!)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export const hash = (s: string): string => createHash("sha256").update(normalize(s)).digest("hex");

/** Each run of one to four whole words in a line, normalized: what a name could be. */
export function grams(line: string): string[] {
  const w = normalize(line).split(" ").filter(Boolean);
  const out: string[] = [];
  for (let n = 1; n <= 4; n++) for (let i = 0; i + n <= w.length; i++) out.push(w.slice(i, i + n).join(" "));
  return out;
}

/** The lines of `text` that hold a name whose hash is in `hashes`, as 1-based line numbers. */
export function findHits(text: string, hashes: Set<string>): number[] {
  const hits: number[] = [];
  text.split("\n").forEach((line, i) => {
    if (grams(line).some((g) => hashes.has(createHash("sha256").update(g).digest("hex")))) hits.push(i + 1);
  });
  return hits;
}

function main(): number {
  if (process.argv.includes("--hash")) {
    for (const line of readFileSync(0, "utf8").split("\n")) if (line.trim()) console.log(hash(line));
    return 0;
  }
  const list = (process.env.UI_NAME_GUARD ?? "").split(",").map((s) => s.trim().toLowerCase()).filter((s) => /^[0-9a-f]{64}$/.test(s));
  if (!list.length) {
    console.log("name-guard: skipped (UI_NAME_GUARD is not set here; ui-ci sets it)");
    return 0;
  }
  const hashes = new Set(list);
  const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean);
  let found = 0;
  for (const f of files) {
    const buf = readFileSync(f);
    if (buf.includes(0)) continue; // binary
    for (const line of findHits(buf.toString("utf8"), hashes)) {
      console.log(`name-guard: ${f}:${line} holds a live customer or org name; use an invented one (acme, globex, *.example)`);
      found++;
    }
  }
  console.log(found ? `name-guard: ${found} line(s) name a customer (D-57)` : `name-guard: clean (${files.length} files, ${hashes.size} names)`);
  return found ? 1 : 0;
}

if (import.meta.url === `file://${process.argv[1]}`) process.exit(main());

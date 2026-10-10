#!/usr/bin/env node
// ui-audit: the design audit a product runs in CI (hub ui-standard §3). JSON on stdout, exit codes
// per suite-standards §6.

import { parseArgs, USAGE } from "./args.js";
import { audit, formatText, loadTokens } from "./audit.js";
import type { Refusal } from "./types.js";

const refusalText = (r: Refusal) => `ui-audit: ${r.reason}: ${r.note}`;

async function main(): Promise<number> {
  const tokens = await loadTokens();
  const parsed = parseArgs(process.argv.slice(2), tokens.products, process.env);
  const print = (json: unknown, text: string) => console.log(parsed.format === "text" ? text : JSON.stringify(json, null, 2));
  if ("refusal" in parsed) {
    print(parsed.refusal, refusalText(parsed.refusal) + (parsed.exit === 64 ? "\n\n" + USAGE : ""));
    return parsed.exit;
  }
  if (parsed.help) {
    console.log(USAGE);
    return 0;
  }

  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    const r: Refusal = { ok: false, reason: "playwright_missing", note: "install it beside the package: pnpm add -D playwright && pnpm exec playwright install chromium" };
    print(r, refusalText(r));
    return 5;
  }
  let browser;
  try {
    // Only the audited hosts resolve. The audit already answers off-origin requests itself; this
    // also stops Chromium's own DNS prefetch and preconnect from reaching a third party.
    const hosts = [...new Set(parsed.opts.urls.map((u) => new URL(u).hostname))];
    browser = await chromium.launch({ args: [`--host-resolver-rules=MAP * ~NOTFOUND, ${hosts.map((h) => `EXCLUDE ${h}`).join(", ")}`] });
  } catch (e) {
    const r: Refusal = { ok: false, reason: "browser_missing", note: `run pnpm exec playwright install chromium (in CI: --with-deps). ${(e as Error).message.split("\n")[0]}` };
    print(r, refusalText(r));
    return 5;
  }
  try {
    const result = await audit(parsed.opts, browser);
    print(result, formatText(result));
    return result.ok ? 0 : 1;
  } finally {
    await browser.close();
  }
}

process.exitCode = await main();

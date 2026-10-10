// ui-audit's arguments. A usage error (an unknown flag, no URL) exits 64; a value that is the wrong
// shape (a URL that is not http(s), a budget that is not a size, a product that does not exist)
// exits 2 (suite-standards §6).

import type { AuditOptions, Refusal } from "./types.js";
import { DEFAULT_THEMES, DEFAULT_WIDTHS } from "./audit.js";

export const USAGE = `ui-audit <url...> [options]

Audits each page at 1280 and 380 px wide, in light and dark, against @forspring/ui's tokens.

  --budget-js <size>      script files per page, gzipped (default 0; e.g. 20kb for htmx)
  --product <key>         accept only this product's accent (forspring, sitespring, ...)
  --allow-spacing <list>  off-grid spacings in px to accept while migrating (e.g. 2,6,10,14,18)
  --format json|text      json is the default (also --json); text for a person reading a build
  --help

Exit codes: 0 no errors, 1 findings with severity error, 2 invalid input, 5 Playwright missing,
64 usage.`;

export type Parsed = { opts: AuditOptions; format: "json" | "text"; help?: boolean } | { refusal: Refusal; exit: 2 | 64; format: "json" | "text" };

export function parseSize(s: string): number | null {
  const m = /^(\d+(?:\.\d+)?)\s*(b|kb|k|mb|m)?$/i.exec(s.trim());
  if (!m) return null;
  const n = Number(m[1]);
  const unit = (m[2] ?? "b").toLowerCase();
  return Math.round(n * (unit.startsWith("k") ? 1024 : unit.startsWith("m") ? 1024 * 1024 : 1));
}

export function parseArgs(argv: string[], products: readonly string[], env: Record<string, string | undefined> = {}): Parsed {
  let format: "json" | "text" = env.UI_AUDIT_FORMAT === "text" ? "text" : "json";
  const usage = (note: string): Parsed => ({ refusal: { ok: false, reason: "usage", note: `${note}. Run ui-audit --help.` }, exit: 64, format });
  const invalid = (reason: string, note: string): Parsed => ({ refusal: { ok: false, reason, note }, exit: 2, format });

  const urls: string[] = [];
  const flags = new Map<string, string>();
  let help = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--help" || a === "-h") help = true;
    else if (a === "--json") flags.set("format", "json");
    else if (a.startsWith("--")) {
      const eq = a.indexOf("=");
      const name = a.slice(2, eq === -1 ? undefined : eq);
      if (!["budget-js", "product", "allow-spacing", "format"].includes(name)) return usage(`unknown option --${name}`);
      const value = eq === -1 ? argv[++i] : a.slice(eq + 1);
      if (value === undefined || value.startsWith("--")) return usage(`--${name} needs a value`);
      flags.set(name, value);
    } else urls.push(a);
  }
  if (flags.has("format")) {
    const f = flags.get("format");
    if (f !== "json" && f !== "text") return usage(`--format is json or text, not ${f}`);
    format = f;
  }
  if (help) return { opts: { urls, budgetJs: 0, allowSpacing: [], widths: DEFAULT_WIDTHS, themes: DEFAULT_THEMES }, format, help: true };
  if (!urls.length) return usage("give at least one URL");

  for (const u of urls) {
    let parsed: URL;
    try {
      parsed = new URL(u);
    } catch {
      return invalid("invalid_url", `${u} is not a URL; give an absolute http(s) URL such as http://127.0.0.1:8787/`);
    }
    if (!/^https?:$/.test(parsed.protocol)) return invalid("invalid_url", `${u} is not http(s); serve the page (fonts do not load from file://)`);
  }

  let budgetJs = 0;
  if (flags.has("budget-js")) {
    const n = parseSize(flags.get("budget-js")!);
    if (n === null) return invalid("invalid_budget", `--budget-js takes a size such as 0, 20kb or 300kb, not ${flags.get("budget-js")}`);
    budgetJs = n;
  }

  const product = flags.get("product");
  if (product !== undefined && !products.includes(product)) return invalid("unknown_product", `--product is one of ${products.join(", ")}`);

  let allowSpacing: number[] = [];
  if (flags.has("allow-spacing")) {
    const parts = flags.get("allow-spacing")!.split(",").map((s) => s.trim().replace(/px$/, ""));
    allowSpacing = parts.map(Number);
    if (parts.some((p) => p === "") || allowSpacing.some((n) => !Number.isFinite(n) || n < 0)) return invalid("invalid_spacing", "--allow-spacing takes px values separated by commas, such as 2,6,10,14,18");
  }

  return { opts: { urls, budgetJs, product, allowSpacing, widths: DEFAULT_WIDTHS, themes: DEFAULT_THEMES }, format };
}

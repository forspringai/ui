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
  --allow-status <list>   HTTP statuses a page may answer with and still be audited (e.g. 403,503
                          for refusal pages); any other status of 400 or over is an error
  --cookie-env <NAME>     send the Cookie header value in environment variable NAME to the audited
                          origins (and each --allow-origin) only, for signed-in pages; never given
                          on the command line, and redacted from the output
  --allow-origin <origin> an origin the page may call, such as its API on another port
                          (http://127.0.0.1:8788); repeatable. Its requests are not third-party
                          findings and get the --cookie-env cookie
  --wait-for <selector>   after load, wait until this element is visible before measuring (for a
                          single-page app); a page-load error if it is not
  --wait-timeout <ms>     how long --wait-for waits (default 30000)
  --settle <ms>           wait this much longer once the page is quiet (default 0). Every page is
                          measured once its network is idle and its DOM has not changed for 300 ms
                          (at most 10 s after load)
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
  const allowOriginArgs: string[] = [];
  let help = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--help" || a === "-h") help = true;
    else if (a === "--json") flags.set("format", "json");
    else if (a.startsWith("--")) {
      const eq = a.indexOf("=");
      const name = a.slice(2, eq === -1 ? undefined : eq);
      if (!["budget-js", "product", "allow-spacing", "allow-status", "cookie-env", "allow-origin", "wait-for", "wait-timeout", "settle", "format"].includes(name)) return usage(`unknown option --${name}`);
      const value = eq === -1 ? argv[++i] : a.slice(eq + 1);
      if (value === undefined || value.startsWith("--")) return usage(`--${name} needs a value`);
      if (name === "allow-origin") allowOriginArgs.push(value);
      else flags.set(name, value);
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

  let allowStatus: number[] = [];
  if (flags.has("allow-status")) {
    const parts = flags.get("allow-status")!.split(",").map((s) => s.trim());
    allowStatus = parts.map(Number);
    if (parts.some((p) => !/^\d{3}$/.test(p)) || allowStatus.some((n) => n < 400 || n > 599)) return invalid("invalid_status", "--allow-status takes HTTP statuses from 400 to 599 separated by commas, such as 403,503");
  }

  // The cookie is a session: it comes from the environment, never argv (which other users on the
  // host can read in the process list), and is never echoed, not even in a refusal.
  let cookie: string | undefined;
  if (flags.has("cookie-env")) {
    const name = flags.get("cookie-env")!;
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) return invalid("invalid_cookie_env", "--cookie-env takes the name of an environment variable (letters, digits, _), not a cookie");
    cookie = env[name];
    if (!cookie) return invalid("cookie_env_unset", `environment variable ${name} is unset or empty; set it to a Cookie header value (name=value; name2=value2)`);
    if (/[\r\n]/.test(cookie)) return invalid("invalid_cookie", `environment variable ${name} holds a line break; a Cookie header value is one line`);
  }

  // An origin, not a URL: a path would suggest only part of the host is allowed, which it is not.
  const allowOrigins: string[] = [];
  for (const o of allowOriginArgs) {
    let u: URL;
    try {
      u = new URL(o);
    } catch {
      return invalid("invalid_origin", `--allow-origin takes an origin such as http://127.0.0.1:8788, not ${o}`);
    }
    if (!/^https?:$/.test(u.protocol) || u.pathname !== "/" || u.search || u.hash || u.username || u.password)
      return invalid("invalid_origin", `--allow-origin takes an http(s) origin with no path, such as http://127.0.0.1:8788, not ${o}`);
    if (!allowOrigins.includes(u.origin)) allowOrigins.push(u.origin);
  }

  const ms = (name: string, min: number): number | undefined | Parsed => {
    if (!flags.has(name)) return undefined;
    const v = flags.get(name)!;
    if (!/^\d+$/.test(v) || Number(v) < min) return invalid(`invalid_${name.replace("-", "_")}`, `--${name} takes a whole number of milliseconds${min ? ` from ${min}` : ""}, such as 2000, not ${v}`);
    return Number(v);
  };
  const waitTimeout = ms("wait-timeout", 1);
  if (typeof waitTimeout === "object") return waitTimeout;
  const settle = ms("settle", 0);
  if (typeof settle === "object") return settle;
  const waitFor = flags.get("wait-for");
  if (waitFor !== undefined && !waitFor.trim()) return invalid("invalid_wait_for", "--wait-for takes a CSS selector, such as main h1");

  return { opts: { urls, budgetJs, product, allowSpacing, allowStatus, cookie, allowOrigins, waitFor, waitTimeout, settle, widths: DEFAULT_WIDTHS, themes: DEFAULT_THEMES }, format };
}

/**
 * Takes the cookie, and each value in it, out of text about to be printed. Nothing the audit
 * prints should hold it, but a page or an error message may echo a request header back.
 */
const decoded = (s: string) => {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};

export function redactor(cookie: string | undefined): (text: string) => string {
  if (!cookie) return (t) => t;
  const secrets = [cookie, ...cookie.split(";").map((p) => p.slice(p.indexOf("=") + 1).trim())]
    .filter((s) => s.length >= 4)
    .flatMap((s) => [s, encodeURIComponent(s), decoded(s), JSON.stringify(s).slice(1, -1)])
    .sort((a, b) => b.length - a.length);
  return (t) => secrets.reduce((acc, s) => acc.split(s).join("[redacted]"), t);
}

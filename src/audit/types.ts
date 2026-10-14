// The audit's output shape (suite-standards §6: JSON on stdout by default). A finding names the rule,
// the element (a short CSS path), what was measured and what the standard expects.

export type Severity = "error" | "warning" | "review";

export type Rule =
  | "page-load"
  | "contrast"
  | "text-min"
  | "font-size"
  | "font-family"
  | "radius"
  | "spacing"
  | "target-size"
  | "target-primary"
  | "palette"
  | "axe"
  | "third-party"
  | "js-budget";

export type Finding = {
  rule: Rule;
  severity: Severity;
  selector: string;
  value: string;
  expected: string;
  note: string;
  /** How many elements on the page gave this same finding, when more than one. */
  count?: number;
};

export type Theme = "light" | "dark";

export type PageResult = {
  url: string;
  width: number;
  theme: Theme;
  findings: Finding[];
};

export type AuditResult = {
  ok: boolean;
  pages: PageResult[];
};

export type Refusal = { ok: false; reason: string; note: string };

export type AuditOptions = {
  urls: string[];
  /** Script bytes per page, gzipped (see D-9). 0 by default: console pages ship no script files. */
  budgetJs: number;
  /** Restricts the accent colours the palette rule accepts to this product's. */
  product?: string;
  /** Off-grid spacings (px) accepted for products migrating onto the 4px grid (D-8). */
  allowSpacing: number[];
  /** HTTP statuses (400 and over) a page may answer with and still be audited: a refusal page (D-10). */
  allowStatus?: number[];
  /**
   * A Cookie header value sent with every request to the audited page's own origin, and nowhere
   * else, so signed-in pages can be audited (D-10). The CLI reads it from an environment variable.
   */
  cookie?: string;
  /**
   * Other origins the page may call (a single-page app's API on another port, say): their requests
   * go through and are not third-party findings, and they get the same cookie (D-16).
   */
  allowOrigins?: string[];
  /** A CSS selector to wait for, visible, after the load event and before measuring (D-16). */
  waitFor?: string;
  /** How long to wait for waitFor, in ms. 30000 by default. */
  waitTimeout?: number;
  /** A fixed wait in ms after the page has settled, for a page that draws on a timer (D-16). 0 by default. */
  settle?: number;
  widths: number[];
  themes: Theme[];
};

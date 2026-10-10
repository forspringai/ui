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
  widths: number[];
  themes: Theme[];
};

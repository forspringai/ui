// D-77: a consent page's headers. consentHeaders() sets the three over a page's own (its CSP keeps every
// other directive); consentHeaderGaps() names what a response lacks, as ui-audit's consent-headers rule says it.
import { expect, test } from "vitest";
import { consentHeaderGaps, consentHeaders, NO_FRAMES } from "../src/html.ts";

test("over a page's own headers: frame-ancestors 'none' in place of its own, its other directives kept, DENY, no-store", () => {
  const h = consentHeaders({ "Content-Type": "text/html; charset=utf-8", "content-security-policy": "default-src 'none'; frame-ancestors 'self'; form-action 'self' https://client.example", "Cache-Control": "public, max-age=60" });
  expect(h).toEqual({
    "content-type": "text/html; charset=utf-8",
    "content-security-policy": "default-src 'none'; form-action 'self' https://client.example; frame-ancestors 'none'",
    "x-frame-options": "DENY",
    "cache-control": "no-store",
  });
});

test("with no headers of its own, the three alone; and its answer has no gaps", () => {
  const h = consentHeaders();
  expect(h).toEqual({ "content-security-policy": NO_FRAMES, "x-frame-options": "DENY", "cache-control": "no-store" });
  expect(consentHeaderGaps((n) => h[n])).toEqual([]);
  // A Response takes it as it is.
  expect(new Response("x", { headers: h }).headers.get("cache-control")).toBe("no-store");
});

test("the gaps: frame-ancestors missing or anything but 'none' ('self' too), and no-store missing", () => {
  const gaps = (h: Record<string, string>) => consentHeaderGaps((n) => h[n]);
  expect(gaps({})).toEqual(["no frame-ancestors in its CSP", "Cache-Control missing"]);
  expect(gaps({ "content-security-policy": "default-src 'none'; frame-ancestors 'self'", "cache-control": "private, max-age=0" })).toEqual(["CSP frame-ancestors 'self'", "Cache-Control private, max-age=0"]);
  expect(gaps({ "content-security-policy": "default-src 'none';  frame-ancestors   'none' ", "cache-control": "private, no-store" })).toEqual([]);
  // X-Frame-Options is for browsers older than frame-ancestors: its absence is not a gap, nor is it enough alone.
  expect(gaps({ "x-frame-options": "DENY", "cache-control": "no-store" })).toEqual(["no frame-ancestors in its CSP"]);
});

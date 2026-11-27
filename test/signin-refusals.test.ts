// D-80: the sign-in failed words, once, for every product: every suite-signin refusal in Danish and English, never a
// command, a general text for a reason this package does not know, and the page drawn from them.
import { describe, expect, test } from "vitest";
import { SIGN_IN_REFUSAL_FALLBACK, SIGN_IN_REFUSAL_REASONS, SIGN_IN_REFUSALS, signInRefusal } from "../src/refusals.ts";
import { signInFailedPage } from "../src/pages.ts";

// forspringai/suite-signin src/types.ts (972c94c): CallbackRefusal, and the start's rate_limited. A new reason there
// is a row here and in SIGN_IN_REFUSALS; until then it gets the general words.
const SUITE_SIGNIN = ["rate_limited", "account_error", "bad_request", "no_login", "expired", "binding_mismatch", "iss_mismatch", "token_exchange_failed", "invalid_id_token", "email_not_verified", "auth_too_old", "product_refused"];

describe("sign-in refusals (D-80)", () => {
  test("every suite-signin reason, and no other", () => {
    expect([...SIGN_IN_REFUSAL_REASONS].sort()).toEqual([...SUITE_SIGNIN].sort());
  });

  test("each has a title, a text and a fix in Danish and English, and the titles differ per language", () => {
    for (const lang of ["da", "en"] as const) {
      const titles = new Set<string>();
      for (const r of SIGN_IN_REFUSAL_REASONS) {
        const w = SIGN_IN_REFUSALS[r][lang];
        for (const k of ["title", "text", "fix"] as const) expect(w[k].trim().length, `${r} ${lang} ${k}`).toBeGreaterThan(3);
        titles.add(w.title);
      }
      expect(titles.size).toBe(SIGN_IN_REFUSAL_REASONS.length);
    }
  });

  test("a page never tells a person to run a command (D-35)", () => {
    const all = [...SIGN_IN_REFUSAL_REASONS.map((r) => SIGN_IN_REFUSALS[r]), SIGN_IN_REFUSAL_FALLBACK].flatMap((i) => [i.da, i.en]).flatMap((w) => [w.title, w.text, w.fix]);
    for (const s of all) {
      expect(s, s).not.toMatch(/`|--|\b(run|kør)\b|\bauth login\b/i);
      // A CLI is lowercase ("sitespring auth login"); the products' names in prose are capitalised.
      expect(s, s).not.toMatch(/\b(sitespring|dataspring|pulsespring|flowspring|forspring) [a-z]/);
    }
  });

  test("the words Peter needed on his phone: binding_mismatch names the browser and what to do", () => {
    expect(signInRefusal("binding_mismatch", "en").fix).toBe("Open this page in the browser you want to use (for example Safari) and finish signing in there.");
    expect(signInRefusal("binding_mismatch", "da").fix).toBe("Åbn siden i den browser, du vil bruge (fx Safari), og gennemfør login dér.");
    expect(signInRefusal("rate_limited", "da").fix).toBe("Vent et minut, og prøv igen.");
  });

  test("an unknown or hostile reason gets the general words, status 400, reason 'unknown'", () => {
    for (const r of ["new_reason", "<script>", "", "__proto__", "toString"]) {
      const w = signInRefusal(r, "en");
      expect([w.reason, w.status, w.title]).toEqual(["unknown", 400, "Sign-in failed"]);
    }
  });

  test("the page: its status, the title as h1, text, detail (escaped), fix, a retry and the ref", () => {
    const p = signInFailedPage({ lang: "da", reason: "product_refused", retryHref: "/sign-in?return=%2F", detail: "Organisationen <b>er</b> lukket.", ref: "a1b2c3" });
    const body = String(p.body);
    expect(p.status).toBe(403);
    expect(p.title).toBe("Du kan ikke logge ind her");
    expect(body).toContain('data-reason="product_refused"');
    expect(body).toContain("<h1>Du kan ikke logge ind her</h1>");
    expect(body).toContain("Organisationen &lt;b&gt;er&lt;/b&gt; lukket.");
    expect(body).toContain(">Log ind igen</a>");
    expect(body).toContain("a1b2c3");
    // A wait is "Try again", not "Sign in again"; with no retry link there is no button.
    expect(String(signInFailedPage({ lang: "en", reason: "rate_limited", retryHref: "/sign-in" }).body)).toContain(">Try again</a>");
    expect(String(signInFailedPage({ lang: "en", reason: "expired" }).body)).not.toContain("<a ");
    expect(String(signInFailedPage({ lang: "en", reason: "<x>" }).body)).toContain('data-reason="unknown"');
  });
});

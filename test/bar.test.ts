// The bar's menus, the standard pages, the refusal vocabulary and the React wrappers (D-17).

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { bar, esc, initials, orgPath, shell, type BarOptions } from "../src/html.ts";
import { accountUnavailablePage, chooseOrgPage, noOrgPage, refusedPage } from "../src/pages.ts";
import { AccountUnavailable, Bar, ChooseOrg, NoOrg, Refused } from "../src/react.ts";
import { isRefusal, REFUSAL_REASONS, REFUSALS } from "../src/refusals.ts";

const evil = `<script>alert("x")</script>&'`;

const opts: BarOptions = {
  lang: "en",
  product: "dataspring",
  productLabel: "DataSpring",
  org: {
    current: { slug: "noon", name: "Noon", role: "admin" },
    orgs: [
      { slug: "noon", name: "Noon", role: "admin" },
      { slug: "spekta", name: "Spekta", role: "owner" },
    ],
    path: "/o/noon/datacore/runs?state=failed",
    peopleHref: "https://account.forspring.ai/o/noon/people",
  },
  products: {
    items: [
      { name: "DataSpring", href: "/o/noon/", current: true },
      { name: "SiteSpring", href: "https://sitespring.ai/o/noon/" },
    ],
    accountHref: "https://account.forspring.ai/o/noon/",
  },
  userMenu: {
    name: "Peter Engelbrecht",
    email: "peter@example.com",
    accountHref: "https://account.forspring.ai/",
    agentsHref: "https://account.forspring.ai/o/noon/agents?product=dataspring",
    languages: { da: "?lang=da", en: "?lang=en" },
    signOut: { action: "/signout", fields: { csrf: "t0k" } },
  },
};

describe("the bar", () => {
  const out = String(bar(opts));

  test("the lockup is the product's doll and its name alone, and leads to the org's home (D-98, D-18)", () => {
    expect(out).toMatch(/^<header class="bar"><div class="wrap bar-inner"><a class="brand" href="\/o\/noon\/" aria-label="DataSpring"><svg class="mark" viewBox="-184 -160 368 368" aria-hidden="true" focusable="false">.*?<\/svg><span class="word">DataSpring<\/span><\/a>/);
    expect(out).not.toContain("Forspring</span>");
  });

  test("the org switcher names each customer with your role, keeps the path, and links to people", () => {
    expect(out).toContain('<details class="switcher bar-menu org-switcher"><summary><span class="bar-menu-name">Noon</span><span class="visually-hidden">, switch organization</span></summary>');
    expect(out).toContain('<a href="/o/spekta/datacore/runs?state=failed"><span class="bar-item-name">Spekta</span><span class="bar-item-meta">owner</span></a>');
    expect(out).toContain('<a href="/o/noon/datacore/runs?state=failed" aria-current="true">');
    expect(out).toContain(">Manage people in Noon</a>");
  });

  test("with one org there is no org switcher; the org shows in the menu head", () => {
    const one = String(bar({ ...opts, org: { current: opts.org!.current, orgs: [opts.org!.current] } }));
    expect(one).not.toContain("org-switcher");
    expect(one).toContain('<span class="user-role">admin in Noon</span>');
  });

  test("the product switcher lists the org's products and links to the org at Forspring", () => {
    expect(out).toContain('<p class="bar-panel-label">Noon has</p>');
    expect(out).toContain('<a href="/o/noon/" aria-current="true"><span class="bar-item-name">DataSpring</span><span class="bar-item-meta">here</span></a>');
    expect(out).toContain('<a href="https://account.forspring.ai/o/noon/">All of Noon at Forspring</a>');
  });

  test("the user menu: initials, who, role here, account, agents, language, sign out as a ghost button", () => {
    expect(out).toContain('<summary><span class="avatar">PE</span><span class="visually-hidden">: Peter Engelbrecht, your account</span></summary>');
    expect(out).toContain(">Your Forspring account</a>");
    expect(out).toContain(">Agents and keys in Noon</a>");
    expect(out).toContain('<a href="?lang=en" lang="en" hreflang="en" aria-current="true">English</a>');
    expect(out).toContain('<form class="user-signout" method="post" action="/signout"><input type="hidden" name="csrf" value="t0k"><button class="ghost small wide" type="submit">Sign out of Forspring</button></form>');
  });

  test("Danish first: the same bar in Danish", () => {
    const da = String(bar({ ...opts, lang: "da" }));
    for (const w of ["Dine organisationer", "Administrer folk i Noon", "Noon har", "Alt for Noon hos Forspring", "Din Forspring-konto", "Agenter og nøgler i Noon", "administrator i Noon", "Log ud af Forspring", ", skift organisation"]) expect(da).toContain(w);
  });

  test("shell() draws the same bar", () => {
    expect(String(shell({ ...opts, title: "Runs", body: "" }))).toContain(out);
  });

  test("everything in the bar is escaped, and hrefs pass safeHref", () => {
    const bad = String(
      bar({
        lang: "en",
        productLabel: evil,
        org: { current: { slug: evil, name: evil, role: "member" }, orgs: [{ slug: evil, name: evil, role: "member" }, { slug: "b", name: evil, role: "viewer", href: "javascript:alert(1)" }], path: evil, peopleHref: evil },
        products: { items: [{ name: evil, href: "javascript:x" }], accountHref: evil },
        userMenu: { name: evil, email: evil, accountHref: evil, signOut: { action: evil, fields: { [evil]: evil } } },
      }),
    );
    expect(bad).not.toContain("<script>");
    expect(bad).not.toContain("javascript:");
    expect(bad).not.toMatch(/="[^"]*"[^ >\/]/);
  });
});

test("orgPath keeps the place in another org", () => {
  expect(orgPath("/o/noon/datacore/runs", "spekta")).toBe("/o/spekta/datacore/runs");
  expect(orgPath("/o/noon", "spekta")).toBe("/o/spekta/");
  expect(orgPath("/o/noon?x=1", "spekta")).toBe("/o/spekta/?x=1");
  expect(orgPath("/settings", "spekta")).toBe("/o/spekta/");
  expect(orgPath("/", "a b")).toBe("/o/a%20b/");
});

test("initials", () => {
  expect(initials("Peter Engelbrecht")).toBe("PE");
  expect(initials("Mette Kjær Nielsen")).toBe("MN");
  expect(initials("Øjvind")).toBe("Ø");
  expect(initials("", "aisha@example.com")).toBe("A");
  expect(initials("")).toBe("?");
});

describe("the refusal vocabulary", () => {
  test("the eight reasons of the hub's table, in its order", () => {
    expect(REFUSAL_REASONS).toEqual(["not_signed_in", "org_required", "not_a_member", "product_off", "org_suspended", "role_too_low", "org_mismatch", "account_unavailable"]);
    expect(isRefusal("product_off")).toBe(true);
    expect(isRefusal("toString")).toBe(false);
  });

  test("each has a status, an exit code, and Danish and English words with no em dash", () => {
    for (const r of REFUSAL_REASONS) {
      const v = REFUSALS[r];
      expect(v.status).toBeGreaterThanOrEqual(400);
      expect([1, 2, 3, 4]).toContain(v.exit);
      for (const l of ["da", "en"] as const) for (const k of ["title", "text", "fix"] as const) expect(v[l][k]).toMatch(/^[^—]{4,}$/);
    }
    expect(REFUSALS.not_a_member.status).toBe(404); // the same as an org that does not exist
    expect(REFUSALS.account_unavailable.status).toBe(503);
  });
});

describe("the standard pages", () => {
  test("refused renders each reason with its words, its fix and its status", () => {
    for (const reason of REFUSAL_REASONS)
      for (const lang of ["da", "en"] as const) {
        const p = refusedPage({ lang, reason });
        const b = String(p.body);
        expect(p.status).toBe(REFUSALS[reason].status);
        expect(p.title).toBe(REFUSALS[reason][lang].title);
        expect(b).toContain(`data-reason="${reason}"`);
        expect(b).toContain(`<p class="kicker">${reason}</p>`);
        for (const k of ["text", "fix"] as const) expect(b).toContain(esc(REFUSALS[reason][lang][k]));
      }
  });

  test("refusal details: who can fix it, the role, the credential's org, the command", () => {
    const off = String(refusedPage({ lang: "en", reason: "product_off", org: "Noon", people: [{ name: "Jonas", email: "jonas@example.com" }] }).body);
    expect(off).toContain('<p class="std-label">Admins who can switch it on</p><ul class="std-people"><li><span class="name">Jonas</span> <a href="mailto:jonas@example.com">jonas@example.com</a></li></ul>');
    expect(off).toContain("Organization: Noon");
    expect(String(refusedPage({ lang: "da", reason: "role_too_low", roleNeeded: "admin" }).body)).toContain("Det kræver rollen administrator.");
    expect(String(refusedPage({ lang: "en", reason: "org_mismatch", credentialOrg: "Spekta" }).body)).toContain("The key is for Spekta.");
    expect(String(refusedPage({ lang: "en", reason: "not_signed_in", signInHref: "/login", command: "dataspring auth login" }).body)).toContain('<a class="button" href="/login">Sign in</a></div><p class="fine">From an agent: <code>dataspring auth login</code></p>');
    // not_a_member must not tell an org that exists from one that does not.
    expect(String(refusedPage({ lang: "en", reason: "not_a_member", org: "Secret Co" }).body)).not.toContain("Secret Co");
  });

  test("account unavailable: 503 with a retry", () => {
    const p = accountUnavailablePage({ lang: "en" });
    expect(p.status).toBe(503);
    expect(String(p.body)).toContain("Forspring&#39;s account is not answering, so we cannot check your access.");
    expect(String(p.body)).toContain('<a class="button" href="">Try again</a>');
  });

  test("choose an org: your role, when last used, the one used here first", () => {
    const p = chooseOrgPage({
      lang: "en",
      product: "DataSpring",
      lastHere: "spekta",
      orgs: [
        { slug: "noon", name: "Noon", role: "admin", href: "/o/noon/", lastUsed: new Date("2026-10-12T09:00:00Z") },
        { slug: "spekta", name: "Spekta", role: "owner", href: "/o/spekta/" },
      ],
    });
    const b = String(p.body);
    expect(p.status).toBe(200);
    expect(b.indexOf("Spekta")).toBeLessThan(b.indexOf("Noon"));
    expect(b).toContain('Spekta <span class="tag primary">Last used here</span>');
    expect(b).toContain("admin · last used 12 Oct 2026");
    expect(b).toContain('<a class="button small" href="/o/spekta/" aria-label="Open Spekta">Open</a>');
    expect(b).toContain('<a class="button ghost small" href="/o/noon/" aria-label="Open Noon">Open</a>');
  });

  test("no org yet: who to ask", () => {
    const b = String(noOrgPage({ lang: "da", product: "DataSpring", email: "a@b.dk", ask: [{ email: "admin@b.dk" }], accountHref: "/" }).body);
    expect(b).toContain("Du er logget ind som a@b.dk, men du er ikke med i en organisation, der har DataSpring.");
    expect(b).toContain('<a href="mailto:admin@b.dk">admin@b.dk</a>');
    expect(String(noOrgPage({ lang: "en", accountHref: "/" }).body)).toContain("Ask whoever looks after Forspring where you work to add you.");
  });

  test("the pages escape what they are given", () => {
    const all = [
      refusedPage({ lang: "en", reason: "product_off", org: evil, people: [{ name: evil, email: evil }], command: evil }),
      refusedPage({ lang: "en", reason: "org_required", orgs: [{ slug: evil, name: evil, role: "member", href: evil }] }),
      chooseOrgPage({ lang: "en", product: evil, lastHere: evil, orgs: [{ slug: evil, name: evil, role: "admin", href: evil, lastUsed: evil }] }),
      noOrgPage({ lang: "en", product: evil, email: evil, ask: [{ name: evil, email: evil }], accountHref: evil }),
    ].map((p) => String(p.body));
    for (const b of all) expect(b).not.toContain("<script>");
  });
});

describe("the React wrappers render the same markup", () => {
  const same = (el: Parameters<typeof renderToStaticMarkup>[0], html: unknown) => expect(renderToStaticMarkup(el)).toBe(String(html));

  test("Bar", () => {
    same(createElement(Bar, opts), bar(opts));
    same(createElement(Bar, { ...opts, lang: "da", productLabel: evil }), bar({ ...opts, lang: "da", productLabel: evil }));
  });

  test("the pages", () => {
    const orgs = [{ slug: "noon", name: "Noon", role: "admin" as const, href: "/o/noon/" }];
    same(createElement(ChooseOrg, { lang: "da", orgs }), chooseOrgPage({ lang: "da", orgs }).body);
    same(createElement(NoOrg, { lang: "en", accountHref: "/" }), noOrgPage({ lang: "en", accountHref: "/" }).body);
    for (const reason of REFUSAL_REASONS) same(createElement(Refused, { lang: "en", reason, org: evil }), refusedPage({ lang: "en", reason, org: evil }).body);
    same(createElement(AccountUnavailable, { lang: "da" }), accountUnavailablePage({ lang: "da" }).body);
  });
});

// The bar's menus, the standard pages, the refusal vocabulary and the React wrappers (D-17).

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { bar, esc, initials, orgPath, shell, strip, type BarOptions } from "../src/html.ts";
import { accountUnavailablePage, chooseOrgPage, noOrgPage, refusedPage } from "../src/pages.ts";
import { AccountUnavailable, Bar, ChooseOrg, NoOrg, Refused } from "../src/react.ts";
import { agentFix, isRefusal, REFUSAL_REASONS, REFUSALS, type RefusalText } from "../src/refusals.ts";

const evil = `<script>alert("x")</script>&'`;

const opts: BarOptions = {
  lang: "en",
  product: "dataspring",
  productLabel: "DataSpring",
  org: {
    current: { slug: "acme", name: "Acme", role: "admin" },
    orgs: [
      { slug: "acme", name: "Acme", role: "admin" },
      { slug: "globex", name: "Globex", role: "owner" },
    ],
    path: "/o/acme/datacore/runs?state=failed",
    peopleHref: "https://account.forspring.ai/o/acme/people",
  },
  products: {
    items: [
      { name: "DataSpring", href: "/o/acme/", current: true },
      { name: "SiteSpring", href: "https://sitespring.ai/o/acme/" },
    ],
    accountHref: "https://account.forspring.ai/o/acme/",
  },
  userMenu: {
    name: "Peter Engelbrecht",
    email: "peter@example.com",
    accountHref: "https://account.forspring.ai/",
    agentsHref: "https://account.forspring.ai/o/acme/agents?product=dataspring",
    languages: { da: "?lang=da", en: "?lang=en" },
    signOut: { action: "/signout", fields: { csrf: "t0k" } },
  },
};

describe("the bar", () => {
  const out = String(bar(opts));

  test("the lockup is the product's doll and its name alone, and leads to the org's home (D-98, D-18)", () => {
    expect(out).toMatch(/^<header class="bar"><div class="wrap bar-inner"><a class="brand" href="\/o\/acme\/" aria-label="DataSpring"><svg class="mark" viewBox="-184 -160 368 368" width="28" height="28" aria-hidden="true" focusable="false">.*?<\/svg><span class="word">DataSpring<\/span><\/a>/);
    expect(out).not.toContain("Forspring</span>");
  });

  test("the org switcher names each customer with your role, keeps the path, and links to people", () => {
    expect(out).toContain('<details class="switcher bar-menu org-switcher"><summary><span class="bar-menu-name">Acme</span><span class="visually-hidden">, switch organization</span></summary>');
    expect(out).toContain('<a href="/o/globex/datacore/runs?state=failed"><span class="bar-item-name">Globex</span><span class="bar-item-meta">owner</span></a>');
    expect(out).toContain('<a href="/o/acme/datacore/runs?state=failed" aria-current="true">');
    expect(out).toContain(">Manage people in Acme</a>");
  });

  test("with one org there is no org switcher; the org shows in the menu head", () => {
    const one = String(bar({ ...opts, org: { current: opts.org!.current, orgs: [opts.org!.current] } }));
    expect(one).not.toContain("org-switcher");
    expect(one).toContain('<span class="user-role">admin in Acme</span>');
  });

  test("the product switcher lists the org's products and links to the org at Forspring", () => {
    expect(out).toContain('<p class="bar-panel-label">Acme has</p>');
    expect(out).toContain('<a href="/o/acme/" aria-current="true"><span class="bar-item-name">DataSpring</span><span class="bar-item-meta">here</span></a>');
    expect(out).toContain('<a href="https://account.forspring.ai/o/acme/">All of Acme at Forspring</a>');
  });

  test("the user menu: initials, who, role here, account, agents, language, sign out as a ghost button", () => {
    expect(out).toContain('<summary><span class="avatar">PE</span><span class="visually-hidden">: Peter Engelbrecht, your account</span></summary>');
    expect(out).toContain(">Your Forspring account</a>");
    expect(out).toContain(">Agents and keys in Acme</a>");
    expect(out).toContain('<a href="?lang=en" lang="en" hreflang="en" aria-current="true">English</a>');
    expect(out).toContain('<form class="user-signout" method="post" action="/signout"><input type="hidden" name="csrf" value="t0k"><button class="ghost small wide" type="submit">Sign out of Forspring</button></form>');
  });

  test("Danish first: the same bar in Danish", () => {
    const da = String(bar({ ...opts, lang: "da" }));
    for (const w of ["Dine organisationer", "Administrer folk i Acme", "Acme har", "Alt for Acme hos Forspring", "Din Forspring-konto", "Agenter og nøgler i Acme", "administrator i Acme", "Log ud af Forspring", ", skift organisation"]) expect(da).toContain(w);
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

describe("the bar's nav (D-46)", () => {
  const nav = {
    label: "Pages",
    toggle: "Menu",
    items: [
      { label: "Dashboard", href: "/o/acme/" },
      { label: "Staff", href: "/o/acme/staff", current: true },
      { label: evil, href: "/o/acme/x" },
    ],
  };

  test("the pages follow the wordmark, the shown one aria-current, and the switchers move to the end with the person", () => {
    const out = String(bar({ ...opts, nav }));
    expect(out).toContain('</a><nav class="bar-nav" aria-label="Pages"><ul><li><a href="/o/acme/">Dashboard</a></li><li><a href="/o/acme/staff" aria-current="page">Staff</a></li>');
    expect(out).toContain(esc(evil));
    expect(out).not.toContain(evil);
    const at = (s: string) => out.indexOf(s);
    expect(at('class="bar-nav"')).toBeLessThan(at('class="spacer"'));
    expect(at('class="spacer"')).toBeLessThan(at("org-switcher"));
    expect(at("org-switcher")).toBeLessThan(at("user-menu"));
  });

  test("without nav the bar is unchanged: the switchers stay after the wordmark", () => {
    const out = String(bar(opts));
    expect(out).not.toContain("bar-nav");
    expect(out.indexOf("org-switcher")).toBeLessThan(out.indexOf('class="spacer"'));
  });

  test("one page draws no nav", () => {
    const out = String(bar({ ...opts, nav: { ...nav, items: [nav.items[0]!] } }));
    expect(out).not.toContain("bar-nav");
    expect(out.indexOf("org-switcher")).toBeLessThan(out.indexOf('class="spacer"'));
  });

  test("shell: the pages fold under the toggle on a phone, no sidebar column, nav-in-bar on the body", () => {
    const page = String(shell({ ...opts, nav, title: "Staff", body: "x" }));
    expect(page).toContain('<body class="has-menu nav-in-bar">');
    expect(page).toContain('<details class="menu-fold"><summary><span>Menu</span><span class="menu-fold-current">Staff</span></summary>');
    expect(page.match(/class="bar-nav"/g)).toHaveLength(1);
  });

  test("shell: a menu wins over nav (the sidebar, no pages in the bar)", () => {
    const menu = { label: "Main menu", toggle: "Menu", groups: [{ items: [{ label: "Runs", href: "/o/acme/runs", current: true }] }] };
    const page = String(shell({ ...opts, nav, menu, title: "Runs", body: "x" }));
    expect(page).not.toContain("bar-nav");
    expect(page).not.toContain("nav-in-bar");
    expect(page).toContain('<nav class="menu menu-side" aria-label="Main menu">');
  });

  test("shell: one page is a plain page, no menu", () => {
    const page = String(shell({ ...opts, nav: { ...nav, items: [nav.items[0]!] }, title: "Home", body: "x" }));
    expect(page).not.toContain("has-menu");
    expect(page).not.toContain("menu-fold");
  });
});

describe("an app's own brand (D-47)", () => {
  test("the app's name and logo replace the doll; no Forspring or product mark", () => {
    const out = String(bar({ ...opts, product: "appspring", productLabel: "AppSpring", app: { name: "Salão Douro", logo: "https://cdn.example.com/salao.png" } }));
    expect(out).toContain('<a class="brand" href="/o/acme/" aria-label="Salão Douro"><img class="app-logo" src="https://cdn.example.com/salao.png" alt="" referrerpolicy="no-referrer"><span class="word">Salão Douro</span></a>');
    expect(out).not.toContain('class="mark"');
    expect(out).not.toContain("AppSpring");
    expect(out).not.toContain("Forspring</span>");
  });

  test("no logo: the name alone", () => {
    const out = String(bar({ ...opts, app: { name: "Salão Douro" } }));
    expect(out).toContain('aria-label="Salão Douro"><span class="word">Salão Douro</span></a>');
    expect(out).not.toContain("<img");
  });

  test.each(["javascript:alert(1)", "http://x.example/a.png", "//x.example/a.png", "../a.png", 'a.png" onerror="x', "data:text/html,<b>"])("an unsafe logo %s draws no image", (logo) => {
    const out = String(bar({ ...opts, app: { name: "App", logo } }));
    expect(out).not.toContain("<img");
  });

  test("the name is escaped", () => {
    const out = String(bar({ ...opts, app: { name: evil } }));
    expect(out).toContain(`<span class="word">${esc(evil)}</span>`);
    expect(out).not.toContain(evil);
  });

  test("with nav: the app zone is the app's brand and its pages", () => {
    const out = String(bar({ ...opts, org: undefined, products: undefined, app: { name: "Salão Douro" }, nav: { label: "Pages", toggle: "Menu", items: [{ label: "A", href: "/a", current: true }, { label: "B", href: "/b" }] } }));
    expect(out).toMatch(/<span class="word">Salão Douro<\/span><\/a><nav class="bar-nav" aria-label="Pages">/);
  });
});

describe("the strip (D-48)", () => {
  test("the bold lead, the line and a link out", () => {
    expect(String(strip({ title: "Viewing as Sales.", text: "You are Inês Costa, Owner.", action: { label: "Stop viewing as", href: "?view_as=" } }))).toBe(
      '<div class="strip warning" role="status"><p><strong>Viewing as Sales.</strong> You are Inês Costa, Owner.</p><a class="strip-action" href="?view_as=">Stop viewing as</a></div>',
    );
  });

  test("a POST way out carries its fields; everything is escaped and the href made safe", () => {
    const out = String(strip({ title: evil, action: { label: "Stop", post: "javascript:alert(1)", fields: { csrf: evil } } }));
    expect(out).toContain('<form method="post" action="#">');
    expect(out).toContain(`<input type="hidden" name="csrf" value="${esc(evil)}">`);
    expect(out).toContain('<button class="strip-action" type="submit">Stop</button>');
    expect(out).not.toContain(evil);
  });
});

describe("bar-nav badges and the app's catalog icon (D-49)", () => {
  test("a page's count rides beside its label, the menu's badge look", () => {
    const out = String(bar({ ...opts, nav: { label: "Pages", toggle: "Menu", items: [{ label: "Leads", href: "/l", badge: { text: "5", signal: "warn", label: "waiting" } }, { label: "Deals", href: "/d", current: true }] } }));
    expect(out).toContain('<a href="/l">Leads<span class="menu-badge"><span class="signal-mark warn" aria-hidden="true"></span>5<span class="visually-hidden"> waiting</span></span></a>');
  });

  test("the app's icon in ink when there is no logo; the logo wins; an unknown name draws nothing", () => {
    const withIcon = String(bar({ ...opts, app: { name: "Bookings", icon: "calendar" } }));
    expect(withIcon).toMatch(/aria-label="Bookings"><span class="app-icon"><svg[^>]*class="icon"/);
    const both = String(bar({ ...opts, app: { name: "Bookings", icon: "calendar", logo: "https://cdn.example.com/b.png" } }));
    expect(both).toContain('<img class="app-logo"');
    expect(both).not.toContain("app-icon");
    const unknown = String(bar({ ...opts, app: { name: "Bookings", icon: "no-such-icon" } }));
    expect(unknown).not.toContain("app-icon");
    expect(unknown).toContain('aria-label="Bookings"><span class="word">Bookings</span>');
  });
});

test("orgPath keeps the place in another org", () => {
  expect(orgPath("/o/acme/datacore/runs", "globex")).toBe("/o/globex/datacore/runs");
  expect(orgPath("/o/acme", "globex")).toBe("/o/globex/");
  expect(orgPath("/o/acme?x=1", "globex")).toBe("/o/globex/?x=1");
  expect(orgPath("/settings", "globex")).toBe("/o/globex/");
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
  });

  test("a page's words never tell a person to run a command; the agent's words are separate", () => {
    for (const r of REFUSAL_REASONS)
      for (const l of ["da", "en"] as const) {
        const w: RefusalText = REFUSALS[r][l];
        for (const k of ["title", "text", "fix"] as const) expect(w[k], `${r}.${l}.${k}`).not.toMatch(/\bagent\b|auth login|--[a-z]|_ORG\b|\.json\b/i);
        expect(agentFix(r, l)).toBe(w.agent ? `${w.fix} ${w.agent}` : w.fix);
      }
    expect(agentFix("not_signed_in")).toBe("Sign in and you will come back here. An agent runs auth login.");
    expect(agentFix("org_required", "da")).toBe("Vælg den, du vil arbejde i. En agent angiver den med --org, <PRODUKT>_ORG eller .forspring.json.");
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
        expect(b).not.toContain("kicker"); // the code is for machines: data-reason, never the page's words
        expect(b).not.toMatch(new RegExp(`>${reason}<`));
        for (const k of ["text", "fix"] as const) expect(b).toContain(esc(REFUSALS[reason][lang][k]));
        const agent = (REFUSALS[reason][lang] as RefusalText).agent;
        if (agent) expect(b).not.toContain(esc(agent));
      }
  });

  test("refusal details: who can fix it, the role, the credential's org, the command", () => {
    const off = String(refusedPage({ lang: "en", reason: "product_off", org: "Acme", people: [{ name: "Jonas", email: "jonas@example.com" }] }).body);
    expect(off).toContain('<p class="std-label">Admins who can switch it on</p><ul class="std-people"><li><span class="name">Jonas</span> <a href="mailto:jonas@example.com">jonas@example.com</a></li></ul>');
    expect(off).toContain("Organization: Acme");
    expect(String(refusedPage({ lang: "da", reason: "role_too_low", roleNeeded: "admin" }).body)).toContain("Det kræver adgangsniveauet administrator.");
    expect(String(refusedPage({ lang: "en", reason: "org_mismatch", credentialOrg: "Globex" }).body)).toContain("The key is for Globex.");
    expect(String(refusedPage({ lang: "en", reason: "not_signed_in", signInHref: "/login", command: "dataspring auth login" }).body)).toContain('<a class="button" href="/login">Sign in</a></div><p class="fine">From an agent: <code>dataspring auth login</code></p>');
    // not_a_member must not tell an org that exists from one that does not.
    expect(String(refusedPage({ lang: "en", reason: "not_a_member", org: "Secret Co" }).body)).not.toContain("Secret Co");
  });

  test("a ref is shown last, escaped, in the page's language (D-30)", () => {
    const da = String(accountUnavailablePage({ lang: "da", ref: "4bf92f35" }).body);
    expect(da).toMatch(/<p class="error-ref">Fejlkode: <code>4bf92f35<\/code><br>Nævn den, hvis du skriver til os\.<\/p><\/div>$/);
    expect(String(refusedPage({ lang: "en", reason: "account_unavailable", ref: "4bf92f35" }).body)).toContain('<p class="error-ref">Reference: <code>4bf92f35</code><br>Quote it if you contact us.</p>');
    const bad = String(refusedPage({ lang: "en", reason: "account_unavailable", ref: evil }).body);
    expect(bad).not.toContain("<script>");
    expect(bad).toContain("<code>&lt;script&gt;");
    expect(String(refusedPage({ lang: "en", reason: "product_off" }).body)).not.toContain("error-ref");
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
      lastHere: "globex",
      orgs: [
        { slug: "acme", name: "Acme", role: "admin", href: "/o/acme/", lastUsed: new Date("2026-10-12T09:00:00Z") },
        { slug: "globex", name: "Globex", role: "owner", href: "/o/globex/" },
      ],
    });
    const b = String(p.body);
    expect(p.status).toBe(200);
    expect(b.indexOf("Globex")).toBeLessThan(b.indexOf("Acme"));
    expect(b).toContain('Globex <span class="tag primary">Last used here</span>');
    expect(b).toContain("admin · last used 12 Oct 2026");
    expect(b).toContain('<a class="button small" href="/o/globex/" aria-label="Open Globex">Open</a>');
    expect(b).toContain('<a class="button ghost small" href="/o/acme/" aria-label="Open Acme">Open</a>');
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
    const orgs = [{ slug: "acme", name: "Acme", role: "admin" as const, href: "/o/acme/" }];
    same(createElement(ChooseOrg, { lang: "da", orgs }), chooseOrgPage({ lang: "da", orgs }).body);
    same(createElement(NoOrg, { lang: "en", accountHref: "/" }), noOrgPage({ lang: "en", accountHref: "/" }).body);
    for (const reason of REFUSAL_REASONS) same(createElement(Refused, { lang: "en", reason, org: evil }), refusedPage({ lang: "en", reason, org: evil }).body);
    same(createElement(AccountUnavailable, { lang: "da" }), accountUnavailablePage({ lang: "da" }).body);
    same(createElement(AccountUnavailable, { lang: "en", ref: evil }), accountUnavailablePage({ lang: "en", ref: evil }).body);
    same(createElement(Refused, { lang: "da", reason: "account_unavailable", ref: "4bf92f35" }), refusedPage({ lang: "da", reason: "account_unavailable", ref: "4bf92f35" }).body);
  });
});

// D-51: the access levels are never exported as "roles" again; AppSpring's role is a job (D-50).
test("@forspring/ui/html exports the access levels, and no Role, ROLES or ROLE_NAMES", async () => {
  const mod: Record<string, unknown> = await import("../src/html.ts");
  expect(Object.keys(mod)).toEqual(expect.arrayContaining(["ACCESS_LEVELS", "ACCESS_LEVEL_NAMES"]));
  for (const old of ["ROLES", "ROLE_NAMES"]) expect(mod).not.toHaveProperty(old);
  const dts = (await import("node:fs")).readFileSync(new URL("../dist/html.d.ts", import.meta.url), "utf8");
  expect(dts).not.toMatch(/export (type|declare const) (Role|ROLES|ROLE_NAMES)\b/);
});

// The suite's ONE org list (D-59): every list of organisations to choose from in the package is drawn by orgList(),
// in one row look (the org's mark, its name, your access level), in two modes: choices (each row a POST form's
// button carrying an opaque value) and links (each row a link to the caller's href). orgPicker's link mode,
// chooseOrgPage, refusedPage's "your organisations" and the bar's org switcher are thin wrappers on it, and every
// one of them carries the data-forspring-org-list marker that ui-audit's own-org-list rule looks for.
import { describe, expect, test } from "vitest";
import { bar, orgList } from "../src/html.ts";
import { chooseOrgPage, orgPicker, refusedPage } from "../src/pages.ts";

const evil = `<script>alert("x")</script>&'"`;
const acme = { name: "Acme", role: "admin" as const };
const globex = { name: "Globex", role: "owner" as const };

// The row's inside (mark, name, access level), the part every list shares.
const inner = (b: string, name: string) => b.match(new RegExp(`<span class="org-picker-mark"[^>]*>[^<]*</span><span class="org-picker-text"><span class="name">${name}(?: <span class="tag[^"]*">[^<]*</span>)?</span><span class="meta">[^<]*</span></span>`))?.[0];

describe("orgList", () => {
  test("links: each row is one link to the caller's href, the current org marked; nothing else is a URL", () => {
    const b = String(orgList({ lang: "en", links: [{ ...acme, href: "/x/acme-home", current: true }, { ...globex, href: "https://other.example/g?a=1&b=2" }] }));
    expect(b).toMatch(/^<ul class="org-picker-list" data-forspring-org-list><li><a class="org-picker-row" href="\/x\/acme-home" aria-current="true"><span class="org-picker-mark" aria-hidden="true">A<\/span>/);
    expect(b).toContain('<span class="name">Globex</span><span class="meta">owner</span></span><svg class="icon"');
    expect([...b.matchAll(/(?:href|action|src)="([^"]*)"/g)].map((m) => m[1])).toEqual(["/x/acme-home", "https://other.example/g?a=1&amp;b=2"]);
    expect(b).not.toContain("<form");
    expect(b).not.toContain("<button");
  });

  test("choices: each row is the one submit button of its own POST form, the value passed through", () => {
    const b = String(orgList({ lang: "da", action: "/pick", fields: { csrf: "c" }, orgs: [{ ...acme, value: "sealed.1" }] }));
    expect(b).toContain('<li><form method="post" action="/pick"><input type="hidden" name="csrf" value="c"><button class="org-picker-row" type="submit" name="org" value="sealed.1">');
    expect(b).toContain('<span class="meta">administrator</span>');
    // D-75: a choice list takes no click for its first second; a list of links is not held up.
    expect(b).toMatch(/^<ul class="org-picker-list org-picker-choices" data-forspring-org-list>/);
  });

  test("a tag after the name and words after the access level", () => {
    const b = String(orgList({ lang: "en", links: [{ ...acme, href: "/a", tag: "Last used here", meta: "last used 12 Oct 2026" }] }));
    expect(b).toContain('<span class="name">Acme <span class="tag primary">Last used here</span></span><span class="meta">admin · last used 12 Oct 2026</span>');
  });

  test("a menu (the bar's panel): the same rows with no chevron, in a list without a box of its own", () => {
    const b = String(orgList({ lang: "en", menu: true, links: [{ ...acme, href: "/a" }] }));
    expect(b).toMatch(/^<ul class="org-picker-list org-picker-menu" data-forspring-org-list>/);
    expect(b).not.toContain("<svg");
  });

  test("none: nothing at all, so the caller says why", () => {
    expect(String(orgList({ lang: "en", links: [] }))).toBe("");
    expect(String(orgList({ lang: "en", orgs: [], action: "/p" }))).toBe("");
  });

  test("it escapes everything it is given", () => {
    const b = String(orgList({ lang: "en", links: [{ name: evil, role: "member", href: evil, logo: evil, tag: evil, meta: evil }] }));
    expect(b).not.toContain("<script>");
    expect(b).not.toContain(`"x")`);
  });
});

describe("every org list in the package is the one list", () => {
  const lists = {
    "orgPicker (choices)": String(orgPicker({ lang: "en", action: "/p", orgs: [{ ...acme, value: "v1" }, { ...globex, value: "v2" }] })),
    "orgPicker (links)": String(orgPicker({ lang: "en", links: [{ ...acme, href: "/o/acme/" }, { ...globex, href: "/o/globex/" }] })),
    chooseOrgPage: String(chooseOrgPage({ lang: "en", orgs: [{ ...acme, slug: "acme", href: "/o/acme/" }, { ...globex, slug: "globex", href: "/o/globex/" }] }).body),
    "refusedPage (org_required)": String(refusedPage({ lang: "en", reason: "org_required", orgs: [{ ...acme, slug: "acme", href: "/o/acme/" }, { ...globex, slug: "globex", href: "/o/globex/" }] }).body),
    "the bar's org switcher": String(
      bar({ lang: "en", product: "dataspring", productLabel: "DataSpring", org: { current: { ...acme, slug: "acme" }, orgs: [{ ...acme, slug: "acme" }, { ...globex, slug: "globex" }], path: "/o/acme/runs" } }),
    ),
  };

  test.each(Object.entries(lists))("%s: one list, with the marker, in the shared row look", (_name, b) => {
    expect(b.match(/data-forspring-org-list/g)).toHaveLength(1);
    expect(inner(b, "Acme")).toBeDefined();
    expect(inner(b, "Globex")).toBeDefined();
    // no row is a separate "Open" / "Choose" button beside the name any more
    expect(b).not.toMatch(/>(Open|Choose)<\/(a|button)>/);
  });

  test("the rows' insides are the same markup everywhere", () => {
    const all = Object.values(lists).map((b) => inner(b, "Globex"));
    expect(new Set(all).size).toBe(1);
  });

  test("the bar keeps the person's place in the other org, and marks this one", () => {
    const b = lists["the bar's org switcher"];
    expect(b).toContain('<a class="org-picker-row" href="/o/globex/runs">');
    expect(b).toContain('<a class="org-picker-row" href="/o/acme/runs" aria-current="true">');
  });

  test("chooseOrgPage: the org used here first and tagged, when it was last used beside the access level", () => {
    const b = String(
      chooseOrgPage({
        lang: "en",
        lastHere: "globex",
        orgs: [
          { ...acme, slug: "acme", href: "/o/acme/", lastUsed: new Date("2026-10-12T09:00:00Z") },
          { ...globex, slug: "globex", href: "/o/globex/" },
        ],
      }).body,
    );
    expect(b.indexOf("Globex")).toBeLessThan(b.indexOf("Acme"));
    expect(b).toContain('<span class="name">Globex <span class="tag primary">Last used here</span></span>');
    expect(b).toContain('<span class="meta">admin · last used 12 Oct 2026</span>');
  });
});

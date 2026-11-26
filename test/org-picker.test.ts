// The suite's org picker (hub plan 2026-11-26, "One org picker for the suite"): the account's sign-in step shows it when a
// product asks for an `org`. Server-rendered with no script: one list in the account's look, each org its own POST form
// with one real button; Danish and English; one org drawn sanely, none never an empty list; everything escaped.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { orgPicker, orgPickerPage, type OrgPickerOptions } from "../src/pages.ts";
import { OrgPicker } from "../src/react.ts";

const evil = `<script>alert("x")</script>&'"`;

const two: OrgPickerOptions = {
  lang: "da",
  product: "AppSpring",
  action: "/authorize/org",
  fields: { csrf: "c1", request: "r1" },
  orgs: [
    { id: "org_noon", name: "Noon", role: "admin" },
    { id: "org_spekta", name: "Spekta", role: "owner" },
  ],
};

describe("orgPicker", () => {
  test("Danish: the title, the lede with the product, each org's name and access level, one list", () => {
    const b = String(orgPicker(two));
    expect(b).toMatch(/^<div class="card std-page org-picker"><h1>Vælg organisation<\/h1>/);
    expect(b).toContain("<p>Hvilken organisation vil du bruge AppSpring i?</p>");
    expect(b.match(/<ul class="list">/g)).toHaveLength(1);
    expect(b).toContain('<span class="name">Noon</span><br><span class="meta">administrator</span>');
    expect(b).toContain('<span class="name">Spekta</span><br><span class="meta">ejer</span>');
    expect(b.indexOf("Noon")).toBeLessThan(b.indexOf("Spekta"));
  });

  test("English: the same, in English", () => {
    const b = String(orgPicker({ ...two, lang: "en" }));
    expect(b).toContain("<h1>Choose organisation</h1>");
    expect(b).toContain("<p>Which organisation do you want to use AppSpring in?</p>");
    expect(b).toContain('<span class="meta">admin</span>');
    expect(b).toContain('aria-label="Choose Noon">Choose</button>');
    expect(String(orgPicker({ ...two, lang: "en", product: undefined }))).toContain("<p>Which organisation do you want to use?</p>");
  });

  test("each org is its own POST form: the hidden fields, then a real submit button named by the org", () => {
    const b = String(orgPicker(two));
    const forms = b.match(/<form [^>]*>[\s\S]*?<\/form>/g) ?? [];
    expect(forms).toHaveLength(2);
    expect(forms[0]).toBe(
      '<form class="inline" method="post" action="/authorize/org"><input type="hidden" name="csrf" value="c1"><input type="hidden" name="request" value="r1"><button class="ghost small" type="submit" name="org" value="org_noon" aria-label="Vælg Noon">Vælg</button></form>',
    );
    expect(forms[1]).toContain('name="org" value="org_spekta" aria-label="Vælg Spekta">Vælg</button>');
    // no script, no link pretending to be a button
    expect(b).not.toContain("<script");
    expect(b).not.toContain("<a ");
  });

  test("the field name is the caller's", () => {
    expect(String(orgPicker({ ...two, name: "customer" }))).toContain('name="customer" value="org_noon"');
  });

  test("one org (the caller should skip the page): drawn with a primary button, never a broken page", () => {
    const b = String(orgPicker({ ...two, orgs: [two.orgs[0]!] }));
    expect(b.match(/<form /g)).toHaveLength(1);
    expect(b).toContain('<button class="small" type="submit" name="org" value="org_noon" aria-label="Vælg Noon">Vælg</button>');
  });

  test("no org: the no-organisation sentence, never an empty list", () => {
    const b = String(orgPicker({ ...two, orgs: [] }));
    expect(b).not.toContain('<ul class="list">');
    expect(b).toContain("<p>Du er ikke med i en organisation, der har AppSpring.</p>");
  });

  test("it escapes everything it is given", () => {
    const b = String(orgPicker({ lang: "en", product: evil, action: evil, fields: { [evil]: evil }, name: evil, orgs: [{ id: evil, name: evil, role: "member" }] }));
    expect(b).not.toContain("<script>");
    expect(b).not.toContain(`"x")`);
  });

  test("as a page: status 200, the title, narrow, the same body", () => {
    const p = orgPickerPage(two);
    expect(p).toMatchObject({ status: 200, title: "Vælg organisation", narrow: true });
    expect(String(p.body)).toBe(String(orgPicker(two)));
  });

  test("the React wrapper renders the same markup", () => {
    expect(renderToStaticMarkup(createElement(OrgPicker, two))).toBe(String(orgPicker(two)));
  });
});

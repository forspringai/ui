// The suite's org picker (hub plan 2026-11-26, "One org picker for the suite"): the account's sign-in step shows it when a
// product asks for an `org`. Server-rendered with no script: what is being connected at the top, then one row per org,
// the whole row the submit button of its own POST form carrying the caller's opaque value unchanged. One language per
// render; one org drawn sanely, none never an empty list; everything escaped.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { orgPicker, orgPickerPage, type OrgPickerOptions } from "../src/pages.ts";
import { OrgPicker } from "../src/react.ts";

const evil = `<script>alert("x")</script>&'"`;

const two: OrgPickerOptions = {
  lang: "da",
  action: "/authorize/org",
  fields: { csrf: "c1", request: "r1" },
  connecting: { kind: "Slack-workspace", name: "Acme" },
  subtitle: "Hvilken organisation skal Slack-workspacet Acme forbindes med?",
  orgs: [
    { value: "sealed.AAA", name: "Acme", role: "admin" },
    { value: "sealed.BBB", name: "Globex", role: "owner" },
  ],
};

const forms = (b: string) => b.match(/<form [^>]*>[\s\S]*?<\/form>/g) ?? [];

describe("orgPicker", () => {
  test("Danish: what is connected, the title, the subtitle, each org's name and access level in order, the note", () => {
    const b = String(orgPicker(two));
    expect(b).toMatch(/^<div class="card std-page org-picker"><p class="org-picker-subject">/);
    expect(b).toContain('<span class="org-picker-kind">Slack-workspace</span><span class="name">Acme</span>');
    expect(b).toContain("<h1>Vælg organisation</h1><p>Hvilken organisation skal Slack-workspacet Acme forbindes med?</p>");
    expect(b.match(/<ul class="org-picker-list org-picker-choices" data-forspring-org-list>/g)).toHaveLength(1);
    expect(b).toContain('<span class="name">Acme</span><span class="meta">administrator</span>');
    expect(b).toContain('<span class="name">Globex</span><span class="meta">ejer</span>');
    expect(b.indexOf("sealed.AAA")).toBeLessThan(b.indexOf("sealed.BBB"));
    expect(b).toContain('<p class="org-picker-note">Du kan ikke ændre valget her bagefter.</p></div>');
  });

  test("English: one language only, never Danish beside it", () => {
    const b = String(orgPicker({ ...two, lang: "en", subtitle: undefined }));
    expect(b).toContain("<h1>Choose organisation</h1>");
    expect(b).toContain('<span class="meta">admin</span>');
    expect(b).toContain('<p class="org-picker-note">You cannot change this choice here later.</p>');
    expect(b).not.toMatch(/Vælg|ejer|administrator|ændre/);
    expect(String(orgPicker(two))).not.toMatch(/Choose|owner|cannot/);
  });

  test("the language is the caller's lang only: a browser saying otherwise changes nothing, the orgs are drawn as given", () => {
    const nav = Object.getOwnPropertyDescriptor(globalThis, "navigator");
    Object.defineProperty(globalThis, "navigator", { value: { language: "en-GB", languages: ["en-GB"] }, configurable: true });
    try {
      for (const lang of ["da", "en"] as const) {
        const b = String(orgPicker({ ...two, lang, subtitle: undefined, connecting: undefined, orgs: [{ value: "v", name: "Acme", role: "viewer" }] }));
        expect(b).toBe(
          lang === "da"
            ? '<div class="card std-page org-picker"><h1>Vælg organisation</h1><ul class="org-picker-list org-picker-choices" data-forspring-org-list><li>' + forms(b)[0] + '</li></ul><p class="org-picker-note">Du kan ikke ændre valget her bagefter.</p></div>'
            : '<div class="card std-page org-picker"><h1>Choose organisation</h1><ul class="org-picker-list org-picker-choices" data-forspring-org-list><li>' + forms(b)[0] + '</li></ul><p class="org-picker-note">You cannot change this choice here later.</p></div>',
        );
        expect(b).toContain(lang === "da" ? '<span class="meta">læser</span>' : '<span class="meta">viewer</span>');
      }
    } finally {
      if (nav) Object.defineProperty(globalThis, "navigator", nav);
      else Reflect.deleteProperty(globalThis, "navigator");
    }
    // no role filter in the picker: a viewer org given is a viewer org drawn
    expect(forms(String(orgPicker({ ...two, orgs: [...two.orgs, { value: "sealed.CCC", name: "Læser ApS", role: "viewer" }] })))).toHaveLength(3);
  });

  test("each org is its own POST form whose one submit button is the whole row, carrying the opaque value unchanged", () => {
    const f = forms(String(orgPicker(two)));
    expect(f).toHaveLength(2);
    expect(f[0]).toBe(
      '<form method="post" action="/authorize/org"><input type="hidden" name="csrf" value="c1"><input type="hidden" name="request" value="r1">' +
        '<button class="org-picker-row" type="submit" name="org" value="sealed.AAA"><span class="org-picker-mark" aria-hidden="true">A</span>' +
        '<span class="org-picker-text"><span class="name">Acme</span><span class="meta">administrator</span></span>' +
        f[0]!.match(/<svg [\s\S]*<\/svg>/)![0] +
        "</button></form>",
    );
    expect(f[0]).toMatch(/<svg class="icon"[^>]*aria-hidden="true"/);
    for (const x of f) expect(x.match(/<button /g)).toHaveLength(1);
  });

  test("no script, no link, and no URL built from an org: the only URL is the caller's action", () => {
    const b = String(orgPicker(two));
    expect(b).not.toContain("<script");
    expect(b).not.toContain("<a ");
    expect([...b.matchAll(/(?:action|href|src)="([^"]*)"/g)].map((m) => m[1])).toEqual(["/authorize/org", "/authorize/org"]);
  });

  test("the field name is the caller's", () => {
    expect(String(orgPicker({ ...two, name: "choice" }))).toContain('name="choice" value="sealed.AAA"');
  });

  test("a logo or icon is drawn as decoration; without one, the name's first letter", () => {
    const b = String(
      orgPicker({
        ...two,
        connecting: { kind: "Slack-workspace", name: "Acme", icon: "https://cdn.example/n.png" },
        orgs: [{ value: "v", name: "ærø kaffe", role: "viewer", logo: "/logo.png" }],
      }),
    );
    expect(b).toContain('<span class="org-picker-mark" aria-hidden="true"><img src="https://cdn.example/n.png" alt=""></span>');
    expect(b).toContain('<span class="org-picker-mark" aria-hidden="true"><img src="/logo.png" alt=""></span>');
    expect(String(orgPicker({ ...two, orgs: [{ value: "v", name: "ærø kaffe", role: "viewer" }] }))).toContain('aria-hidden="true">Æ</span>');
  });

  test("no connecting, no subtitle: neither line; note: the caller's words, or none", () => {
    const b = String(orgPicker({ ...two, connecting: undefined, subtitle: undefined, note: "Du kan kun ændre det ved at installere igen." }));
    expect(b).toMatch(/^<div class="card std-page org-picker"><h1>Vælg organisation<\/h1><ul /);
    expect(b).toContain('<p class="org-picker-note">Du kan kun ændre det ved at installere igen.</p>');
    expect(String(orgPicker({ ...two, note: false }))).not.toContain("org-picker-note");
  });

  test("one org (the caller should skip the page): that single row, never a broken page", () => {
    const b = String(orgPicker({ ...two, orgs: [two.orgs[0]!] }));
    expect(forms(b)).toHaveLength(1);
    expect(b).toContain('value="sealed.AAA"');
  });

  test("no org: the no-organisation sentence, never an empty list or a note", () => {
    const b = String(orgPicker({ ...two, orgs: [] }));
    expect(b).not.toContain("<ul");
    expect(b).not.toContain("org-picker-note");
    expect(b).toContain("<p>Du er ikke med i en organisation, du kan vælge her.</p>");
  });

  test("it escapes everything it is given", () => {
    const b = String(
      orgPicker({
        lang: "en",
        action: evil,
        fields: { [evil]: evil },
        name: evil,
        connecting: { kind: evil, name: evil, icon: evil },
        subtitle: evil,
        note: evil,
        orgs: [{ value: evil, name: evil, role: "member", logo: evil }],
      }),
    );
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

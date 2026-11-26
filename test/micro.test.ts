// The micro-interactions (D-53): the markup of each, what it does with no script, escaping, the words in
// Danish and English, the React twin drawing the same bytes, the contrast of text on the new tints, and
// the rules of the cut-off and the progress bar. What the scripts do in a browser is
// test/micro-browser.test.ts.

import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { contrast, mix } from "../src/color.ts";
import { MODES, model } from "../src/emit.ts";
import {
  BUTTON_SCRIPT,
  button,
  buttonScript,
  CHANGED_SCRIPT,
  changedValue,
  COUNTDOWN_SCRIPT,
  cutoff,
  HOLD_SCRIPT,
  holdToConfirm,
  holdScript,
  icon,
  progress,
  sortByCutoff,
  TABLE_SELECT_SCRIPT,
  table,
  timeLeft,
  toast,
  TOAST_SCRIPT,
  type ToastOptions,
} from "../src/html.ts";
import { Button, ChangedValue, Cutoff, HoldToConfirm, Progress, Table, Toast } from "../src/react.ts";

const evil = `x" onfocus="alert(1)<script>`;
const clean = (out: string) => {
  expect(out).not.toContain("<script>");
  expect(out).not.toContain('" onfocus="');
  expect(out).not.toMatch(/="[^"]*"[^ >\/]/);
};
const syntax = (src: string) => expect(() => new Function(src)).not.toThrow();

test("every script is valid JavaScript on its own", () => {
  for (const s of [BUTTON_SCRIPT, CHANGED_SCRIPT, TABLE_SELECT_SCRIPT, HOLD_SCRIPT, COUNTDOWN_SCRIPT, TOAST_SCRIPT]) syntax(s);
});

test("a script tag takes the page's nonce, stripped to base64 characters", () => {
  expect(String(buttonScript("abc+/=_-"))).toMatch(/^<script nonce="abc\+\/=_-">/);
  expect(String(holdScript('x"><img>'))).toMatch(/^<script nonce="ximg">/);
  expect(String(holdScript())).toMatch(/^<script>/);
});

describe("1. working, then a tick: button({ progress })", () => {
  test("idle: the button, its words for the script, a template for the tick and an empty status region", () => {
    const h = String(button({ label: "Udgiv", progress: { lang: "da" } }));
    expect(h).toBe(
      '<span class="button-progress"><button type="submit" data-working="Arbejder…" data-done="Færdig">Udgiv</button>' +
        `<template data-done-icon>${icon("check")}</template><span class="visually-hidden" role="status"></span></span>`,
    );
  });

  test("the words are the package's in both languages, or the product's own", () => {
    expect(String(button({ label: "Publish", progress: { lang: "en" } }))).toContain('data-working="Working…" data-done="Done"');
    const own = String(button({ label: "Udgiv", progress: { lang: "da", working: "Udgiver…", done: "Udgivet" } }));
    expect(own).toContain('data-working="Udgiver…" data-done="Udgivet"');
  });

  test("working: a spinner and the word, aria-busy, still a live button, and no announcement in the markup", () => {
    const h = String(button({ label: "Udgiv", progress: { lang: "da", state: "working" } }));
    expect(h).toContain('data-state="working" aria-busy="true">');
    expect(h).toContain('<span class="spinner" aria-hidden="true"></span>Arbejder…</button>');
    expect(h).not.toContain("disabled");
    // On a fresh page the button's own words are read in order; announcing them as well would say it twice.
    expect(h).toContain('<span class="visually-hidden" role="status"></span>');
  });

  test("done: the tick and the word, no aria-busy", () => {
    const h = String(button({ label: "Udgiv", progress: { lang: "en", state: "done" } }));
    expect(h).toContain('data-state="done">' + String(icon("check")) + "Done</button>");
    expect(h).not.toContain("aria-busy");
  });

  test("the variant, size, name and value still go on the button; an icon before the label stays when idle", () => {
    const h = String(button({ label: "Slet", variant: "danger", small: true, name: "op", value: "x", icon: "trash", progress: { lang: "en" } }));
    expect(h).toContain('<button class="danger small" type="submit" name="op" value="x"');
    expect(h).toContain(String(icon("trash")) + "Slet</button>");
  });

  test("a link takes no progress, and a button with none is the button it was", () => {
    expect(String(button({ label: "Se", href: "/x", progress: { lang: "da" } }))).toBe('<a class="button" href="/x">Se</a>');
    expect(String(button({ label: "Gem" }))).toBe('<button type="submit">Gem</button>');
  });

  test("escapes the label and the words", () => {
    clean(String(button({ label: evil, progress: { lang: "en", working: evil, done: evil } })));
  });

  test("the React twin draws the same bytes", () => {
    const o = { label: "Udgiv", progress: { lang: "da" as const, state: "working" as const } };
    expect(renderToStaticMarkup(createElement(Button, o))).toBe(String(button(o)));
  });
});

describe("2. changed value", () => {
  test("a span that is tinted only when the server says it changed", () => {
    expect(String(changedValue("1.248", { changed: true }))).toBe('<span class="changed-value" data-changed="true">1.248</span>');
    expect(String(changedValue("1.248"))).toBe('<span class="changed-value">1.248</span>');
  });

  test("escapes, and the React twin draws the same bytes", () => {
    clean(String(changedValue(evil, { changed: true })));
    expect(renderToStaticMarkup(createElement(ChangedValue, { changed: true, children: "7" }))).toBe(String(changedValue("7", { changed: true })));
  });

  // The tint is the accent at 16% over the surface (--_changed); the text on it keeps AA in both themes
  // for every product, on the page, the card and the muted surface a ticked row takes.
  const m = model(join(import.meta.dirname, "..", "tokens"));
  describe.each(MODES)("%s theme", (mode) => {
    describe.each(m.products)("%s", (p) => {
      for (const surface of ["background", "card", "muted"]) {
        for (const text of ["foreground", "body-foreground", "card-foreground"]) {
          test(`${text} on the tint over ${surface}`, () => {
            const tint = mix(m.product[p]!.primary[mode], m.colors[surface]![mode], 0.16);
            expect(contrast(m.colors[text]![mode], tint)).toBeGreaterThanOrEqual(4.5);
          });
        }
      }
    });
  });
});

describe("3. undo toast", () => {
  const SAVED: ToastOptions = { lang: "en", tone: "success", text: "Page archived.", dismissHref: "/sites", undo: { action: "/sites/7/undo", fields: { csrf: "tok" } } };

  test("Undo is a POST form with the hidden fields, named by the toast's text, and the toast says how long", () => {
    const h = String(toast(SAVED));
    expect(h).toContain('data-toast-undo="10"');
    expect(h).toContain('<span class="toast-actions"><form class="toast-undo-form" method="post" action="/sites/7/undo"><input type="hidden" name="csrf" value="tok"><button type="submit" class="ghost small" aria-describedby="toast-text">Undo</button></form><a class="button ghost small toast-dismiss"');
    expect(h).not.toContain("data-toast-autohide");
  });

  test("the word is the package's in Danish, or the product's, and the seconds are rounded and at least 1", () => {
    expect(String(toast({ ...SAVED, lang: "da" }))).toContain(">Fortryd</button>");
    expect(String(toast({ ...SAVED, undo: { action: "/u", label: "Bring it back", seconds: 7.4 } }))).toContain('data-toast-undo="7"');
    expect(String(toast({ ...SAVED, undo: { action: "/u", seconds: 0 } }))).toContain('data-toast-undo="1"');
  });

  test("an undo and an action together are refused: the toast has room for one thing to do", () => {
    expect(() => toast({ ...SAVED, action: { label: "See", href: "/x" } })).toThrow(/undo or an action/);
  });

  test("it is still dismissed by a link, with no script: nothing in the markup needs one", () => {
    const h = String(toast(SAVED));
    expect(h).toContain('href="/sites" data-toast-dismiss="toast"');
  });

  test("escapes, and a javascript: undo URL becomes #", () => {
    const h = String(toast({ ...SAVED, id: evil, text: evil, undo: { action: "javascript:alert(1)", fields: { [evil]: evil }, label: evil } }));
    clean(h);
    expect(h).toContain('action="#"');
    expect(h).not.toContain("javascript:");
  });

  test("the React twin draws the same bytes", () => {
    expect(renderToStaticMarkup(createElement(Toast, SAVED))).toBe(String(toast(SAVED)));
  });
});

describe("4. selectable rows: table({ selectable })", () => {
  const T = {
    label: "Sites",
    columns: [{ label: "Site" }, { label: "Status" }],
    rows: [["Bager Hansen", "Live"], ["Mette", "Draft"], ["Café Example", "Live"]],
    selectable: {
      lang: "en" as const,
      name: "site",
      ids: ["a", "b", "c"],
      labels: ["Bager Hansen", "Mette", "Café Example"],
      form: { action: "/sites/publish", fields: { csrf: "tok" } },
      actions: button({ label: "Publish selected", small: true }),
    },
  };

  test("a form around the table, a checkbox column that works with no script, and the action", () => {
    const h = String(table(T));
    expect(h).toMatch(/^<form class="table-select" data-select-text="\{n\} selected" action="\/sites\/publish" method="post"><input type="hidden" name="csrf" value="tok"><div class="table-wrap"/);
    expect(h).toContain('<th scope="col" class="select"><span class="visually-hidden">Select</span></th>');
    expect(h).toContain('<td class="select"><input type="checkbox" name="site" value="a" aria-label="Select Bager Hansen"></td><td>Bager Hansen</td>');
    expect(h.match(/<input type="checkbox"/g)).toHaveLength(3);
    expect(h).toContain('<p class="table-select-count" aria-hidden="true">0 selected</p><span class="visually-hidden" role="status" data-select-live></span><span class="table-select-actions"><button class="small" type="submit">Publish selected</button>');
  });

  test("a GET form, Danish words, and the rows the server drew ticked", () => {
    const h = String(table({ ...T, selectable: { ...T.selectable, lang: "da", form: { action: "/x", method: "get" }, selected: ["b", "c"] } }));
    expect(h).toContain('action="/x" method="get"');
    expect(h).toContain('data-select-text="{n} valgt"');
    expect(h).toContain('value="b" aria-label="Vælg Mette" checked>');
    expect(h).toContain('value="a" aria-label="Vælg Bager Hansen">');
    expect(h).toContain(">2 valgt</p>");
  });

  test("a table with no selectable is the table it was", () => {
    const { selectable: _s, ...plain } = T;
    expect(String(table(plain))).toMatch(/^<div class="table-wrap"/);
    expect(String(table(plain))).not.toContain("checkbox");
  });

  test("one id and one label for each row, or it throws", () => {
    expect(() => table({ ...T, selectable: { ...T.selectable, ids: ["a"] } })).toThrow(/one id and one label/);
    expect(() => table({ ...T, selectable: { ...T.selectable, labels: [] } })).toThrow(/one id and one label/);
  });

  test("inside a table with controls, the form is the table's frame and the footer stays outside it", () => {
    const h = String(table({ ...T, controls: { lang: "en", search: { value: "" }, paging: { from: 1, to: 3, total: 3 } } }));
    expect(h).toMatch(/^<div class="data-table"><div class="table-controls"><form class="table-search"/);
    expect(h.indexOf('class="table-select"')).toBeGreaterThan(h.indexOf("table-search"));
    expect(h.indexOf('class="table-foot"')).toBeGreaterThan(h.indexOf("</form></div><div class=\"table-foot\"") - 1);
    // Forms never nest: the search form closes before the selection form opens.
    expect(h.indexOf("</form>")).toBeLessThan(h.indexOf('<form class="table-select"'));
  });

  test("escapes the ids, the labels and the name", () => {
    clean(String(table({ ...T, selectable: { ...T.selectable, name: evil, ids: [evil, evil, evil], labels: [evil, evil, evil] } })));
  });

  test("the React twin draws the same bytes", () => {
    expect(renderToStaticMarkup(createElement(Table, T))).toBe(String(table(T)));
  });
});

describe("5. hold to confirm", () => {
  const H = { lang: "en" as const, id: "hold-site", label: "Delete the site", dialog: "delete-site", href: "/sites/7/delete", action: "/sites/7/delete", fields: { csrf: "tok" } };

  test("the confirm's own trigger (a link to the dialog and the no-script page) and a hidden form for the hold", () => {
    const h = String(holdToConfirm(H));
    expect(h).toBe(
      '<span class="hold"><a class="button danger hold-button" href="/sites/7/delete" data-dialog-open="delete-site" data-hold-form="hold-site">' +
        '<span class="hold-fill" aria-hidden="true"><span>Hold to confirm</span></span><span class="hold-label">Delete the site</span><span class="hold-hint" aria-hidden="true">Hold to confirm</span></a>' +
        '<form class="hold-form" id="hold-site" method="post" action="/sites/7/delete" hidden><input type="hidden" name="csrf" value="tok"></form></span>',
    );
  });

  test("nothing in the markup acts on a click: the link goes to the confirm, and the hold form has no button", () => {
    const h = String(holdToConfirm(H));
    expect(h).not.toMatch(/<button|type="submit"|onclick/);
    expect(h).toContain('<form class="hold-form"');
    expect(h).toContain("hidden>");
  });

  test("the hint is the product's words, or the package's in Danish and English", () => {
    expect(String(holdToConfirm({ ...H, holdLabel: "Hold to delete the site" }))).toContain(">Hold to delete the site</span>");
    expect(String(holdToConfirm({ ...H, lang: "da" }))).toContain(">Hold nede</span>");
    expect(String(holdToConfirm(H))).toContain(">Hold to confirm</span>");
  });

  test("the label stays the link's name and the hint is aria-hidden, so a screen reader hears the plain action", () => {
    const h = String(holdToConfirm(H));
    expect(h).toContain('<span class="hold-hint" aria-hidden="true">');
    expect(h).not.toMatch(/hold-label"[^>]*aria-hidden/);
  });

  test("escapes, and a javascript: URL becomes #", () => {
    const h = String(holdToConfirm({ ...H, id: evil, label: evil, holdLabel: evil, dialog: evil, href: "javascript:alert(1)", action: "javascript:alert(2)", fields: { [evil]: evil } }));
    clean(h);
    expect(h).not.toContain("javascript:");
  });

  test("the script never submits on a click: it submits only from the end of a timed hold", () => {
    // The only requestSubmit is inside the step that has seen HOLD_MS pass.
    expect(HOLD_SCRIPT.match(/requestSubmit/g)).toHaveLength(1);
    const step = HOLD_SCRIPT.slice(HOLD_SCRIPT.indexOf("const step"), HOLD_SCRIPT.indexOf('document.addEventListener("pointerdown"'));
    expect(step).toMatch(/if \(t >= HOLD_MS\) \{[^]*requestSubmit/);
    expect(HOLD_SCRIPT).toContain("const HOLD_MS = 1000;");
    // Only a touch or pen pointer on a coarse screen can start one.
    expect(HOLD_SCRIPT).toContain('e.pointerType === "mouse" || !matchMedia("(pointer: coarse)").matches');
  });

  test("the React twin draws the same bytes", () => {
    expect(renderToStaticMarkup(createElement(HoldToConfirm, H))).toBe(String(holdToConfirm(H)));
  });

  // The fill is solid danger with the label's own ink on it, so the hold word is read on both halves.
  const m = model(join(import.meta.dirname, "..", "tokens"));
  describe.each(MODES)("%s theme", (mode) => {
    describe.each(m.products)("%s", (p) => {
      test("the primary-foreground word on the danger fill", () => {
        expect(contrast(m.product[p]!["primary-foreground"][mode], m.colors.danger![mode])).toBeGreaterThanOrEqual(4.5);
      });
    });
    for (const surface of ["background", "card"]) {
      test(`the danger word on ${surface}`, () => expect(contrast(m.colors.danger![mode], m.colors[surface]![mode])).toBeGreaterThanOrEqual(4.5));
    }
  });
});

describe("6. cut-off countdown", () => {
  const now = new Date("2026-11-22T08:00:00Z");
  const at = (min: number) => new Date(now.getTime() + min * 60000);

  test.each([
    [0, "da", "under 1 min"],
    [-1, "en", "under 1 min"],
    [1, "en", "1 min"],
    [59_999, "en", "1 min"],
    [60_000, "en", "1 min"],
    [20 * 60_000, "en", "20 min"],
    [80 * 60_000, "en", "1 h 20 min"],
    [80 * 60_000, "da", "1 t 20 min"],
    [120 * 60_000, "en", "2 h"],
    [(24 * 60 + 90) * 60_000, "en", "1 d 1 h"],
    [(3 * 24 * 60) * 60_000, "da", "3 d"],
    [80 * 60_000 + 1, "en", "1 h 21 min"],
  ] as const)("%i ms in %s is %s", (ms, lang, text) => expect(timeLeft(ms, lang)).toBe(text));

  test("soon: neutral, with the clock; the words say when", () => {
    const h = String(cutoff({ lang: "en", at: at(80), now }));
    expect(h).toContain('class="tag cutoff" datetime="2026-11-22T09:20:00.000Z" data-cutoff="2026-11-22T09:20:00.000Z" data-warn="60" data-before="Cut-off in" data-passed="Cut-off passed" data-units="d,h,min,under 1 min" data-state="soon"');
    expect(h).toContain('<span class="cutoff-text">Cut-off in 1 h 20 min</span>');
    expect(h.match(/<svg/g)).toHaveLength(3);
  });

  test("warning at the threshold and under it, danger when it has passed (never colour alone: other words)", () => {
    const warn = String(cutoff({ lang: "da", at: at(60), now }));
    expect(warn).toContain('class="tag cutoff warning"');
    expect(warn).toContain('data-state="warning"');
    expect(warn).toContain("Frist om 1 t");
    expect(String(cutoff({ lang: "da", at: at(61), now }))).toContain('class="tag cutoff" ');
    const late = String(cutoff({ lang: "da", at: at(0), now }));
    expect(late).toContain('class="tag cutoff danger"');
    expect(late).toContain("Frist overskredet");
    expect(String(cutoff({ lang: "en", at: at(-5), now }))).toContain("Cut-off passed");
  });

  test("the product sets the threshold and the words", () => {
    expect(String(cutoff({ lang: "en", at: at(150), now, warnWithin: 180 }))).toContain('class="tag cutoff warning"');
    expect(String(cutoff({ lang: "en", at: at(150), now, warnWithin: 180 }))).toContain('data-warn="180"');
    const own = String(cutoff({ lang: "en", at: at(5), now, words: { before: "Orders close in", passed: "Orders closed" } }));
    expect(own).toContain("Orders close in 5 min");
    expect(own).toContain('data-passed="Orders closed"');
  });

  test("a string date works, and a bad date throws", () => {
    expect(String(cutoff({ lang: "en", at: "2026-11-22T09:20:00Z", now }))).toContain("1 h 20 min");
    expect(() => cutoff({ lang: "en", at: "never", now })).toThrow(/not a date/);
  });

  test("escapes the product's words", () => {
    clean(String(cutoff({ lang: "en", at: at(5), now, words: { before: evil, passed: evil } })));
  });

  test("the script's words match the helper's for every span of time", () => {
    // The script cannot import the helper, so it keeps its own copy of the arithmetic: run both.
    const sandbox = { chips: [] as { attrs: Record<string, string>; text: string; classes: Set<string> }[] };
    const run = (ms: number, lang: "da" | "en") => {
      const units = { da: "d,t,min,under 1 min", en: "d,h,min,under 1 min" }[lang];
      const chip = {
        attrs: { "data-cutoff": new Date(now.getTime() + ms).toISOString(), "data-warn": "60", "data-before": "B", "data-passed": "P", "data-units": units, "data-state": "soon" } as Record<string, string>,
        text: "",
        classes: new Set<string>(),
      };
      const text = { get textContent() { return chip.text; }, set textContent(v: string) { chip.text = v; } };
      const el = {
        getAttribute: (a: string) => chip.attrs[a] ?? null,
        setAttribute: (a: string, v: string) => (chip.attrs[a] = v),
        querySelector: () => text,
        classList: { toggle: (c: string, on: boolean) => (on ? chip.classes.add(c) : chip.classes.delete(c)) },
      };
      const fakeNow = now.getTime();
      const src = COUNTDOWN_SCRIPT.replace("run();\n  const next", "run();\n  const next = () => 0;\n  const unused");
      new Function("document", "Date", "setTimeout", src)(
        { querySelectorAll: () => [el] },
        Object.assign(function () {}, { now: () => fakeNow, parse: Date.parse }),
        () => 0,
      );
      sandbox.chips.push(chip);
      return chip.text;
    };
    for (const ms of [30_000, 61_000, 20 * 60_000, 80 * 60_000, 3 * 3600_000 + 59_000, 26 * 3600_000, 50 * 3600_000 + 5 * 60_000, 9 * 24 * 3600_000]) {
      for (const lang of ["da", "en"] as const) expect(run(ms, lang), `${ms} ${lang}`).toBe(`B ${timeLeft(ms, lang)}`);
    }
  });

  test("sorted nearest cut-off first: what is to come soonest, then what has passed (latest first), then no cut-off", () => {
    const rows = [
      { n: "none", at: undefined },
      { n: "later", at: at(300) },
      { n: "passed-old", at: at(-300) },
      { n: "soon", at: at(20) },
      { n: "passed-new", at: at(-5) },
      { n: "null", at: null },
      { n: "mid", at: at(90).toISOString() },
    ];
    const out = sortByCutoff(rows, (r) => r.at, now).map((r) => r.n);
    expect(out).toEqual(["soon", "mid", "later", "passed-new", "passed-old", "none", "null"]);
    expect(rows[0]!.n).toBe("none");
  });

  test("a sort is stable for equal times and does not touch the input", () => {
    const rows = [{ n: "a", at: at(10) }, { n: "b", at: at(10) }, { n: "c", at: at(5) }];
    expect(sortByCutoff(rows, (r) => r.at, now).map((r) => r.n)).toEqual(["c", "a", "b"]);
    expect(rows.map((r) => r.n)).toEqual(["a", "b", "c"]);
  });

  test("the React twin draws the same bytes", () => {
    const o = { lang: "da" as const, at: at(30), now };
    expect(renderToStaticMarkup(createElement(Cutoff, o))).toBe(String(cutoff(o)));
  });
});

describe("7. an honest progress bar", () => {
  const fill = (h: string) => Number(/ value="([^"]+)"/.exec(h)![1]);

  test("0 of 10 is an empty track: the value is 0, not a minimum", () => {
    const h = String(progress({ value: 0, max: 10, label: "0 of 10 locked" }));
    expect(fill(h)).toBe(0);
    expect(h).toContain('role="progressbar" value="0" max="10" aria-valuemin="0" aria-valuemax="10" aria-valuenow="0"');
    expect(h).toContain('<p class="progress-label" id="progress-label">0 of 10 locked</p>');
    expect(h).toContain('aria-labelledby="progress-label"');
  });

  test("only value === max is full", () => {
    const full = [0, 1, 4.5, 9, 9.99, 10].filter((v) => fill(String(progress({ value: v, max: 10, label: "x" }))) === 10);
    expect(full).toEqual([10]);
  });

  test("a value out of range or not a number is held to the track", () => {
    expect(fill(String(progress({ value: -3, max: 10, label: "x" })))).toBe(0);
    expect(fill(String(progress({ value: 14, max: 10, label: "x" })))).toBe(10);
    expect(fill(String(progress({ value: Number.NaN, max: 10, label: "x" })))).toBe(0);
  });

  test("a max that is not above 0 is a mistake, not a full bar", () => {
    expect(() => progress({ value: 0, max: 0, label: "x" })).toThrow(/max must be above 0/);
    expect(() => progress({ value: 1, max: Number.POSITIVE_INFINITY, label: "x" })).toThrow();
  });

  test("two on a page take their own ids", () => {
    const a = String(progress({ id: "a", value: 1, max: 2, label: "x" }));
    expect(a).toContain('aria-labelledby="a-label"');
    expect(a).toContain('id="a-label"');
  });

  test("escapes, and the React twin draws the same bytes", () => {
    clean(String(progress({ id: evil, value: 1, max: 2, label: evil })));
    expect(renderToStaticMarkup(createElement(Progress, { value: 3, max: 10, label: "3 of 10" }))).toBe(String(progress({ value: 3, max: 10, label: "3 of 10" })));
  });
});

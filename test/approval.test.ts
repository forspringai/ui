// Agent approval, diff and "why it did that" (D-24): the markup a person decides on with no script
// (POST forms with their fields, a closed details), the words in both languages and the same words
// as Spring's Slack cards, the "+k more" count, escaping, and the React wrappers drawing the same bytes.

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { approval, diff, explain, type ApprovalOptions, type DiffOptions, type ExplainOptions } from "../src/html.ts";
import { Approval, Diff, Explain } from "../src/react.ts";

const REMINDERS: ApprovalOptions = {
  lang: "en",
  id: "approve-reminders",
  agent: "Spring",
  onBehalfOf: "Maria (Finance)",
  title: "Spring wants to send 14 payment reminders",
  summary: "Spring prepared reminders for overdue invoices and is waiting for approval.",
  expires: new Date(Date.UTC(2026, 10, 12, 13, 0)),
  why: { text: "Invoices are 14+ days overdue.", links: [{ label: "the skill Chase overdue invoices, step 3", href: "/skills/chase-overdue#step-3" }] },
  changes: { items: [["Nordkraft ApS #2041", "33 days", "12,400 kr."], ["Bager Hansen ApS #2038", "21 days", "3,150 kr."], ["Østerbro Cykler #2044", "16 days", "8,720 kr."]], total: 14, moreHref: "/requests/r-1/items" },
  effects: [{ text: "Sends 14 emails from finance@" }, { text: "Can't be undone", tone: "warning" }, { text: "Nothing is charged" }],
  approve: { label: "Approve and send", action: "/requests/r-1/approve", fields: { csrf: "tok-1", request: "r-1" } },
  edit: { href: "/requests/r-1/edit" },
  reject: { action: "/requests/r-1/reject", fields: { csrf: "tok-1", request: "r-1" } },
  draftHref: "/requests/r-1/draft",
};

const evil = `x" onfocus="alert(1)<script>`;
const clean = (out: string) => {
  expect(out).not.toContain("<script>");
  expect(out).not.toContain('" onfocus="');
  expect(out).not.toMatch(/="[^"]*"[^ >\/]/);
};

describe("approval()", () => {
  const h = String(approval(REMINDERS));

  test("a section labelled by its heading: who asks, what, and a waiting line", () => {
    expect(h).toMatch(/^<section class="approval" id="approve-reminders" aria-labelledby="approve-reminders-title"><p class="approval-kicker"><span class="approval-agent">Spring<\/span> · Waiting for approval<\/p><h2 class="approval-title" id="approve-reminders-title">Spring wants to send 14 payment reminders<\/h2>/);
    expect(h).toContain('<p class="approval-summary">Spring prepared reminders for overdue invoices and is waiting for approval.</p>');
    expect(String(approval({ ...REMINDERS, headingLevel: 3 }))).toContain('<h3 class="approval-title" id="approve-reminders-title">');
  });

  test("the facts are a description list in Spring's words: Asked by … via Spring, Expires, Why, What changes, What it does", () => {
    expect(h).toContain('<dl class="approval-facts"><div><dt>Asked by</dt><dd>Maria (Finance) via Spring</dd></div>');
    expect(h).toContain('<div><dt>Expires</dt><dd><time datetime="2026-11-12T13:00:00.000Z">12 Nov 2026, 14:00</time></dd></div>');
    expect(h).toContain('<div><dt>Why</dt><dd>Invoices are 14+ days overdue. <span class="agent-follows">Follows <a href="/skills/chase-overdue#step-3">the skill Chase overdue invoices, step 3</a></span></dd></div>');
    expect(h).toContain("<dt>What changes</dt>");
    expect(h).toContain('<dt>What it does</dt><dd><ul class="approval-effects"><li>Sends 14 emails from finance@</li><li class="warning"><strong>Can&#39;t be undone</strong></li><li>Nothing is charged</li></ul>');
    const order = ["Asked by", "Expires", "Why", "What changes", "What it does"].map((w) => h.indexOf(`<dt>${w}</dt>`));
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  test("the first three items, their parts with · between, then +11 more linked", () => {
    expect(h).toContain('<ul class="approval-changes"><li><span class="approval-item-name">Nordkraft ApS #2041</span> · 33 days · 12,400 kr.</li>');
    expect(h).toContain('<li class="approval-more"><a href="/requests/r-1/items">+11 more</a></li></ul>');
    expect(h.match(/<li>/g)?.length).toBe(3 + 2);
  });

  test("+k more is the total less what is drawn, and absent when everything shows", () => {
    const items = ["a", "b", "c", "d", "e"];
    const count = (o: Partial<ApprovalOptions["changes"]>) => /\+(\d+) more/.exec(String(approval({ ...REMINDERS, changes: { items, ...o } })))?.[1];
    expect(count({})).toBe("2");
    expect(count({ show: 5 })).toBeUndefined();
    expect(count({ show: 1 })).toBe("4");
    expect(count({ total: 40 })).toBe("37");
    expect(count({ items: ["a"], total: 14 })).toBe("13");
    expect(count({ items: [], total: 3 })).toBe("3");
    const plain = String(approval({ ...REMINDERS, changes: { items, moreHref: undefined } }));
    expect(plain).toContain('<li class="approval-more">+2 more</li>');
    expect(String(approval({ ...REMINDERS, changes: { items: [] } }))).toContain("<dd><p>Nothing changes.</p></dd>");
  });

  test("approve and reject are POST forms with their hidden fields; edit and the draft are links; one row", () => {
    expect(h).toContain(
      '<div class="approval-actions"><form method="post" action="/requests/r-1/approve"><input type="hidden" name="csrf" value="tok-1"><input type="hidden" name="request" value="r-1"><button type="submit" aria-describedby="approve-reminders-title">Approve and send</button></form><a class="button ghost" href="/requests/r-1/edit" aria-describedby="approve-reminders-title">Edit first</a><form method="post" action="/requests/r-1/reject"><input type="hidden" name="csrf" value="tok-1"><input type="hidden" name="request" value="r-1"><button type="submit" class="ghost" aria-describedby="approve-reminders-title">Reject</button></form><a class="go" href="/requests/r-1/draft">See the draft</a></div>',
    );
    const bare = String(approval({ ...REMINDERS, approve: { action: "/a" }, edit: undefined, reject: undefined, draftHref: undefined }));
    expect(bare).toContain('<div class="approval-actions"><form method="post" action="/a"><button type="submit" aria-describedby="approve-reminders-title">Approve</button></form></div>');
  });

  test("an outcome replaces the buttons and the expiry, as a signal with words", () => {
    const at = new Date(Date.UTC(2026, 10, 11, 13, 2));
    const done = String(approval({ ...REMINDERS, outcome: { status: "approved", by: "Peter Engelbrecht", at, note: "The reminders are sent." } }));
    expect(done).not.toContain("<form");
    expect(done).not.toContain("<button");
    expect(done).not.toContain("Expires");
    expect(done).not.toContain("Waiting for approval");
    expect(done).toContain('<div class="approval-outcome"><p><span class="signal ok"><span class="signal-mark ok" aria-hidden="true"></span><span>Approved by Peter Engelbrecht · <time datetime="2026-11-11T13:02:00.000Z">11 Nov 2026, 14:02</time></span></span></p><p>The reminders are sent.</p></div></section>');
    expect(String(approval({ ...REMINDERS, outcome: { status: "rejected", by: "Maria" } }))).toContain('<span class="signal off"><span class="signal-mark off" aria-hidden="true"></span><span>Rejected by Maria</span></span>');
    // Nobody decided an expired request, so it names no one.
    expect(String(approval({ ...REMINDERS, outcome: { status: "expired", by: "x", at: "yesterday" } }))).toContain('<span class="signal warn"><span class="signal-mark warn" aria-hidden="true"></span><span>Expired yesterday</span></span>');
  });

  test("Danish words", () => {
    const da = String(
      approval({
        ...REMINDERS,
        lang: "da",
        onBehalfOf: "Maria (Økonomi)",
        approve: { action: "/a" },
        edit: { href: "/e" },
        reject: { action: "/r" },
        why: { text: "Fakturaerne er forfaldne.", links: [{ label: "A", href: "/a" }, { label: "B", href: "/b" }, { label: "C", href: "/c" }] },
      }),
    );
    expect(da).toContain("Spring</span> · Venter på godkendelse</p>");
    expect(da).toContain("<dt>Anmodet af</dt><dd>Maria (Økonomi) via Spring</dd>");
    expect(da).toContain('<dt>Udløber</dt><dd><time datetime="2026-11-12T13:00:00.000Z">12. nov. 2026, 14.00</time></dd>');
    expect(da).toContain('<dt>Hvorfor</dt><dd>Fakturaerne er forfaldne. <span class="agent-follows">Følger <a href="/a">A</a>, <a href="/b">B</a> og <a href="/c">C</a></span>');
    for (const w of ["<dt>Hvad ændres</dt>", "<dt>Hvad det gør</dt>", "+11 flere", ">Godkend</button>", ">Ret først</a>", ">Afvis</button>", ">Se udkastet</a>"]) expect(da).toContain(w);
    const done = String(approval({ ...REMINDERS, lang: "da", outcome: { status: "approved", by: "Mette", at: new Date(Date.UTC(2026, 10, 4, 9, 41)) } }));
    expect(done).toContain("<span>Godkendt af Mette · <time");
    expect(String(approval({ ...REMINDERS, lang: "da", outcome: { status: "rejected" } }))).toContain("Afvist</span>");
    expect(String(approval({ ...REMINDERS, lang: "da", outcome: { status: "expired" } }))).toContain("Udløbet</span>");
  });

  test("an expiry in the caller's words, with or without its moment", () => {
    expect(String(approval({ ...REMINDERS, expires: "in 2 hours" }))).toContain("<dt>Expires</dt><dd>in 2 hours</dd>");
    expect(String(approval({ ...REMINDERS, expires: { at: new Date(Date.UTC(2026, 0, 1)), label: "tomorrow" } }))).toContain('<dd><time datetime="2026-01-01T00:00:00.000Z">tomorrow</time></dd>');
  });

  test("escapes everything it is given, and drops a javascript: href", () => {
    const out = String(
      approval({
        lang: "en",
        id: evil,
        agent: evil,
        onBehalfOf: evil,
        title: evil,
        summary: evil,
        expires: evil,
        why: { text: evil, links: [{ label: evil, href: "javascript:alert(1)" }] },
        changes: { items: [[evil, evil], evil], total: 9, moreHref: evil },
        effects: [{ text: evil, tone: "danger" }],
        approve: { label: evil, action: evil, fields: { [evil]: evil } },
        edit: { label: evil, href: evil },
        reject: { label: evil, action: evil, fields: { [evil]: evil } },
        draftHref: "javascript:alert(1)",
      }),
    );
    clean(out);
    expect(out).not.toContain("javascript:");
    expect(out).toContain('<h2 class="approval-title" id="x&quot; onfocus=&quot;alert(1)&lt;script&gt;-title">x&quot; onfocus=&quot;alert(1)&lt;script&gt;</h2>');
    clean(String(approval({ ...REMINDERS, outcome: { status: "approved", by: evil, at: evil, note: evil } })));
  });
});

describe("diff()", () => {
  const BRIEF: DiffOptions = {
    lang: "en",
    label: "Channel #finance",
    fields: [
      { label: "Owners", before: "Maria", after: "Maria, Jonas" },
      { label: "Procedures", after: "Chase overdue invoices" },
    ],
    lines: [
      { kind: "same", text: "Answer in Danish." },
      { kind: "removed", text: "Never send anything to customers." },
      { kind: "added", text: "Reminders go out only after approval." },
    ],
  };
  const h = String(diff(BRIEF));

  test("fields are a table of field, before and after; a missing value is None", () => {
    expect(h).toMatch(/^<figure class="diff"><figcaption class="diff-label">Channel #finance<\/figcaption><div class="table-wrap" role="region" aria-label="Channel #finance" tabindex="0">/);
    expect(h).toContain('<thead><tr><th scope="col">Field</th><th scope="col">Before</th><th scope="col">After</th></tr></thead>');
    expect(h).toContain('<tr><td><span class="diff-field">Owners</span></td><td>Maria</td><td>Maria, Jonas</td></tr>');
    expect(h).toContain('<tr><td><span class="diff-field">Procedures</span></td><td><span class="diff-none">None</span></td><td>Chase overdue invoices</td></tr>');
  });

  test("added and removed lines carry a sign and the words, not colour alone", () => {
    expect(h).toContain('<li class="diff-line"><span class="diff-sign" aria-hidden="true"></span><span class="diff-text">Answer in Danish.</span></li>');
    expect(h).toContain('<li class="diff-line removed"><span class="diff-sign" aria-hidden="true">−</span><del class="diff-text"><span class="visually-hidden">Removed: </span>Never send anything to customers.</del></li>');
    expect(h).toContain('<li class="diff-line added"><span class="diff-sign" aria-hidden="true">+</span><ins class="diff-text"><span class="visually-hidden">Added: </span>Reminders go out only after approval.</ins></li>');
  });

  test("Danish words, and lines alone with no caption", () => {
    const da = String(diff({ ...BRIEF, lang: "da" }));
    for (const w of [">Felt</th>", ">Før</th>", ">Efter</th>", ">Ingen</span>", ">Fjernet: </span>", ">Tilføjet: </span>"]) expect(da).toContain(w);
    const lines = String(diff({ lang: "da", lines: BRIEF.lines }));
    expect(lines).toMatch(/^<figure class="diff"><ul class="diff-lines">/);
    expect(lines).not.toContain("<table");
  });

  test("escapes everything it is given", () => {
    const out = String(diff({ lang: "en", label: evil, fields: [{ label: evil, before: evil, after: evil }], lines: [{ kind: "added", text: evil }, { kind: "removed", text: evil }, { kind: "same", text: evil }] }));
    clean(out);
  });
});

describe("explain()", () => {
  const TRAIL: ExplainOptions = {
    lang: "en",
    agent: "Spring",
    steps: [
      { text: "Found 14 invoices more than 14 days overdue", used: { label: "e-conomic: open invoices", href: "/sources/economic" }, at: new Date(Date.UTC(2026, 10, 11, 8, 2)) },
      { text: "Checked that no customer agreed a later payment", used: { label: "customer notes" } },
      { text: "Wrote a reminder to each", at: "08:05" },
    ],
    follows: [{ label: "the skill Chase overdue invoices, step 3", href: "/skills/chase-overdue#step-3" }],
  };
  const h = String(explain(TRAIL));

  test("a closed details titled with the agent's name, the steps an ordered list", () => {
    expect(h).toMatch(/^<details class="explain"><summary>Why Spring did this<\/summary><div class="explain-body"><ol class="explain-steps"><li>/);
    expect(h).not.toMatch(/<details[^>]* open/);
    expect(h.match(/<li>/g)).toHaveLength(3);
    expect(String(explain({ ...TRAIL, lang: "da", agent: "Hugo" }))).toContain("<summary>Hvorfor Hugo gjorde det</summary>");
  });

  test("each step: what it did, what it used (linked when it can be opened), and when", () => {
    expect(h).toContain('<li><span class="explain-text">Found 14 invoices more than 14 days overdue</span><span class="explain-meta">Based on <a href="/sources/economic">e-conomic: open invoices</a> · <time datetime="2026-11-11T08:02:00.000Z">09:02</time></span></li>');
    expect(h).toContain('<li><span class="explain-text">Checked that no customer agreed a later payment</span><span class="explain-meta">Based on customer notes</span></li>');
    expect(h).toContain('<li><span class="explain-text">Wrote a reminder to each</span><span class="explain-meta">08:05</span></li>');
    expect(h).toContain('<p class="explain-follows"><span class="agent-follows">Follows <a href="/skills/chase-overdue#step-3">the skill Chase overdue invoices, step 3</a></span></p></div></details>');
    const da = String(explain({ ...TRAIL, lang: "da" }));
    expect(da).toContain("Ud fra <a");
    expect(da).toContain(">09.02</time>");
    expect(da).toContain("Følger <a");
  });

  test("escapes everything it is given", () => {
    const out = String(explain({ lang: "en", agent: evil, steps: [{ text: evil, used: { label: evil, href: "javascript:alert(1)" }, at: evil }], follows: [{ label: evil, href: evil }] }));
    clean(out);
    expect(out).not.toContain("javascript:");
  });

  test("inside an approval, after the facts and before the buttons", () => {
    const a = String(approval({ ...REMINDERS, explain: explain(TRAIL) }));
    expect(a.indexOf("</dl>")).toBeLessThan(a.indexOf('<details class="explain">'));
    expect(a.indexOf("</details>")).toBeLessThan(a.indexOf('<div class="approval-actions">'));
  });
});

describe("React wrappers draw the helpers' bytes", () => {
  test.each([
    REMINDERS,
    { ...REMINDERS, lang: "da" as const, title: `a"<b>'c`, explain: explain({ lang: "da", agent: "Spring", steps: [{ text: "x" }] }) },
    { ...REMINDERS, outcome: { status: "approved" as const, by: "Peter", at: new Date(Date.UTC(2026, 10, 11)) } },
  ])("Approval %#", (o) => {
    expect(renderToStaticMarkup(createElement(Approval, o))).toBe(String(approval(o)));
  });

  test("Diff and Explain", () => {
    const d: DiffOptions = { lang: "da", label: "Brief", fields: [{ label: "Ejere", before: "A", after: "B" }], lines: [{ kind: "added", text: "<x>" }] };
    expect(renderToStaticMarkup(createElement(Diff, d))).toBe(String(diff(d)));
    const e: ExplainOptions = { lang: "en", agent: "Spring", steps: [{ text: "Read", used: { label: "a", href: "/a" } }], follows: [{ label: "s", href: "/s" }] };
    expect(renderToStaticMarkup(createElement(Explain, e))).toBe(String(explain(e)));
  });
});

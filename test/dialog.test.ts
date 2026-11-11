// The dialog and the destructive-action confirm (D-23): the markup a browser needs to do the work
// with no script (pattern and required hold the submit, form method="dialog" closes), the words in
// both languages, escaping, and the React wrappers drawing the same bytes.

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { confirmDestructive, dialog, dialogScript, dialogTrigger, regexEscape, type ConfirmDestructiveOptions } from "../src/html.ts";
import { ConfirmDestructive, Dialog } from "../src/react.ts";

const SITE: ConfirmDestructiveOptions = {
  lang: "en",
  id: "delete-site",
  title: "Delete banegaarden.dk?",
  losses: ["181 pages", "4 forms", "62 redirects"],
  text: "The domain stops answering at once.",
  irreversible: true,
  confirmName: "banegaarden.dk",
  action: "/o/bager-hansen/sites/banegaarden.dk/delete",
  fields: { csrf: "tok-123" },
  keepLabel: "Keep site",
  confirmLabel: "Delete site",
};

const attr = (h: string, sel: RegExp) => sel.exec(h)?.[1];
const unescape = (s: string) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

describe("dialog()", () => {
  const d = String(dialog({ id: "rename", title: "Rename the key", body: "Body", close: "Close", actions: '<b>x</b>' }));

  test("a native dialog, labelled by its h2, with the close button first and focused", () => {
    expect(d).toMatch(/^<dialog class="dialog" id="rename" aria-labelledby="rename-title"><h2 class="dialog-title" id="rename-title">Rename the key<\/h2>/);
    expect(d).toContain('<div class="dialog-actions"><button type="submit" class="ghost" form="rename-close" value="close" autofocus>Close</button>&lt;b&gt;x&lt;/b&gt;</div>');
    expect(d).toMatch(/<form method="dialog" id="rename-close"><\/form><\/dialog>$/);
    expect(d).not.toContain("role=");
  });

  test("as the fallback page it is a section with an h1, and close is a link back", () => {
    const p = String(dialog({ id: "x", title: "T", body: "B", close: "Back", alert: true, page: { closeHref: "javascript:alert(1)" } }));
    expect(p).toMatch(/^<section class="dialog dialog-page" id="x" aria-labelledby="x-title"><h1 class="dialog-title" id="x-title">T<\/h1>/);
    expect(p).toContain('<a class="button ghost" href="#" autofocus>Back</a>');
    expect(p).not.toContain("<dialog");
    expect(p).not.toContain('method="dialog"');
    expect(p).not.toContain("alertdialog");
  });

  test("the trigger is a link to the fallback page that names its dialog", () => {
    expect(String(dialogTrigger({ dialog: "delete-site", href: "/delete", label: "Delete site", variant: "danger" }))).toBe('<a class="button danger" href="/delete" data-dialog-open="delete-site">Delete site</a>');
  });

  test("the script tag carries only a clean nonce", () => {
    const s = String(dialogScript('abc"><x'));
    expect(s).toMatch(/^<script nonce="abcx">/);
    expect(s).toContain("showModal()");
  });
});

describe("confirmDestructive()", () => {
  const h = String(confirmDestructive(SITE));

  test("an alertdialog described by what is lost", () => {
    expect(h).toMatch(/^<dialog class="dialog" id="delete-site" role="alertdialog" aria-labelledby="delete-site-title" aria-describedby="delete-site-body">/);
    expect(h).toContain('<h2 class="dialog-title" id="delete-site-title">Delete banegaarden.dk?</h2>');
    expect(h).toContain('<div class="dialog-body" id="delete-site-body"><p>This removes 181 pages, 4 forms and 62 redirects. The domain stops answering at once. <strong>It can&#39;t be undone.</strong></p>');
  });

  test("Keep closes through form method=dialog; the confirm is a POST with the CSRF field", () => {
    expect(h).toContain('<form method="dialog" id="delete-site-close"></form>');
    expect(h).toContain('<form class="dialog-form" method="post" action="/o/bager-hansen/sites/banegaarden.dk/delete"><input type="hidden" name="csrf" value="tok-123">');
    // Keep is first in the footer, in focus; the destructive button is after it, in danger.
    expect(h).toContain('<div class="dialog-actions"><button type="submit" class="ghost" form="delete-site-close" value="close" autofocus>Keep site</button><button class="danger" type="submit">Delete site</button></div>');
    expect(h.match(/autofocus/g)).toHaveLength(1);
    expect(h.indexOf("Keep site")).toBeLessThan(h.indexOf("Delete site</button>"));
  });

  test("the name field: required, the exact name as its pattern, nothing helping the typing", () => {
    const input = /<input id="delete-site-name"[^>]*>/.exec(h)![0];
    expect(input).toContain(' name="confirm" required ');
    expect(input).toContain('autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false"');
    expect(attr(input, /pattern="([^"]*)"/)).toBe("banegaarden\\.dk");
    expect(h).toContain('<label for="delete-site-name">Type <b>banegaarden.dk</b> to confirm</label>');
  });

  test("the pattern matches the name alone, compiled as a browser does (v flag, anchored)", () => {
    for (const name of ["banegaarden.dk", 'Bob\'s "<site>" & co', "a(b)[c]{d}|e^$*+?/\\f-g"]) {
      const out = String(confirmDestructive({ ...SITE, confirmName: name }));
      const pattern = unescape(attr(out, /pattern="([^"]*)"/)!);
      expect(pattern).toBe(regexEscape(name));
      const re = new RegExp(`^(?:${pattern})$`, "v");
      expect(re.test(name)).toBe(true);
      expect(re.test(name + "x")).toBe(false);
      expect(re.test(name.toUpperCase() === name ? name.toLowerCase() : name.toUpperCase())).toBe(false);
    }
    expect(regexEscape("banegaarden.dk")).not.toBe("banegaarden.dk");
  });

  test("a name with quotes and < is escaped in the pattern, the label and the title", () => {
    const evil = `x" onfocus="alert(1)<script>`;
    const out = String(confirmDestructive({ ...SITE, title: evil, confirmName: evil, losses: [evil], text: evil, fields: { [evil]: evil }, action: evil, keepLabel: evil, confirmLabel: evil }));
    expect(out).not.toContain("<script>");
    expect(out).not.toContain('" onfocus="');
    expect(out).not.toMatch(/="[^"]*"[^ >\/]/);
    expect(attr(out, /pattern="([^"]*)"/)).toBe("x&quot; onfocus=&quot;alert\\(1\\)&lt;script&gt;");
    expect(out).toContain("<b>x&quot; onfocus=&quot;alert(1)&lt;script&gt;</b>");
  });

  test("Danish words", () => {
    const da = String(confirmDestructive({ ...SITE, lang: "da", title: "Slet banegaarden.dk?", losses: ["181 sider", "4 formularer", "62 omdirigeringer"], text: "Domænet holder op med at svare med det samme.", keepLabel: undefined, confirmLabel: "Slet hjemmesiden" }));
    expect(da).toContain("<p>Det fjerner 181 sider, 4 formularer og 62 omdirigeringer. Domænet holder op med at svare med det samme. <strong>Det kan ikke fortrydes.</strong></p>");
    expect(da).toContain(">Behold</button>");
    expect(da).toContain("Skriv <b>banegaarden.dk</b> for at bekræfte");
    expect(da).toContain('title="Skriv banegaarden.dk præcis, som det står."');
  });

  test("English default Keep, one loss, many losses as a list, no name field without confirmName", () => {
    const one = String(confirmDestructive({ lang: "en", id: "k", title: "Revoke the key?", losses: ["1 key"], action: "/k", confirmLabel: "Revoke key" }));
    expect(one).toContain("<p>This removes 1 key.</p>");
    expect(one).toContain(">Keep</button>");
    expect(one).not.toContain("<input id=");
    const many = String(confirmDestructive({ ...SITE, losses: ["a", "b", "c", "d", "e"] }));
    expect(many).toContain('<p>This removes:</p><ul class="dialog-losses"><li>a</li><li>b</li><li>c</li><li>d</li><li>e</li></ul><p>The domain stops answering at once. <strong>');
  });

  test("the fallback page keeps the POST, the field and the CSRF token; Keep links back", () => {
    const p = String(confirmDestructive({ ...SITE, page: { keepHref: "/o/bager-hansen/sites/banegaarden.dk" } }));
    expect(p).toMatch(/^<section class="dialog dialog-page" id="delete-site" aria-labelledby="delete-site-title"><h1/);
    expect(p).toContain('<a class="button ghost" href="/o/bager-hansen/sites/banegaarden.dk" autofocus>Keep site</a><button class="danger" type="submit">Delete site</button>');
    expect(p).toContain('<input type="hidden" name="csrf" value="tok-123">');
    expect(p).toContain('pattern="banegaarden\\.dk"');
  });
});

describe("React wrappers draw the helpers' bytes", () => {
  test.each([
    ["dialog", { id: "rename", title: "Rename", body: "<b>", close: "Close" }],
    ["fallback page", { id: "rename", title: "Rename", body: "B", close: "Back", page: { closeHref: "/" } }],
  ] as const)("Dialog, %s", (_, o) => {
    expect(renderToStaticMarkup(createElement(Dialog, o))).toBe(String(dialog(o)));
  });

  test.each([SITE, { ...SITE, lang: "da" as const, confirmName: `a"<b>'c` }, { ...SITE, page: { keepHref: "/back" } }])("ConfirmDestructive %#", (o) => {
    expect(renderToStaticMarkup(createElement(ConfirmDestructive, o))).toBe(String(confirmDestructive(o)));
  });
});

// Connect an agent (D-19, hub D-102): the hub's copy, interactive sign-in first, no key outside the
// folded "Automation and CI", tabs with no script, and the React wrapper drawing the same markup.

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { CONNECT_CLIENTS, CONNECT_SCRIPT, connectPanel, connectScript, connectServerName, cursorInstallUrl, type ConnectPanelOptions } from "../src/connect.ts";
import { ConnectAgent } from "../src/react.ts";

const base: ConnectPanelOptions = {
  lang: "da",
  product: "sitespring",
  org: { slug: "noon", name: "Noon" },
  mcpUrl: "https://mcp.sitespring.app/mcp",
};
const withKeys: ConnectPanelOptions = { ...base, keysHref: "https://account.forspring.ai/o/noon/agents?product=sitespring", createKey: { action: "/o/noon/keys", fields: { csrf: "t0k" } } };

// The panel's text with tags dropped and entities decoded, for comparing with the hub's sentences.
const text = (h: string) => h.replace(/<[^>]+>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
// Everything before the folded section: the title, the lede and the four tabs.
const defaultTabs = (h: string) => h.slice(0, h.indexOf('<details class="connect-ci">') >>> 0);

describe("the Danish copy (agent-connect-plan.md section 2)", () => {
  const out = String(connectPanel(withKeys));
  const t = text(out);

  test("title and lede", () => {
    expect(out).toContain('<section class="connect" aria-labelledby="connect-title"><h2 id="connect-title">Forbind en agent</h2>');
    expect(t).toContain("Giv Claude, Cursor eller en anden agent adgang til SiteSpring i Noon. Du logger ind med din Forspring-konto og godkender i browseren. Der er ingen nøgle at kopiere, og du kan altid afbryde forbindelsen igen.");
  });

  test("Claude Code: add with --scope user, no header, then /mcp; headless with claude mcp login", () => {
    expect(t).toContain("Kør i din terminal:");
    expect(out).toContain("<pre><code>claude mcp add --transport http --scope user sitespring https://mcp.sitespring.app/mcp</code></pre>");
    expect(t).toContain("Skriv derefter /mcp i Claude Code, vælg sitespring og Authenticate. Log ind, og godkend Noon.");
    expect(t).toContain("På en server uden browser: kør claude mcp login sitespring, åbn linket på en anden enhed, og indsæt adressen, du ender på.");
    expect(out).toContain('<i lang="en">Authenticate</i>');
  });

  test("Claude.ai: three steps and the Team and Enterprise note", () => {
    expect(t).toContain("Åbn Customize → Connectors, og vælg Add custom connector.");
    expect(t).toContain("Navn: SiteSpring. Adresse:");
    expect(t).toContain("Klik Add.");
    expect(t).toContain("Klik Connect, log ind med Forspring, og godkend Noon.");
    expect(t).toContain("På Team og Enterprise tilføjer en ejer forbindelsen under Organization settings → Connectors. Derefter klikker hver person på Connect.");
  });

  test("other clients: the address, OAuth, and Cursor's deeplink", () => {
    expect(t).toContain("Cursor, VS Code, Codex og andre");
    expect(t).toContain("Serveradresse:");
    expect(t).toContain("Klienter, der understøtter OAuth, logger selv ind: tilføj adressen, og godkend i browseren.");
    expect(out).toContain(`<a class="button ghost small" href="${cursorInstallUrl("sitespring", base.mcpUrl).replace(/&/g, "&amp;")}">Tilføj til Cursor</a>`);
  });

  test("CLI: install and auth login, and how the org is named", () => {
    expect(out).toContain("<pre><code>curl -fsSL https://sitespring.app/install.sh | sh</code></pre>");
    expect(out).toContain("<pre><code>sitespring auth login</code></pre>");
    expect(t).toContain("CLI'en viser en kode og et link. Åbn linket på en hvilken som helst enhed, og godkend. Det virker også over SSH og i en container. Organisationen vælges med --org noon, SITESPRING_ORG eller en .forspring.json.");
  });

  test("Automation and CI: folded, the key's reach, the form, header and variable, the link", () => {
    expect(out).toContain('<details class="connect-ci"><summary>Automatisering og CI</summary>');
    expect(out).not.toContain('<details class="connect-ci" open');
    expect(t).toContain("Til et CI-job eller en agent, der kører uden en person til stede. En nøgle handler som dig i Noon, højst som admin, indtil du tilbagekalder den. Brug login ovenfor, når en person er til stede.");
    expect(out).toContain('<form class="connect-key" method="post" action="/o/noon/keys"><input type="hidden" name="csrf" value="t0k"><label for="connect-key-name">Navngiv nøglen</label>');
    expect(out).toContain('placeholder="fx GitHub Actions"><button type="submit" class="small">Opret en nøgle</button>');
    expect(t).toContain("MCP: Authorization: Bearer <nøgle> · CLI: export SITESPRING_API_KEY=<nøgle>");
    expect(out).toContain('<a class="go" href="https://account.forspring.ai/o/noon/agents?product=sitespring">Se og tilbagekald alle agenter i Noon</a>');
  });
});

describe("the English copy", () => {
  const t = text(String(connectPanel({ ...withKeys, lang: "en" })));
  test("every sentence", () => {
    for (const s of [
      "Connect an agent",
      "Give Claude, Cursor or another agent access to SiteSpring in Noon. You sign in with your Forspring account and approve in your browser. There is no key to copy, and you can disconnect at any time.",
      "Run in your terminal:",
      "Then type /mcp in Claude Code, pick sitespring and Authenticate. Sign in and approve Noon.",
      "On a server with no browser: run claude mcp login sitespring, open the link on another device, and paste back the address you land on.",
      "Open Customize → Connectors and choose Add custom connector.",
      "Name: SiteSpring. URL:",
      "Click Connect, sign in with Forspring and approve Noon.",
      "On Team and Enterprise an owner adds it under Organization settings → Connectors, then each person clicks Connect.",
      "Other clients",
      "Cursor, VS Code, Codex and others",
      "Server address:",
      "Clients that support OAuth sign in by themselves: add the address and approve in your browser.",
      "Add to Cursor",
      "The CLI prints a code and a link. Open the link on any device and approve. It works over SSH and in containers too. Name the org with --org noon, SITESPRING_ORG or a .forspring.json.",
      "Automation and CI",
      "For a CI job or an agent that runs with no person present. A key acts as you in Noon, at most as admin, until you revoke it. When a person is present, use the sign-in above.",
      "Name the key",
      "Create a key",
      "MCP: Authorization: Bearer <key> · CLI: export SITESPRING_API_KEY=<key>",
      "See and revoke every agent in Noon",
    ])
      expect(t).toContain(s);
  });
});

describe("interactive first (hub D-102)", () => {
  test("the default tabs show no key, no key placeholder, no header and no ?org=", () => {
    for (const lang of ["da", "en"] as const) {
      const tabs = text(defaultTabs(String(connectPanel({ ...withKeys, lang }))));
      expect(tabs).not.toMatch(/Bearer|Authorization|API_KEY|<nøgle>|<key>|_YOUR_KEY|--header|\?org=/);
    }
  });

  test("with neither keysHref nor createKey the folded section is left out", () => {
    expect(String(connectPanel(base))).not.toContain("connect-ci");
    expect(String(connectPanel({ ...base, keysHref: "/keys" }))).toContain("connect-ci");
    expect(String(connectPanel({ ...base, keysHref: "/keys" }))).not.toContain("<form");
  });
});

describe("names, tabs and markup", () => {
  test("the server's name is the CLI's, or <cli>-<org> with several orgs", () => {
    expect(connectServerName("sitespring", "noon")).toBe("sitespring");
    expect(connectServerName("sitespring", "noon", true)).toBe("sitespring-noon");
    const out = String(connectPanel({ ...base, multiOrg: true }));
    expect(out).toContain("claude mcp add --transport http --scope user sitespring-noon https://mcp.sitespring.app/mcp");
    expect(out).toContain("<code>claude mcp login sitespring-noon</code>");
  });

  test("cliName and installUrl override the product's; the variables follow the CLI's name", () => {
    const out = String(connectPanel({ ...withKeys, product: "pulsespring", cliName: "pulse-spring", installUrl: "https://get.example.com/i.sh", mcpUrl: "https://pulsespring.app/mcp" }));
    expect(out).toContain("curl -fsSL https://get.example.com/i.sh | sh");
    expect(out).toContain("pulse-spring auth login");
    expect(out).toContain("PULSE_SPRING_ORG");
    expect(out).toContain("PULSE_SPRING_API_KEY");
    expect(out).toContain("adgang til PulseSpring i Noon");
  });

  test("Cursor's deeplink carries the URL as base64 JSON, and nothing else", () => {
    const u = new URL(cursorInstallUrl("sitespring-noon", "https://mcp.sitespring.app/mcp/o/noon"));
    expect(u.protocol).toBe("cursor:");
    expect(u.searchParams.get("name")).toBe("sitespring-noon");
    expect(JSON.parse(atob(u.searchParams.get("config")!))).toEqual({ url: "https://mcp.sitespring.app/mcp/o/noon" });
  });

  test("four tabs as radios in a labelled group, Claude Code open by default, each panel with a heading", () => {
    const out = String(connectPanel(base));
    expect(out).toContain('<fieldset class="connect-choose"><legend class="visually-hidden">Vælg din klient</legend>');
    for (const c of CONNECT_CLIENTS) {
      expect(out).toContain(`name="connect-client" id="connect-${c}" value="${c}"`);
      expect(out).toContain(`<label for="connect-${c}">`);
      expect(out).toContain(`<div class="connect-panel connect-${c}"><h3>`);
    }
    expect(out.match(/ checked>/g)).toHaveLength(1);
    expect(out).toContain('value="claude-code" checked>');
    expect(String(connectPanel({ ...base, open: "cli" }))).toContain('value="cli" checked>');
  });

  test("id prefixes every id and the group's name, so two panels can share a page", () => {
    const out = String(connectPanel({ ...withKeys, id: "ds" }));
    expect(out).toContain('aria-labelledby="ds-title"');
    expect(out).toContain('name="ds-client" id="ds-cli"');
    expect(out).toContain('<label for="ds-key-name">');
    expect(out).not.toMatch(/"connect-(title|client|cli|key-name)"/);
  });

  test("headingLevel 1 makes the title the h1 and the clients h2", () => {
    const out = String(connectPanel({ ...base, headingLevel: 1 }));
    expect(out).toContain('<h1 id="connect-title">Forbind en agent</h1>');
    expect(out).toContain('<div class="connect-panel connect-cli"><h2>CLI</h2>');
  });

  test("copy buttons name what they copy, and a status region announces it", () => {
    const out = String(connectPanel(base));
    expect(out).toContain('<button type="button" class="ghost small connect-copy"><span class="copy-label">Kopiér<span class="visually-hidden"> kommandoen</span></span><span class="copy-done">Kopieret</span></button>');
    expect(out).toContain("<span class=\"visually-hidden\"> adressen</span>");
    expect(out).toContain('<p class="visually-hidden" role="status" data-copy-status></p>');
  });

  test("everything is escaped; a javascript: keys link is neutralised", () => {
    const evil = `<script>alert("x")</script>&'`;
    const out = String(connectPanel({ ...base, org: { slug: evil, name: evil }, mcpUrl: `https://x/${evil}`, keysHref: "javascript:alert(1)" }));
    expect(out).not.toContain("<script>");
    expect(out).toContain("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;&amp;&#39;");
    expect(out).toContain('<a class="go" href="#">');
  });
});

describe("the copy script", () => {
  test("is a tag with the nonce, and the nonce cannot break out of its attribute", () => {
    expect(String(connectScript())).toBe(`<script>${CONNECT_SCRIPT}</script>`);
    expect(String(connectScript("abc+/="))).toMatch(/^<script nonce="abc\+\/=">/);
    expect(String(connectScript('x" onload="y'))).toMatch(/^<script nonce="xonload=y">/);
  });

  test("needs a secure clipboard, marks the page, and copies the code beside the button", () => {
    expect(CONNECT_SCRIPT).toContain("navigator.clipboard");
    expect(CONNECT_SCRIPT).toContain("isSecureContext");
    expect(CONNECT_SCRIPT).toContain('setAttribute("data-forspring-copy", "")');
    expect(CONNECT_SCRIPT).toContain('closest(".connect-code")');
    expect(CONNECT_SCRIPT).not.toContain("</script");
  });
});

describe("React", () => {
  test("ConnectAgent renders connectPanel's markup exactly", () => {
    for (const o of [base, withKeys, { ...withKeys, lang: "en" as const, multiOrg: true, open: "other" as const, headingLevel: 1 as const }])
      expect(renderToStaticMarkup(createElement(ConnectAgent, o))).toBe(String(connectPanel(o)));
  });
});

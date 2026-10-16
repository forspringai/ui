// "Connect an agent" (hub D-102, docs/agent-connect-plan.md section 2): the one panel every product,
// and later the account's Agents page, shows for connecting Claude Code, Claude.ai, other MCP clients
// and the CLI. Interactive sign-in first: the default tabs never show a key or a key placeholder; keys
// sit in a folded "Automation and CI" section (D-19). The words are the package's, Danish and English,
// so the products cannot drift apart again, which is how SiteSpring's panel came to lead with a key.
//
// No script needed: the tabs are radio buttons, and CSS shows the chosen client's panel with :has()
// (a browser without :has() shows every panel, each under its heading). The copy buttons are
// progressive enhancement: they stay hidden until CONNECT_SCRIPT has run, and with no script the
// commands are selectable text, one click selecting the whole command.

import { esc, html, PRODUCT_NAMES, raw, safeHref, type Html, type Lang, type Product } from "./html.ts";

/** The four tabs, in their order. */
export const CONNECT_CLIENTS = ["claude-code", "claude-ai", "other", "cli"] as const;
export type ConnectClient = (typeof CONNECT_CLIENTS)[number];

export type ConnectPanelOptions = {
  lang: Lang;
  /** The product the agent connects to; its name comes from PRODUCT_NAMES unless `productName` is set. */
  product: Product;
  productName?: string;
  /** The organisation: its slug for `--org`, its name for the words. */
  org: { slug: string; name: string };
  /** The MCP server's URL, as the client should store it. The bare /mcp until the product serves
   *  /mcp/o/<org> (hub D-99 item 2); never with ?org=, which strict OAuth discovery refuses. */
  mcpUrl: string;
  /** The CLI's command, and the stem of its environment variables (SITESPRING_ORG). Default: the product key. */
  cliName?: string;
  /** The person has more than one org in this product: the MCP server's name in Claude Code and Cursor
   *  becomes <cli>-<org>, so one connection per org can sit side by side. */
  multiOrg?: boolean;
  /** The installer. Default https://<cli>.app/install.sh. */
  installUrl?: string;
  /** Where keys are made and revoked: the product's keys page now, the account's
   *  /o/<org>/agents?product=<p> after tez. With `createKey` or this, the folded "Automation and CI"
   *  section is drawn; with neither it is left out. */
  keysHref?: string;
  /** The product's own form for making a key, in the folded section: a POST to `action` with `fields`
   *  as hidden inputs (its CSRF token) and the key's name in an input called `name` (default "name"). */
  createKey?: { action: string; fields?: Record<string, string>; name?: string };
  /** The tab open at first. Default claude-code. */
  open?: ConnectClient;
  /** 1 when the panel is the page's subject (its title is the h1, the clients' headings h2); default 2. */
  headingLevel?: 1 | 2;
  /** Prefix for the ids and the radio group's name, unique on the page. Default "connect". */
  id?: string;
};

// The copy is the hub's (agent-connect-plan.md section 2), word for word. Claude's own interface
// words stay in English inside the Danish (Claude has no Danish interface), marked lang="en".
const T = {
  da: {
    title: "Forbind en agent",
    lede: (p: string, o: string) =>
      `Giv Claude, Cursor eller en anden agent adgang til ${p} i ${o}. Du logger ind med din Forspring-konto og godkender i browseren. Der er ingen nøgle at kopiere, og du kan altid afbryde forbindelsen igen.`,
    choose: "Vælg din klient",
    other: "Andre klienter",
    otherWho: "Cursor, VS Code, Codex og andre",
    run: "Kør i din terminal:",
    thenMcp: (name: Html, o: string, en: (s: string) => Html) => html`Skriv derefter <code>/mcp</code> i Claude Code, vælg <code>${name}</code> og ${en("Authenticate")}. Log ind, og godkend ${o}.`,
    headless: (cmd: Html) => html`På en server uden browser: kør ${cmd}, åbn linket på en anden enhed, og indsæt adressen, du ender på.`,
    aiOpen: (en: (s: string) => Html) => html`Åbn ${en("Customize → Connectors")}, og vælg ${en("Add custom connector")}.`,
    aiName: (p: string) => html`Navn: <b>${p}</b>. Adresse:`,
    aiAdd: (en: (s: string) => Html) => html`Klik ${en("Add")}.`,
    aiConnect: (o: string, en: (s: string) => Html) => html`Klik ${en("Connect")}, log ind med Forspring, og godkend ${o}.`,
    aiTeam: (en: (s: string) => Html) => html`På Team og Enterprise tilføjer en ejer forbindelsen under ${en("Organization settings → Connectors")}. Derefter klikker hver person på ${en("Connect")}.`,
    server: "Serveradresse:",
    oauth: "Klienter, der understøtter OAuth, logger selv ind: tilføj adressen, og godkend i browseren.",
    cursor: "Tilføj til Cursor",
    cli: (org: string, env: string) =>
      html`CLI'en viser en kode og et link. Åbn linket på en hvilken som helst enhed, og godkend. Det virker også over SSH og i en container. Organisationen vælges med <code>--org ${org}</code>, <code>${env}</code> eller en <code>.forspring.json</code>.`,
    ci: "Automatisering og CI",
    ciText: (o: string) => `Til et CI-job eller en agent, der kører uden en person til stede. En nøgle handler som dig i ${o}, højst som admin, indtil du tilbagekalder den. Brug login ovenfor, når en person er til stede.`,
    keyName: "Navngiv nøglen",
    keyNameExample: "fx GitHub Actions",
    createKey: "Opret en nøgle",
    key: "nøgle",
    keys: (o: string) => `Se og tilbagekald alle agenter i ${o}`,
    copy: "Kopiér",
    copied: "Kopieret",
    theCommand: "kommandoen",
    theAddress: "adressen",
  },
  en: {
    title: "Connect an agent",
    lede: (p: string, o: string) =>
      `Give Claude, Cursor or another agent access to ${p} in ${o}. You sign in with your Forspring account and approve in your browser. There is no key to copy, and you can disconnect at any time.`,
    choose: "Choose your client",
    other: "Other clients",
    otherWho: "Cursor, VS Code, Codex and others",
    run: "Run in your terminal:",
    thenMcp: (name: Html, o: string, en: (s: string) => Html) => html`Then type <code>/mcp</code> in Claude Code, pick <code>${name}</code> and ${en("Authenticate")}. Sign in and approve ${o}.`,
    headless: (cmd: Html) => html`On a server with no browser: run ${cmd}, open the link on another device, and paste back the address you land on.`,
    aiOpen: (en: (s: string) => Html) => html`Open ${en("Customize → Connectors")} and choose ${en("Add custom connector")}.`,
    aiName: (p: string) => html`Name: <b>${p}</b>. URL:`,
    aiAdd: (en: (s: string) => Html) => html`Click ${en("Add")}.`,
    aiConnect: (o: string, en: (s: string) => Html) => html`Click ${en("Connect")}, sign in with Forspring and approve ${o}.`,
    aiTeam: (en: (s: string) => Html) => html`On Team and Enterprise an owner adds it under ${en("Organization settings → Connectors")}, then each person clicks ${en("Connect")}.`,
    server: "Server address:",
    oauth: "Clients that support OAuth sign in by themselves: add the address and approve in your browser.",
    cursor: "Add to Cursor",
    cli: (org: string, env: string) =>
      html`The CLI prints a code and a link. Open the link on any device and approve. It works over SSH and in containers too. Name the org with <code>--org ${org}</code>, <code>${env}</code> or a <code>.forspring.json</code>.`,
    ci: "Automation and CI",
    ciText: (o: string) => `For a CI job or an agent that runs with no person present. A key acts as you in ${o}, at most as admin, until you revoke it. When a person is present, use the sign-in above.`,
    keyName: "Name the key",
    keyNameExample: "e.g. GitHub Actions",
    createKey: "Create a key",
    key: "key",
    keys: (o: string) => `See and revoke every agent in ${o}`,
    copy: "Copy",
    copied: "Copied",
    theCommand: "the command",
    theAddress: "the address",
  },
};

/** The MCP server's name in Claude Code and Cursor: the CLI's name, or <cli>-<org> with several orgs. */
export function connectServerName(cliName: string, org: string, multiOrg?: boolean): string {
  return multiOrg ? `${cliName}-${org}` : cliName;
}

/** Cursor's documented install deeplink for a remote MCP server (no key in it). */
export function cursorInstallUrl(name: string, mcpUrl: string): string {
  const config = btoa(JSON.stringify({ url: mcpUrl }));
  return `cursor://anysphere.cursor-deeplink/mcp/install?name=${encodeURIComponent(name)}&config=${encodeURIComponent(config)}`;
}

/** The panel. Draw it in a page that loads components.css; add connectScript() once for copy buttons. */
export function connectPanel(o: ConnectPanelOptions): Html {
  const t = T[o.lang];
  const id = o.id ?? "connect";
  const product = o.productName ?? PRODUCT_NAMES[o.product];
  const cli = o.cliName ?? o.product;
  const env = cli.toUpperCase().replace(/[^A-Z0-9]/g, "_");
  const name = connectServerName(cli, o.org.slug, o.multiOrg);
  const install = o.installUrl ?? `https://${cli}.app/install.sh`;
  const open = o.open ?? "claude-code";
  const level = o.headingLevel ?? 2;
  const heading = (n: number, text: string, hid?: string) => raw(`<h${n}${hid ? ` id="${esc(hid)}"` : ""}>${esc(text)}</h${n}>`);
  // Claude's interface words, which stay English in the Danish copy.
  const en = (s: string): Html => (o.lang === "da" ? html`<i lang="en">${s}</i>` : html`<i>${s}</i>`);

  const copy = (what: string) =>
    html`<button type="button" class="ghost small connect-copy"><span class="copy-label">${t.copy}<span class="visually-hidden"> ${what}</span></span><span class="copy-done">${t.copied}</span></button>`;
  const block = (text: string, what = t.theCommand) => html`<div class="connect-code"><pre><code>${text}</code></pre>${copy(what)}</div>`;

  const labels: Record<ConnectClient, string> = { "claude-code": "Claude Code", "claude-ai": "Claude.ai", other: t.other, cli: "CLI" };
  const panels: Record<ConnectClient, Html> = {
    "claude-code": html`<p>${t.run}</p>${block(`claude mcp add --transport http --scope user ${name} ${o.mcpUrl}`)}<p>${t.thenMcp(html`${name}`, o.org.name, en)}</p><p>${t.headless(html`<code>claude mcp login ${name}</code>`)}</p>`,
    "claude-ai": html`<ol class="connect-steps"><li>${t.aiOpen(en)}</li><li><p>${t.aiName(product)}</p>${block(o.mcpUrl, t.theAddress)}<p>${t.aiAdd(en)}</p></li><li>${t.aiConnect(o.org.name, en)}</li></ol><p>${t.aiTeam(en)}</p>`,
    // The deeplink is our own scheme and our own escaped values, so it skips safeHref, which allows
    // only http(s) and mailto.
    other: html`<p class="connect-who">${t.otherWho}</p><p>${t.server}</p>${block(o.mcpUrl, t.theAddress)}<p>${t.oauth}</p><p><a class="button ghost small" href="${cursorInstallUrl(name, o.mcpUrl)}">${t.cursor}</a></p>`,
    cli: html`${block(`curl -fsSL ${install} | sh`)}${block(`${cli} auth login`)}<p>${t.cli(o.org.slug, `${env}_ORG`)}</p>`,
  };

  const radios = CONNECT_CLIENTS.map(
    (c) => html`<input type="radio" class="visually-hidden" name="${`${id}-client`}" id="${`${id}-${c}`}" value="${c}"${raw(c === open ? " checked" : "")}><label for="${`${id}-${c}`}">${labels[c]}</label>`,
  );
  const tabs = CONNECT_CLIENTS.map((c) => html`<div class="${`connect-panel connect-${c}`}">${heading(level + 1, labels[c])}${panels[c]}</div>`);

  let ci: Html | string = "";
  if (o.keysHref || o.createKey) {
    const k = o.createKey;
    const fields = Object.entries(k?.fields ?? {}).map(([n, v]) => html`<input type="hidden" name="${n}" value="${v}">`);
    const form = k
      ? html`<form class="connect-key" method="post" action="${safeHref(k.action)}">${fields}<label for="${`${id}-key-name`}">${t.keyName}</label><span class="toolbar"><input class="small" id="${`${id}-key-name`}" name="${k.name ?? "name"}" type="text" autocomplete="off" required placeholder="${t.keyNameExample}"><button type="submit" class="small">${t.createKey}</button></span></form>`
      : "";
    const link = o.keysHref ? html`<p><a class="go" href="${safeHref(o.keysHref)}">${t.keys(o.org.name)}</a></p>` : "";
    ci = html`<details class="connect-ci"><summary>${t.ci}</summary><div class="connect-ci-body"><p>${t.ciText(o.org.name)}</p>${form}<p class="connect-env">MCP: <code>Authorization: Bearer &lt;${t.key}&gt;</code> · CLI: <code>export ${env}_API_KEY=&lt;${t.key}&gt;</code></p>${link}</div></details>`;
  }

  return html`<section class="connect" aria-labelledby="${`${id}-title`}">${heading(level, t.title, `${id}-title`)}<p class="connect-lede">${t.lede(product, o.org.name)}</p><div class="connect-tabs"><fieldset class="connect-choose"><legend class="visually-hidden">${t.choose}</legend>${radios}</fieldset>${tabs}</div>${ci}<p class="visually-hidden" role="status" data-copy-status></p></section>`;
}

/**
 * The copy buttons' script, as text: put it on the page once (connectScript(nonce) writes the tag),
 * or bundle it. It needs the async clipboard (a secure context); without it the buttons stay hidden
 * and the commands stay selectable text. It listens on the document, so panels drawn later (React)
 * get working buttons too, and it names nothing outside .connect.
 */
export const CONNECT_SCRIPT = `(() => {
  if (!navigator.clipboard || !window.isSecureContext) return;
  document.documentElement.setAttribute("data-forspring-copy", "");
  document.addEventListener("click", (e) => {
    const b = e.target instanceof Element ? e.target.closest(".connect-copy") : null;
    const code = b && b.closest(".connect-code")?.querySelector("code");
    if (!code) return;
    navigator.clipboard.writeText(code.textContent).then(() => {
      b.setAttribute("data-copied", "");
      clearTimeout(b._copied);
      b._copied = setTimeout(() => b.removeAttribute("data-copied"), 2000);
      const status = b.closest(".connect")?.querySelector("[data-copy-status]");
      if (status) {
        status.textContent = "";
        setTimeout(() => (status.textContent = b.querySelector(".copy-done").textContent), 50);
      }
    });
  });
})();`;

/** CONNECT_SCRIPT in a <script> tag, with the page's CSP nonce when it has one. */
export function connectScript(nonce?: string): Html {
  return html`<script${raw(nonce ? ` nonce="${nonce.replace(/[^A-Za-z0-9+/=_-]/g, "")}"` : "")}>${raw(CONNECT_SCRIPT)}</script>`;
}

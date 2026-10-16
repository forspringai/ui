import { type Html, type Lang, type Product } from "./html.ts";
/** The four tabs, in their order. */
export declare const CONNECT_CLIENTS: readonly ["claude-code", "claude-ai", "other", "cli"];
export type ConnectClient = (typeof CONNECT_CLIENTS)[number];
export type ConnectPanelOptions = {
    lang: Lang;
    /** The product the agent connects to; its name comes from PRODUCT_NAMES unless `productName` is set. */
    product: Product;
    productName?: string;
    /** The organisation: its slug for `--org`, its name for the words. */
    org: {
        slug: string;
        name: string;
    };
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
    createKey?: {
        action: string;
        fields?: Record<string, string>;
        name?: string;
    };
    /** The tab open at first. Default claude-code. */
    open?: ConnectClient;
    /** 1 when the panel is the page's subject (its title is the h1, the clients' headings h2); default 2. */
    headingLevel?: 1 | 2;
    /** Prefix for the ids and the radio group's name, unique on the page. Default "connect". */
    id?: string;
};
/** The MCP server's name in Claude Code and Cursor: the CLI's name, or <cli>-<org> with several orgs. */
export declare function connectServerName(cliName: string, org: string, multiOrg?: boolean): string;
/** Cursor's documented install deeplink for a remote MCP server (no key in it). */
export declare function cursorInstallUrl(name: string, mcpUrl: string): string;
/** The panel. Draw it in a page that loads components.css; add connectScript() once for copy buttons. */
export declare function connectPanel(o: ConnectPanelOptions): Html;
/**
 * The copy buttons' script, as text: put it on the page once (connectScript(nonce) writes the tag),
 * or bundle it. It needs the async clipboard (a secure context); without it the buttons stay hidden
 * and the commands stay selectable text. It listens on the document, so panels drawn later (React)
 * get working buttons too, and it names nothing outside .connect.
 */
export declare const CONNECT_SCRIPT = "(() => {\n  if (!navigator.clipboard || !window.isSecureContext) return;\n  document.documentElement.setAttribute(\"data-forspring-copy\", \"\");\n  document.addEventListener(\"click\", (e) => {\n    const b = e.target instanceof Element ? e.target.closest(\".connect-copy\") : null;\n    const code = b && b.closest(\".connect-code\")?.querySelector(\"code\");\n    if (!code) return;\n    navigator.clipboard.writeText(code.textContent).then(() => {\n      b.setAttribute(\"data-copied\", \"\");\n      clearTimeout(b._copied);\n      b._copied = setTimeout(() => b.removeAttribute(\"data-copied\"), 2000);\n      const status = b.closest(\".connect\")?.querySelector(\"[data-copy-status]\");\n      if (status) {\n        status.textContent = \"\";\n        setTimeout(() => (status.textContent = b.querySelector(\".copy-done\").textContent), 50);\n      }\n    });\n  });\n})();";
/** CONNECT_SCRIPT in a <script> tag, with the page's CSP nonce when it has one. */
export declare function connectScript(nonce?: string): Html;

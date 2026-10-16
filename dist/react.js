// React wrappers for rich apps (DataSpring's boards, AppSpring): the bar and the standard pages as
// components, drawing exactly the markup of the server-rendered helpers (D-17), so the two can never
// drift. Each one renders the helper's outer element with its inner HTML as dangerouslySetInnerHTML:
// the helpers escape everything they are given, so nothing a person wrote reaches the DOM as markup.
// The menus are details elements and the links plain links, so the bar needs no event handlers.
//
// React is an optional peer dependency; nothing else is imported at run time. No JSX, so this file
// needs no React build step of its own.
import { createElement } from "react";
import { bar } from "./html.js";
import { connectPanel } from "./connect.js";
import { accountUnavailablePage, chooseOrgPage, noOrgPage, refusedPage } from "./pages.js";
const UNESCAPE = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'" };
const unescape = (s) => s.replace(/&(amp|lt|gt|quot|#39);/g, (e) => UNESCAPE[e]);
/** Html with one outer element, as a React element: its attributes as props, the rest as inner HTML. */
export function fromHtml(h, key) {
    const m = /^<([a-z][a-z0-9-]*)((?:\s[a-z][a-z0-9-]*="[^"]*")*)>([\s\S]*)<\/\1>$/.exec(String(h));
    if (!m)
        throw new Error("fromHtml: expected a single element");
    const props = { dangerouslySetInnerHTML: { __html: m[3] } };
    if (key !== undefined)
        props.key = key;
    for (const a of m[2].matchAll(/\s([a-z][a-z0-9-]*)="([^"]*)"/g))
        props[a[1] === "class" ? "className" : a[1]] = unescape(a[2]);
    return createElement(m[1], props);
}
/** The bar: wordmark, org switcher, product switcher, user menu (bar() in @forspring/ui/html). */
export const Bar = (props) => fromHtml(bar(props));
/** Choose an organization (chooseOrgPage). The app sets the response status itself, if it has one. */
export const ChooseOrg = (props) => fromHtml(chooseOrgPage(props).body);
/** No organization yet (noOrgPage). */
export const NoOrg = (props) => fromHtml(noOrgPage(props).body);
/** A refusal by its reason (refusedPage). */
export const Refused = (props) => fromHtml(refusedPage(props).body);
/** The account not answering (accountUnavailablePage). */
export const AccountUnavailable = (props) => fromHtml(accountUnavailablePage(props).body);
/** Connect an agent (connectPanel in @forspring/ui/connect, D-19). The tabs need no handlers; for the
 *  copy buttons, put connectScript() (or CONNECT_SCRIPT) on the page once: it listens on the document,
 *  so it works for panels React draws after it has run. */
export const ConnectAgent = (props) => fromHtml(connectPanel(props));

// React wrappers for rich apps (DataSpring's boards, AppSpring): the bar and the standard pages as
// components, drawing exactly the markup of the server-rendered helpers (D-17), so the two can never
// drift. Each one renders the helper's outer element with its inner HTML as dangerouslySetInnerHTML:
// the helpers escape everything they are given, so nothing a person wrote reaches the DOM as markup.
// The menus are details elements and the links plain links, so the bar needs no event handlers.
//
// React is an optional peer dependency; nothing else is imported at run time. No JSX, so this file
// needs no React build step of its own.
import { createElement } from "react";
import { approval, bar, confirmDestructive, dialog, diff, explain, icon, pagination, table, toast, toastRegion, tooltip } from "./html.js";
import { connectPanel } from "./connect.js";
import { accountUnavailablePage, chooseOrgPage, noOrgPage, refusedPage } from "./pages.js";
const UNESCAPE = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'" };
const unescape = (s) => s.replace(/&(amp|lt|gt|quot|#39);/g, (e) => UNESCAPE[e]);
// React names a few attributes in camelCase and warns on the HTML spelling; the bytes it writes are the
// same. The stroke ones are an icon's (D-26).
const PROP = { class: "className", tabindex: "tabIndex", "stroke-width": "strokeWidth", "stroke-linecap": "strokeLinecap", "stroke-linejoin": "strokeLinejoin" };
/** Html with one outer element, as a React element: its attributes as props, the rest as inner HTML. */
export function fromHtml(h, key) {
    // Attribute names may have a capital: an svg's viewBox.
    const m = /^<([a-z][a-z0-9-]*)((?:\s[a-zA-Z][a-zA-Z0-9-]*="[^"]*")*)>([\s\S]*)<\/\1>$/.exec(String(h));
    if (!m)
        throw new Error("fromHtml: expected a single element");
    const props = { dangerouslySetInnerHTML: { __html: m[3] } };
    if (key !== undefined)
        props.key = key;
    for (const a of m[2].matchAll(/\s([a-zA-Z][a-zA-Z0-9-]*)="([^"]*)"/g))
        props[PROP[a[1]] ?? a[1]] = unescape(a[2]);
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
/** A native dialog (dialog() in @forspring/ui/html, D-23). It draws closed: put dialogScript() (or
 *  DIALOG_SCRIPT) on the page once and a trigger with data-dialog-open="<id>", or call showModal() on
 *  the element by its id. The script listens on the document, so dialogs drawn after it ran open too. */
export const Dialog = (props) => fromHtml(dialog(props));
/** The destructive-action confirm (confirmDestructive). The server checks the typed name again. */
export const ConfirmDestructive = (props) => fromHtml(confirmDestructive(props));
/** An agent's request for approval (approval() in @forspring/ui/html, D-24). Approve and reject are
 *  plain POST forms, so it needs no handlers; the product's server decides and redraws it with
 *  `outcome`. */
export const Approval = (props) => fromHtml(approval(props));
/** A change to fields or text, as the caller computed it (diff()). */
export const Diff = (props) => fromHtml(diff(props));
/** "Why Spring did this": the agent's steps in a closed details element (explain()). */
export const Explain = (props) => fromHtml(explain(props));
/** A table in its scrolling frame, with search, filters, the stated order and paging when given
 *  `controls` (table() in @forspring/ui/html, D-25). The search is a GET form and the rest are links,
 *  so it needs no handlers: the URL is the state, and the server draws the page asked for. */
export const Table = (props) => fromHtml(table(props));
/** "1–6 af 248" with Previous and Next as links (pagination()). */
export const Pagination = (props) => fromHtml(pagination(props));
/** The message after a POST and its 303 (toast() in @forspring/ui/html, D-26). Dismiss is a link to
 *  `dismissHref`; put toastScript() (or TOAST_SCRIPT) on the page for an instant dismiss and the
 *  optional auto-hide, which never hides a danger toast. */
export const Toast = (props) => fromHtml(toast(props));
/** Several toasts stacked at the bottom of the window (toastRegion()); `toasts` is Html from toast(). */
export const ToastRegion = (props) => fromHtml(toastRegion(props));
/** A button and a native popover with a short explanation (tooltip()). It needs no handlers: the
 *  browser opens it from the button. Never the only copy of something a person needs to act. */
export const Tooltip = (props) => fromHtml(tooltip(props));
/** One of the package's icons, inline SVG in currentColor (icon()); aria-hidden unless given a label. */
export const Icon = (props) => fromHtml(icon(props.name, props.label === undefined ? {} : { label: props.label }));

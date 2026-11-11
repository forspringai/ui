import { type ReactElement } from "react";
import { type ApprovalOptions, type BarOptions, type ConfirmDestructiveOptions, type DialogOptions, type DiffOptions, type ExplainOptions, type Html, type PaginationOptions, type TableOptions } from "./html.ts";
import { type ConnectPanelOptions } from "./connect.ts";
import { type ChooseOrgOptions, type NoOrgOptions, type RefusedOptions } from "./pages.ts";
/** Html with one outer element, as a React element: its attributes as props, the rest as inner HTML. */
export declare function fromHtml(h: Html, key?: string): ReactElement;
/** The bar: wordmark, org switcher, product switcher, user menu (bar() in @forspring/ui/html). */
export declare const Bar: (props: BarOptions) => ReactElement;
/** Choose an organization (chooseOrgPage). The app sets the response status itself, if it has one. */
export declare const ChooseOrg: (props: ChooseOrgOptions) => ReactElement;
/** No organization yet (noOrgPage). */
export declare const NoOrg: (props: NoOrgOptions) => ReactElement;
/** A refusal by its reason (refusedPage). */
export declare const Refused: (props: RefusedOptions) => ReactElement;
/** The account not answering (accountUnavailablePage). */
export declare const AccountUnavailable: (props: {
    lang: RefusedOptions["lang"];
    retryHref?: string;
    command?: string;
}) => ReactElement;
/** Connect an agent (connectPanel in @forspring/ui/connect, D-19). The tabs need no handlers; for the
 *  copy buttons, put connectScript() (or CONNECT_SCRIPT) on the page once: it listens on the document,
 *  so it works for panels React draws after it has run. */
export declare const ConnectAgent: (props: ConnectPanelOptions) => ReactElement;
/** A native dialog (dialog() in @forspring/ui/html, D-23). It draws closed: put dialogScript() (or
 *  DIALOG_SCRIPT) on the page once and a trigger with data-dialog-open="<id>", or call showModal() on
 *  the element by its id. The script listens on the document, so dialogs drawn after it ran open too. */
export declare const Dialog: (props: DialogOptions) => ReactElement;
/** The destructive-action confirm (confirmDestructive). The server checks the typed name again. */
export declare const ConfirmDestructive: (props: ConfirmDestructiveOptions) => ReactElement;
/** An agent's request for approval (approval() in @forspring/ui/html, D-24). Approve and reject are
 *  plain POST forms, so it needs no handlers; the product's server decides and redraws it with
 *  `outcome`. */
export declare const Approval: (props: ApprovalOptions) => ReactElement;
/** A change to fields or text, as the caller computed it (diff()). */
export declare const Diff: (props: DiffOptions) => ReactElement;
/** "Why Spring did this": the agent's steps in a closed details element (explain()). */
export declare const Explain: (props: ExplainOptions) => ReactElement;
/** A table in its scrolling frame, with search, filters, the stated order and paging when given
 *  `controls` (table() in @forspring/ui/html, D-25). The search is a GET form and the rest are links,
 *  so it needs no handlers: the URL is the state, and the server draws the page asked for. */
export declare const Table: (props: TableOptions) => ReactElement;
/** "1–6 af 248" with Previous and Next as links (pagination()). */
export declare const Pagination: (props: PaginationOptions) => ReactElement;

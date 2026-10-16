import { type ReactElement } from "react";
import { type BarOptions, type Html } from "./html.ts";
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

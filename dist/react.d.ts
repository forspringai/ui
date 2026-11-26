import { type ReactElement } from "react";
import { type ActionsOptions, type ApprovalOptions, type BarOptions, type ButtonOptions, type ChangedValueOptions, type CutoffOptions, type HoldToConfirmOptions, type ProgressOptions, type ConfirmDestructiveOptions, type DialogOptions, type DiffOptions, type ErrorSummaryOptions, type ExplainOptions, type Html, type IconName, type Lang, type PaginationOptions, type TableOptions, type ToastOptions, type TooltipOptions } from "./html.ts";
import { type ConnectPanelOptions } from "./connect.ts";
import { type ChooseOrgOptions, type NoOrgOptions, type OrgPickerOptions, type RefusedOptions } from "./pages.ts";
/** Html with one outer element, as a React element: its attributes as props, the rest as inner HTML. */
export declare function fromHtml(h: Html, key?: string): ReactElement;
/** The bar: wordmark, org switcher, product switcher, user menu (bar() in @forspring/ui/html). */
export declare const Bar: (props: BarOptions) => ReactElement;
/** Choose an organisation (chooseOrgPage). The app sets the response status itself, if it has one. */
export declare const ChooseOrg: (props: ChooseOrgOptions) => ReactElement;
/** Choose an organisation at sign-in (orgPicker): one POST form and button per org, no handlers needed. An app's
 *  in-app switcher can draw the same list. */
export declare const OrgPicker: (props: OrgPickerOptions) => ReactElement;
/** No organisation yet (noOrgPage). */
export declare const NoOrg: (props: NoOrgOptions) => ReactElement;
/** A refusal by its reason (refusedPage). */
export declare const Refused: (props: RefusedOptions) => ReactElement;
/** The account not answering (accountUnavailablePage). */
export declare const AccountUnavailable: (props: {
    lang: RefusedOptions["lang"];
    retryHref?: string;
    command?: string;
    ref?: string;
}) => ReactElement;
/** Connect an agent (connectPanel in @forspring/ui/connect, D-19). The tabs need no handlers; for the
 *  copy buttons, put connectScript() (or CONNECT_SCRIPT) on the page once: it listens on the document,
 *  so it works for panels React draws after it has run. */
export declare const ConnectAgent: (props: ConnectPanelOptions) => ReactElement;
/** An action row (actions() in @forspring/ui/html, D-41): the primary first, then the secondary ones,
 *  the destructive one apart at the far end. Give it the buttons as Html, from button() or
 *  dialogTrigger(), as ToastRegion takes its toasts. */
export declare const Actions: (props: ActionsOptions) => ReactElement;
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
/** The message after a POST and its 303 (toast() in @forspring/ui/html, D-26). Dismiss is a link to
 *  `dismissHref`; put toastScript() (or TOAST_SCRIPT) on the page for an instant dismiss and the
 *  optional auto-hide, which never hides a danger toast. */
export declare const Toast: (props: ToastOptions) => ReactElement;
/** Several toasts stacked at the bottom of the window (toastRegion()); `toasts` is Html from toast(). */
export declare const ToastRegion: (props: {
    lang: Lang;
    toasts: Html | Html[];
    label?: string;
}) => ReactElement;
/** A button and a native popover with a short explanation (tooltip()). It needs no handlers: the
 *  browser opens it from the button. Never the only copy of something a person needs to act. */
export declare const Tooltip: (props: TooltipOptions) => ReactElement;
/** One of the package's icons, inline SVG in currentColor (icon()); aria-hidden unless given a label. */
export declare const Icon: (props: {
    name: IconName;
    label?: string;
}) => ReactElement;
/** A failed submit's summary (errorSummary, D-30): it takes focus when it mounts. Nothing when there
 *  are no errors. */
export declare const ErrorSummary: (props: ErrorSummaryOptions) => ReactElement | null;
/** A button (button() in @forspring/ui/html). With `progress` it is the working-then-done button
 *  (D-53): put buttonScript() (or BUTTON_SCRIPT) on the page once, and send `ui:button-done` on the
 *  button when the work ends. */
export declare const Button: (props: ButtonOptions) => ReactElement;
/** A value that just changed (changedValue(), D-53); send `ui:changed` on a node to tint it again. */
export declare const ChangedValue: (props: ChangedValueOptions & {
    children: Html | string | number;
}) => ReactElement;
/** A danger action held for a second on a phone (holdToConfirm(), D-53); needs holdScript(). */
export declare const HoldToConfirm: (props: HoldToConfirmOptions) => ReactElement;
/** A cut-off chip (cutoff(), D-53); countdownScript() keeps it current. */
export declare const Cutoff: (props: CutoffOptions) => ReactElement;
/** An honest progress bar (progress(), D-53): empty at 0, full only at max. */
export declare const Progress: (props: ProgressOptions) => ReactElement;

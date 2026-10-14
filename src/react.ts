// React wrappers for rich apps (DataSpring's boards, AppSpring): the bar and the standard pages as
// components, drawing exactly the markup of the server-rendered helpers (D-17), so the two can never
// drift. Each one renders the helper's outer element with its inner HTML as dangerouslySetInnerHTML:
// the helpers escape everything they are given, so nothing a person wrote reaches the DOM as markup.
// The menus are details elements and the links plain links, so the bar needs no event handlers.
//
// React is an optional peer dependency; nothing else is imported at run time. No JSX, so this file
// needs no React build step of its own.

import { createElement, type ReactElement } from "react";
import { bar, type BarOptions, type Html } from "./html.ts";
import { accountUnavailablePage, chooseOrgPage, noOrgPage, refusedPage, type ChooseOrgOptions, type NoOrgOptions, type RefusedOptions } from "./pages.ts";

const UNESCAPE: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'" };
const unescape = (s: string) => s.replace(/&(amp|lt|gt|quot|#39);/g, (e) => UNESCAPE[e]!);

/** Html with one outer element, as a React element: its attributes as props, the rest as inner HTML. */
export function fromHtml(h: Html, key?: string): ReactElement {
  const m = /^<([a-z][a-z0-9-]*)((?:\s[a-z][a-z0-9-]*="[^"]*")*)>([\s\S]*)<\/\1>$/.exec(String(h));
  if (!m) throw new Error("fromHtml: expected a single element");
  const props: Record<string, unknown> = { dangerouslySetInnerHTML: { __html: m[3]! } };
  if (key !== undefined) props.key = key;
  for (const a of m[2]!.matchAll(/\s([a-z][a-z0-9-]*)="([^"]*)"/g)) props[a[1] === "class" ? "className" : a[1]!] = unescape(a[2]!);
  return createElement(m[1]!, props);
}

/** The bar: wordmark, org switcher, product switcher, user menu (bar() in @forspring/ui/html). */
export const Bar = (props: BarOptions): ReactElement => fromHtml(bar(props));

/** Choose an organization (chooseOrgPage). The app sets the response status itself, if it has one. */
export const ChooseOrg = (props: ChooseOrgOptions): ReactElement => fromHtml(chooseOrgPage(props).body);

/** No organization yet (noOrgPage). */
export const NoOrg = (props: NoOrgOptions): ReactElement => fromHtml(noOrgPage(props).body);

/** A refusal by its reason (refusedPage). */
export const Refused = (props: RefusedOptions): ReactElement => fromHtml(refusedPage(props).body);

/** The account not answering (accountUnavailablePage). */
export const AccountUnavailable = (props: { lang: RefusedOptions["lang"]; retryHref?: string; command?: string }): ReactElement => fromHtml(accountUnavailablePage(props).body);

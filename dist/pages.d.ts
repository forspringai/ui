import { type Refusal } from "./refusals.ts";
import { type OrgLink, type PickerOrg, type Html, type Lang, type Org } from "./html.ts";
/** What a page helper returns: spread it into shell(), and answer with `status`. */
export type StandardPage = {
    status: number;
    title: string;
    narrow: true;
    body: Html;
};
/** Someone who can help: an admin who can add you, an owner who can restart billing. */
export type Person = {
    name?: string;
    email: string;
};
export type OrgChoice = Org & {
    /** Where the org's home in this product is: /o/<slug>/, or the page the person asked for there. */
    href: string;
    /** When the person last used it, from the account; a Date is written in the page's language. */
    lastUsed?: Date | string;
};
export type ChooseOrgOptions = {
    lang: Lang;
    orgs: OrgChoice[];
    /** The product's name, for the lede ("that have DataSpring"). */
    product?: string;
    /** The org this browser used last (a cookie of the product's own, never the server's state):
     *  listed first and tagged "Last used here". */
    lastHere?: string;
};
/** Signed in, several orgs with this product and none in the URL: each org with your access level and when you last used it. */
export declare function chooseOrgPage(o: ChooseOrgOptions): StandardPage;
export type { OrgLink, PickerOrg } from "./html.ts";
export type OrgPickerOptions = {
    /** The one language of the page, decided by the caller (the account's or the product's own locale logic). Required:
     *  the picker never reads the browser (no navigator, Accept-Language or cookie) and never draws two languages. */
    lang: Lang;
    /** What is being connected, at the top, by its real display name: a Slack workspace "Acme" with its icon (an image
     *  URL; without one, the name's first letter). */
    connecting?: {
        kind: string;
        name: string;
        icon?: string;
    };
    /** A line under the heading, e.g. "Hvilken organisation skal Slack-workspacet Acme forbindes med?". */
    subtitle?: string;
    /** The line under the list. Default: the choice cannot be changed here later. `false` leaves it out. */
    note?: string | false;
} & ({
    /** The organisations the person may choose, in this order. The picker draws exactly these: the CALLER filters by
     *  role and product (the account by `org_min_role`; Spring's install lists only owner and admin orgs). */
    orgs: PickerOrg[];
    /** Where each choice is posted. Every org is its own form whose one button is the whole row, so choosing needs
     *  no script. */
    action: string;
    /** The field the chosen org's value is sent in (default `org`). */
    name?: string;
    /** Hidden fields every form carries: the CSRF token, the handle of the sign-in request it answers. */
    fields?: Record<string, string>;
} | {
    /** The link mode: each org a row leading to the caller's href (navigation, not a choice the server must trust).
     *  The picker builds no URL from an org. Same filtering rule as `orgs`. */
    links: OrgLink[];
});
/**
 * Choose an organisation (the suite's org picker, hub plan 2026-11-26): the account shows it after sign-in when a
 * product asks for an `org`. At the top, what is being connected; then one row per org (its mark, name and your
 * access level, a chevron). The whole row is the `<button>` of its own POST form (`fields`, then `name`=the org's
 * `value`), so it is server-rendered, works with no script, and Tab / Enter / Space work as for any button. In the
 * link mode (`links`) each row is a link to the caller's href instead. One language per render.
 *
 * One org is no page: the caller skips the step and uses that org. Given one anyway, it draws that single row (the
 * page still reads right); given none, it says there is no organisation to choose, never an empty list.
 */
export declare function orgPicker(o: OrgPickerOptions): Html;
/** The org picker as a page of its own (spread it into shell(), as the other standard pages). */
export declare function orgPickerPage(o: OrgPickerOptions): StandardPage;
export type NoOrgOptions = {
    lang: Lang;
    product?: string;
    /** The signed-in person's address. */
    email?: string;
    /** Who to ask, from the account (the admins of an org that has invited people from your domain, say). */
    ask?: Person[];
    /** "Your Forspring account". */
    accountHref: string;
};
/** Signed in, but in no organisation with this product: who to ask. */
export declare function noOrgPage(o: NoOrgOptions): StandardPage;
export type RefusedOptions = {
    lang: Lang;
    reason: Refusal;
    /** The organisation the request was for, by name. Not shown for not_a_member, which must not tell
     *  an org that exists from one that does not. */
    org?: string;
    /** not_signed_in: the account's sign-in, with the return URL. */
    signInHref?: string;
    /** org_required, not_a_member: your own organisations. */
    orgs?: (Org & {
        href: string;
    })[];
    /** Who can fix it: admins (product_off, not_a_member), owners (org_suspended), people with the
     *  access level (role_too_low). The account names up to three. */
    people?: Person[];
    /** org_suspended: the account's billing page for the org. */
    billingHref?: string;
    /** role_too_low: the access level it needs (the reason code keeps its old name). */
    roleNeeded?: Org["role"];
    /** org_mismatch: the organisation the key or token is for. */
    credentialOrg?: string;
    /** account_unavailable: where "Try again" goes; the same page by default. */
    retryHref?: string;
    /** The exact command that fixes it, for an agent reading the page ("dataspring auth login"). */
    command?: string;
    /** account_unavailable, or any refusal that hid a platform or upstream error: the request's short
     *  ref (hub D-88), shown last as "Fejlkode" / "Reference" for support (D-30). A plain refusal needs
     *  none; its reason, the card's data-reason, is the stable code. */
    ref?: string;
};
/** A refusal, by its reason: what happened, what it means, and the fix (D-17, hub D-99). */
export declare function refusedPage(o: RefusedOptions): StandardPage;
export type SignInFailedOptions = {
    lang: Lang;
    /** The refusal suite-signin returned (its CallbackRefusal, or the start's rate_limited). Any string is safe:
     *  an unknown one, as from a URL, gets the general words. */
    reason: string;
    /** Where "Sign in again" starts a new sign-in (the product's own start, with the page to come back to). None: no button. */
    retryHref?: string;
    /** product_refused's detail from the product's onSignIn hook: the product's own words, shown as given. */
    detail?: string;
    /** The request's short ref, for support (D-30). */
    ref?: string;
};
/**
 * The sign-in failed page (D-80): the same words in every product for each suite-signin refusal, Danish first,
 * never a command (D-35), with "Sign in again" when the product gives its start. Status as the refusal's.
 */
export declare function signInFailedPage(o: SignInFailedOptions): StandardPage;
/** The account did not answer: 503, never a guess (hub one-way-in). The same as refusedPage's account_unavailable. */
export declare function accountUnavailablePage(o: {
    lang: Lang;
    retryHref?: string;
    command?: string;
    ref?: string;
}): StandardPage;

import { type Refusal } from "./refusals.ts";
import { type AccessLevel, type Html, type Lang, type Org } from "./html.ts";
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
     *  listed first and drawn as the primary action. */
    lastHere?: string;
};
/** Signed in, several orgs with this product and none in the URL: each org with your access level and when you last used it. */
export declare function chooseOrgPage(o: ChooseOrgOptions): StandardPage;
/** An organisation the picker offers: its id (what the form sends back), its name and your access level there. */
export type PickerOrg = {
    id: string;
    name: string;
    role: AccessLevel;
};
export type OrgPickerOptions = {
    lang: Lang;
    /** The organisations the person may choose: the ones where they have the role the product asked for and that
     *  have the product. Listed in this order. */
    orgs: PickerOrg[];
    /** Where each choice is posted (the account's picker step). Every org is its own form with one button, so
     *  choosing needs no script. */
    action: string;
    /** The field the chosen org's id is sent in (default `org`). */
    name?: string;
    /** Hidden fields every form carries: the CSRF token, the handle of the sign-in request it answers. */
    fields?: Record<string, string>;
    /** The product's name, for the lede ("Which organisation do you want to use AppSpring in?"). */
    product?: string;
};
/**
 * Choose an organisation at sign-in (the suite's org picker, hub plan 2026-11-26): the account shows it after the
 * person signed in, when the product asked for an `org`. One list in the look of the account's "Dine
 * organisationer" and a product's org switcher: each org's name, your access level there, and one button, each its
 * own POST form (`fields`, then `name`=the org's id), so it is server-rendered and works with no script.
 *
 * One org is no page: the caller skips the step and uses that org (the plan). Given one anyway, it draws that one
 * org with a primary button, so a page that does show it still reads right; given none, it says the person is in no
 * organisation with the product (noOrgPage's words), never an empty list.
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
/** The account did not answer: 503, never a guess (hub one-way-in). The same as refusedPage's account_unavailable. */
export declare function accountUnavailablePage(o: {
    lang: Lang;
    retryHref?: string;
    command?: string;
    ref?: string;
}): StandardPage;

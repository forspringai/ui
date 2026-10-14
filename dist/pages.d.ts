import { type Refusal } from "./refusals.ts";
import { type Html, type Lang, type Org } from "./html.ts";
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
/** Signed in, several orgs with this product and none in the URL: each org with your role and when you last used it. */
export declare function chooseOrgPage(o: ChooseOrgOptions): StandardPage;
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
     *  role (role_too_low). The account names up to three. */
    people?: Person[];
    /** org_suspended: the account's billing page for the org. */
    billingHref?: string;
    /** role_too_low: the role it needs. */
    roleNeeded?: Org["role"];
    /** org_mismatch: the organisation the key or token is for. */
    credentialOrg?: string;
    /** account_unavailable: where "Try again" goes; the same page by default. */
    retryHref?: string;
    /** The exact command that fixes it, for an agent reading the page ("dataspring auth login"). */
    command?: string;
};
/** A refusal, by its reason: what happened, what it means, and the fix (D-17, hub D-99). */
export declare function refusedPage(o: RefusedOptions): StandardPage;
/** The account did not answer: 503, never a guess (hub one-way-in). The same as refusedPage's account_unavailable. */
export declare function accountUnavailablePage(o: {
    lang: Lang;
    retryHref?: string;
    command?: string;
}): StandardPage;

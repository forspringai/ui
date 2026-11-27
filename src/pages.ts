// The standard pages around signing in (hub D-99, docs/one-way-in.md "Every screen around signing
// in"): choose an organisation, no organisation yet, a refusal for each reason, and the account not
// answering. Every product shows the same pages with the same words, so none of them is a product's
// own (D-17). Each helper returns the page's status, title and body; spread it into shell():
//
//   const page = refusedPage({ lang, reason: "product_off", people: admins });
//   new Response(String(shell({ ...bar, ...page })), { status: page.status, headers })
//
// The bodies are one card each, so a rich app can draw them in its own frame (the React wrappers).

import { REFUSALS, signInRefusal, type Refusal } from "./refusals.ts";
import { ACCESS_LEVEL_NAMES, button, errorRef, html, orgList, orgMark, safeHref, type OrgLink, type PickerOrg, type Content, type Html, type Lang, type Org } from "./html.ts";

/** What a page helper returns: spread it into shell(), and answer with `status`. */
export type StandardPage = { status: number; title: string; narrow: true; body: Html };

/** Someone who can help: an admin who can add you, an owner who can restart billing. */
export type Person = { name?: string; email: string };

const T = {
  da: {
    chooseTitle: "Vælg en organisation",
    pickTitle: "Vælg organisation",
    pickNote: "Du kan ikke ændre valget her bagefter.",
    pickNone: "Du er ikke med i en organisation, du kan vælge her.",
    chooseText: (p?: string) => (p ? `Du er med i flere organisationer, der har ${p}. Hvilken vil du arbejde i?` : "Du er med i flere organisationer. Hvilken vil du arbejde i?"),
    lastHere: "Sidst brugt her",
    lastUsed: (d: string) => `sidst brugt ${d}`,
    noOrgTitle: "Ingen organisation endnu",
    noOrgText: (who: string | undefined, p?: string) =>
      `${who ? `Du er logget ind som ${who}, men du` : "Du"} er ikke med i en organisation${p ? `, der har ${p}` : ""}.`,
    askThese: "Bed en af dem om at invitere dig:",
    askSomeone: (p?: string) => `Bed den, der står for ${p ?? "Forspring"} hos jer, om at invitere dig.`,
    account: "Din Forspring-konto",
    yourOrgs: "Dine organisationer",
    canAdd: "De kan invitere dig",
    admins: "Administratorer, der kan slå det til",
    owners: "Ejere",
    hasRole: (r: string) => `Har adgangsniveauet ${r}`,
    needs: (r: string) => `Det kræver adgangsniveauet ${r}.`,
    orgLine: (o: string) => `Organisation: ${o}`,
    keyFor: (o: string) => `Nøglen gælder ${o}.`,
    signIn: "Log ind",
    billing: "Gå til betaling",
    retry: "Prøv igen",
    signInAgain: "Log ind igen",
    agent: "Fra en agent:",
  },
  en: {
    chooseTitle: "Choose an organisation",
    pickTitle: "Choose organisation",
    pickNote: "You cannot change this choice here later.",
    pickNone: "You are in no organisation you can choose here.",
    chooseText: (p?: string) => (p ? `You are in several organisations that have ${p}. Which one do you want to work in?` : "You are in several organisations. Which one do you want to work in?"),
    lastHere: "Last used here",
    lastUsed: (d: string) => `last used ${d}`,
    noOrgTitle: "No organisation yet",
    noOrgText: (who: string | undefined, p?: string) =>
      `${who ? `You are signed in as ${who}, but you are` : "You are"} not in an organisation${p ? ` that has ${p}` : ""}.`,
    askThese: "Ask one of them to add you:",
    askSomeone: (p?: string) => `Ask whoever looks after ${p ?? "Forspring"} where you work to add you.`,
    account: "Your Forspring account",
    yourOrgs: "Your organisations",
    canAdd: "They can add you",
    admins: "Admins who can switch it on",
    owners: "Owners",
    hasRole: (r: string) => `Have the ${r} access level`,
    needs: (r: string) => `It needs the ${r} access level.`,
    orgLine: (o: string) => `Organisation: ${o}`,
    keyFor: (o: string) => `The key is for ${o}.`,
    signIn: "Sign in",
    billing: "Go to billing",
    retry: "Try again",
    signInAgain: "Sign in again",
    agent: "From an agent:",
  },
};

const LOCALE: Record<Lang, string> = { da: "da-DK", en: "en-GB" };

const when = (d: Date | string, lang: Lang) => (typeof d === "string" ? d : new Intl.DateTimeFormat(LOCALE[lang], { dateStyle: "medium", timeZone: "Europe/Copenhagen" }).format(d));

function page(status: number, title: string, cls: string, inner: Content, reason?: Refusal): StandardPage {
  const data = reason ? html` data-reason="${reason}"` : "";
  return { status, title, narrow: true, body: html`<div class="${`card std-page ${cls}`}"${data}>${inner}</div>` };
}

const label = (text: string) => html`<p class="std-label">${text}</p>`;

function people(ps: Person[]): Html {
  return html`<ul class="std-people">${ps.map(
    (p) => html`<li>${p.name ? html`<span class="name">${p.name}</span> ` : ""}<a href="${safeHref(`mailto:${p.email}`)}">${p.email}</a></li>`,
  )}</ul>`;
}

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
export function chooseOrgPage(o: ChooseOrgOptions): StandardPage {
  const t = T[o.lang];
  const last = o.orgs.find((g) => g.slug === o.lastHere);
  const orgs = last ? [last, ...o.orgs.filter((g) => g !== last)] : o.orgs;
  // The suite's one org list in its link mode (D-59): the row is the link, the org used here first and tagged.
  const items = orgList({
    lang: o.lang,
    links: orgs.map((g) => ({ name: g.name, role: g.role, href: g.href, tag: g === last ? t.lastHere : undefined, meta: g.lastUsed ? t.lastUsed(when(g.lastUsed, o.lang)) : undefined })),
  });
  return page(200, t.chooseTitle, "choose-org", html`<h1>${t.chooseTitle}</h1><p>${t.chooseText(o.product)}</p>${items}`);
}

export type { OrgLink, PickerOrg } from "./html.ts";

export type OrgPickerOptions = {
  /** The one language of the page, decided by the caller (the account's or the product's own locale logic). Required:
   *  the picker never reads the browser (no navigator, Accept-Language or cookie) and never draws two languages. */
  lang: Lang;
  /** What is being connected, at the top, by its real display name: a Slack workspace "Acme" with its icon (an image
   *  URL; without one, the name's first letter). */
  connecting?: { kind: string; name: string; icon?: string };
  /** A line under the heading, e.g. "Hvilken organisation skal Slack-workspacet Acme forbindes med?". */
  subtitle?: string;
  /** The line under the list. Default: the choice cannot be changed here later. `false` leaves it out. */
  note?: string | false;
} & (
  | {
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
    }
  | {
      /** The link mode: each org a row leading to the caller's href (navigation, not a choice the server must trust).
       *  The picker builds no URL from an org. Same filtering rule as `orgs`. */
      links: OrgLink[];
    }
);

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
export function orgPicker(o: OrgPickerOptions): Html {
  const t = T[o.lang];
  const c = o.connecting;
  const subject = c
    ? html`<p class="org-picker-subject">${orgMark(c.name, c.icon)}<span><span class="org-picker-kind">${c.kind}</span><span class="name">${c.name}</span></span></p>`
    : "";
  const count = "links" in o ? o.links.length : o.orgs.length;
  const rows = count === 0 ? html`<p>${t.pickNone}</p>` : orgList(o);
  const note = o.note === false || count === 0 ? "" : html`<p class="org-picker-note">${o.note ?? t.pickNote}</p>`;
  return html`<div class="card std-page org-picker">${subject}<h1>${t.pickTitle}</h1>${o.subtitle ? html`<p>${o.subtitle}</p>` : ""}${rows}${note}</div>`;
}

/** The org picker as a page of its own (spread it into shell(), as the other standard pages). */
export function orgPickerPage(o: OrgPickerOptions): StandardPage {
  return { status: 200, title: T[o.lang].pickTitle, narrow: true, body: orgPicker(o) };
}

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
export function noOrgPage(o: NoOrgOptions): StandardPage {
  const t = T[o.lang];
  const ask = o.ask?.length ? html`<p>${t.askThese}</p>${people(o.ask)}` : html`<p>${t.askSomeone(o.product)}</p>`;
  return page(200, t.noOrgTitle, "no-org", html`<h1>${t.noOrgTitle}</h1><p>${t.noOrgText(o.email, o.product)}</p>${ask}<div class="actions">${button({ label: t.account, href: o.accountHref, variant: "ghost" })}</div>`);
}

export type RefusedOptions = {
  lang: Lang;
  reason: Refusal;
  /** The organisation the request was for, by name. Not shown for not_a_member, which must not tell
   *  an org that exists from one that does not. */
  org?: string;
  /** not_signed_in: the account's sign-in, with the return URL. */
  signInHref?: string;
  /** org_required, not_a_member: your own organisations. */
  orgs?: (Org & { href: string })[];
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
export function refusedPage(o: RefusedOptions): StandardPage {
  const t = T[o.lang];
  const r = REFUSALS[o.reason];
  const words = r[o.lang];
  const parts: Content[] = [];
  if (o.org && o.reason !== "not_a_member") parts.push(html`<p class="meta">${t.orgLine(o.org)}</p>`);
  parts.push(html`<p>${words.text}</p>`);
  if (o.reason === "role_too_low" && o.roleNeeded) parts.push(html`<p>${t.needs(ACCESS_LEVEL_NAMES[o.lang][o.roleNeeded])}</p>`);
  if (o.reason === "org_mismatch" && o.credentialOrg) parts.push(html`<p>${t.keyFor(o.credentialOrg)}</p>`);
  if (o.orgs?.length && (o.reason === "org_required" || o.reason === "not_a_member")) {
    parts.push(label(t.yourOrgs), orgList({ lang: o.lang, links: o.orgs.map((g) => ({ name: g.name, role: g.role, href: g.href })) }));
  }
  if (o.people?.length) {
    const heading = o.reason === "org_suspended" ? t.owners : o.reason === "product_off" ? t.admins : o.reason === "role_too_low" && o.roleNeeded ? t.hasRole(ACCESS_LEVEL_NAMES[o.lang][o.roleNeeded]) : t.canAdd;
    parts.push(label(heading), people(o.people));
  }
  parts.push(html`<p>${words.fix}</p>`);
  const action =
    o.reason === "not_signed_in" && o.signInHref
      ? button({ label: t.signIn, href: o.signInHref })
      : o.reason === "org_suspended" && o.billingHref
        ? button({ label: t.billing, href: o.billingHref, variant: "ghost" })
        : o.reason === "account_unavailable"
          ? button({ label: t.retry, href: o.retryHref ?? "" })
          : "";
  if (action) parts.push(html`<div class="actions">${action}</div>`);
  if (o.command) parts.push(html`<p class="fine">${t.agent} <code>${o.command}</code></p>`);
  if (o.ref) parts.push(errorRef({ lang: o.lang, ref: o.ref }));
  return page(r.status, words.title, "refused", html`<h1>${words.title}</h1>${parts}`, o.reason);
}

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
export function signInFailedPage(o: SignInFailedOptions): StandardPage {
  const t = T[o.lang];
  const w = signInRefusal(o.reason, o.lang);
  const parts: Content[] = [html`<p>${w.text}</p>`];
  if (o.detail) parts.push(html`<p>${o.detail}</p>`);
  parts.push(html`<p>${w.fix}</p>`);
  if (o.retryHref) parts.push(html`<div class="actions">${button({ label: w.reason === "rate_limited" || w.reason === "token_exchange_failed" ? t.retry : t.signInAgain, href: o.retryHref })}</div>`);
  if (o.ref) parts.push(errorRef({ lang: o.lang, ref: o.ref }));
  return { status: w.status, title: w.title, narrow: true, body: html`<div class="card std-page refused" data-reason="${w.reason}">${html`<h1>${w.title}</h1>`}${parts}</div>` };
}

/** The account did not answer: 503, never a guess (hub one-way-in). The same as refusedPage's account_unavailable. */
export function accountUnavailablePage(o: { lang: Lang; retryHref?: string; command?: string; ref?: string }): StandardPage {
  return refusedPage({ ...o, reason: "account_unavailable" });
}

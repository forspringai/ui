// The standard pages around signing in (hub D-99, docs/one-way-in.md "Every screen around signing
// in"): choose an organisation, no organisation yet, a refusal for each reason, and the account not
// answering. Every product shows the same pages with the same words, so none of them is a product's
// own (D-17). Each helper returns the page's status, title and body; spread it into shell():
//
//   const page = refusedPage({ lang, reason: "product_off", people: admins });
//   new Response(String(shell({ ...bar, ...page })), { status: page.status, headers })
//
// The bodies are one card each, so a rich app can draw them in its own frame (the React wrappers).

import { REFUSALS, type Refusal } from "./refusals.ts";
import { button, html, list, ROLE_NAMES, safeHref, tag, type Content, type Html, type Lang, type Org } from "./html.ts";

/** What a page helper returns: spread it into shell(), and answer with `status`. */
export type StandardPage = { status: number; title: string; narrow: true; body: Html };

/** Someone who can help: an admin who can add you, an owner who can restart billing. */
export type Person = { name?: string; email: string };

const T = {
  da: {
    chooseTitle: "Vælg en organisation",
    chooseText: (p?: string) => (p ? `Du er med i flere organisationer, der har ${p}. Hvilken vil du arbejde i?` : "Du er med i flere organisationer. Hvilken vil du arbejde i?"),
    lastHere: "Sidst brugt her",
    lastUsed: (d: string) => `sidst brugt ${d}`,
    open: "Åbn",
    openOrg: (o: string) => `Åbn ${o}`,
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
    hasRole: (r: string) => `Har rollen ${r}`,
    needs: (r: string) => `Det kræver rollen ${r}.`,
    orgLine: (o: string) => `Organisation: ${o}`,
    keyFor: (o: string) => `Nøglen gælder ${o}.`,
    signIn: "Log ind",
    billing: "Gå til betaling",
    retry: "Prøv igen",
    agent: "Fra en agent:",
  },
  en: {
    chooseTitle: "Choose an organization",
    chooseText: (p?: string) => (p ? `You are in several organizations that have ${p}. Which one do you want to work in?` : "You are in several organizations. Which one do you want to work in?"),
    lastHere: "Last used here",
    lastUsed: (d: string) => `last used ${d}`,
    open: "Open",
    openOrg: (o: string) => `Open ${o}`,
    noOrgTitle: "No organization yet",
    noOrgText: (who: string | undefined, p?: string) =>
      `${who ? `You are signed in as ${who}, but you are` : "You are"} not in an organization${p ? ` that has ${p}` : ""}.`,
    askThese: "Ask one of them to add you:",
    askSomeone: (p?: string) => `Ask whoever looks after ${p ?? "Forspring"} where you work to add you.`,
    account: "Your Forspring account",
    yourOrgs: "Your organizations",
    canAdd: "They can add you",
    admins: "Admins who can switch it on",
    owners: "Owners",
    hasRole: (r: string) => `Have the role ${r}`,
    needs: (r: string) => `It needs the role ${r}.`,
    orgLine: (o: string) => `Organization: ${o}`,
    keyFor: (o: string) => `The key is for ${o}.`,
    signIn: "Sign in",
    billing: "Go to billing",
    retry: "Try again",
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
   *  listed first and drawn as the primary action. */
  lastHere?: string;
};

/** Signed in, several orgs with this product and none in the URL: each org with your role and when you last used it. */
export function chooseOrgPage(o: ChooseOrgOptions): StandardPage {
  const t = T[o.lang];
  const last = o.orgs.find((g) => g.slug === o.lastHere);
  const orgs = last ? [last, ...o.orgs.filter((g) => g !== last)] : o.orgs;
  const items = list(
    orgs.map((g) => ({
      name: g === last ? html`${g.name} ${tag(t.lastHere, "primary")}` : g.name,
      meta: [ROLE_NAMES[o.lang][g.role], g.lastUsed ? ` · ${t.lastUsed(when(g.lastUsed, o.lang))}` : ""],
      action: button({ label: t.open, href: g.href, small: true, variant: g === last || (!last && orgs.length === 1) ? "primary" : "ghost", ariaLabel: t.openOrg(g.name) }),
    })),
  );
  return page(200, t.chooseTitle, "choose-org", html`<h1>${t.chooseTitle}</h1><p>${t.chooseText(o.product)}</p>${items}`);
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
export function refusedPage(o: RefusedOptions): StandardPage {
  const t = T[o.lang];
  const r = REFUSALS[o.reason];
  const words = r[o.lang];
  const parts: Content[] = [];
  if (o.org && o.reason !== "not_a_member") parts.push(html`<p class="meta">${t.orgLine(o.org)}</p>`);
  parts.push(html`<p>${words.text}</p>`);
  if (o.reason === "role_too_low" && o.roleNeeded) parts.push(html`<p>${t.needs(ROLE_NAMES[o.lang][o.roleNeeded])}</p>`);
  if (o.reason === "org_mismatch" && o.credentialOrg) parts.push(html`<p>${t.keyFor(o.credentialOrg)}</p>`);
  if (o.orgs?.length && (o.reason === "org_required" || o.reason === "not_a_member")) {
    parts.push(label(t.yourOrgs), list(o.orgs.map((g) => ({ name: g.name, meta: ROLE_NAMES[o.lang][g.role], action: button({ label: t.open, href: g.href, small: true, variant: "ghost", ariaLabel: t.openOrg(g.name) }) }))));
  }
  if (o.people?.length) {
    const heading = o.reason === "org_suspended" ? t.owners : o.reason === "product_off" ? t.admins : o.reason === "role_too_low" && o.roleNeeded ? t.hasRole(ROLE_NAMES[o.lang][o.roleNeeded]) : t.canAdd;
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
  return page(r.status, words.title, "refused", html`<p class="kicker">${o.reason}</p><h1>${words.title}</h1>${parts}`, o.reason);
}

/** The account did not answer: 503, never a guess (hub one-way-in). The same as refusedPage's account_unavailable. */
export function accountUnavailablePage(o: { lang: Lang; retryHref?: string; command?: string }): StandardPage {
  return refusedPage({ ...o, reason: "account_unavailable" });
}

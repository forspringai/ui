// The standard pages around signing in (hub D-99, docs/one-way-in.md "Every screen around signing
// in"): choose an organisation, no organisation yet, a refusal for each reason, and the account not
// answering. Every product shows the same pages with the same words, so none of them is a product's
// own (D-17). Each helper returns the page's status, title and body; spread it into shell():
//
//   const page = refusedPage({ lang, reason: "product_off", people: admins });
//   new Response(String(shell({ ...bar, ...page })), { status: page.status, headers })
//
// The bodies are one card each, so a rich app can draw them in its own frame (the React wrappers).
import { REFUSALS } from "./refusals.js";
import { ACCESS_LEVEL_NAMES, button, errorRef, html, list, safeHref, tag } from "./html.js";
const T = {
    da: {
        chooseTitle: "Vælg en organisation",
        pickTitle: "Vælg organisation",
        pickText: (p) => (p ? `Hvilken organisation vil du bruge ${p} i?` : "Hvilken organisation vil du bruge?"),
        pick: "Vælg",
        pickOrg: (o) => `Vælg ${o}`,
        chooseText: (p) => (p ? `Du er med i flere organisationer, der har ${p}. Hvilken vil du arbejde i?` : "Du er med i flere organisationer. Hvilken vil du arbejde i?"),
        lastHere: "Sidst brugt her",
        lastUsed: (d) => `sidst brugt ${d}`,
        open: "Åbn",
        openOrg: (o) => `Åbn ${o}`,
        noOrgTitle: "Ingen organisation endnu",
        noOrgText: (who, p) => `${who ? `Du er logget ind som ${who}, men du` : "Du"} er ikke med i en organisation${p ? `, der har ${p}` : ""}.`,
        askThese: "Bed en af dem om at invitere dig:",
        askSomeone: (p) => `Bed den, der står for ${p ?? "Forspring"} hos jer, om at invitere dig.`,
        account: "Din Forspring-konto",
        yourOrgs: "Dine organisationer",
        canAdd: "De kan invitere dig",
        admins: "Administratorer, der kan slå det til",
        owners: "Ejere",
        hasRole: (r) => `Har adgangsniveauet ${r}`,
        needs: (r) => `Det kræver adgangsniveauet ${r}.`,
        orgLine: (o) => `Organisation: ${o}`,
        keyFor: (o) => `Nøglen gælder ${o}.`,
        signIn: "Log ind",
        billing: "Gå til betaling",
        retry: "Prøv igen",
        agent: "Fra en agent:",
    },
    en: {
        chooseTitle: "Choose an organization",
        pickTitle: "Choose organisation",
        pickText: (p) => (p ? `Which organisation do you want to use ${p} in?` : "Which organisation do you want to use?"),
        pick: "Choose",
        pickOrg: (o) => `Choose ${o}`,
        chooseText: (p) => (p ? `You are in several organizations that have ${p}. Which one do you want to work in?` : "You are in several organizations. Which one do you want to work in?"),
        lastHere: "Last used here",
        lastUsed: (d) => `last used ${d}`,
        open: "Open",
        openOrg: (o) => `Open ${o}`,
        noOrgTitle: "No organization yet",
        noOrgText: (who, p) => `${who ? `You are signed in as ${who}, but you are` : "You are"} not in an organization${p ? ` that has ${p}` : ""}.`,
        askThese: "Ask one of them to add you:",
        askSomeone: (p) => `Ask whoever looks after ${p ?? "Forspring"} where you work to add you.`,
        account: "Your Forspring account",
        yourOrgs: "Your organizations",
        canAdd: "They can add you",
        admins: "Admins who can switch it on",
        owners: "Owners",
        hasRole: (r) => `Have the ${r} access level`,
        needs: (r) => `It needs the ${r} access level.`,
        orgLine: (o) => `Organization: ${o}`,
        keyFor: (o) => `The key is for ${o}.`,
        signIn: "Sign in",
        billing: "Go to billing",
        retry: "Try again",
        agent: "From an agent:",
    },
};
const LOCALE = { da: "da-DK", en: "en-GB" };
const when = (d, lang) => (typeof d === "string" ? d : new Intl.DateTimeFormat(LOCALE[lang], { dateStyle: "medium", timeZone: "Europe/Copenhagen" }).format(d));
function page(status, title, cls, inner, reason) {
    const data = reason ? html ` data-reason="${reason}"` : "";
    return { status, title, narrow: true, body: html `<div class="${`card std-page ${cls}`}"${data}>${inner}</div>` };
}
const label = (text) => html `<p class="std-label">${text}</p>`;
function people(ps) {
    return html `<ul class="std-people">${ps.map((p) => html `<li>${p.name ? html `<span class="name">${p.name}</span> ` : ""}<a href="${safeHref(`mailto:${p.email}`)}">${p.email}</a></li>`)}</ul>`;
}
/** Signed in, several orgs with this product and none in the URL: each org with your access level and when you last used it. */
export function chooseOrgPage(o) {
    const t = T[o.lang];
    const last = o.orgs.find((g) => g.slug === o.lastHere);
    const orgs = last ? [last, ...o.orgs.filter((g) => g !== last)] : o.orgs;
    const items = list(orgs.map((g) => ({
        name: g === last ? html `${g.name} ${tag(t.lastHere, "primary")}` : g.name,
        meta: [ACCESS_LEVEL_NAMES[o.lang][g.role], g.lastUsed ? ` · ${t.lastUsed(when(g.lastUsed, o.lang))}` : ""],
        action: button({ label: t.open, href: g.href, small: true, variant: g === last || (!last && orgs.length === 1) ? "primary" : "ghost", ariaLabel: t.openOrg(g.name) }),
    })));
    return page(200, t.chooseTitle, "choose-org", html `<h1>${t.chooseTitle}</h1><p>${t.chooseText(o.product)}</p>${items}`);
}
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
export function orgPicker(o) {
    const t = T[o.lang];
    const field = o.name ?? "org";
    const hidden = Object.entries(o.fields ?? {}).map(([k, v]) => html `<input type="hidden" name="${k}" value="${v}">`);
    const items = o.orgs.length === 0
        ? html `<p>${t.noOrgText(undefined, o.product)}</p>`
        : list(o.orgs.map((g) => ({
            name: g.name,
            meta: ACCESS_LEVEL_NAMES[o.lang][g.role],
            action: html `<form class="inline" method="post" action="${safeHref(o.action)}">${hidden}${button({ label: t.pick, name: field, value: g.id, small: true, variant: o.orgs.length === 1 ? "primary" : "ghost", ariaLabel: t.pickOrg(g.name) })}</form>`,
        })));
    return html `<div class="card std-page org-picker"><h1>${t.pickTitle}</h1><p>${t.pickText(o.product)}</p>${items}</div>`;
}
/** The org picker as a page of its own (spread it into shell(), as the other standard pages). */
export function orgPickerPage(o) {
    return { status: 200, title: T[o.lang].pickTitle, narrow: true, body: orgPicker(o) };
}
/** Signed in, but in no organisation with this product: who to ask. */
export function noOrgPage(o) {
    const t = T[o.lang];
    const ask = o.ask?.length ? html `<p>${t.askThese}</p>${people(o.ask)}` : html `<p>${t.askSomeone(o.product)}</p>`;
    return page(200, t.noOrgTitle, "no-org", html `<h1>${t.noOrgTitle}</h1><p>${t.noOrgText(o.email, o.product)}</p>${ask}<div class="actions">${button({ label: t.account, href: o.accountHref, variant: "ghost" })}</div>`);
}
/** A refusal, by its reason: what happened, what it means, and the fix (D-17, hub D-99). */
export function refusedPage(o) {
    const t = T[o.lang];
    const r = REFUSALS[o.reason];
    const words = r[o.lang];
    const parts = [];
    if (o.org && o.reason !== "not_a_member")
        parts.push(html `<p class="meta">${t.orgLine(o.org)}</p>`);
    parts.push(html `<p>${words.text}</p>`);
    if (o.reason === "role_too_low" && o.roleNeeded)
        parts.push(html `<p>${t.needs(ACCESS_LEVEL_NAMES[o.lang][o.roleNeeded])}</p>`);
    if (o.reason === "org_mismatch" && o.credentialOrg)
        parts.push(html `<p>${t.keyFor(o.credentialOrg)}</p>`);
    if (o.orgs?.length && (o.reason === "org_required" || o.reason === "not_a_member")) {
        parts.push(label(t.yourOrgs), list(o.orgs.map((g) => ({ name: g.name, meta: ACCESS_LEVEL_NAMES[o.lang][g.role], action: button({ label: t.open, href: g.href, small: true, variant: "ghost", ariaLabel: t.openOrg(g.name) }) }))));
    }
    if (o.people?.length) {
        const heading = o.reason === "org_suspended" ? t.owners : o.reason === "product_off" ? t.admins : o.reason === "role_too_low" && o.roleNeeded ? t.hasRole(ACCESS_LEVEL_NAMES[o.lang][o.roleNeeded]) : t.canAdd;
        parts.push(label(heading), people(o.people));
    }
    parts.push(html `<p>${words.fix}</p>`);
    const action = o.reason === "not_signed_in" && o.signInHref
        ? button({ label: t.signIn, href: o.signInHref })
        : o.reason === "org_suspended" && o.billingHref
            ? button({ label: t.billing, href: o.billingHref, variant: "ghost" })
            : o.reason === "account_unavailable"
                ? button({ label: t.retry, href: o.retryHref ?? "" })
                : "";
    if (action)
        parts.push(html `<div class="actions">${action}</div>`);
    if (o.command)
        parts.push(html `<p class="fine">${t.agent} <code>${o.command}</code></p>`);
    if (o.ref)
        parts.push(errorRef({ lang: o.lang, ref: o.ref }));
    return page(r.status, words.title, "refused", html `<h1>${words.title}</h1>${parts}`, o.reason);
}
/** The account did not answer: 503, never a guess (hub one-way-in). The same as refusedPage's account_unavailable. */
export function accountUnavailablePage(o) {
    return refusedPage({ ...o, reason: "account_unavailable" });
}

export type RefusalText = {
    /** The heading: what happened, in a few words. */
    title: string;
    /** What it means, in one or two sentences. */
    text: string;
    /** What the person or agent can do about it. */
    fix: string;
};
export type RefusalInfo = {
    /** The HTTP status a page or an API answers with. */
    status: number;
    /** The CLI's exit code (suite-standards §6: 1 failure, 2 invalid input, 3 not found, 4 forbidden). */
    exit: number;
    da: RefusalText;
    en: RefusalText;
};
export declare const REFUSALS: {
    readonly not_signed_in: {
        readonly status: 401;
        readonly exit: 4;
        readonly da: {
            readonly title: "Du er ikke logget ind";
            readonly text: "Siden kræver, at du er logget ind med din Forspring-konto.";
            readonly fix: "Log ind, så kommer du tilbage hertil. En agent kører auth login.";
        };
        readonly en: {
            readonly title: "You are not signed in";
            readonly text: "This page needs you to be signed in with your Forspring account.";
            readonly fix: "Sign in and you will come back here. An agent runs auth login.";
        };
    };
    readonly org_required: {
        readonly status: 400;
        readonly exit: 2;
        readonly da: {
            readonly title: "Vælg en organisation";
            readonly text: "Du er med i flere organisationer, og der er ikke valgt en af dem.";
            readonly fix: "Vælg den, du vil arbejde i. En agent angiver den med --org, <PRODUKT>_ORG eller .forspring.json.";
        };
        readonly en: {
            readonly title: "Choose an organization";
            readonly text: "You are in several organizations and none of them was named.";
            readonly fix: "Pick the one to work in. An agent names it with --org, <PRODUCT>_ORG or .forspring.json.";
        };
    };
    readonly not_a_member: {
        readonly status: 404;
        readonly exit: 3;
        readonly da: {
            readonly title: "Organisationen findes ikke, eller du er ikke med i den";
            readonly text: "Vi kan ikke vise dig noget fra en organisation, du ikke er med i.";
            readonly fix: "Tjek adressen, eller vælg en af dine egne organisationer. En administrator i organisationen kan invitere dig.";
        };
        readonly en: {
            readonly title: "This organization does not exist, or you are not in it";
            readonly text: "We cannot show you anything from an organization you are not in.";
            readonly fix: "Check the address, or pick one of your own organizations. An admin of the organization can add you.";
        };
    };
    readonly product_off: {
        readonly status: 403;
        readonly exit: 4;
        readonly da: {
            readonly title: "Produktet er ikke slået til for dig";
            readonly text: "Du er med i organisationen, men du har ikke fået adgang til produktet.";
            readonly fix: "Bed en administrator om at slå det til for dig.";
        };
        readonly en: {
            readonly title: "This product is not switched on for you";
            readonly text: "You are in the organization, but you have not been given this product.";
            readonly fix: "Ask an admin to switch it on for you.";
        };
    };
    readonly org_suspended: {
        readonly status: 403;
        readonly exit: 4;
        readonly da: {
            readonly title: "Produktet er sat på pause for organisationen";
            readonly text: "Betalingen er stoppet, så ingen i organisationen kan bruge produktet lige nu.";
            readonly fix: "En ejer kan starte det igen under betaling.";
        };
        readonly en: {
            readonly title: "This product is paused for the organization";
            readonly text: "Billing has stopped, so nobody in the organization can use the product right now.";
            readonly fix: "An owner can start it again on the billing page.";
        };
    };
    readonly role_too_low: {
        readonly status: 403;
        readonly exit: 4;
        readonly da: {
            readonly title: "Din rolle kan ikke det her";
            readonly text: "Du er med i organisationen, men det kræver en anden rolle.";
            readonly fix: "Bed en, der har rollen, om at gøre det eller give dig rollen.";
        };
        readonly en: {
            readonly title: "Your role cannot do this";
            readonly text: "You are in the organization, but this needs another role.";
            readonly fix: "Ask someone with that role to do it, or to give you the role.";
        };
    };
    readonly org_mismatch: {
        readonly status: 403;
        readonly exit: 4;
        readonly da: {
            readonly title: "Nøglen hører til en anden organisation";
            readonly text: "Nøglen eller tokenet gælder en anden organisation end den i adressen.";
            readonly fix: "Brug en nøgle til denne organisation, eller adressen for nøglens egen.";
        };
        readonly en: {
            readonly title: "The key is for another organization";
            readonly text: "The key or token is for another organization than the one in the address.";
            readonly fix: "Use a key for this organization, or the address of the key's own.";
        };
    };
    readonly account_unavailable: {
        readonly status: 503;
        readonly exit: 1;
        readonly da: {
            readonly title: "Forsprings konto svarer ikke";
            readonly text: "Forsprings konto svarer ikke, så vi kan ikke tjekke din adgang.";
            readonly fix: "Intet er gået tabt; prøv igen om et minut.";
        };
        readonly en: {
            readonly title: "Forspring's account is not answering";
            readonly text: "Forspring's account is not answering, so we cannot check your access.";
            readonly fix: "Nothing is lost; try again in a minute.";
        };
    };
};
/** A stable, machine-readable refusal reason. */
export type Refusal = keyof typeof REFUSALS;
/** Every reason, in the order of the hub's table. */
export declare const REFUSAL_REASONS: Refusal[];
export declare const isRefusal: (s: unknown) => s is Refusal;

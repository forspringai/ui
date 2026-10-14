// The suite's one vocabulary for refusals (hub D-99, docs/one-way-in.md "One vocabulary for
// refusals"). Every product refuses with one of these reasons, on the web, in its API, its CLI and its
// MCP, so a person and an agent read the same words everywhere. The texts are the package's, in
// Danish first and English, so no product rewords them; what is specific to one refusal (whose org,
// which admins, the command that fixes it) is the product's to add, and pages.ts renders it.
//
// No markup and no dependencies: a CLI or an MCP server imports this alone (@forspring/ui/refusals).
export const REFUSALS = {
    not_signed_in: {
        status: 401,
        exit: 4,
        da: {
            title: "Du er ikke logget ind",
            text: "Siden kræver, at du er logget ind med din Forspring-konto.",
            fix: "Log ind, så kommer du tilbage hertil. En agent kører auth login.",
        },
        en: {
            title: "You are not signed in",
            text: "This page needs you to be signed in with your Forspring account.",
            fix: "Sign in and you will come back here. An agent runs auth login.",
        },
    },
    org_required: {
        status: 400,
        exit: 2,
        da: {
            title: "Vælg en organisation",
            text: "Du er med i flere organisationer, og der er ikke valgt en af dem.",
            fix: "Vælg den, du vil arbejde i. En agent angiver den med --org, <PRODUKT>_ORG eller .forspring.json.",
        },
        en: {
            title: "Choose an organization",
            text: "You are in several organizations and none of them was named.",
            fix: "Pick the one to work in. An agent names it with --org, <PRODUCT>_ORG or .forspring.json.",
        },
    },
    // A 404, the same as an organization that does not exist, so its name cannot be probed.
    not_a_member: {
        status: 404,
        exit: 3,
        da: {
            title: "Organisationen findes ikke, eller du er ikke med i den",
            text: "Vi kan ikke vise dig noget fra en organisation, du ikke er med i.",
            fix: "Tjek adressen, eller vælg en af dine egne organisationer. En administrator i organisationen kan invitere dig.",
        },
        en: {
            title: "This organization does not exist, or you are not in it",
            text: "We cannot show you anything from an organization you are not in.",
            fix: "Check the address, or pick one of your own organizations. An admin of the organization can add you.",
        },
    },
    product_off: {
        status: 403,
        exit: 4,
        da: {
            title: "Produktet er ikke slået til for dig",
            text: "Du er med i organisationen, men du har ikke fået adgang til produktet.",
            fix: "Bed en administrator om at slå det til for dig.",
        },
        en: {
            title: "This product is not switched on for you",
            text: "You are in the organization, but you have not been given this product.",
            fix: "Ask an admin to switch it on for you.",
        },
    },
    org_suspended: {
        status: 403,
        exit: 4,
        da: {
            title: "Produktet er sat på pause for organisationen",
            text: "Betalingen er stoppet, så ingen i organisationen kan bruge produktet lige nu.",
            fix: "En ejer kan starte det igen under betaling.",
        },
        en: {
            title: "This product is paused for the organization",
            text: "Billing has stopped, so nobody in the organization can use the product right now.",
            fix: "An owner can start it again on the billing page.",
        },
    },
    role_too_low: {
        status: 403,
        exit: 4,
        da: {
            title: "Din rolle kan ikke det her",
            text: "Du er med i organisationen, men det kræver en anden rolle.",
            fix: "Bed en, der har rollen, om at gøre det eller give dig rollen.",
        },
        en: {
            title: "Your role cannot do this",
            text: "You are in the organization, but this needs another role.",
            fix: "Ask someone with that role to do it, or to give you the role.",
        },
    },
    org_mismatch: {
        status: 403,
        exit: 4,
        da: {
            title: "Nøglen hører til en anden organisation",
            text: "Nøglen eller tokenet gælder en anden organisation end den i adressen.",
            fix: "Brug en nøgle til denne organisation, eller adressen for nøglens egen.",
        },
        en: {
            title: "The key is for another organization",
            text: "The key or token is for another organization than the one in the address.",
            fix: "Use a key for this organization, or the address of the key's own.",
        },
    },
    account_unavailable: {
        status: 503,
        exit: 1,
        da: {
            title: "Forsprings konto svarer ikke",
            text: "Forsprings konto svarer ikke, så vi kan ikke tjekke din adgang.",
            fix: "Intet er gået tabt; prøv igen om et minut.",
        },
        en: {
            title: "Forspring's account is not answering",
            text: "Forspring's account is not answering, so we cannot check your access.",
            fix: "Nothing is lost; try again in a minute.",
        },
    },
};
/** Every reason, in the order of the hub's table. */
export const REFUSAL_REASONS = Object.keys(REFUSALS);
export const isRefusal = (s) => typeof s === "string" && Object.hasOwn(REFUSALS, s);

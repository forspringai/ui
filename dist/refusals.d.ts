export type RefusalText = {
    /** The heading: what happened, in a few words. */
    title: string;
    /** What it means, in one or two sentences. */
    text: string;
    /** What the person can do about it. Shown on pages, so never a command (Peter, 2026-11-12: an
     *  end-user page never tells people to run a CLI command). */
    fix: string;
    /** What an agent does about it, for an API, CLI or MCP answer only; never shown on a page. */
    agent?: string;
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
            readonly fix: "Log ind, så kommer du tilbage hertil.";
            readonly agent: "En agent kører auth login.";
        };
        readonly en: {
            readonly title: "You are not signed in";
            readonly text: "This page needs you to be signed in with your Forspring account.";
            readonly fix: "Sign in and you will come back here.";
            readonly agent: "An agent runs auth login.";
        };
    };
    readonly org_required: {
        readonly status: 400;
        readonly exit: 2;
        readonly da: {
            readonly title: "Vælg en organisation";
            readonly text: "Du er med i flere organisationer, og der er ikke valgt en af dem.";
            readonly fix: "Vælg den, du vil arbejde i.";
            readonly agent: "En agent angiver den med --org, <PRODUKT>_ORG eller .forspring.json.";
        };
        readonly en: {
            readonly title: "Choose an organisation";
            readonly text: "You are in several organisations and none of them was named.";
            readonly fix: "Pick the one to work in.";
            readonly agent: "An agent names it with --org, <PRODUCT>_ORG or .forspring.json.";
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
            readonly title: "This organisation does not exist, or you are not in it";
            readonly text: "We cannot show you anything from an organisation you are not in.";
            readonly fix: "Check the address, or pick one of your own organisations. An admin of the organisation can add you.";
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
            readonly text: "You are in the organisation, but you have not been given this product.";
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
            readonly title: "This product is paused for the organisation";
            readonly text: "Billing has stopped, so nobody in the organisation can use the product right now.";
            readonly fix: "An owner can start it again on the billing page.";
        };
    };
    readonly role_too_low: {
        readonly status: 403;
        readonly exit: 4;
        readonly da: {
            readonly title: "Dit adgangsniveau rækker ikke til det her";
            readonly text: "Du er med i organisationen, men det kræver et højere adgangsniveau.";
            readonly fix: "Bed en ejer eller administrator om at gøre det eller give dig et højere adgangsniveau.";
        };
        readonly en: {
            readonly title: "Your access level cannot do this";
            readonly text: "You are in the organisation, but this needs a higher access level.";
            readonly fix: "Ask an owner or admin to do it, or to raise your access level.";
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
            readonly title: "The key is for another organisation";
            readonly text: "The key or token is for another organisation than the one in the address.";
            readonly fix: "Use a key for this organisation, or the address of the key's own.";
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
/** The fix for an API, CLI or MCP answer: the person's words, then the agent's when the reason has
 *  them. A page uses `fix` alone. */
export declare function agentFix(reason: Refusal, lang?: "da" | "en"): string;
export type SignInRefusal = "rate_limited" | "account_error" | "bad_request" | "no_login" | "expired" | "binding_mismatch" | "iss_mismatch" | "token_exchange_failed" | "invalid_id_token" | "email_not_verified" | "auth_too_old" | "product_refused";
export type SignInRefusalInfo = {
    status: number;
    da: RefusalText;
    en: RefusalText;
};
export declare const SIGN_IN_REFUSALS: {
    readonly rate_limited: {
        readonly status: 429;
        readonly da: {
            readonly title: "For mange login lige nu";
            readonly text: "Der er startet mange login fra dit netværk lige nu.";
            readonly fix: "Vent et minut, og prøv igen.";
        };
        readonly en: {
            readonly title: "Too many sign-ins right now";
            readonly text: "Many sign-ins were started from your network just now.";
            readonly fix: "Wait a minute and try again.";
        };
    };
    readonly account_error: {
        readonly status: 400;
        readonly da: {
            readonly title: "Login blev ikke gennemført";
            readonly text: "Din Forspring-konto stoppede login, fx fordi det blev annulleret.";
            readonly fix: "Prøv at logge ind igen.";
        };
        readonly en: {
            readonly title: "The sign-in was not completed";
            readonly text: "Your Forspring account stopped the sign-in, for example because it was cancelled.";
            readonly fix: "Try signing in again.";
        };
    };
    readonly bad_request: {
        readonly status: 400;
        readonly da: {
            readonly title: "Login-linket var ufuldstændigt";
            readonly text: "Siden fik ikke alt det, den skal bruge for at logge dig ind.";
            readonly fix: "Start login forfra.";
        };
        readonly en: {
            readonly title: "The sign-in link was incomplete";
            readonly text: "This page did not get everything it needs to sign you in.";
            readonly fix: "Start signing in again.";
        };
    };
    readonly no_login: {
        readonly status: 400;
        readonly da: {
            readonly title: "Dette login er allerede brugt";
            readonly text: "Linket hører til et login, der allerede er brugt, eller som vi ikke kender.";
            readonly fix: "Start login forfra.";
        };
        readonly en: {
            readonly title: "This sign-in has been used already";
            readonly text: "The link belongs to a sign-in that has been used already, or that we don't know.";
            readonly fix: "Start signing in again.";
        };
    };
    readonly expired: {
        readonly status: 400;
        readonly da: {
            readonly title: "Login udløb";
            readonly text: "Der gik mere end 10 minutter, fra login blev startet, til det blev gennemført.";
            readonly fix: "Start login forfra.";
        };
        readonly en: {
            readonly title: "The sign-in expired";
            readonly text: "More than 10 minutes passed between starting the sign-in and finishing it.";
            readonly fix: "Start signing in again.";
        };
    };
    readonly binding_mismatch: {
        readonly status: 400;
        readonly da: {
            readonly title: "Login blev startet i en anden browser";
            readonly text: "Et login skal gennemføres i den browser, det blev startet i. Det sker fx, når et link åbner i en apps egen browser.";
            readonly fix: "Åbn siden i den browser, du vil bruge (fx Safari), og gennemfør login dér.";
        };
        readonly en: {
            readonly title: "The sign-in was started in another browser";
            readonly text: "A sign-in has to finish in the browser it was started in. This happens, for example, when a link opens in an app's own browser.";
            readonly fix: "Open this page in the browser you want to use (for example Safari) and finish signing in there.";
        };
    };
    readonly iss_mismatch: {
        readonly status: 400;
        readonly da: {
            readonly title: "Svaret kom ikke fra Forspring";
            readonly text: "Svaret på dit login kom ikke fra din Forspring-konto, så vi brugte det ikke.";
            readonly fix: "Start login forfra.";
        };
        readonly en: {
            readonly title: "The answer did not come from Forspring";
            readonly text: "The answer to your sign-in did not come from your Forspring account, so we did not use it.";
            readonly fix: "Start signing in again.";
        };
    };
    readonly token_exchange_failed: {
        readonly status: 502;
        readonly da: {
            readonly title: "Vi kunne ikke gennemføre login";
            readonly text: "Din Forspring-konto svarede ikke, da vi skulle gennemføre login.";
            readonly fix: "Prøv igen om lidt.";
        };
        readonly en: {
            readonly title: "We could not finish the sign-in";
            readonly text: "Your Forspring account did not answer when we tried to finish the sign-in.";
            readonly fix: "Try again in a moment.";
        };
    };
    readonly invalid_id_token: {
        readonly status: 400;
        readonly da: {
            readonly title: "Login kunne ikke bekræftes";
            readonly text: "Svaret fra din Forspring-konto bestod ikke vores kontrol.";
            readonly fix: "Start login forfra.";
        };
        readonly en: {
            readonly title: "The sign-in could not be confirmed";
            readonly text: "The answer from your Forspring account did not pass our checks.";
            readonly fix: "Start signing in again.";
        };
    };
    readonly email_not_verified: {
        readonly status: 403;
        readonly da: {
            readonly title: "Din e-mail er ikke bekræftet";
            readonly text: "Din Forspring-konto har ingen bekræftet e-mailadresse.";
            readonly fix: "Bekræft din e-mail fra mailen fra Forspring, og log ind igen.";
        };
        readonly en: {
            readonly title: "Your email is not confirmed";
            readonly text: "Your Forspring account has no confirmed email address.";
            readonly fix: "Confirm your email from Forspring's mail, then sign in again.";
        };
    };
    readonly auth_too_old: {
        readonly status: 401;
        readonly da: {
            readonly title: "Log ind igen";
            readonly text: "Det er for længe siden, du sidst loggede ind på din Forspring-konto.";
            readonly fix: "Log ind igen, så kommer du tilbage hertil.";
        };
        readonly en: {
            readonly title: "Please sign in again";
            readonly text: "It has been too long since you last signed in to your Forspring account.";
            readonly fix: "Sign in again and you will come back here.";
        };
    };
    readonly product_refused: {
        readonly status: 403;
        readonly da: {
            readonly title: "Du kan ikke logge ind her";
            readonly text: "Din Forspring-konto er i orden, men dette produkt lukkede dig ikke ind.";
            readonly fix: "Spørg en administrator i din organisation.";
        };
        readonly en: {
            readonly title: "You can't sign in here";
            readonly text: "Your Forspring account is fine, but this product did not let you in.";
            readonly fix: "Ask an admin in your organisation.";
        };
    };
};
/** For a reason this package does not know yet (a newer suite-signin): the general words. */
export declare const SIGN_IN_REFUSAL_FALLBACK: SignInRefusalInfo;
export declare const SIGN_IN_REFUSAL_REASONS: SignInRefusal[];
export declare const isSignInRefusal: (s: unknown) => s is SignInRefusal;
/** The words for a sign-in refusal (any string: a reason from the URL is untrusted), and its HTTP status. */
export declare function signInRefusal(reason: string, lang: "da" | "en"): RefusalText & {
    status: number;
    reason: SignInRefusal | "unknown";
};

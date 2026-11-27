// The suite's one vocabulary for refusals (hub D-99, docs/one-way-in.md "One vocabulary for
// refusals"). Every product refuses with one of these reasons, on the web, in its API, its CLI and its
// MCP, so a person and an agent read the same words everywhere. The texts are the package's, in
// Danish first and English, so no product rewords them; what is specific to one refusal (whose org,
// which admins, the command that fixes it) is the product's to add, and pages.ts renders it.
//
// No markup and no dependencies: a CLI or an MCP server imports this alone (@forspring/ui/refusals).

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

export const REFUSALS = {
  not_signed_in: {
    status: 401,
    exit: 4,
    da: {
      title: "Du er ikke logget ind",
      text: "Siden kræver, at du er logget ind med din Forspring-konto.",
      fix: "Log ind, så kommer du tilbage hertil.",
      agent: "En agent kører auth login.",
    },
    en: {
      title: "You are not signed in",
      text: "This page needs you to be signed in with your Forspring account.",
      fix: "Sign in and you will come back here.",
      agent: "An agent runs auth login.",
    },
  },
  org_required: {
    status: 400,
    exit: 2,
    da: {
      title: "Vælg en organisation",
      text: "Du er med i flere organisationer, og der er ikke valgt en af dem.",
      fix: "Vælg den, du vil arbejde i.",
      agent: "En agent angiver den med --org, <PRODUKT>_ORG eller .forspring.json.",
    },
    en: {
      title: "Choose an organisation",
      text: "You are in several organisations and none of them was named.",
      fix: "Pick the one to work in.",
      agent: "An agent names it with --org, <PRODUCT>_ORG or .forspring.json.",
    },
  },
  // A 404, the same as an organisation that does not exist, so its name cannot be probed.
  not_a_member: {
    status: 404,
    exit: 3,
    da: {
      title: "Organisationen findes ikke, eller du er ikke med i den",
      text: "Vi kan ikke vise dig noget fra en organisation, du ikke er med i.",
      fix: "Tjek adressen, eller vælg en af dine egne organisationer. En administrator i organisationen kan invitere dig.",
    },
    en: {
      title: "This organisation does not exist, or you are not in it",
      text: "We cannot show you anything from an organisation you are not in.",
      fix: "Check the address, or pick one of your own organisations. An admin of the organisation can add you.",
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
      text: "You are in the organisation, but you have not been given this product.",
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
      title: "This product is paused for the organisation",
      text: "Billing has stopped, so nobody in the organisation can use the product right now.",
      fix: "An owner can start it again on the billing page.",
    },
  },
  role_too_low: {
    status: 403,
    exit: 4,
    da: {
      title: "Dit adgangsniveau rækker ikke til det her",
      text: "Du er med i organisationen, men det kræver et højere adgangsniveau.",
      fix: "Bed en ejer eller administrator om at gøre det eller give dig et højere adgangsniveau.",
    },
    en: {
      title: "Your access level cannot do this",
      text: "You are in the organisation, but this needs a higher access level.",
      fix: "Ask an owner or admin to do it, or to raise your access level.",
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
      title: "The key is for another organisation",
      text: "The key or token is for another organisation than the one in the address.",
      fix: "Use a key for this organisation, or the address of the key's own.",
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
} as const satisfies Record<string, RefusalInfo>;

/** A stable, machine-readable refusal reason. */
export type Refusal = keyof typeof REFUSALS;

/** Every reason, in the order of the hub's table. */
export const REFUSAL_REASONS = Object.keys(REFUSALS) as Refusal[];

export const isRefusal = (s: unknown): s is Refusal => typeof s === "string" && Object.hasOwn(REFUSALS, s);

/** The fix for an API, CLI or MCP answer: the person's words, then the agent's when the reason has
 *  them. A page uses `fix` alone. */
export function agentFix(reason: Refusal, lang: "da" | "en" = "en"): string {
  const w: RefusalText = REFUSALS[reason][lang];
  return w.agent ? `${w.fix} ${w.agent}` : w.fix;
}

// --- Sign-in refusals (D-80) ------------------------------------------------------------------------
// Why a sign-in made no session: forspringai/suite-signin's CallbackRefusal (src/types.ts, 972c94c), plus
// rate_limited, which its start can answer too. suite-signin returns only the reason and each product drew its
// own page, so the words differed and most products showed none (Peter met binding_mismatch on his phone, 27 Nov:
// a sign-in started in an app's own browser and finished in Safari). The texts are the package's, Danish first,
// for a person on a page: never a command (D-35). A product adds what is its own (product_refused's detail).

export type SignInRefusal =
  | "rate_limited"
  | "account_error"
  | "bad_request"
  | "no_login"
  | "expired"
  | "binding_mismatch"
  | "iss_mismatch"
  | "token_exchange_failed"
  | "invalid_id_token"
  | "email_not_verified"
  | "auth_too_old"
  | "product_refused";

export type SignInRefusalInfo = { status: number; da: RefusalText; en: RefusalText };

const AGAIN = { da: "Start login forfra.", en: "Start signing in again." } as const;

export const SIGN_IN_REFUSALS = {
  rate_limited: {
    status: 429,
    da: { title: "For mange login lige nu", text: "Der er startet mange login fra dit netværk lige nu.", fix: "Vent et minut, og prøv igen." },
    en: { title: "Too many sign-ins right now", text: "Many sign-ins were started from your network just now.", fix: "Wait a minute and try again." },
  },
  account_error: {
    status: 400,
    da: { title: "Login blev ikke gennemført", text: "Din Forspring-konto stoppede login, fx fordi det blev annulleret.", fix: "Prøv at logge ind igen." },
    en: { title: "The sign-in was not completed", text: "Your Forspring account stopped the sign-in, for example because it was cancelled.", fix: "Try signing in again." },
  },
  bad_request: {
    status: 400,
    da: { title: "Login-linket var ufuldstændigt", text: "Siden fik ikke alt det, den skal bruge for at logge dig ind.", fix: AGAIN.da },
    en: { title: "The sign-in link was incomplete", text: "This page did not get everything it needs to sign you in.", fix: AGAIN.en },
  },
  no_login: {
    status: 400,
    da: { title: "Dette login er allerede brugt", text: "Linket hører til et login, der allerede er brugt, eller som vi ikke kender.", fix: AGAIN.da },
    en: { title: "This sign-in has been used already", text: "The link belongs to a sign-in that has been used already, or that we don't know.", fix: AGAIN.en },
  },
  expired: {
    status: 400,
    da: { title: "Login udløb", text: "Der gik mere end 10 minutter, fra login blev startet, til det blev gennemført.", fix: AGAIN.da },
    en: { title: "The sign-in expired", text: "More than 10 minutes passed between starting the sign-in and finishing it.", fix: AGAIN.en },
  },
  binding_mismatch: {
    status: 400,
    da: {
      title: "Login blev startet i en anden browser",
      text: "Et login skal gennemføres i den browser, det blev startet i. Det sker fx, når et link åbner i en apps egen browser.",
      fix: "Åbn siden i den browser, du vil bruge (fx Safari), og gennemfør login dér.",
    },
    en: {
      title: "The sign-in was started in another browser",
      text: "A sign-in has to finish in the browser it was started in. This happens, for example, when a link opens in an app's own browser.",
      fix: "Open this page in the browser you want to use (for example Safari) and finish signing in there.",
    },
  },
  iss_mismatch: {
    status: 400,
    da: { title: "Svaret kom ikke fra Forspring", text: "Svaret på dit login kom ikke fra din Forspring-konto, så vi brugte det ikke.", fix: AGAIN.da },
    en: { title: "The answer did not come from Forspring", text: "The answer to your sign-in did not come from your Forspring account, so we did not use it.", fix: AGAIN.en },
  },
  token_exchange_failed: {
    status: 502,
    da: { title: "Vi kunne ikke gennemføre login", text: "Din Forspring-konto svarede ikke, da vi skulle gennemføre login.", fix: "Prøv igen om lidt." },
    en: { title: "We could not finish the sign-in", text: "Your Forspring account did not answer when we tried to finish the sign-in.", fix: "Try again in a moment." },
  },
  invalid_id_token: {
    status: 400,
    da: { title: "Login kunne ikke bekræftes", text: "Svaret fra din Forspring-konto bestod ikke vores kontrol.", fix: AGAIN.da },
    en: { title: "The sign-in could not be confirmed", text: "The answer from your Forspring account did not pass our checks.", fix: AGAIN.en },
  },
  email_not_verified: {
    status: 403,
    da: { title: "Din e-mail er ikke bekræftet", text: "Din Forspring-konto har ingen bekræftet e-mailadresse.", fix: "Bekræft din e-mail fra mailen fra Forspring, og log ind igen." },
    en: { title: "Your email is not confirmed", text: "Your Forspring account has no confirmed email address.", fix: "Confirm your email from Forspring's mail, then sign in again." },
  },
  auth_too_old: {
    status: 401,
    da: { title: "Log ind igen", text: "Det er for længe siden, du sidst loggede ind på din Forspring-konto.", fix: "Log ind igen, så kommer du tilbage hertil." },
    en: { title: "Please sign in again", text: "It has been too long since you last signed in to your Forspring account.", fix: "Sign in again and you will come back here." },
  },
  product_refused: {
    status: 403,
    da: { title: "Du kan ikke logge ind her", text: "Din Forspring-konto er i orden, men dette produkt lukkede dig ikke ind.", fix: "Spørg en administrator i din organisation." },
    en: { title: "You can't sign in here", text: "Your Forspring account is fine, but this product did not let you in.", fix: "Ask an admin in your organisation." },
  },
} as const satisfies Record<SignInRefusal, SignInRefusalInfo>;

/** For a reason this package does not know yet (a newer suite-signin): the general words. */
export const SIGN_IN_REFUSAL_FALLBACK: SignInRefusalInfo = {
  status: 400,
  da: { title: "Login mislykkedes", text: "Noget gik galt, mens vi loggede dig ind.", fix: AGAIN.da },
  en: { title: "Sign-in failed", text: "Something went wrong while signing you in.", fix: AGAIN.en },
};

export const SIGN_IN_REFUSAL_REASONS = Object.keys(SIGN_IN_REFUSALS) as SignInRefusal[];

export const isSignInRefusal = (s: unknown): s is SignInRefusal => typeof s === "string" && Object.hasOwn(SIGN_IN_REFUSALS, s);

/** The words for a sign-in refusal (any string: a reason from the URL is untrusted), and its HTTP status. */
export function signInRefusal(reason: string, lang: "da" | "en"): RefusalText & { status: number; reason: SignInRefusal | "unknown" } {
  const info: SignInRefusalInfo = isSignInRefusal(reason) ? SIGN_IN_REFUSALS[reason] : SIGN_IN_REFUSAL_FALLBACK;
  return { ...info[lang], status: info.status, reason: isSignInRefusal(reason) ? reason : "unknown" };
}

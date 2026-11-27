export type SuiteLang = "da" | "en";
export type SuiteProduct = {
    key: "dataspring" | "sitespring" | "appspring" | "pulsespring" | "flowspring";
    name: string;
    /** The site's address in each language. */
    url: Readonly<Record<SuiteLang, string>>;
    /** The product's one line, from the hub's docs/brand/vision.md suite table, word for word. */
    line: string;
};
/** Forspring, which every row and llms.txt names first. */
export declare const FORSPRING: {
    readonly name: "Forspring";
    readonly url: "https://forspring.ai";
};
/**
 * The products with a site, in vision.md's order. Spring and BrainSpring have no site yet, so they are not
 * listed; add each one here when its site exists, and every site picks it up at its next build.
 */
export declare const SUITE: readonly SuiteProduct[];
/**
 * The footer's suite row as HTML: "Part of Forspring: DataSpring · SiteSpring · ...", each product linked to
 * its site in the page's language, the page's own product plain text with aria-current="page". Styled by
 * components.css .suite-row (muted, the content's small step, a line of its own).
 */
export declare function suiteRow(o: {
    lang: SuiteLang;
    current?: SuiteProduct["key"];
}): string;
/**
 * llms.txt's closing section, "## The Forspring suite", in English as every llms.txt is: the site's own
 * product first in the sentence, then every product's one line and address (the page's own unlinked).
 */
export declare function suiteLlms(o: {
    current?: SuiteProduct["key"];
}): string;

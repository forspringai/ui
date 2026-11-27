// The Forspring suite on every product site (ui brand/marketing.md section 10, D-73; hub tick q2v): the
// list once, and the two places every site shows it, so a new product's site is one edit here, not five.
// Self-contained (no import) and strings out, so a SiteSpring site can vendor this one file beside the
// tokens and a server-rendered product can import it from @forspring/ui/suite.
/** Forspring, which every row and llms.txt names first. */
export const FORSPRING = { name: "Forspring", url: "https://forspring.ai" };
/**
 * The products with a site, in vision.md's order. Spring and BrainSpring have no site yet, so they are not
 * listed; add each one here when its site exists, and every site picks it up at its next build.
 */
export const SUITE = [
    { key: "dataspring", name: "DataSpring", url: { da: "https://dataspring.app", en: "https://dataspring.app/en" }, line: "One true set of numbers, from the systems you already run." },
    { key: "sitespring", name: "SiteSpring", url: { da: "https://sitespring.app", en: "https://sitespring.app/en" }, line: "A fast website that agents build and keep up to date." },
    { key: "appspring", name: "AppSpring", url: { da: "https://appspring.app", en: "https://appspring.app/en/" }, line: "The building blocks for your own internal tools." },
    { key: "pulsespring", name: "PulseSpring", url: { da: "https://pulsespring.app", en: "https://pulsespring.app/en/" }, line: "It checks that everything we run for you is alive, and opens a case when it isn't." },
    { key: "flowspring", name: "FlowSpring", url: { da: "https://www.flowspring.app", en: "https://www.flowspring.app/en/" }, line: "The processes a company repeats, run on their own, step by step." },
];
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
/**
 * The footer's suite row as HTML: "Part of Forspring: DataSpring · SiteSpring · ...", each product linked to
 * its site in the page's language, the page's own product plain text with aria-current="page". Styled by
 * components.css .suite-row (muted, the content's small step, a line of its own).
 */
export function suiteRow(o) {
    const items = SUITE.map((p) => (p.key === o.current ? `<span aria-current="page">${esc(p.name)}</span>` : `<a href="${esc(p.url[o.lang])}" hreflang="${o.lang}">${esc(p.name)}</a>`));
    return `<p class="suite-row">${o.lang === "en" ? "Part of" : "En del af"} <a href="${FORSPRING.url}">${FORSPRING.name}</a>: ${items.join(" · ")}</p>`;
}
/**
 * llms.txt's closing section, "## The Forspring suite", in English as every llms.txt is: the site's own
 * product first in the sentence, then every product's one line and address (the page's own unlinked).
 */
export function suiteLlms(o) {
    const own = SUITE.find((p) => p.key === o.current)?.name ?? "This site";
    const lines = SUITE.map((p) => (p.key === o.current ? `- ${p.name}: ${p.line}` : `- [${p.name}](${p.url.en.replace(/\/en\/?$/, "")}): ${p.line}`));
    return `## The Forspring suite\n\n${own} is part of ${FORSPRING.name} (${FORSPRING.url}), a Danish company that delivers results, not licences.\n\n${lines.join("\n")}\n`;
}

import { html } from "@forspring/ui/html";

const WORDS = { switchOrg: "Switch organization" };

export function whereMenu(orgs: { slug: string; name: string; current: boolean }[], path: string) {
  return html`<p class="bar-panel-label">${WORDS.switchOrg}</p><ul>${orgs.map((o) => html`<li><a href="/o/${o.slug}${path}"${o.current ? ' aria-current="true"' : ""}>${o.name}</a></li>`)}</ul>`;
}

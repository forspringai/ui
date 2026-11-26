import { button, html } from "@forspring/ui/html";

export async function picker(team: string, candidates: { id: string; name: string; role: "owner" | "admin" }[], seal: (id: string) => Promise<string>) {
  const rows = await Promise.all(
    candidates.map(async (c) => {
      const sealed = await seal(c.id);
      return html`<li><span class="grow"><span class="name">${c.name}</span></span>${button({ label: c.name, type: "submit", name: "c", value: sealed })}</li>`;
    }),
  );
  return { title: { da: `Forbind Slack-workspacet ${team} med hvilken organisation?`, en: `Connect the Slack workspace ${team} to which organisation?` }, rows };
}

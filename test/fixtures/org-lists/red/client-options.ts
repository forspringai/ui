// An invented console's client script (lead-ui's suite scan, 2026-11-27): an empty <select> in the page,
// its options built in script from the orgs an API returns. No org word beside it.
type Orgs = { orgs: { org_id: string; name: string }[] };
const el = (tag: string, props: Record<string, string>) => Object.assign(document.createElement(tag), props);

export async function fillDevicePicker(select: HTMLSelectElement) {
  const r: Orgs = await (await fetch("/api/me/orgs")).json();
  select.replaceChildren(...r.orgs.map((o) => el("option", { value: o.org_id, textContent: o.name })));
}

export function fillWithOption(select: HTMLSelectElement, memberships: { id: string; name: string }[]) {
  select.append(...memberships.map((m) => new Option(m.name, m.id)));
}

import { orgList } from "@forspring/ui/html";
import { chooseOrgPage, orgPicker } from "@forspring/ui/pages";

// "Choose an organization" is the package's heading; this file only calls it.
export function bind(team: string, candidates: { name: string; role: "owner" | "admin"; sealed: string }[], csrf: string) {
  return orgPicker({
    lang: "da",
    connecting: { kind: "Slack-workspace", name: team },
    action: "/slack/bind/choose",
    name: "c",
    fields: { csrf },
    orgs: candidates.map((c) => ({ name: c.name, role: c.role, value: c.sealed })),
  });
}

export function noOrgInUrl(orgs: { slug: string; name: string; role: "admin" }[]) {
  return chooseOrgPage({ lang: "en", orgs: orgs.map((o) => ({ ...o, href: `/o/${o.slug}/` })) });
}

export function switcher(orgs: { slug: string; name: string; role: "member"; current: boolean }[], path: string) {
  return orgList({ lang: "en", menu: true, links: orgs.map((o) => ({ name: o.name, role: o.role, href: `/o/${o.slug}${path}`, current: o.current })) });
}

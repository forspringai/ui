// Sentences that mention an organisation without being an org list, and lists that are not of orgs.
export const WORDS = {
  switchFailed: "Failed to switch organization.",
  noOrgBody: "Choose an organization to see its connection address.",
  unknown: (org: string) => `I can't tell which organisation "${org}" is: name it by its id.`,
};

export function roleSelect(roles: string[], current: string) {
  return `<select name="role">${roles.map((r) => `<option value="${r}"${r === current ? " selected" : ""}>${r}</option>`).join("")}</select>`;
}

export function ids(orgs: { id: string }[]) {
  return orgs.map((o) => o.id);
}

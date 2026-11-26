import { field } from "@forspring/ui/html";

export function consentOrg(props: { orgs: { id: string; name: string }[]; preselected?: string }) {
  return field({
    label: "Organisation",
    name: "org_id",
    control: "select",
    options: props.orgs.map((org) => ({ value: org.id, label: org.name, selected: org.id === props.preselected })),
  });
}

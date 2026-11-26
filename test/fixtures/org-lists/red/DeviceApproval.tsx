import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";

export function DeviceOrg({ orgs, value, onChange }: { orgs: { id: string; name: string; role: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label="Organization">
        <SelectValue placeholder="Choose an organization" />
      </SelectTrigger>
      <SelectContent>
        {orgs.map((org) => (
          <SelectItem key={org.id} value={org.id}>
            {org.name} ({org.role})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

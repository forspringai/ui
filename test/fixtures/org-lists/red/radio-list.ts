const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export function rows(choices: { org: string; name: string }[]) {
  return choices
    .map((c) => `<li><label><input type="radio" name="org" value="${esc(c.org)}"><span class="grow">${esc(c.name)}</span></label></li>`)
    .join("");
}

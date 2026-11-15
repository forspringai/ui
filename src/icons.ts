// @forspring/ui/icons: one export per icon and iconSvg(), for a client bundle that draws a few fixed
// icons (D-40). Import only the names you draw; a bundler leaves the rest out. icon() in ./html.ts
// draws through the same iconSvg(), so both write the same bytes. For a name known only at run time
// use icon(name), which needs the whole table; draw that where the HTML is made.

export * from "./icons/paths.ts";

// The same escaping as esc() in ./html.ts, kept here so this entry pulls in nothing else.
const ENTITIES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const escAttr = (s: string): string => s.replace(/[&<>"']/g, (c) => ENTITIES[c]!);

/**
 * An icon's paths (an iconX export) as inline SVG on the 24 grid in currentColor (D-26). Without a
 * label it is aria-hidden and the words beside it carry the meaning; with one it is role="img".
 */
export function iconSvg(paths: string, o: { label?: string } = {}): string {
  const a = o.label ? `role="img" aria-label="${escAttr(o.label)}"` : 'aria-hidden="true"';
  return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${a} focusable="false">${paths}</svg>`;
}

export * from "./icons/paths.ts";
/**
 * An icon's paths (an iconX export) as inline SVG on the 24 grid in currentColor (D-26). Without a
 * label it is aria-hidden and the words beside it carry the meaning; with one it is role="img".
 */
export declare function iconSvg(paths: string, o?: {
    label?: string;
}): string;

export type Rgba = [number, number, number, number];
export type TextObservation = {
    selector: string;
    size: number;
    weight: number;
    family: string;
    h1: boolean;
    gsi: boolean;
    disabled: boolean;
    fg: Rgba;
    /** The composited background, or null when a background image sits under the text. */
    bg: [number, number, number] | null;
    /** The element carrying the background image, when bg is null. */
    imageOn?: string;
};
export type BoxObservation = {
    selector: string;
    gsi: boolean;
    /** Computed border-*-radius, one string per corner ("3px", "50%", "3px 6px"). */
    radii: string[];
    /** Margins, paddings and (on flex and grid containers) gaps that are lengths in px. */
    spacing: {
        prop: string;
        px: number;
    }[];
    /** Background and visible border colours (text colour is on the text observations). */
    colours: {
        prop: string;
        rgba: Rgba;
    }[];
};
export type TargetObservation = {
    selector: string;
    width: number;
    height: number;
};
export type Observations = {
    texts: TextObservation[];
    boxes: BoxObservation[];
    /** Targets under 24 by 24 px that no exception (inline link, label, spacing) covers. */
    smallTargets: TargetObservation[];
    /** Buttons, for the 44 px floor on phones. */
    primaries: TargetObservation[];
    /** Families of the font faces the page loaded. */
    fonts: string[];
};
export declare function collect(): Observations;

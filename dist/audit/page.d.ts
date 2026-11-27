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
/** An element shadcn marked with data-slot, measured for the rich-app check (D-33). */
export type SlotObservation = {
    selector: string;
    slot: string;
    /** data-size, which shadcn sets on buttons and select triggers ("default", "sm", "icon"), or null. */
    size: string | null;
    radii: string[];
    /** Computed min-height in px; 0 for auto or none. */
    minHeight: number;
    /** The rendered height in px. */
    height: number;
    fontSize: number;
};
export type TargetObservation = {
    selector: string;
    width: number;
    height: number;
};
/** A button as drawn (D-78): its box, padding, corner, type and border, and how many lines its label takes. */
export type ButtonObservation = {
    selector: string;
    height: number;
    width: number;
    padY: number;
    padX: number;
    radius: number;
    weight: string;
    font: number;
    border: number;
    lines: number;
};
/** The page's own values of the tokens the button inventory's sizes are made of (ui's defaults where it has none). */
export type ButtonTokens = {
    control: number;
    controlSmall: number;
    touch: number;
    space1: number;
    space3: number;
    space5: number;
    space6: number;
    radius: number;
    body: number;
    small: number;
};
/** A list of organisations the page draws outside @forspring/ui's orgList() (D-59): its box and how many orgs it offers. */
export type OrgListObservation = {
    selector: string;
    orgs: number;
    kind: "links" | "choices" | "select";
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
    /** Every rendered element with a data-slot; audit.ts checks the known ones under --rich-app. */
    slots: SlotObservation[];
    /** Org lists drawn by hand, outside the package's data-forspring-org-list (D-59). */
    orgLists?: OrgListObservation[];
    /** Every button that draws a box, and the page's token values, for button-shape (D-78). */
    buttons?: ButtonObservation[];
    buttonTokens?: ButtonTokens;
};
export declare function collect(): Observations;
/** A border box in page coordinates (viewport ones for popovers), px. */
export type Box = {
    x: number;
    y: number;
    w: number;
    h: number;
};
export type ControlBox = {
    selector: string;
    box: Box;
};
export type ControlText = {
    selector: string;
    /**
     * What the eye centres (D-42): from the first line's cap top to the last line's baseline, so a
     * descender, an accent or a lowercase-only word does not move it. An icon with no words: its glyph.
     */
    inkTop: number;
    inkBottom: number;
    lines: number;
    /** The padding box: the border box less its borders. */
    boxTop: number;
    boxBottom: number;
};
/**
 * Something cut or out of place (D-42): text cut by a box that clips it with no ellipsis or line
 * clamp, text spilling out of the painted box it belongs to, a box past the window's sides, or a
 * scroller with more below and nothing that shows it.
 */
export type ClipObservation = {
    selector: string;
    kind: "cut" | "spill" | "viewport" | "scroll";
    /** px past the edge, at most. */
    by: number;
    /** The sides it crosses. */
    sides: string[];
    /** The text concerned, shortened, when there is one. */
    text: string;
};
export type StackChild = {
    selector: string;
    box: Box;
    /** An auto margin on the start side of the stack axis: a deliberate separation (an action row's far end). */
    autoBefore: boolean;
    autoAfter: boolean;
};
export type StackObservation = {
    selector: string;
    axis: "block" | "inline";
    children: StackChild[];
    /**
     * The gaps are not the author's spacing as such: a grid's tracks set them, or a flex container
     * shares out its free space (justify-content: space-*). off-scale skips these (D-42).
     */
    laidOut: boolean;
};
export type PopoverObservation = {
    selector: string;
    /** null when no trigger was found: no popovertarget, aria-controls, summary or anchor names it. */
    trigger: string | null;
    /** Viewport coordinates, measured with the trigger in view. */
    box: Box;
    triggerBox: Box | null;
    viewport: {
        w: number;
        h: number;
    };
    /** Its rows and controls at least half its inner width, each one's inset from its inner edges (D-76). */
    rows: {
        selector: string;
        start: number;
        end: number;
    }[];
};
export type RegionObservation = {
    selector: string;
    /** The region's own fill composited on the surface behind it, or null when it paints none. */
    fill: [number, number, number] | null;
    /** The nearest painted ancestor ground, composited; the page's when none paints. */
    behind: [number, number, number];
    /** The border colour composited on the surface behind, when all four sides show; else null. */
    border: [number, number, number] | null;
};
export type LayoutObservations = {
    controls: ControlBox[];
    /** Index pairs into controls that are one composite control and never measured against each other. */
    composite: [number, number][];
    texts: ControlText[];
    stacks: StackObservation[];
    regions: RegionObservation[];
    clips: ClipObservation[];
};
/**
 * The layout measurements (D-41), as collect(): one self-contained function sent to Chromium as
 * source, measuring only. The controls and composites are lead-bench's definitions
 * (D-41); audit.ts holds the thresholds.
 */
export declare function collectLayout(): LayoutObservations;
/**
 * The open popovers and menus, each with its trigger, in viewport coordinates (D-41): a details
 * element's positioned panel, and a native popover with the button that opens it. Self-contained,
 * like collect(). probePopovers() in audit.ts opens each trigger and calls it; a probe of its own
 * (the screens bench's) can do the same.
 */
export declare function collectPopovers(): PopoverObservation[];

export type OrgListRule = "words" | "control" | "class";
export type OrgListFinding = {
    file: string;
    line: number;
    rule: OrgListRule;
    text: string;
};
export type AllowEntry = {
    file: string;
    rule: OrgListRule;
    reason: string;
    tick: string;
};
export type OrgListResult = {
    ok: boolean;
    findings: OrgListFinding[];
    allowed: OrgListFinding[];
    problems: string[];
    unused: AllowEntry[];
};
/** Every finding in one file's text (`file` is how it is reported). */
export declare function scanText(file: string, src: string): OrgListFinding[];
/** Reads `.forspring-ui-allow.json` (or the given file); problems for every entry that is malformed or lacks a tick. */
export declare function readAllow(path: string): {
    entries: AllowEntry[];
    problems: string[];
};
/** Scans `roots` (paths relative to `cwd`) and applies the allowlist. */
export declare function checkOrgLists(roots: string[], o: {
    cwd: string;
    allow?: string;
}): OrgListResult;

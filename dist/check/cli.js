#!/usr/bin/env node
// forspring-ui-check: static checks a product runs in its CI, with no browser (D-59). One check so far:
//
//   forspring-ui-check org-lists [--allow <file>] [--json] <path>...
//
// Exit 0 when nothing is found (or every finding is allowlisted), 1 on a finding or a bad allowlist, 64 on a usage
// error.
import { checkOrgLists } from "./org-lists.js";
export const USAGE = `forspring-ui-check org-lists [--allow <file>] [--json] <path>...

Finds a list of organisations a product draws by hand instead of @forspring/ui's orgList() (orgPicker,
chooseOrgPage, the bar's org switcher). Paths are files or directories, relative to the current directory.
--allow  the allowlist (default .forspring-ui-allow.json): [{ "file", "rule", "reason", "tick" }].
         "file" is the path as the finding prints it (relative to where the check runs, with /);
         "rule" is a rule NAME: words, control or class (not a line number or the matched text);
         an entry without a tick fails the run, and an unused one is reported. Example:
         [{ "file": "src/admin/switch.tsx", "rule": "control",
            "reason": "operator-only switcher, moves to orgList() links", "tick": "abc" }]
--json   the result as JSON on stdout.

Rules: words (a picker's heading or label written by hand), control (a map over orgs that makes a
choice control, a control carrying an org field, a select of orgs), class (the package's org-list
classes or data-forspring-org-list written by hand).`;
function main(argv) {
    const [check, ...rest] = argv;
    if (check === "--help" || check === "-h") {
        console.log(USAGE);
        return 0;
    }
    if (check !== "org-lists") {
        console.error(`forspring-ui-check: unknown check ${JSON.stringify(check ?? "")}\n\n${USAGE}`);
        return 64;
    }
    let allow;
    let json = false;
    const roots = [];
    for (let i = 0; i < rest.length; i++) {
        const a = rest[i];
        if (a === "--allow") {
            allow = rest[++i];
            if (!allow) {
                console.error(`forspring-ui-check: --allow needs a file\n\n${USAGE}`);
                return 64;
            }
        }
        else if (a === "--json")
            json = true;
        else if (a.startsWith("-")) {
            console.error(`forspring-ui-check: unknown option ${a}\n\n${USAGE}`);
            return 64;
        }
        else
            roots.push(a);
    }
    if (roots.length === 0) {
        console.error(`forspring-ui-check: name the paths to read\n\n${USAGE}`);
        return 64;
    }
    const r = checkOrgLists(roots, { cwd: process.cwd(), allow });
    if (json)
        console.log(JSON.stringify(r, null, 2));
    else {
        for (const f of r.findings)
            console.log(`${f.file}:${f.line}: ${f.rule}: ${f.text}`);
        for (const p of r.problems)
            console.log(`allowlist: ${p}`);
        if (r.allowed.length)
            console.log(`allowed (${r.allowed.length}): ${[...new Set(r.allowed.map((f) => `${f.file} (${f.rule})`))].join(", ")}`);
        for (const e of r.unused)
            console.log(`allowlist: unused entry ${e.file} (${e.rule}), tick ${e.tick}: remove it`);
        console.log(r.ok
            ? "org-lists: no own org list"
            : `org-lists: ${r.findings.length} finding${r.findings.length === 1 ? "" : "s"}: draw org lists with @forspring/ui's orgList() / orgPicker() / chooseOrgPage(), or allowlist with a tick`);
    }
    return r.ok ? 0 : 1;
}
process.exitCode = main(process.argv.slice(2));

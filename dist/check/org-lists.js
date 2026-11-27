// forspring-ui-check org-lists (D-59): the suite has ONE org list, @forspring/ui's orgList() (orgPicker, its link
// mode, chooseOrgPage, refusedPage's orgs and the bar's org switcher draw it). This finds a product drawing its own
// list of organisations to choose from, by reading its source: no browser, so it runs in a product's CI.
//
// Three rules, each a pattern a hand-drawn org list leaves behind:
//   words    a picker's heading or label written by hand ("Choose an organization", "Skift organisation", "...to
//            which organisation?"): an imperative phrase starts its string or tag and ends it, a question ends in
//            "?", so a sentence that only mentions an organisation is not one. Comment lines are skipped.
//   control  a .map over orgs (orgs, organizations, memberships, candidates, customers, tenants) whose mapped row is a
//            choice control (a list item, link, button, input, option, SelectItem, DropdownMenuItem, ui's button(),
//            or one built in client script: createElement/el/h("option"), new Option());
//            any .map whose row is a control carrying an org field (name="org" / "org_id"); a select's options made
//            from orgs; in Python, a loop over orgs that builds <li>, <a>, <button>, <input> or <option>.
//   class    the package's own org-list class names or its data-forspring-org-list marker written by hand: only
//            the package emits them (a hand-written marker would hide a list from ui-audit's own-org-list rule).
// It cannot see a list it has no pattern for; ui-audit's own-org-list rule looks at the rendered page.
//
// Exceptions live in .forspring-ui-allow.json beside the run: [{ file, rule, reason, tick }]. An entry without a
// tick fails the run, so every exception has an owner and a way out.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
const EXTENSIONS = /\.(ts|tsx|js|jsx|mjs|cjs|astro|svelte|vue|py|html)$/;
const SKIP_DIRS = new Set(["node_modules", "dist", "build", ".git", ".wrangler", ".turbo", "coverage", "__pycache__", ".venv", "venv", "worktrees", "__tests__", "test", "tests", "fixtures", "__fixtures__"]);
const SKIP_FILES = /\.(test|spec|browser|stories)\.[a-z]+$|\.d\.ts$|\.gen\.[a-z]+$|\.min\.js$/;
// A heading or label that IS the phrase: an imperative one starts its string or tag, a question ends in "?".
const PHRASE = /(?:^|["'`>{]\s*)(?:(?:choose|select|pick|switch)(?: an?)? organi[sz]ations?|(?:vælg|skift)(?: en)? organisation)\s*[.:]?\s*(?=["'`<]|\$\{|$)|\b(?:which|hvilken) organi[sz]ation\?/i;
const COLLECTION = /\b(orgs|organi[sz]ations|memberships|candidates|customers|tenants)\??\s*\.\s*map\s*\(\s*(?:async\s*)?(?:\w+|\([^)]*\))\s*=>/g;
const ANY_MAP = /\.\s*map\s*\(\s*(?:async\s*)?(?:\w+|\([^)]*\))\s*=>/g;
// Markup, or a control built in client script: createElement("option"), a helper such as el("li", ...)
// or h("option", ...), new Option(...) (lead-ui's suite scan, 2026-11-27: SiteSpring filled two empty
// selects from r.orgs.map((o) => el("option", ...)), which the markup alone did not show).
const CONTROL = /<li[\s>]|<a\s|<button[\s>]|<input\s|<option[\s>]|<SelectItem[\s>]|<DropdownMenuItem[\s>]|\bbutton\(\s*\{|\b(?:createElement|el|h)\(\s*["'](?:li|a|button|input|option)["']|\bnew\s+Option\s*\(/;
const ORG_FIELD = /\bname\s*[=:]\s*\\?["'`]org(?:_id)?\\?["'`]/;
const OPTIONS_OF_ORGS = /\boptions\s*:\s*[\w.?]*\b(orgs|organi[sz]ations|memberships|tenants)\??\s*\.\s*map\s*\(/g;
const COMMENT = /^\s*(\/\/|\/\*|\*|#|"""|''')/;
const CLASS = /\bclass(?:Name)?\s*=\s*["'{`][^"'`}]*\b(org-picker(?:-[a-z]+)?|org-switcher|choose-org)\b|\bdata-forspring-org-list\b/;
function* files(dir) {
    let names;
    try {
        names = readdirSync(dir);
    }
    catch {
        return;
    }
    for (const n of names.sort()) {
        if (n.startsWith(".") && n !== ".")
            continue;
        const p = join(dir, n);
        let s;
        try {
            s = statSync(p);
        }
        catch {
            continue;
        }
        if (s.isDirectory()) {
            if (!SKIP_DIRS.has(n))
                yield* files(p);
        }
        else if (EXTENSIONS.test(n) && !SKIP_FILES.test(n))
            yield p;
    }
}
const lineOf = (src, at) => src.slice(0, at).split("\n").length;
const snippet = (src, at) => src.slice(src.lastIndexOf("\n", at - 1) + 1, src.indexOf("\n", at) === -1 ? undefined : src.indexOf("\n", at)).trim().slice(0, 160);
/** Every finding in one file's text (`file` is how it is reported). */
export function scanText(file, src) {
    const out = [];
    const lines = src.split("\n");
    lines.forEach((l, i) => {
        if (COMMENT.test(l))
            return;
        if (PHRASE.test(l))
            out.push({ file, line: i + 1, rule: "words", text: l.trim().slice(0, 160) });
        if (CLASS.test(l))
            out.push({ file, line: i + 1, rule: "class", text: l.trim().slice(0, 160) });
    });
    const seen = new Set();
    const control = (at) => {
        const line = lineOf(src, at);
        if (!seen.has(line))
            out.push({ file, line, rule: "control", text: snippet(src, at) });
        seen.add(line);
    };
    // A .map over orgs whose mapped row is a choice control; any .map whose row carries an org field (name="org");
    // a select's options made from orgs.
    for (const m of src.matchAll(COLLECTION))
        if (CONTROL.test(src.slice(m.index + m[0].length, m.index + m[0].length + 400)))
            control(m.index);
    for (const m of src.matchAll(ANY_MAP)) {
        const body = src.slice(m.index + m[0].length, m.index + m[0].length + 400);
        if (CONTROL.test(body) && ORG_FIELD.test(body))
            control(m.index);
    }
    for (const m of src.matchAll(OPTIONS_OF_ORGS))
        control(m.index);
    // Python: a comprehension over orgs that builds a choice control ("<li>...".format(...) for o in orgs).
    for (const m of src.matchAll(/\bfor\s+\w+\s+in\s+(\w+)\b/g)) {
        if (!file.endsWith(".py"))
            break;
        const around = src.slice(Math.max(0, m.index - 400), m.index);
        if (/["']<(li|a|button|input|option)[\s>]/.test(around) && /\b(org|orgs|organi[sz]ation)\b/.test(around + m[1]))
            out.push({ file, line: lineOf(src, m.index), rule: "control", text: snippet(src, m.index) });
    }
    return out.sort((a, b) => a.line - b.line || a.rule.localeCompare(b.rule));
}
/** Reads `.forspring-ui-allow.json` (or the given file); problems for every entry that is malformed or lacks a tick. */
export function readAllow(path) {
    if (!existsSync(path))
        return { entries: [], problems: [] };
    let raw;
    try {
        raw = JSON.parse(readFileSync(path, "utf8"));
    }
    catch (e) {
        return { entries: [], problems: [`${path}: not JSON (${e.message})`] };
    }
    if (!Array.isArray(raw))
        return { entries: [], problems: [`${path}: must be an array of { file, rule, reason, tick }`] };
    const entries = [];
    const problems = [];
    raw.forEach((e, i) => {
        const ok = e && typeof e === "object" && typeof e.file === "string" && ["words", "control", "class"].includes(e.rule) && typeof e.reason === "string" && e.reason.trim();
        if (!ok)
            problems.push(`${path}[${i}]: needs file, rule (words|control|class) and reason`);
        else if (typeof e.tick !== "string" || !e.tick.trim())
            problems.push(`${path}[${i}] ${e.file} (${e.rule}): no tick; every exception names the tick that removes it`);
        else
            entries.push(e);
    });
    return { entries, problems };
}
/** Scans `roots` (paths relative to `cwd`) and applies the allowlist. */
export function checkOrgLists(roots, o) {
    const { entries, problems } = readAllow(join(o.cwd, o.allow ?? ".forspring-ui-allow.json"));
    const all = [];
    for (const r of roots) {
        const abs = join(o.cwd, r);
        const list = existsSync(abs) && statSync(abs).isFile() ? [abs] : [...files(abs)];
        for (const f of list)
            all.push(...scanText(relative(o.cwd, f).split(sep).join("/"), readFileSync(f, "utf8")));
    }
    const used = new Set();
    const findings = [];
    const allowed = [];
    for (const f of all) {
        const e = entries.find((x) => x.file === f.file && x.rule === f.rule);
        if (e) {
            used.add(e);
            allowed.push(f);
        }
        else
            findings.push(f);
    }
    return { ok: findings.length === 0 && problems.length === 0, findings, allowed, problems, unused: entries.filter((e) => !used.has(e)) };
}

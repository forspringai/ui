// forspring-ui-check org-lists (D-59): a product's CI fails when it draws its own list of organisations instead of
// @forspring/ui's orgList(). The red fixtures copy the shapes of the hand-drawn lists the suite had (invented code);
// each must be found, by the rule that names why. The green ones (the same screens drawn with the package, and
// sentences that only mention an organisation) must not.
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { checkOrgLists, scanText } from "../src/check/org-lists.ts";

const here = join(import.meta.dirname, "fixtures/org-lists");
const rulesIn = (dir: string) => {
  const r = checkOrgLists([dir], { cwd: here });
  const by = new Map<string, Set<string>>();
  for (const f of r.findings) by.set(f.file, (by.get(f.file) ?? new Set()).add(f.rule));
  return Object.fromEntries([...by].map(([k, v]) => [k, [...v].sort()]));
};

describe("org-lists: the red cases", () => {
  test("every hand-drawn org list is found, by the rule that names it", () => {
    expect(rulesIn("red")).toEqual({
      "red/DeviceApproval.tsx": ["control", "words"],
      "red/bind-picker.ts": ["control", "words"],
      "red/client-options.ts": ["control"],
      "red/connect_picker.py": ["control", "words"],
      "red/consent-select.ts": ["control"],
      "red/hand-marker.html": ["class"],
      "red/radio-list.ts": ["control"],
      "red/where-menu.ts": ["control", "words"],
    });
  });

  test("a finding names the file and line", () => {
    const r = checkOrgLists(["red/where-menu.ts"], { cwd: here });
    expect(r.ok).toBe(false);
    expect(r.findings).toContainEqual({ file: "red/where-menu.ts", line: 3, rule: "words", text: 'const WORDS = { switchOrg: "Switch organization" };' });
    expect(r.findings.find((f) => f.rule === "control")?.line).toBe(6);
  });
});

describe("org-lists: the green cases", () => {
  test("the same screens drawn with the package, and sentences that only mention an organisation, are not found", () => {
    expect(rulesIn("green")).toEqual({});
    expect(checkOrgLists(["green"], { cwd: here }).ok).toBe(true);
  });

  test("words: only a heading or label that is the phrase", () => {
    for (const [line, hit] of [
      ['<h1>Choose an organization</h1>', true],
      ['"Vælg en organisation"', true],
      ["'Skift organisation'", true],
      ["`Connect ${x} to which organisation?`", true],
      ['"Failed to switch organization."', false],
      ['"Choose an organization to see its address."', false],
      ['// "Choose an organization" in a comment', false],
    ] as const)
      expect(scanText("f.ts", line).some((f) => f.rule === "words"), line).toBe(hit);
  });
});

describe("org-lists: the allowlist", () => {
  const withAllow = (entries: unknown) => {
    const dir = mkdtempSync(join(tmpdir(), "org-lists-"));
    writeFileSync(join(dir, "page.ts"), 'export const rows = (orgs: { id: string }[]) => orgs.map((o) => `<li><a href="/o/${o.id}/">x</a></li>`);\n');
    writeFileSync(join(dir, ".forspring-ui-allow.json"), JSON.stringify(entries));
    try {
      return checkOrgLists(["page.ts"], { cwd: dir });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  };

  test("an entry with a reason and a tick lets that file's finding through, and says so", () => {
    const r = withAllow([{ file: "page.ts", rule: "control", reason: "moves to orgList with the next release", tick: "abc" }]);
    expect(r.ok).toBe(true);
    expect(r.findings).toEqual([]);
    expect(r.allowed).toHaveLength(1);
  });

  test("an entry without a tick fails the run, and lets nothing through", () => {
    const r = withAllow([{ file: "page.ts", rule: "control", reason: "later" }]);
    expect(r.ok).toBe(false);
    expect(r.problems[0]).toMatch(/no tick/);
    expect(r.findings).toHaveLength(1);
  });

  test("an entry for another rule does not cover this one; an unused entry is reported", () => {
    const r = withAllow([{ file: "page.ts", rule: "words", reason: "r", tick: "t" }]);
    expect(r.ok).toBe(false);
    expect(r.unused).toHaveLength(1);
  });
});

// The built bin (dist/, as a product runs it; test/build.test.ts holds dist/ to the source).
describe("the bin", () => {
  test("exit 1 with file:line on red, 0 on green, 64 on a usage error", () => {
    const run = (...args: string[]) => {
      try {
        return { code: 0, out: execFileSync(process.execPath, [join(import.meta.dirname, "../dist/check/cli.js"), ...args], { cwd: here, encoding: "utf8" }) };
      } catch (e) {
        const x = e as { status: number; stdout: string; stderr: string };
        return { code: x.status, out: x.stdout + x.stderr };
      }
    };
    const red = run("org-lists", "red");
    expect(red.code).toBe(1);
    expect(red.out).toContain("red/where-menu.ts:6: control:");
    expect(run("org-lists", "green")).toMatchObject({ code: 0 });
    expect(run("org-lists").code).toBe(64);
    expect(run("nope", "x").code).toBe(64);
  });
});

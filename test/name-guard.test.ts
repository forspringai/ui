import { describe, expect, test } from "vitest";
import { findHits, grams, hash, normalize } from "../scripts/name-guard.ts";

// Invented names only (D-55): the guard's own test must not hold a real one.
describe("name-guard", () => {
  test("normalizes case, Danish letters, accents and punctuation", () => {
    expect(normalize("Blåbær ApS")).toBe("blaabaer aps");
    expect(normalize("  Café-Nord.example ")).toBe("cafe nord example");
    expect(hash("INITECH")).toBe(hash("initech"));
  });

  test("grams are the one- to four-word runs of a line", () => {
    expect(grams("a b c")).toEqual(["a", "b", "c", "a b", "b c", "a b c"]);
  });

  test("finds a listed name as whole words, in any case, and nothing else", () => {
    const list = new Set([hash("Initech"), hash("Vandelay Industries")]);
    const text = ["ok line", "path /o/initech/runs", "VANDELAY  industries was here", "initechnology is not a match", "vandelay alone is not"].join("\n");
    expect(findHits(text, list)).toEqual([2, 3]);
  });
});

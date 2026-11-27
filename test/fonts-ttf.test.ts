// The TTF copies (D-71) that a TrueType-only renderer (resvg, SiteSpring's share images) loads: static, the
// family and weight the CSS asks for, and Archivo Condensed's advances the ones shareImage() wraps with.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";
import { ADVANCE } from "../src/share-image.ts";

const fonts = join(import.meta.dirname, "..", "fonts");

// Just enough of the TrueType format: the table directory, head, hhea, hmtx, OS/2, name and a format 4 cmap.
function ttf(file: string) {
  const b = readFileSync(join(fonts, file));
  const tables = new Map<string, number>();
  for (let i = 0; i < b.readUInt16BE(4); i++) tables.set(b.toString("latin1", 12 + i * 16, 16 + i * 16), b.readUInt32BE(20 + i * 16));
  const at = (t: string) => tables.get(t)!;
  const upem = b.readUInt16BE(at("head") + 18);
  const metrics = b.readUInt16BE(at("hhea") + 34);
  const advance = (g: number) => b.readUInt16BE(at("hmtx") + Math.min(g, metrics - 1) * 4);
  let sub = 0;
  for (let i = 0; i < b.readUInt16BE(at("cmap") + 2); i++) {
    const r = at("cmap") + 4 + i * 8;
    if (b.readUInt16BE(r) === 3 && b.readUInt16BE(r + 2) === 1) sub = at("cmap") + b.readUInt32BE(r + 4);
  }
  const segs = b.readUInt16BE(sub + 6) / 2;
  const glyph = (code: number) => {
    for (let s = 0; s < segs; s++) {
      const end = b.readUInt16BE(sub + 14 + s * 2), start = b.readUInt16BE(sub + 16 + segs * 2 + s * 2);
      if (code > end || code < start) continue;
      const delta = b.readInt16BE(sub + 16 + segs * 4 + s * 2), roAt = sub + 16 + segs * 6 + s * 2, ro = b.readUInt16BE(roAt);
      return ro === 0 ? (code + delta) & 0xffff : (b.readUInt16BE(roAt + ro + (code - start) * 2) + delta) & 0xffff;
    }
    return 0;
  };
  const names = new Map<number, string>();
  const n = at("name"), count = b.readUInt16BE(n + 2), strings = n + b.readUInt16BE(n + 4);
  for (let i = 0; i < count; i++) {
    const r = n + 6 + i * 12;
    if (b.readUInt16BE(r) !== 3) continue;
    const s = b.subarray(strings + b.readUInt16BE(r + 10), strings + b.readUInt16BE(r + 10) + b.readUInt16BE(r + 8));
    let t = "";
    for (let j = 0; j < s.length; j += 2) t += String.fromCharCode(s.readUInt16BE(j));
    names.set(b.readUInt16BE(r + 6), t);
  }
  return { magic: b.readUInt32BE(0), variable: tables.has("fvar"), weight: b.readUInt16BE(at("OS/2") + 4), names, perMille: (ch: string) => Math.round((advance(glyph(ch.codePointAt(0)!)) * 1000) / upem) };
}

test("Archivo Condensed 800: a static TrueType face named as the CSS names it", () => {
  const f = ttf("archivo-condensed-800.ttf");
  expect(f.magic).toBe(0x00010000);
  expect(f.variable).toBe(false);
  expect(f.weight).toBe(800);
  expect(f.names.get(16)).toBe("Archivo Condensed");
  expect(f.names.get(17)).toBe("ExtraBold");
});

test("its advances are shareImage()'s table, to a thousandth of an em", () => {
  const f = ttf("archivo-condensed-800.ttf");
  const off = Object.entries(ADVANCE).filter(([ch, w]) => Math.abs(f.perMille(ch) - w) > 1).map(([ch, w]) => `${ch}: ttf ${f.perMille(ch)}, table ${w}`);
  expect(off).toEqual([]);
});

test("Space Mono: static TrueType, regular, every character one width", () => {
  const f = ttf("space-mono.ttf");
  expect(f.magic).toBe(0x00010000);
  expect(f.variable).toBe(false);
  expect(f.weight).toBe(400);
  expect(f.names.get(1)).toBe("Space Mono");
  expect(new Set([..."flowspring.app0123456789"].map(f.perMille)).size).toBe(1);
});

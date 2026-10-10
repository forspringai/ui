// Colour arithmetic for the tests: WCAG 2.2 contrast, and OKLab distance for telling two colours
// apart, under normal vision or simulated colour blindness. The units and transforms are the dataviz
// validator's (Euclidean OKLab distance times 100; Machado, Oliveira and Fernandes 2009 at severity
// 1.0), so the chart gate here and the validator agree.

export function rgb(hex: string): [number, number, number] {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) throw new Error(`not a #rrggbb colour: ${hex}`);
  const n = parseInt(m[1]!, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => c / 255) as [number, number, number];
}

const linear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

export function luminance(hex: string): number {
  const [r, g, b] = rgb(hex).map(linear) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

type Vision = "protan" | "deutan" | "tritan";
const MACHADO: Record<Vision, number[][]> = {
  protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]],
  tritan: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.3039]],
};

function linearRgb(hex: string, vision?: Vision): [number, number, number] {
  const c = rgb(hex).map(linear) as [number, number, number];
  if (!vision) return c;
  const clamp = (x: number) => Math.max(0, Math.min(1, x));
  return MACHADO[vision].map((row) => clamp(row[0]! * c[0] + row[1]! * c[1] + row[2]! * c[2])) as [number, number, number];
}

export function oklab(hex: string, vision?: Vision): [number, number, number] {
  const [r, g, b] = linearRgb(hex, vision);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

// OKLCH lightness and chroma.
export function lc(hex: string): [number, number] {
  const [l, a, b] = oklab(hex);
  return [l, Math.hypot(a, b)];
}

export function distance(a: string, b: string, vision?: Vision): number {
  const [p, q] = [oklab(a, vision), oklab(b, vision)];
  return 100 * Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
}

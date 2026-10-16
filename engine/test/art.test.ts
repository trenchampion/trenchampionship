import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { keccak_256 } from "@noble/hashes/sha3";
import { describe, expect, it } from "vitest";

import { characterAttributes, characterImageUri, characterSvg, characterTokenUri, type Traits } from "../src/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const doc = JSON.parse(readFileSync(join(here, "..", "vectors", "art-vectors.json"), "utf8")) as {
  count: number;
  cases: { id: string; traits: number[]; name: string; svgKeccak: string; uriKeccak: string }[];
};
const hex = (u8: Uint8Array) => "0x" + Array.from(u8, (b) => b.toString(16).padStart(2, "0")).join("");
const h = (s: string) => hex(keccak_256(new TextEncoder().encode(s)));
const toTraits = (v: number[]): Traits => ({ strength: v[0]!, defense: v[1]!, speed: v[2]!, focus: v[3]!, element: v[4]!, special: v[5]!, weakness: v[6]! });

describe("character art", () => {
  it("matches the shared vectors", () => {
    expect(doc.cases.length).toBe(doc.count);
    expect(doc.count).toBeGreaterThanOrEqual(96);
    for (const c of doc.cases) {
      const t = toTraits(c.traits);
      expect(h(characterSvg(BigInt(c.id), t))).toBe(c.svgKeccak);
      expect(h(characterTokenUri(BigInt(c.id), t, c.name))).toBe(c.uriKeccak);
    }
  });

  it("produces valid metadata JSON with an SVG image and portrait attributes", () => {
    for (const c of doc.cases) {
      const uri = characterTokenUri(BigInt(c.id), toTraits(c.traits), c.name);
      expect(uri.startsWith("data:application/json;base64,")).toBe(true);
      const json = Buffer.from(uri.slice("data:application/json;base64,".length), "base64").toString("utf8");
      const meta = JSON.parse(json) as { name: string; image: string; attributes: { trait_type: string; value: string | number }[] };
      expect(meta.name).toBe(c.name);
      expect(meta.image.startsWith("data:image/svg+xml;base64,")).toBe(true);
      const svg = Buffer.from(meta.image.slice("data:image/svg+xml;base64,".length), "base64").toString("utf8");
      expect(svg.startsWith("<svg ")).toBe(true);
      expect(svg.endsWith("</svg>")).toBe(true);
      expect(svg).not.toMatch(/NaN|undefined|null/);
      expect(meta.attributes.map((a) => a.trait_type)).toEqual([
        "Strength", "Defense", "Speed", "Focus", "Element", "Special", "Weakness", "Energy",
        "Skin", "Eye Shape", "Brows", "Ears", "Marks", "Accessory", "Headgear", "Outfit", "Metal", "Eyes", "Item", "Background", "Aura",
      ]);
    }
  });

  it("uses only integer coordinates (no computed floats)", () => {
    // literal decimals in the drawing are all below 4 (opacities, thin strokes, tiny radii)
    for (const c of doc.cases) {
      const svg = characterSvg(BigInt(c.id), toTraits(c.traits));
      for (const m of svg.matchAll(/[-0-9]+\.[0-9]+/g)) expect(Number(m[0])).toBeLessThan(4);
    }
  });

  it("exposes the image uri and the attributes", () => {
    const t = toTraits([1, 1, 1, 1, 0, 0, 0]);
    expect(characterImageUri(1n, t).startsWith("data:image/svg+xml;base64,")).toBe(true);
    expect(characterAttributes(1n, t).startsWith(',{"trait_type":"Skin","value":"')).toBe(true);
  });
});

// Generates engine/vectors/art-vectors.json from the TypeScript renderer (run after `pnpm build`).
// The Solidity test contracts/test/CharacterArt.t.sol must produce the same keccak256 for each case.
// Cases are chosen so that every branch of the portrait is exercised: each element as element and as
// weakness, each special, each trait tier, each value of each id-hashed variant family, both rare
// features, the species-specific teeth and textures, and names that need JSON escaping.
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { keccak_256 } from "@noble/hashes/sha3";

import { characterTokenUri, characterSvg } from "../dist/art.js";
import { variants } from "../dist/vectorart.js";

const here = dirname(fileURLToPath(import.meta.url));
const hex = (u8) => "0x" + Array.from(u8, (b) => b.toString(16).padStart(2, "0")).join("");
const h = (s) => hex(keccak_256(new TextEncoder().encode(s)));

const cases = [];
const add = (id, traits, name) => cases.push({ id: id.toString(), traits, name });
/** First id at or after `from` whose variants satisfy `pred`. */
const find = (pred, from) => {
  for (let id = BigInt(from); id < BigInt(from) + 100000n; id++) if (pred(variants(id))) return id;
  throw new Error("no id satisfies the predicate");
};
const plain = (v) => !v.goldEyes && !v.aura;

// 1. every special (and one out of range) in both item designs, cycling elements, weaknesses and tiers
const tiers = [[15, 7, 15, 8], [9, 15, 8, 13], [11, 11, 11, 12], [10, 10, 15, 10], [11, 15, 9, 10], [9, 12, 12, 12], [8, 8, 8, 8], [13, 13, 13, 13]];
for (let sp = 0; sp <= 9; sp++) {
  for (let st = 0; st < 2; st++) {
    const id = find((v) => v.itemStyle === st && plain(v), 1000 + sp * 100 + st * 50);
    const b = tiers[(sp + st) % tiers.length];
    add(id, [b[0], b[1], b[2], b[3], (sp + st) % 5, sp, (sp + 2 + st) % 5], `Spec ${sp} style ${st}`);
  }
}

// 2. every element with every strength/defense/speed/focus tier (teeth, textures, crests, armour, eyes)
const tierVals = [8, 11, 14];
for (let e = 0; e < 5; e++) {
  for (let k = 0; k < 3; k++) {
    add(find(plain, 3000 + e * 30 + k), [tierVals[k], tierVals[(k + 1) % 3], tierVals[(k + 2) % 3], tierVals[k], e, 1 + ((e + k) % 8), (e + 1) % 5], `Tier ${e}/${k}`);
    add(find(plain, 3500 + e * 30 + k), [tierVals[(k + 2) % 3], tierVals[k], tierVals[(k + 1) % 3], tierVals[(k + 2) % 3], e, 1 + ((e + k + 3) % 8), (e + 3) % 5], `Tier2 ${e}/${k}`);
  }
}

// 3. every value of every id-hashed family, on a bare (no armour) fighter so outfits and headgear show
const families = { skin: 3, marks: 7, ears: 3, accessory: 6, background: 6, outfit: 6, brows: 3, metal: 2, iris: 2, headgear: 6, eye: 3 };
let seed = 10000;
for (const [family, n] of Object.entries(families)) {
  for (let val = 0; val < n; val++) {
    const id = find((v) => v[family] === val && plain(v), seed);
    seed += 97;
    const e = (val + seed) % 5;
    add(id, [8 + (val % 3) * 3, 8, 9 + (val % 2) * 5, 9 + (val % 3) * 3, e, (val + 1) % 9, (e + 1 + (val % 4)) % 5], `${family} ${val}`);
  }
}

// 4. rare features, alone and combined with an eye patch, hood and helmet
add(find((v) => v.goldEyes && v.accessory !== 2, 20000), [12, 8, 12, 13, 2, 6, 3], "Gold eyes");
add(find((v) => v.goldEyes && v.accessory === 2, 20000), [10, 9, 10, 8, 0, 5, 1], "Gold eyes, eye patch");
add(find((v) => v.aura, 21000), [9, 15, 8, 13, 3, 7, 4], "Aura, full plate");
add(find((v) => v.aura && v.goldEyes, 22000), [14, 10, 14, 14, 4, 4, 2], "Aura and gold eyes, hood");
add(find((v) => v.accessory === 2 && v.eye === 2, 23000), [11, 11, 11, 11, 4, 8, 0], "Eye patch, narrow eyes, hood");
add(find((v) => v.accessory === 1 && v.ears === 2, 24000), [11, 11, 11, 11, 4, 2, 0], "Earring hidden under the hood");
add(find((v) => v.accessory === 1 && v.ears === 0, 24500), [11, 11, 11, 11, 0, 2, 1], "Earring on a Fire fighter");
add(find((v) => v.headgear === 5 && v.outfit === 4, 25000), [8, 8, 8, 8, 1, 3, 2], "Feathered band and fur collar");

// 5. out-of-range element/weakness/special, extremes and names that need escaping (JSON only)
add(42n, [11, 11, 12, 11, 7, 0, 9], "Out of range element and weakness");
add(7n, [1, 15, 14, 15, 4, 8, 0], "A name of exactly 26 ch");
add(1000000n, [15, 15, 14, 1, 2, 3, 4], "Ægir & \"Sons\" <Guild> 'quote'");
add(2n ** 64n, [5, 5, 15, 20, 1, 7, 1], "Very long character name that goes past forty characters");
add(0n, [3, 4, 5, 33, 3, 2, 2], "x");
add(123456789n, [9, 9, 9, 18, 2, 5, 1], "Tab\tBreak\nName\\Back");
add(2n ** 255n, [15, 15, 15, 0, 4, 4, 3], "ü日本語 émoji 🙂");
add(2n ** 256n - 1n, [15, 15, 15, 15, 0, 1, 0], "Max id");

const seen = new Set();
const out = [];
for (const c of cases) {
  const key = `${c.id}/${c.traits.join(",")}/${c.name}`;
  if (seen.has(key)) continue;
  seen.add(key);
  const t = { strength: c.traits[0], defense: c.traits[1], speed: c.traits[2], focus: c.traits[3], element: c.traits[4], special: c.traits[5], weakness: c.traits[6] };
  const id = BigInt(c.id);
  out.push({ ...c, svgKeccak: h(characterSvg(id, t)), uriKeccak: h(characterTokenUri(id, t, c.name)) });
}
const doc = { version: 2, layout: "traits = [strength, defense, speed, focus, element, special, weakness]", count: out.length, cases: out };
writeFileSync(join(here, "..", "vectors", "art-vectors.json"), JSON.stringify(doc));
console.log(`wrote ${out.length} art cases`);

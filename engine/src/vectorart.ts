/**
 * Vector character portraits (prototype of the on-chain CharacterArt v2, style B, round 3).
 *
 * 512×512 bust, cel-shaded: flat colours with one shade plane and one light plane, dark outlines, a rim light in
 * the element colour, a species texture. Five species silhouettes (one per element), the jaw from strength,
 * eyes from focus, mouth from strength, crest from speed, armour from defense, item from the special, badge from
 * the weakness, and fifteen id-hashed variants including two rare ones. Every shape is a deterministic function of
 * (id, traits).
 *
 * Integer arithmetic only (the Solidity port must mirror every number byte for byte): no floats, no Math.round,
 * no trigonometry; every division is `idiv` (truncation toward zero, like Solidity), every curve constant is a
 * literal.
 */
import { keccak_256 } from "@noble/hashes/sha3";

import type { Traits } from "./battle.js";

const OUT = "#120d16"; // outline
const SW = 7;
const LEATHER = "#2a1710";
const GOLD = "#e2b94d";
const TEETH = "#efe9dc";

type Skin = readonly [string, string, string]; // light, base, shade
interface Pal {
  bg: string; bg2: string; ring: string;
  skins: readonly [Skin, Skin, Skin];
  a: string; ab: string; // accent and its shade (horns, feathers, bark, fins, hood)
  iris: string; glow: string;
  cloth: string; cloth2: string;
}

const PAL: readonly Pal[] = [
  { bg: "#3a0e08", bg2: "#120503", ring: "#ff6a2a", skins: [["#f5996a", "#d9542a", "#8c2f14"], ["#f7a67c", "#e2673a", "#9a3a1a"], ["#e58a62", "#b8401f", "#6e220f"]], a: "#ffb13a", ab: "#c85a12", iris: "#ffcf4a", glow: "#ffd98a", cloth: "#4a1a12", cloth2: "#24090a" },
  { bg: "#0d2638", bg2: "#040c14", ring: "#79c9ff", skins: [["#f2fbff", "#cfe6f3", "#8fb3c9"], ["#ecf6fc", "#bcd8e8", "#7a9fb8"], ["#f8fcff", "#dbeaf3", "#9ab8cb"]], a: "#6fc3f5", ab: "#2f7fb8", iris: "#49b6ff", glow: "#d6f0ff", cloth: "#1f3d55", cloth2: "#0f2030" },
  { bg: "#142a10", bg2: "#060e06", ring: "#86c95e", skins: [["#9ccb7a", "#6fa14a", "#3f6a2a"], ["#bfae78", "#8f7f4c", "#5a4e2a"], ["#8fbf66", "#5f8c3c", "#355a22"]], a: "#8a5a2c", ab: "#4e2f14", iris: "#c4ef5e", glow: "#d9f3a8", cloth: "#2f4420", cloth2: "#172410" },
  { bg: "#071a3c", bg2: "#030a18", ring: "#3f86ff", skins: [["#86b4ff", "#4b86f2", "#2a55b4"], ["#78cbee", "#3a97cf", "#20608e"], ["#9aafff", "#5a78e0", "#2f49a3"]], a: "#34d8c0", ab: "#178f7f", iris: "#78eeff", glow: "#b8f4ff", cloth: "#17305e", cloth2: "#0b1a34" },
  { bg: "#1c0f30", bg2: "#07040d", ring: "#a46cff", skins: [["#8e6ed0", "#5c3f90", "#2c1c4c"], ["#7a5aad", "#4d3570", "#22163a"], ["#9c7fd9", "#6a47a0", "#35245e"]], a: "#a56dff", ab: "#5a2fb8", iris: "#ff4fd0", glow: "#eadcff", cloth: "#2c1a4c", cloth2: "#150c26" },
];

/** Truncating integer division (toward zero), the same as Solidity's `/`. */
const idiv = (a: number, b: number): number => Math.trunc(a / b);
const tier = (v: number): number => (v <= 9 ? 0 : v <= 12 ? 1 : 2);
const el = (i: number): number => (i >= 0 && i < 5 ? i : 4);
const thin = (w: number): string => `stroke="${OUT}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
const stroke = thin(SW);

export interface Variants {
  skin: number; // 0..2
  marks: number; // 0..6 none, scar, freckles, war paint bars, cracks, war paint slashes, war paint chin
  ears: number; // 0..2
  accessory: number; // 0..5 none, earring, eye patch, monocle, bandana, tattoo
  background: number; // 0..5 rings, beams, stars, ruins, cave, battlefield
  outfit: number; // 0..5 bare, harness, cloak, chainmail, fur collar, bandolier
  brows: number; // 0..2
  metal: number; // 0..1 steel, gold
  iris: number; // 0..1
  headgear: number; // 0..5 none, bandana, circlet, topknot, skull cap, feathered band
  eye: number; // 0..2 almond, round, narrow
  itemStyle: number; // 0..1 two designs per item
  goldEyes: boolean; // rare, 1 in 16
  aura: boolean; // rare, 1 in 16
  seed: Uint8Array;
}

function idBytes(id: bigint): Uint8Array {
  const out = new Uint8Array(32);
  let v = id;
  for (let i = 31; i >= 0; i--) { out[i] = Number(v & 255n); v >>= 8n; }
  return out;
}

export function variants(id: bigint): Variants {
  const h = keccak_256(idBytes(id));
  return {
    skin: h[0]! % 3, marks: h[1]! % 7, ears: h[2]! % 3, accessory: h[3]! % 6, background: h[4]! % 6, outfit: h[5]! % 6,
    brows: h[6]! % 3, metal: h[7]! % 2, iris: h[8]! % 2, headgear: h[9]! % 6, eye: h[10]! % 3, itemStyle: h[11]! % 2,
    goldEyes: h[12]! % 16 === 0, aura: h[13]! % 16 === 0, seed: h,
  };
}

// ------------------------------------------------------------------ head silhouettes

/** Head outline per species; `j` is the jaw tier (0 narrow, 1 regular, 2 heavy). */
function headPath(e: number, j: number): string {
  const jx = 76 + j * 14;
  const cw = 30 + j * 16;
  const R = 256;
  switch (e) {
    case 0:
      return `M${R - 62} 102 L${R + 62} 102 C${R + 92} 112 ${R + 100} 150 ${R + 100} 196 C${R + 100} 236 ${R + jx + 8} 262 ${R + jx} 288 C${R + jx - 8} 312 ${R + cw + 6} 332 ${R} 342 C${R - cw - 6} 332 ${R - jx + 8} 312 ${R - jx} 288 C${R - jx - 8} 262 ${R - 100} 236 ${R - 100} 196 C${R - 100} 150 ${R - 92} 112 ${R - 62} 102 Z`;
    case 1:
      return `M${R} 90 C${R + 54} 90 ${R + 88} 130 ${R + 88} 196 C${R + 88} 240 ${R + jx - 6} 268 ${R + jx - 10} 294 C${R + jx - 18} 318 ${R + cw} 338 ${R} 346 C${R - cw} 338 ${R - jx + 18} 318 ${R - jx + 10} 294 C${R - jx + 6} 268 ${R - 88} 240 ${R - 88} 196 C${R - 88} 130 ${R - 54} 90 ${R} 90 Z`;
    case 2:
      return `M${R - 92} 104 L${R + 92} 104 C${R + 110} 110 ${R + 114} 160 ${R + 112} 206 C${R + 110} 244 ${R + jx + 22} 270 ${R + jx + 18} 296 C${R + jx + 10} 318 ${R + cw + 20} 334 ${R} 340 C${R - cw - 20} 334 ${R - jx - 10} 318 ${R - jx - 18} 296 C${R - jx - 22} 270 ${R - 110} 244 ${R - 112} 206 C${R - 114} 160 ${R - 110} 110 ${R - 92} 104 Z`;
    case 3:
      return `M${R} 84 C${R + 70} 84 ${R + 98} 136 ${R + 98} 200 C${R + 98} 244 ${R + jx} 272 ${R + jx - 4} 296 C${R + jx - 12} 322 ${R + cw + 4} 340 ${R} 348 C${R - cw - 4} 340 ${R - jx + 12} 322 ${R - jx + 4} 296 C${R - jx} 272 ${R - 98} 244 ${R - 98} 200 C${R - 98} 136 ${R - 70} 84 ${R} 84 Z`;
    default:
      return `M${R} 100 C${R + 64} 100 ${R + 94} 140 ${R + 94} 200 C${R + 94} 236 ${R + jx - 14} 250 ${R + jx - 20} 282 C${R + jx - 24} 312 ${R + cw} 334 ${R} 340 C${R - cw} 334 ${R - jx + 24} 312 ${R - jx + 20} 282 C${R - jx + 14} 250 ${R - 94} 236 ${R - 94} 200 C${R - 94} 140 ${R - 64} 100 ${R} 100 Z`;
  }
}

// ------------------------------------------------------------------ defs

function defs(p: Pal, skin: Skin, v: Variants, head: string, e: number): string {
  const metal = v.metal === 0 ? ["#d5dae2", "#8d96a3", "#3f4652"] : ["#f1d27a", "#b8872c", "#5c3f12"];
  // species texture tile
  let tx = "";
  if (e === 0) tx = `<pattern id="tx" width="28" height="28" patternUnits="userSpaceOnUse"><circle cx="6" cy="8" r="2" fill="${p.a}"/><circle cx="20" cy="20" r="1.5" fill="${p.glow}"/></pattern>`;
  else if (e === 1) tx = `<pattern id="tx" width="20" height="16" patternUnits="userSpaceOnUse"><path d="M0 14 Q5 6 10 14 M10 14 Q15 6 20 14" fill="none" stroke="${skin[2]}" stroke-width="1.6"/></pattern>`;
  else if (e === 2) tx = `<pattern id="tx" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M2 10 L14 16 L10 30 M26 4 L30 18 L38 24" fill="none" stroke="${skin[2]}" stroke-width="2.2" stroke-linecap="round"/></pattern>`;
  else if (e === 3) tx = `<pattern id="tx" width="22" height="22" patternUnits="userSpaceOnUse"><path d="M0 11 A11 11 0 0 1 22 11 M-11 22 A11 11 0 0 1 11 22 M11 22 A11 11 0 0 1 33 22" fill="none" stroke="${skin[2]}" stroke-width="1.8"/></pattern>`;
  else tx = `<pattern id="tx" width="26" height="26" patternUnits="userSpaceOnUse"><path d="M4 22 L22 4" stroke="${skin[2]}" stroke-width="1.4"/></pattern>`;
  return (
    `<defs>` +
    `<radialGradient id="bg" cx="50%" cy="40%" r="70%"><stop offset="0" stop-color="${p.bg}"/><stop offset="1" stop-color="${p.bg2}"/></radialGradient>` +
    `<linearGradient id="mt" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${metal[0]}"/><stop offset="0.55" stop-color="${metal[1]}"/><stop offset="1" stop-color="${metal[2]}"/></linearGradient>` +
    `<radialGradient id="gl" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="${p.glow}" stop-opacity="0.8"/><stop offset="1" stop-color="${p.glow}" stop-opacity="0"/></radialGradient>` +
    `<pattern id="ch" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="7" cy="7" r="5" fill="none" stroke="${metal[1]}" stroke-width="2"/><circle cx="0" cy="0" r="5" fill="none" stroke="${metal[2]}" stroke-width="2"/></pattern>` +
    tx +
    `<clipPath id="hc"><path d="${head}"/></clipPath>` +
    `<clipPath id="rc"><rect x="300" y="0" width="212" height="512"/></clipPath>` +
    `</defs>`
  );
}

// ------------------------------------------------------------------ background

function background(p: Pal, v: Variants): string {
  let s = `<rect width="512" height="512" fill="url(#bg)"/>`;
  if (v.background === 0) {
    s += `<circle cx="256" cy="236" r="200" fill="none" stroke="${p.ring}" stroke-opacity="0.10" stroke-width="22"/><circle cx="256" cy="236" r="156" fill="none" stroke="${p.ring}" stroke-opacity="0.07" stroke-width="8"/>`;
  } else if (v.background === 1) {
    s += `<path d="M0 512 L512 0 L512 110 L110 512 Z M0 290 L290 0 L360 0 L0 360 Z" fill="${p.ring}" fill-opacity="0.07"/>`;
  } else if (v.background === 2) {
    for (let i = 0; i < 16; i++) {
      const x = (v.seed[9 + i]! * 2) % 512;
      const y = (v.seed[(23 + i) % 32]! * 2) % 420;
      const r = 1 + (v.seed[(i * 5) % 32]! % 3);
      s += `<circle cx="${x}" cy="${y}" r="${r}" fill="${p.ring}" fill-opacity="0.4"/>`;
    }
  } else if (v.background === 3) {
    // ruins: broken columns and an arch fragment, a faint moon behind
    s += `<circle cx="396" cy="118" r="54" fill="${p.ring}" fill-opacity="0.12"/>`;
    s += `<path d="M30 440 L30 150 L44 128 L78 136 L82 440 Z M118 440 L116 212 L150 196 L154 440 Z M402 440 L400 176 L436 164 L448 236 L444 440 Z M470 440 L468 90 L496 96 L500 440 Z" fill="#000" fill-opacity="0.32"/>`;
    s += `<path d="M78 136 L78 150 L44 142 Z M154 196 L150 212 L116 212 Z" fill="${p.ring}" fill-opacity="0.12"/>`;
    s += `<path d="M330 440 L330 300 C330 230 400 230 400 300 L400 320 L380 320 L380 300 C380 254 350 254 350 300 L350 440 Z" fill="#000" fill-opacity="0.28"/>`;
    s += `<path d="M0 440 L512 440 L512 512 L0 512 Z" fill="#000" fill-opacity="0.25"/>`;
  } else if (v.background === 4) {
    // cave: stalactites, a stalagmite cluster and a light pool on the floor
    s += `<path d="M0 0 L512 0 L512 70 L490 150 L468 72 L440 120 L420 60 L392 164 L366 70 L340 104 L318 50 L296 110 L270 56 L244 130 L220 62 L196 100 L170 54 L146 148 L120 70 L96 108 L70 60 L44 140 L20 76 L0 100 Z" fill="#000" fill-opacity="0.42"/>`;
    s += `<path d="M20 440 L40 360 L58 440 Z M66 440 L84 330 L102 440 Z M420 440 L436 350 L452 440 Z M462 440 L476 390 L490 440 Z" fill="#000" fill-opacity="0.35"/>`;
    s += `<ellipse cx="256" cy="430" rx="190" ry="36" fill="${p.ring}" fill-opacity="0.10"/>`;
    s += `<path d="M300 0 L318 50 L330 0 Z M468 0 L490 150 L500 0 Z" fill="${p.ring}" fill-opacity="0.10"/>`;
  } else {
    // battlefield: a low sun, spears and banners on the horizon, smoke
    s += `<circle cx="120" cy="150" r="70" fill="${p.ring}" fill-opacity="0.14"/><path d="M0 346 L512 346 L512 512 L0 512 Z" fill="#000" fill-opacity="0.3"/>`;
    s += `<path d="M30 346 L34 180 L38 346 Z M34 182 L74 196 L34 212 Z M60 346 L62 230 L64 346 Z M90 346 L93 200 L96 346 Z M93 202 L120 220 L93 236 Z M410 346 L412 170 L414 346 Z M412 172 L380 190 L412 206 Z M444 346 L446 240 L448 346 Z M478 346 L481 196 L484 346 Z M481 198 L508 214 L481 230 Z M462 346 L464 260 L466 346 Z" fill="#000" fill-opacity="0.4"/>`;
    s += `<path d="M150 346 C170 300 220 300 250 330 C280 290 340 300 360 346 Z" fill="${p.ring}" fill-opacity="0.06"/>`;
  }
  return s + `<rect width="512" height="512" fill="url(#bg)" fill-opacity="0.35"/><rect y="440" width="512" height="72" fill="#000" fill-opacity="0.3"/>`;
}

/** Rare aura: a halo in the element glow behind the bust. */
function aura(p: Pal, head: string): string {
  return (
    `<path d="M40 512 C52 418 140 376 256 372 C372 376 460 418 472 512 Z" fill="none" stroke="${p.glow}" stroke-opacity="0.22" stroke-width="34"/>` +
    `<path d="${head}" fill="none" stroke="${p.glow}" stroke-opacity="0.18" stroke-width="46"/>` +
    `<path d="${head}" fill="none" stroke="${p.glow}" stroke-opacity="0.45" stroke-width="18"/>`
  );
}

// ------------------------------------------------------------------ body

function outfit(v: Variants, skin: Skin, p: Pal): string {
  switch (v.outfit) {
    case 1: // leather harness
      return `<path d="M150 392 L330 512 L296 512 L130 400 Z M362 392 L182 512 L216 512 L382 400 Z" fill="${LEATHER}" ${thin(5)}/><path d="M232 440 L280 440 L282 468 L230 468 Z" fill="url(#mt)" ${thin(5)}/>`;
    case 2: // cloak with a glowing trim and a clasp
      return `<path d="M40 512 C48 420 130 380 256 376 C382 380 464 420 472 512 Z" fill="${p.cloth}" ${stroke}/><path d="M256 376 C382 380 464 420 472 512 L300 512 C300 450 284 404 256 376 Z" fill="${p.cloth2}"/><path d="M56 480 C100 410 180 384 256 382 C332 384 412 410 456 480" fill="none" stroke="${p.glow}" stroke-opacity="0.55" stroke-width="8" stroke-linecap="round"/><circle cx="256" cy="404" r="12" fill="url(#mt)" ${thin(4)}/>`;
    case 3: // chainmail
      return `<path d="M40 512 C52 418 140 376 256 372 C372 376 460 418 472 512 Z" fill="#3a3f48" ${stroke}/><path d="M40 512 C52 418 140 376 256 372 C372 376 460 418 472 512 Z" fill="url(#ch)" fill-opacity="0.7"/><path d="M196 380 C230 366 282 366 316 380 L306 404 C282 394 230 394 206 404 Z" fill="${LEATHER}" ${thin(5)}/>`;
    case 4: // fur collar
      {
        let fur = "";
        for (let i = 0; i < 14; i++) {
          const x = 60 + i * 30;
          const y = 440 - Math.abs(2 * i - 13) * 5;
          fur += `M${x} ${y + 40} C${x + 4} ${y + 10} ${x + 10} ${y - 4} ${x + 15} ${y - 14} C${x + 20} ${y - 2} ${x + 26} ${y + 10} ${x + 30} ${y + 40} `;
        }
        return `<path d="${fur}" fill="${p.cloth2}" ${thin(5)}/><path d="M40 512 C60 470 140 452 256 450 C372 452 452 470 472 512 Z" fill="${p.cloth}" ${thin(5)}/>`;
      }
    case 5: // bandolier with pouches
      return `<path d="M150 392 L330 512 L296 512 L130 400 Z" fill="${LEATHER}" ${thin(5)}/><path d="M196 426 L222 426 L224 452 L198 452 Z M236 452 L262 452 L264 478 L238 478 Z M276 480 L302 480 L304 506 L278 506 Z" fill="${p.ab}" ${thin(4)}/>`;
    default:
      return `<path d="M92 470 L124 420 M112 480 L136 442" stroke="${skin[2]}" stroke-width="5" stroke-linecap="round"/>`;
  }
}

/** Ear scale in twentieths: 0.8, 1, 1.25. */
const EAR_K = [16, 20, 25] as const;

function ears(e: number, size: number, skin: Skin, p: Pal): string {
  const k = EAR_K[size]!;
  // x scaled around the centre line, rounded half up on the magnitude
  const w = (x: number): number => (x >= 256 ? 256 + idiv((x - 256) * k + 10, 20) : 256 - idiv((256 - x) * k + 10, 20));
  const mk = (v: number): number => idiv(v * k + 10, 20);
  if (e === 0) return `<path d="M${w(160)} 230 L${w(104)} ${230 - mk(90)} L${w(172)} 190 Z" fill="${skin[1]}" ${stroke}/><path d="M${w(352)} 230 L${w(408)} ${230 - mk(90)} L${w(340)} 190 Z" fill="${skin[1]}" ${stroke}/>`;
  if (e === 1) return `<path d="M168 226 C${w(126)} 206 ${w(110)} 250 ${w(132)} 288 C150 270 162 266 170 272 Z" fill="${skin[0]}" ${stroke}/><path d="M344 226 C${w(386)} 206 ${w(402)} 250 ${w(380)} 288 C362 270 350 266 342 272 Z" fill="${skin[0]}" ${stroke}/>`;
  if (e === 2) return `<path d="M150 220 C${w(118)} 214 ${w(110)} 258 ${w(130)} 282 C146 268 156 264 164 268 Z" fill="${skin[1]}" ${stroke}/><path d="M362 220 C${w(394)} 214 ${w(402)} 258 ${w(382)} 282 C366 268 356 264 348 268 Z" fill="${skin[1]}" ${stroke}/>`;
  if (e === 3) return `<path d="M160 196 C${w(104)} ${236 - mk(70)} ${w(84)} 236 ${w(112)} 286 C132 256 150 254 164 264 Z" fill="${p.a}" ${stroke}/><path d="M352 196 C${w(408)} ${236 - mk(70)} ${w(428)} 236 ${w(400)} 286 C380 256 362 254 348 264 Z" fill="${p.a}" ${stroke}/><path d="M118 250 C128 262 138 268 150 270 M394 250 C384 262 374 268 362 270" fill="none" stroke="${p.ab}" stroke-width="4"/>`;
  return "";
}

/** Shoulders, outfit, neck, ears, head with cel shading and texture, species extras. */
function body(e: number, skin: Skin, p: Pal, t: Traits, v: Variants, head: string): string {
  const defTier = tier(t.defense);
  let s = "";
  s += `<path d="M40 512 C52 418 140 376 256 372 C372 376 460 418 472 512 Z" fill="${skin[1]}" ${stroke}/>`;
  s += `<path d="M330 380 C400 392 452 430 466 512 L340 512 C346 460 340 420 330 380 Z" fill="${skin[2]}" fill-opacity="0.4"/>`;
  s += `<path d="M60 500 C80 440 130 404 190 392" fill="none" stroke="${skin[0]}" stroke-opacity="0.3" stroke-width="10" stroke-linecap="round"/>`;
  if (defTier === 0) s += outfit(v, skin, p);
  // neck
  s += `<path d="M214 300 L298 300 L306 384 L206 384 Z" fill="${skin[2]}" ${stroke}/><path d="M230 306 L278 306 L282 380 L226 380 Z" fill="${skin[1]}"/>`;
  s += ears(e, v.ears, skin, p);
  // head
  s += `<path d="${head}" fill="${skin[1]}" ${stroke}/>`;
  s += `<g clip-path="url(#hc)">`;
  s += `<path d="${head}" fill="url(#tx)" fill-opacity="${e === 4 ? "0.25" : "0.45"}"/>`;
  s += `<path d="M300 70 L420 70 L420 370 L262 370 C290 352 302 326 300 296 C298 276 282 262 276 246 C268 222 282 180 300 70 Z" fill="${skin[2]}" fill-opacity="0.5"/>`;
  s += `<path d="M232 236 C248 262 256 262 264 262 L268 274 L256 282 Z" fill="${skin[2]}" fill-opacity="0.35"/>`;
  s += `<path d="M168 130 C200 110 240 108 262 118 C230 132 206 150 190 176 Z" fill="${skin[0]}" fill-opacity="0.6"/>`;
  s += `<path d="M176 238 L240 238 L204 266 Z" fill="${skin[0]}" fill-opacity="0.35"/>`;
  s += `<g clip-path="url(#rc)"><path d="${head}" fill="none" stroke="${p.glow}" stroke-opacity="0.6" stroke-width="14"/></g>`;
  s += `</g>`;
  if (e === 0) {
    s += `<path d="M282 130 L300 166 L286 198 M312 150 L326 182 L316 208" fill="none" stroke="${p.a}" stroke-opacity="0.7" stroke-width="5" stroke-linecap="round"/>`;
  } else if (e === 1) {
    s += `<path d="M240 232 C256 228 272 234 282 248 L270 274 C262 262 250 256 240 254 Z" fill="${p.ab}" ${thin(5)}/><path d="M244 236 C256 234 266 238 274 248" fill="none" stroke="${p.a}" stroke-width="4"/>`;
  } else if (e === 2) {
    s += `<path d="M160 206 C210 190 302 190 352 206 L348 222 C302 208 210 208 164 222 Z" fill="${skin[2]}" ${thin(5)}/>`;
    s += `<circle cx="206" cy="116" r="12" fill="${p.a}"/><circle cx="318" cy="112" r="8" fill="${p.a}"/>`;
  } else if (e === 3) {
    s += `<path d="M206 344 L206 374 M226 346 L226 378 M286 346 L286 378 M306 344 L306 374" fill="none" stroke="${p.ab}" stroke-width="5" stroke-linecap="round"/>`;
  } else {
    s += `<path d="M256 70 C356 70 398 158 392 262 C388 332 356 380 336 404 L176 404 C156 380 124 332 120 262 C114 158 156 70 256 70 Z M256 112 C196 112 170 166 172 232 C174 286 202 326 256 328 C310 326 338 286 340 232 C342 166 316 112 256 112 Z" fill-rule="evenodd" fill="${p.ab}" ${stroke}/>`;
    s += `<path d="M256 112 C196 112 170 166 172 232 C174 286 202 326 256 328 C310 326 338 286 340 232 C342 166 316 112 256 112 Z" fill="#000" fill-opacity="0.18"/>`;
    s += `<path d="M256 70 C356 70 398 158 392 262 C388 332 356 380 336 404 L300 404 C330 360 352 300 350 236 C348 170 318 112 256 112 Z" fill="#000" fill-opacity="0.3"/>`;
    s += `<path d="M186 262 C200 250 214 250 228 262 M284 262 C298 250 312 250 326 262" fill="none" stroke="#000" stroke-opacity="0.35" stroke-width="8" stroke-linecap="round"/>`; // hollow cheeks
  }
  return s;
}

/** Crest from the species and the speed tier. */
function crest(e: number, speedTier: number, p: Pal): string {
  const n = 2 + speedTier;
  let s = "";
  if (e === 0) {
    const h = [40, 80, 120][speedTier]!;
    s += `<path d="M186 120 C150 ${110 - idiv(h, 2)} 160 ${70 - h} 192 ${64 - h} C176 ${96 - idiv(h * 6, 10)} 190 ${112 - idiv(h * 3, 10)} 222 108 Z" fill="${p.ab}" ${stroke}/>`;
    s += `<path d="M326 120 C362 ${110 - idiv(h, 2)} 352 ${70 - h} 320 ${64 - h} C336 ${96 - idiv(h * 6, 10)} 322 ${112 - idiv(h * 3, 10)} 290 108 Z" fill="${p.ab}" ${stroke}/>`;
    s += `<path d="M196 100 C236 76 276 76 316 100 L316 110 C276 92 236 92 196 110 Z" fill="${p.a}" fill-opacity="0.7"/>`;
  } else if (e === 1) {
    // two rows of feathers, the back row darker
    for (let row = 1; row >= 0; row--) {
      for (let i = 0; i < n + 1; i++) {
        const dx = 12 + i * 15 + row * 8;
        const len = 56 + speedTier * 26 - i * 8 + row * 10;
        const y0 = 112 - row * 8;
        s += `<path d="M${228 + i * 10} ${y0} C${244 + dx} ${80 - speedTier * 8 - row * 10} ${274 + dx + idiv(len, 2)} ${58 - row * 8} ${284 + dx + len} ${68 + i * 14 - row * 6} C${284 + dx + idiv(len, 2)} ${88 + i * 14 - row * 6} ${264 + dx} ${y0 + 2} ${228 + i * 10} ${y0 + 18} Z" fill="${row === 1 ? p.ab : i % 2 === 0 ? p.a : p.ab}" ${stroke}/>`;
      }
    }
  } else if (e === 2) {
    const H = [34, 56, 80][speedTier]!;
    for (let i = 0; i < n + 1; i++) {
      const x = 180 + idiv(i * 152, n);
      const h = i % 2 === 0 ? H : idiv(H * 7, 10);
      s += `<path d="M${x - 26} 120 L${x} ${116 - h} L${x + 26} 120 Z" fill="${p.ab}" ${stroke}/>`;
    }
  } else if (e === 3) {
    const h = [56, 96, 136][speedTier]!;
    s += `<path d="M204 120 C218 ${114 - h} 294 ${114 - h} 308 120 Z" fill="${p.a}" ${stroke}/>`;
    s += `<path d="M228 116 C240 ${112 - idiv(h, 2)} 272 ${112 - idiv(h, 2)} 284 116" fill="none" stroke="${p.ab}" stroke-width="5"/>`;
  } else {
    const h = [40, 84, 128][speedTier]!;
    s += `<path d="M170 130 C140 ${124 - idiv(h * 6, 10)} 142 ${94 - h} 164 ${88 - h} C160 ${114 - idiv(h * 7, 10)} 176 ${118 - idiv(h * 4, 10)} 206 118 Z" fill="#1a1024" ${stroke}/>`;
    s += `<path d="M342 130 C372 ${124 - idiv(h * 6, 10)} 370 ${94 - h} 348 ${88 - h} C352 ${114 - idiv(h * 7, 10)} 336 ${118 - idiv(h * 4, 10)} 306 118 Z" fill="#1a1024" ${stroke}/>`;
  }
  return s;
}

/** Headgear from the variant, only without a helmet and not over a hood. */
function headgear(v: Variants, p: Pal, e: number, defTier: number): string {
  if (defTier === 2 || e === 4) return "";
  switch (v.headgear) {
    case 1: return `<path d="M156 150 C200 136 312 136 356 150 L352 176 C312 164 200 164 160 176 Z" fill="${p.cloth}" ${thin(5)}/><path d="M352 160 L392 150 L380 184 L372 174 Z" fill="${p.cloth}" ${thin(4)}/>`; // bandana with a knot
    case 2: return `<path d="M156 152 C200 138 312 138 356 152 L354 166 C312 152 200 152 158 166 Z" fill="url(#mt)" ${thin(4)}/><circle cx="256" cy="150" r="8" fill="${p.iris}" ${thin(3)}/>`; // circlet
    case 3: return `<path d="M236 112 C236 84 276 84 276 112 Z" fill="${p.ab}" ${thin(5)}/><path d="M240 112 L272 112 L268 122 L244 122 Z" fill="${LEATHER}" ${thin(4)}/>`; // topknot
    case 4: return `<path d="M160 160 C166 112 206 94 256 94 C306 94 346 112 352 160 L340 164 C330 128 298 114 256 114 C214 114 182 128 172 164 Z" fill="${LEATHER}" ${thin(5)}/><path d="M172 164 L340 164" stroke="${p.ab}" stroke-width="5"/>`; // skull cap
    case 5: return `<path d="M156 150 C200 136 312 136 356 150 L352 176 C312 164 200 164 160 176 Z" fill="${p.cloth}" ${thin(5)}/><path d="M330 150 C352 110 382 92 404 96 C390 120 372 142 344 154 Z" fill="${p.a}" ${thin(4)}/><path d="M336 150 C356 126 376 108 396 100" fill="none" stroke="${p.ab}" stroke-width="3"/>`; // feathered band
    default: return "";
  }
}

/** Armour from the defense tier: pauldrons and gorget, then a breastplate and a helmet with cheek guards. */
function armor(defTier: number, p: Pal): string {
  if (defTier === 0) return "";
  let s = "";
  s += `<path d="M44 486 C44 404 110 378 196 390 C176 426 146 462 118 512 L42 512 Z" fill="url(#mt)" ${stroke}/>`;
  s += `<path d="M468 486 C468 404 402 378 316 390 C336 426 366 462 394 512 L470 512 Z" fill="url(#mt)" ${stroke}/>`;
  s += `<path d="M60 470 L120 400 M72 492 L130 420" stroke="${OUT}" stroke-opacity="0.35" stroke-width="5"/><path d="M452 470 L392 400 M440 492 L382 420" stroke="${OUT}" stroke-opacity="0.35" stroke-width="5"/>`;
  s += `<path d="M196 390 C230 372 282 372 316 390 L302 424 C280 410 232 410 210 424 Z" fill="url(#mt)" ${stroke}/>`;
  if (defTier === 1) return s;
  s += `<path d="M140 512 C160 448 212 418 256 418 C300 418 352 448 372 512 Z" fill="url(#mt)" ${stroke}/>`;
  s += `<path d="M256 432 L282 470 L256 508 L230 470 Z" fill="${p.iris}" ${thin(4)}/>`;
  // helmet: skull, brow ridge, cheek guards and a nasal, with the crest rising behind it
  s += `<path d="M150 200 C148 118 196 82 256 82 C316 82 364 118 362 200 L362 230 C352 238 342 236 338 226 L338 200 C338 150 300 122 256 122 C212 122 174 150 174 200 L174 226 C170 236 160 238 150 230 Z" fill="url(#mt)" ${stroke}/>`;
  s += `<path d="M150 230 C150 280 160 310 184 330 L198 300 C186 282 182 258 182 236 Z M362 230 C362 280 352 310 328 330 L314 300 C326 282 330 258 330 236 Z" fill="url(#mt)" ${stroke}/>`; // cheek guards
  s += `<path d="M138 192 L374 192 L380 212 L132 212 Z" fill="url(#mt)" ${stroke}/>`; // brow ridge
  s += `<path d="M244 212 L268 212 L264 272 L248 272 Z" fill="url(#mt)" ${thin(5)}/>`; // nasal
  s += `<path d="M256 122 L256 82" stroke="${p.iris}" stroke-width="6"/>`;
  return s;
}

/** Eyes: shape from the variant, openness from focus, slit pupils for Fire and Shadow, rare gold eyes. */
function eyes(focusTier: number, p: Pal, e: number, v: Variants): string {
  let s = "";
  const white = e === 4 ? "#1a1024" : e === 0 ? "#fff3e0" : "#f4f6fa";
  const irisColor = v.goldEyes ? GOLD : v.iris === 0 ? p.iris : p.glow;
  const open = [6, 11, 15][focusTier]!;
  for (const cx of [220, 292]) {
    if (v.accessory === 2 && cx === 292) continue;
    if (focusTier === 2 || e === 4 || v.goldEyes) s += `<circle cx="${cx}" cy="216" r="40" fill="url(#gl)"/>`;
    if (v.eye === 0) s += `<path d="M${cx - 26} 216 C${cx - 14} ${212 - open} ${cx + 10} ${210 - open} ${cx + 26} 212 C${cx + 14} ${216 + open} ${cx - 10} ${216 + open} ${cx - 26} 216 Z" fill="${white}" ${thin(5)}/>`;
    else if (v.eye === 1) s += `<ellipse cx="${cx}" cy="216" rx="${20 + focusTier * 2}" ry="${open + 4}" fill="${white}" ${thin(5)}/>`;
    else s += `<path d="M${cx - 30} 214 C${cx - 10} ${212 - idiv(open * 6, 10)} ${cx + 10} ${212 - idiv(open * 6, 10)} ${cx + 30} 212 C${cx + 10} ${216 + idiv(open * 7, 10)} ${cx - 10} ${216 + idiv(open * 7, 10)} ${cx - 30} 214 Z" fill="${white}" ${thin(5)}/>`;
    const ir = [7, 9, 11][focusTier]!;
    if (v.goldEyes) s += `<circle cx="${cx + 4}" cy="216" r="${ir + 3}" fill="${GOLD}" fill-opacity="0.45"/>`;
    s += `<circle cx="${cx + 4}" cy="216" r="${ir}" fill="${irisColor}"/>`;
    if (e === 0 || e === 4) s += `<ellipse cx="${cx + 4}" cy="216" rx="2.5" ry="${ir - 1}" fill="${OUT}"/>`;
    else s += `<circle cx="${cx + 4}" cy="216" r="${idiv(ir + 1, 2)}" fill="${OUT}"/>`;
    s += `<circle cx="${cx - 1}" cy="211" r="2.5" fill="#fff"/>`;
  }
  if (v.accessory === 2) s += `<path d="M150 160 C200 184 280 190 362 176" fill="none" stroke="${OUT}" stroke-width="7"/><path d="M262 198 C280 190 310 190 326 198 L322 236 C306 244 282 244 266 236 Z" fill="#1a1024" ${thin(5)}/>`;
  if (v.accessory === 3) s += `<circle cx="292" cy="216" r="30" fill="none" stroke="${GOLD}" stroke-width="6"/><path d="M318 236 C330 256 334 290 324 318" fill="none" stroke="${GOLD}" stroke-width="4"/>`;
  const tilt = 4 + focusTier * 5;
  if (v.brows === 0) s += `<path d="M186 ${182 + tilt} C204 174 230 176 248 ${192 - tilt}" fill="none" stroke="${OUT}" stroke-width="11" stroke-linecap="round"/><path d="M326 ${182 + tilt} C308 174 282 176 264 ${192 - tilt}" fill="none" stroke="${OUT}" stroke-width="11" stroke-linecap="round"/>`;
  else if (v.brows === 1) s += `<path d="M184 ${180 + tilt} L250 ${188 - tilt}" stroke="${OUT}" stroke-width="14" stroke-linecap="round"/><path d="M328 ${180 + tilt} L262 ${188 - tilt}" stroke="${OUT}" stroke-width="14" stroke-linecap="round"/>`;
  else s += `<path d="M184 ${180 + tilt} L212 184 M226 186 L250 ${190 - tilt}" stroke="${OUT}" stroke-width="13" stroke-linecap="round"/><path d="M328 ${180 + tilt} L262 ${190 - tilt}" stroke="${OUT}" stroke-width="13" stroke-linecap="round"/>`;
  return s;
}

/** Nose and mouth: the shape from strength, the teeth from the species. */
function mouth(strTier: number, skin: Skin, e: number): string {
  let s = "";
  if (e !== 1) s += `<path d="M246 250 L240 268 L256 274 M266 250 L272 268 L256 274" fill="none" stroke="${skin[2]}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`;
  if (strTier === 0) {
    // grim, closed; a lower-lip shadow
    s += `<path d="M226 300 C244 296 268 296 286 302" fill="none" stroke="${OUT}" stroke-width="7" stroke-linecap="round"/><path d="M226 300 L222 292 M286 302 L290 294" stroke="${OUT}" stroke-width="6" stroke-linecap="round"/><path d="M236 310 C250 316 264 316 278 310" fill="none" stroke="${skin[2]}" stroke-width="5" stroke-linecap="round"/>`;
    if (e === 2) s += `<path d="M228 300 L236 284 L242 302 Z M284 302 L276 284 L270 304 Z" fill="${TEETH}" ${thin(3)}/>`; // tusks
  } else if (strTier === 1) {
    // snarl: one corner raised, upper teeth bared
    s += `<path d="M212 296 C236 306 276 304 304 288 C294 310 236 318 212 296 Z" fill="#1a0a0e" ${thin(5)}/>`;
    if (e === 3) s += `<path d="M222 298 L230 310 L236 298 L244 310 L250 298 L258 310 L264 298 L272 309 L278 296 L286 306 L292 294" fill="none" stroke="${TEETH}" stroke-width="3"/>`;
    else if (e === 4) s += `<path d="M224 298 L232 311 L240 297 L252 312 L262 296 L272 310 L282 294 L292 304" fill="none" stroke="${TEETH}" stroke-width="3.5"/>`;
    else s += `<path d="M220 298 L296 290 L292 300 L224 306 Z" fill="${TEETH}"/>`;
    s += `<path d="M216 312 C240 320 276 318 302 304" fill="none" stroke="${skin[2]}" stroke-width="4" stroke-linecap="round"/>`;
  } else {
    // roar: open, fangs, tongue
    s += `<path d="M204 286 C232 322 280 322 308 286 C286 300 226 300 204 286 Z" fill="#1a0a0e" ${thin(5)}/>`;
    if (e === 3) s += `<path d="M212 290 L220 316 L228 290 L236 312 L244 290 L252 312 L260 290 L268 312 L276 290 L284 314 L292 290 L300 310" fill="none" stroke="${TEETH}" stroke-width="3"/>`;
    else s += `<path d="M212 290 L226 290 L219 318 Z M300 290 L286 290 L293 318 Z M240 292 L250 292 L246 306 Z M272 292 L262 292 L266 306 Z" fill="${TEETH}"/>`;
    s += `<path d="M236 312 C248 320 264 320 276 312" fill="none" stroke="#c2304a" stroke-width="5" stroke-linecap="round"/>`;
    s += `<path d="M206 300 C230 330 282 330 306 300" fill="none" stroke="${skin[2]}" stroke-width="4" stroke-linecap="round"/>`;
  }
  return s;
}

function marks(v: Variants, skin: Skin, p: Pal): string {
  switch (v.marks) {
    case 1: // scar over the left cheek
      return `<path d="M178 236 L200 290 M180 258 L196 250 M188 278 L204 270" fill="none" stroke="${skin[2]}" stroke-width="5" stroke-linecap="round"/><path d="M178 236 L200 290" stroke="#f4b7a0" stroke-opacity="0.35" stroke-width="3"/>`;
    case 2: { // freckles
      let s = "";
      for (const [x, y] of [[186, 256], [200, 250], [194, 270], [318, 254], [308, 268], [326, 272]]) s += `<circle cx="${x}" cy="${y}" r="3.5" fill="${skin[2]}"/>`;
      return s;
    }
    case 3: // war paint: bars across both cheeks
      return `<path d="M176 246 L232 246 M280 246 L336 246 M182 262 L222 262 M290 262 L330 262" stroke="${p.a}" stroke-width="9" stroke-linecap="round" stroke-opacity="0.85"/>`;
    case 4: // cracks
      return `<path d="M174 230 L190 254 L180 282 M338 226 L322 250 L332 280 M296 140 L306 162 L296 184" fill="none" stroke="${skin[2]}" stroke-width="4" stroke-linecap="round"/>`;
    case 5: // war paint: three claw slashes under the left eye, one on the right cheek
      return `<path d="M186 244 L206 284 M200 240 L220 280 M214 238 L234 278 M318 250 L300 286" stroke="${p.a}" stroke-width="7" stroke-linecap="round" stroke-opacity="0.85"/>`;
    default: // 6 war paint: chin stripe, brow dots and temple bars; 0 none
      if (v.marks !== 6) return "";
      return `<path d="M256 318 L256 338" stroke="${p.a}" stroke-width="10" stroke-linecap="round" stroke-opacity="0.85"/><circle cx="208" cy="164" r="6" fill="${p.a}" fill-opacity="0.85"/><circle cx="304" cy="164" r="6" fill="${p.a}" fill-opacity="0.85"/><path d="M164 196 L184 196 M164 212 L184 212 M328 196 L348 196 M328 212 L348 212" stroke="${p.a}" stroke-width="6" stroke-linecap="round" stroke-opacity="0.85"/>`;
  }
}

function accessory(v: Variants, p: Pal, e: number): string {
  if (v.accessory === 1 && e !== 4) return `<circle cx="${e === 0 ? 150 : 140}" cy="276" r="11" fill="none" stroke="${GOLD}" stroke-width="6"/>`;
  if (v.accessory === 4) return `<path d="M196 300 L316 300 L326 336 C290 352 222 352 186 336 Z" fill="${p.cloth2}" ${thin(5)}/><path d="M200 306 C230 300 282 300 312 306" fill="none" stroke="${p.a}" stroke-opacity="0.6" stroke-width="4"/>`;
  if (v.accessory === 5) return `<path d="M298 140 C330 150 332 196 302 206 C326 194 326 160 298 140 Z M318 214 C340 228 334 256 312 262 C330 250 330 230 318 214 Z" fill="${p.a}" fill-opacity="0.85"/>`;
  return "";
}

// ------------------------------------------------------------------ items

/** Eight spikes around (432,206): precomputed from cos/sin so the chain and the port share one literal. */
const SPIKES = "M472 206 L500 206 L466 218 Z M460 234 L480 254 L447 239 Z M432 246 L432 274 L420 240 Z M404 234 L384 254 L399 221 Z M392 206 L364 206 L398 194 Z M404 178 L384 158 L417 173 Z M432 166 L432 138 L444 172 Z M460 178 L480 158 L465 191 Z";

/** The item of the special, two designs each (`v.itemStyle`); the metal follows the armour (`#mt`). */
function item(special: number, p: Pal, v: Variants): string {
  const alt = v.itemStyle === 1;
  switch (special) {
    case 1: // First Strike: a dagger, or a wavy kris
      if (alt) return `<path d="M488 136 C468 168 500 196 478 226 C460 254 490 282 466 310 L450 304 C470 276 440 252 458 224 C476 196 448 170 466 142 Z" fill="url(#mt)" ${thin(5)}/><path d="M484 142 C470 168 492 194 476 220" fill="none" stroke="#fff" stroke-opacity="0.45" stroke-width="3"/><path d="M432 300 L470 314 L464 334 L426 320 Z" fill="${p.ab}" ${thin(5)}/><path d="M442 326 L430 372" stroke="${LEATHER}" stroke-width="14" stroke-linecap="round"/><path d="M438 334 L446 338 M434 348 L442 352 M430 362 L438 366" stroke="${p.a}" stroke-width="3"/><circle cx="428" cy="378" r="8" fill="${p.a}" ${thin(3)}/>`;
      return `<path d="M490 146 L430 300 L446 306 L502 156 Z" fill="url(#mt)" ${thin(5)}/><path d="M490 146 L502 156 L474 232 Z" fill="#fff" fill-opacity="0.4"/><path d="M486 160 L446 262" stroke="${OUT}" stroke-opacity="0.35" stroke-width="3"/><path d="M418 296 L460 312 L452 334 L410 318 Z" fill="${p.ab}" ${thin(5)}/><path d="M426 326 L412 372" stroke="${LEATHER}" stroke-width="14" stroke-linecap="round"/><path d="M424 338 L430 340 M420 350 L426 352 M416 362 L422 364" stroke="${p.a}" stroke-width="3"/><circle cx="410" cy="378" r="8" fill="${p.a}" ${thin(3)}/>`;
    case 2: // Armor: a kite shield with a star, or a round shield with a boss
      if (alt) return `<circle cx="432" cy="266" r="68" fill="url(#mt)" ${stroke}/><circle cx="432" cy="266" r="52" fill="${p.a}"/><circle cx="432" cy="266" r="52" fill="none" stroke="${p.ab}" stroke-width="6"/><path d="M432 214 L432 318 M380 266 L484 266" stroke="${p.ab}" stroke-width="6"/><circle cx="432" cy="266" r="16" fill="url(#mt)" ${thin(4)}/><circle cx="432" cy="206" r="4" fill="${OUT}"/><circle cx="432" cy="326" r="4" fill="${OUT}"/><circle cx="372" cy="266" r="4" fill="${OUT}"/><circle cx="492" cy="266" r="4" fill="${OUT}"/><path d="M392 226 C410 208 440 204 466 214" fill="none" stroke="#fff" stroke-opacity="0.3" stroke-width="6"/>`;
      return `<path d="M462 170 C500 190 506 260 484 318 C470 350 450 366 430 376 C410 366 390 350 376 318 C354 260 360 190 398 170 C420 160 440 160 462 170 Z" fill="url(#mt)" ${stroke}/><path d="M430 196 L446 236 L488 240 L456 266 L466 306 L430 284 L394 306 L404 266 L372 240 L414 236 Z" fill="${p.a}"/><circle cx="430" cy="260" r="12" fill="${p.ab}"/><path d="M398 170 C380 200 376 260 392 318" fill="none" stroke="#fff" stroke-opacity="0.25" stroke-width="6"/><circle cx="430" cy="178" r="4" fill="${OUT}"/><circle cx="476" cy="200" r="4" fill="${OUT}"/><circle cx="384" cy="200" r="4" fill="${OUT}"/><circle cx="482" cy="300" r="4" fill="${OUT}"/><circle cx="378" cy="300" r="4" fill="${OUT}"/>`;
    case 3: // Endurance: a round flask, or a tall corked vial on a strap
      if (alt) return `<path d="M404 176 L460 176 L460 304 C460 342 404 342 404 304 Z" fill="${p.glow}" fill-opacity="0.85" ${stroke}/><path d="M410 236 L454 236 L454 304 C454 334 410 334 410 304 Z" fill="${p.iris}"/><path d="M412 240 C424 250 440 250 452 240 L452 254 C440 262 424 262 412 254 Z" fill="#fff" fill-opacity="0.25"/><circle cx="422" cy="292" r="4" fill="#fff" fill-opacity="0.5"/><circle cx="440" cy="310" r="3" fill="#fff" fill-opacity="0.5"/><circle cx="430" cy="270" r="2.5" fill="#fff" fill-opacity="0.5"/><rect x="412" y="150" width="40" height="30" rx="6" fill="${LEATHER}" ${thin(4)}/><path d="M404 200 L460 200 M404 212 L460 212" stroke="${LEATHER}" stroke-width="5"/><ellipse cx="414" cy="290" rx="6" ry="30" fill="#fff" fill-opacity="0.35"/>`;
      return `<path d="M410 190 L450 190 L450 230 C480 250 494 290 494 330 C494 372 464 392 430 392 C396 392 366 372 366 330 C366 290 380 250 410 230 Z" fill="${p.glow}" fill-opacity="0.85" ${stroke}/><path d="M374 330 C374 300 390 270 420 252 L440 252 C470 270 486 300 486 330 C486 362 464 380 430 380 C396 380 374 362 374 330 Z" fill="${p.iris}"/><path d="M380 300 C400 290 460 290 480 300 C470 320 390 320 380 300 Z" fill="#fff" fill-opacity="0.25"/><circle cx="412" cy="340" r="5" fill="#fff" fill-opacity="0.5"/><circle cx="446" cy="356" r="4" fill="#fff" fill-opacity="0.5"/><circle cx="430" cy="322" r="3" fill="#fff" fill-opacity="0.5"/><rect x="404" y="176" width="52" height="22" rx="8" fill="url(#mt)" ${thin(5)}/><ellipse cx="400" cy="300" rx="10" ry="26" fill="#fff" fill-opacity="0.4"/>`;
    case 4: // Adaptation: an orb on a stand, or a floating orb with orbit rings
      if (alt) return `<circle cx="432" cy="250" r="78" fill="url(#gl)"/><ellipse cx="432" cy="250" rx="80" ry="22" fill="none" stroke="${p.a}" stroke-width="5" stroke-opacity="0.8"/><circle cx="432" cy="250" r="48" fill="${p.glow}" ${stroke}/><path d="M398 232 C420 212 448 220 464 246 C444 234 416 240 398 232 Z" fill="${p.a}"/><path d="M402 272 C424 288 450 280 462 260 C450 288 420 296 402 272 Z" fill="${p.ab}"/><circle cx="414" cy="232" r="9" fill="#fff" fill-opacity="0.8"/><ellipse cx="432" cy="250" rx="80" ry="22" fill="none" stroke="${p.a}" stroke-width="5" stroke-opacity="0.8" stroke-dasharray="120 140"/><circle cx="356" cy="246" r="5" fill="${p.glow}"/><circle cx="508" cy="254" r="5" fill="${p.glow}"/><path d="M432 320 L432 336 M416 328 L448 328" stroke="${p.glow}" stroke-width="4" stroke-linecap="round"/>`;
      return `<circle cx="432" cy="262" r="70" fill="url(#gl)"/><circle cx="432" cy="262" r="52" fill="${p.glow}" ${stroke}/><path d="M396 240 C420 220 450 230 468 258 C446 246 416 252 396 240 Z" fill="${p.a}"/><path d="M400 286 C424 302 452 294 466 272 C452 300 420 310 400 286 Z" fill="${p.ab}"/><circle cx="412" cy="244" r="10" fill="#fff" fill-opacity="0.8"/><path d="M380 330 C400 320 464 320 484 330 L470 352 L394 352 Z" fill="${p.ab}" ${thin(5)}/><path d="M396 336 L468 336" stroke="${p.a}" stroke-width="3" stroke-opacity="0.7"/><path d="M372 196 L372 210 M365 203 L379 203 M496 220 L496 232 M490 226 L502 226" stroke="${p.glow}" stroke-width="3" stroke-linecap="round"/>`;
    case 5: // Pressure: a spiked ball mace, or a flanged mace
      if (alt) return `<path d="M418 150 L446 150 L446 258 L418 258 Z" fill="url(#mt)" ${stroke}/><path d="M418 160 L392 176 L392 236 L418 250 Z M446 160 L472 176 L472 236 L446 250 Z" fill="url(#mt)" ${stroke}/><path d="M432 136 L432 150 M432 258 L432 272" stroke="${OUT}" stroke-width="8" stroke-linecap="round"/><path d="M424 158 L424 250" stroke="#fff" stroke-opacity="0.4" stroke-width="4"/><path d="M398 182 L398 230" stroke="#fff" stroke-opacity="0.3" stroke-width="3"/><path d="M432 272 L436 380" stroke="${LEATHER}" stroke-width="16" stroke-linecap="round"/><path d="M430 296 L440 300 M430 316 L440 320 M431 336 L441 340" stroke="${p.ab}" stroke-width="4"/><path d="M414 376 L458 376" stroke="${p.ab}" stroke-width="14" stroke-linecap="round"/>`;
      return `<path d="${SPIKES}" fill="url(#mt)" ${thin(4)}/><circle cx="432" cy="206" r="42" fill="url(#mt)" ${stroke}/><circle cx="420" cy="194" r="10" fill="#fff" fill-opacity="0.4"/><path d="M400 206 A32 32 0 0 0 432 238" fill="none" stroke="${OUT}" stroke-opacity="0.3" stroke-width="5"/><path d="M440 248 L436 380" stroke="${LEATHER}" stroke-width="16" stroke-linecap="round"/><path d="M434 280 L444 284 M433 300 L443 304 M432 320 L442 324" stroke="${p.ab}" stroke-width="4"/><path d="M414 376 L458 376" stroke="${p.ab}" stroke-width="14" stroke-linecap="round"/>`;
    case 6: // Finisher: a greatsword, or a cleaver with a curved back
      if (alt) return `<path d="M438 96 C486 118 496 240 476 332 L440 332 Z" fill="url(#mt)" ${stroke}/><path d="M444 110 C480 140 488 240 472 322" fill="none" stroke="#fff" stroke-opacity="0.45" stroke-width="4"/><path d="M448 140 L450 320" stroke="${OUT}" stroke-opacity="0.3" stroke-width="3"/><circle cx="462" cy="180" r="5" fill="${OUT}"/><circle cx="466" cy="260" r="5" fill="${OUT}"/><path d="M414 332 L504 332 L504 348 L414 348 Z" fill="${p.ab}" ${thin(5)}/><path d="M450 348 L468 348 L466 422 L452 422 Z" fill="${LEATHER}" ${thin(5)}/><path d="M452 362 L466 364 M452 376 L466 378 M452 390 L466 392" stroke="${p.ab}" stroke-width="3"/><circle cx="459" cy="432" r="12" fill="${p.a}" ${thin(5)}/>`;
      return `<path d="M440 92 L478 92 L474 332 L444 332 Z" fill="url(#mt)" ${stroke}/><path d="M452 98 L460 98 L458 324 L452 324 Z" fill="#fff" fill-opacity="0.55"/><path d="M440 92 L459 70 L478 92 Z" fill="url(#mt)" ${thin(5)}/><path d="M400 332 L518 332 L518 348 L400 348 Z" fill="${p.ab}" ${thin(5)}/><path d="M450 348 L468 348 L466 422 L452 422 Z" fill="${LEATHER}" ${thin(5)}/><path d="M452 362 L466 364 M452 376 L466 378 M452 390 L466 392" stroke="${p.ab}" stroke-width="3"/><circle cx="459" cy="432" r="12" fill="${p.a}" ${thin(5)}/>`;
    case 7: // Counterstrike: a sickle, or twin hooks on a chain
      if (alt) return `<path d="M370 150 C412 140 436 176 422 220 L404 212 C412 184 400 166 372 166 Z M368 150 L378 136 L384 156 Z" fill="url(#mt)" ${thin(5)}/><path d="M380 156 C402 156 416 176 412 200" fill="none" stroke="#fff" stroke-opacity="0.45" stroke-width="3"/><path d="M510 132 C468 122 444 158 458 202 L476 194 C468 166 480 148 508 148 Z M512 132 L502 118 L496 138 Z" fill="url(#mt)" ${thin(5)}/><path d="M500 138 C478 138 464 158 468 182" fill="none" stroke="#fff" stroke-opacity="0.45" stroke-width="3"/><path d="M412 216 C404 250 410 290 430 316 M468 198 C480 240 472 280 450 308" fill="none" stroke="${OUT}" stroke-width="10" stroke-linecap="round"/><path d="M412 216 C404 250 410 290 430 316 M468 198 C480 240 472 280 450 308" fill="none" stroke="${p.ab}" stroke-width="6" stroke-linecap="round" stroke-dasharray="8 8"/><circle cx="440" cy="330" r="14" fill="url(#mt)" ${thin(4)}/><path d="M440 344 L442 380" stroke="${LEATHER}" stroke-width="14" stroke-linecap="round"/>`;
      return `<path d="M400 160 C460 150 500 200 492 262 C486 300 460 320 440 320 C470 300 478 250 460 214 C446 186 420 174 392 176 Z" fill="url(#mt)" ${thin(5)}/><path d="M392 176 C410 174 430 180 444 194" fill="none" stroke="#fff" stroke-opacity="0.45" stroke-width="5"/><path d="M474 230 C478 262 466 290 448 306" fill="none" stroke="${OUT}" stroke-opacity="0.35" stroke-width="3"/><path d="M430 316 L452 316 L456 370 L428 370 Z" fill="${p.ab}" ${thin(5)}/><path d="M434 330 L450 332 M434 344 L450 346 M434 358 L450 360" stroke="${LEATHER}" stroke-width="3"/><path d="M436 370 L448 370 L446 412 L438 412 Z" fill="${LEATHER}" ${thin(5)}/><circle cx="442" cy="418" r="7" fill="${p.a}" ${thin(3)}/>`;
    case 8: // Balance: hand scales, or scales on a stand
      if (alt) return `<path d="M396 400 L476 400 L488 420 L384 420 Z" fill="${p.ab}" ${thin(5)}/><path d="M436 150 L436 400" stroke="${LEATHER}" stroke-width="12" stroke-linecap="round"/><path d="M372 176 L500 176" stroke="${p.ab}" stroke-width="10" stroke-linecap="round"/><path d="M372 176 L372 232 M500 176 L500 232" stroke="${p.ab}" stroke-width="4" stroke-dasharray="6 5"/><path d="M344 232 C352 256 392 256 400 232 Z" fill="url(#mt)" ${thin(5)}/><path d="M472 232 C480 256 520 256 528 232 Z" fill="url(#mt)" ${thin(5)}/><path d="M420 150 L452 150 L436 128 Z" fill="${p.a}" ${thin(4)}/><circle cx="436" cy="176" r="9" fill="url(#mt)" ${thin(4)}/>`;
      return `<path d="M436 150 L436 360" stroke="${LEATHER}" stroke-width="12" stroke-linecap="round"/><path d="M372 176 L500 176" stroke="${p.ab}" stroke-width="10" stroke-linecap="round"/><path d="M372 176 L372 232 M500 176 L500 232" stroke="${p.ab}" stroke-width="6" stroke-linecap="round"/><path d="M344 232 C352 256 392 256 400 232 Z" fill="url(#mt)" ${thin(5)}/><path d="M472 232 C480 256 520 256 528 232 Z" fill="url(#mt)" ${thin(5)}/><path d="M352 238 C360 250 384 250 392 238" fill="none" stroke="#fff" stroke-opacity="0.35" stroke-width="3"/><path d="M396 360 L476 360 L484 380 L388 380 Z" fill="${p.ab}" ${thin(5)}/><circle cx="436" cy="142" r="12" fill="${p.a}" ${thin(5)}/><circle cx="436" cy="176" r="8" fill="url(#mt)" ${thin(4)}/>`;
    default: // None: a plain staff, or a gnarled staff with a knot
      if (alt) return `<path d="M446 140 C430 180 450 220 436 260 C424 296 446 330 440 376" fill="none" stroke="${OUT}" stroke-width="20" stroke-linecap="round"/><path d="M446 140 C430 180 450 220 436 260 C424 296 446 330 440 376" fill="none" stroke="${LEATHER}" stroke-width="13" stroke-linecap="round"/><path d="M444 150 C436 170 446 200 440 220" fill="none" stroke="#5a3a24" stroke-width="4" stroke-linecap="round"/><circle cx="448" cy="134" r="16" fill="#5a3a24" ${thin(5)}/><path d="M432 300 L446 304 M430 316 L444 320" stroke="${p.ab}" stroke-width="4"/>`;
      return `<path d="M444 130 L436 380" stroke="${OUT}" stroke-width="20" stroke-linecap="round"/><path d="M444 130 L436 380" stroke="${LEATHER}" stroke-width="13" stroke-linecap="round"/><path d="M441 140 L438 300" stroke="#5a3a24" stroke-width="4" stroke-linecap="round"/><path d="M448 122 L440 130 M436 320 L448 324 M435 340 L447 344 M434 360 L446 364" stroke="${p.ab}" stroke-width="4" stroke-linecap="round"/><path d="M430 128 L458 128 L452 108 L436 108 Z" fill="url(#mt)" ${thin(4)}/>`;
  }
}

function badge(weakness: number): string {
  const w = PAL[el(weakness)]!;
  let g = "";
  switch (el(weakness)) {
    case 0: g = `<path d="M60 408 C78 420 72 440 60 444 C50 440 44 428 52 418 C54 426 58 426 60 420 Z" fill="${w.a}"/>`; break;
    case 1: g = `<path d="M42 418 L74 418 M46 428 L78 428 M50 438 L70 438" fill="none" stroke="${w.a}" stroke-width="5" stroke-linecap="round"/>`; break;
    case 2: g = `<path d="M46 420 L74 420 L78 440 L42 440 Z" fill="${w.ab}"/><path d="M50 420 L70 420 L72 430 L48 430 Z" fill="${w.a}"/>`; break;
    case 3: g = `<path d="M42 422 C50 412 58 432 66 422 C72 414 76 426 78 422 M42 436 C50 426 58 446 66 436 C72 428 76 440 78 436" fill="none" stroke="${w.a}" stroke-width="5" stroke-linecap="round"/>`; break;
    default: g = `<path d="M66 412 C50 414 42 434 56 446 C44 440 44 418 66 412 Z" fill="${w.a}"/><circle cx="66" cy="444" r="4" fill="${w.a}"/>`;
  }
  return `<circle cx="60" cy="428" r="34" fill="#100b14" fill-opacity="0.9" stroke="${w.a}" stroke-width="4"/>${g}`;
}

// ------------------------------------------------------------------ assembly

export function characterSvgV2(id: bigint, t: Traits): string {
  const e = el(t.element);
  const p = PAL[e]!;
  const v = variants(id);
  const skin = p.skins[v.skin]!;
  const head = headPath(e, tier(t.strength));
  const defTier = tier(t.defense);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">` +
    defs(p, skin, v, head, e) +
    background(p, v) +
    (v.aura ? aura(p, head) : "") +
    crest(e, tier(t.speed), p) +
    body(e, skin, p, t, v, head) +
    headgear(v, p, e, defTier) +
    armor(defTier, p) +
    eyes(tier(t.focus), p, e, v) +
    mouth(tier(t.strength), skin, e) +
    marks(v, skin, p) +
    accessory(v, p, e) +
    item(t.special, p, v) +
    badge(t.weakness) +
    `</svg>`
  );
}

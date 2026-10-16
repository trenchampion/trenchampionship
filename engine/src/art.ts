/**
 * Deterministic character artwork and ERC-721 metadata. `characterSvg` is the vector portrait
 * (engine/src/vectorart.ts = CharacterPortrait.sol), `characterAttributes` mirrors
 * CharacterPortrait.attributes and `characterTokenUri` mirrors CharacterArt.tokenURI, all byte for
 * byte (checked by engine/vectors/art-vectors.json). Integer arithmetic only.
 */
import { energyBudget, type Traits } from "./battle.js";
import { characterSvgV2, variants } from "./vectorart.js";

export const ELEMENT_NAMES = ["Fire", "Air", "Earth", "Water", "Shadow"] as const;
export const SPECIAL_NAMES = [
  "None",
  "First Strike",
  "Armor",
  "Endurance",
  "Adaptation",
  "Pressure",
  "Finisher",
  "Counterstrike",
  "Balance",
] as const;

function el(i: number): number {
  return i >= 0 && i < 5 ? i : 4;
}

function tier(v: number): number {
  return v <= 9 ? 0 : v <= 12 ? 1 : 2;
}

export function elementName(e: number): string {
  return ELEMENT_NAMES[el(e)]!;
}

export function specialName(s: number): string {
  return s >= 1 && s <= 8 ? SPECIAL_NAMES[s]! : "None";
}

/** Escapes backslash, double quote and control characters for a JSON string (as CharacterArt._json). */
function json(s: string): string {
  let out = "";
  for (const c of s) {
    const code = c.charCodeAt(0);
    if (c === '"' || c === "\\") out += "\\" + c;
    else if (code < 0x20) out += "\\u00" + code.toString(16).padStart(2, "0");
    else out += c;
  }
  return out;
}

function base64Utf8(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  return btoa(bin);
}

/** The 512x512 portrait SVG, identical to `CharacterPortrait.svg`. */
export function characterSvg(id: bigint, t: Traits): string {
  return characterSvgV2(id, t);
}

const attr = (key: string, value: string): string => `,{"trait_type":"${key}","value":"${value}"}`;
const pick3 = (i: number, a: string, b: string, c: string): string => (i === 0 ? a : i === 1 ? b : c);

const MARKS = ["None", "Scar", "Freckles", "War Paint Bars", "Cracks", "War Paint Slashes", "War Paint Chin"];
const ACCESSORIES = ["None", "Earring", "Eye Patch", "Monocle", "Bandana", "Tattoo"];
const HEADGEAR = ["None", "Bandana", "Circlet", "Topknot", "Skull Cap", "Feathered Band"];
const OUTFITS = ["Bare", "Harness", "Cloak", "Chainmail", "Fur Collar", "Bandolier"];
const BACKGROUNDS = ["Rings", "Beams", "Stars", "Ruins", "Cave", "Battlefield"];
const ITEMS: ReadonlyArray<readonly [string, string]> = [
  ["Staff", "Gnarled Staff"],
  ["Dagger", "Kris"],
  ["Kite Shield", "Round Shield"],
  ["Flask", "Vial"],
  ["Orb", "Floating Orb"],
  ["Spiked Mace", "Flanged Mace"],
  ["Greatsword", "Cleaver"],
  ["Sickle", "Twin Hooks"],
  ["Scales", "Standing Scales"],
];

/** Comma-prefixed JSON attribute objects describing what the portrait shows (`CharacterPortrait.attributes`). */
export function characterAttributes(id: bigint, t: Traits): string {
  const e = el(t.element);
  const defTier = tier(t.defense);
  const v = variants(id);
  const headgear = defTier === 2 ? "Helmet" : e === 4 ? "Hood" : HEADGEAR[v.headgear]!;
  const outfit = defTier === 1 ? "Pauldrons" : defTier === 2 ? "Full Plate" : OUTFITS[v.outfit]!;
  const accessory = v.accessory === 1 && e === 4 ? "None" : ACCESSORIES[v.accessory]!;
  const item = (ITEMS[t.special >= 1 && t.special <= 8 ? t.special : 0]!)[v.itemStyle]!;
  return (
    attr("Skin", pick3(v.skin, "Pale", "Warm", "Deep")) +
    attr("Eye Shape", pick3(v.eye, "Almond", "Round", "Narrow")) +
    attr("Brows", pick3(v.brows, "Arched", "Straight", "Split")) +
    attr("Ears", pick3(v.ears, "Small", "Regular", "Large")) +
    attr("Marks", MARKS[v.marks]!) +
    attr("Accessory", accessory) +
    attr("Headgear", headgear) +
    attr("Outfit", outfit) +
    attr("Metal", v.metal === 0 ? "Steel" : "Gold") +
    attr("Eyes", v.goldEyes ? "Gold" : v.iris === 0 ? "Bright" : "Pale") +
    attr("Item", item) +
    attr("Background", BACKGROUNDS[v.background]!) +
    attr("Aura", v.aura ? "Halo" : "None")
  );
}

/** ERC-721 token URI (base64 JSON), identical to `ControllerNFT.tokenURI`. */
export function characterTokenUri(id: bigint, t: Traits, name: string): string {
  const image = base64Utf8(characterSvg(id, t));
  const energy = energyBudget(t);
  const meta =
    `{"name":"${json(name)}","description":"Trenchampionship character #${id}: ${elementName(t.element)}, ${specialName(t.special)}, weak to ${elementName(t.weakness)}. ` +
    `Strength ${t.strength}, Defense ${t.defense}, Speed ${t.speed}, Focus ${t.focus}.","image":"data:image/svg+xml;base64,${image}","attributes":[` +
    `{"trait_type":"Strength","value":${t.strength},"max_value":15},{"trait_type":"Defense","value":${t.defense},"max_value":15},{"trait_type":"Speed","value":${t.speed},"max_value":15},{"trait_type":"Focus","value":${t.focus},"max_value":15},` +
    `{"trait_type":"Element","value":"${elementName(t.element)}"},{"trait_type":"Special","value":"${specialName(t.special)}"},{"trait_type":"Weakness","value":"${elementName(t.weakness)}"},{"trait_type":"Energy","display_type":"number","value":${energy}}` +
    characterAttributes(id, t) +
    "]}";
  return "data:application/json;base64," + base64Utf8(meta);
}

/** The portrait as an image data URI, for <img src>. */
export function characterImageUri(id: bigint, t: Traits): string {
  return "data:image/svg+xml;base64," + base64Utf8(characterSvg(id, t));
}

// The brand mark: the header pentagon with the five element colours flowing through it.
//   node scripts/brand-mark.mjs <outDir>
// Writes brand.svg (transparent, for the header and favicon), brand-dark.svg / brand-light.svg (on a rounded
// background, for avatars and token logos) and PNGs at 512/200/64/32/16 plus a preview sheet.
import { Resvg } from "@resvg/resvg-js";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const EL = { fire: "#e4552a", air: "#1796b8", earth: "#2c9a58", water: "#2b7bd4", shadow: "#7b45c2" };
const INK = "#120d16", PAPER = "#f7f6f2";

// variant 6, the founder's choice of 2026-10-16: the five element colours flow along the ring, the core goes Fire to
// Shadow; identical to web/src/components/Icons.tsx BrandMark, web/src/app/icon.svg and launch-ui/index.html
const grad = (id) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="0">` +
  `<stop offset="0" stop-color="${EL.fire}"/><stop offset="0.25" stop-color="${EL.air}"/><stop offset="0.5" stop-color="${EL.earth}"/>` +
  `<stop offset="0.75" stop-color="${EL.water}"/><stop offset="1" stop-color="${EL.shadow}"/></linearGradient>` +
  `<linearGradient id="${id}c" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${EL.fire}"/><stop offset="1" stop-color="${EL.shadow}"/></linearGradient>`;

/** The mark in a 40x40 box: outline pentagon + filled inner pentagon, same geometry as the site header. */
const mark = (innerOpacity, strokeWidth) =>
  `<polygon points="20,3 36.2,14.8 30,34 10,34 3.8,14.8" fill="none" stroke="url(#tg)" stroke-width="${strokeWidth}" stroke-linejoin="round"/>` +
  `<polygon points="20,11 29,17.5 25.5,28 14.5,28 11,17.5" fill="url(#tgc)" opacity="${innerOpacity}"/>`;

const transparent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><defs>${grad("tg")}</defs>${mark(0.9, 2)}</svg>`;
const onBg = (bg) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs>${grad("tg")}</defs>` +
  `<rect width="512" height="512" rx="104" fill="${bg}"/>` +
  `<svg x="56" y="56" width="400" height="400" viewBox="0 0 40 40">${mark(0.9, 2.2)}</svg></svg>`;

const out = process.argv[2];
mkdirSync(out, { recursive: true });
const files = { "brand.svg": transparent, "brand-dark.svg": onBg(INK), "brand-light.svg": onBg(PAPER) };
for (const [name, svg] of Object.entries(files)) writeFileSync(join(out, name), svg);
for (const [name, svg] of [["brand-dark", files["brand-dark.svg"]], ["brand-light", files["brand-light.svg"]]]) {
  for (const w of [512, 200]) writeFileSync(join(out, `${name}-${w}.png`), new Resvg(svg, { fitTo: { mode: "width", value: w } }).render().asPng());
}
for (const w of [64, 32, 16]) writeFileSync(join(out, `brand-${w}.png`), new Resvg(transparent, { fitTo: { mode: "width", value: w } }).render().asPng());

// preview: the mark on paper and on ink at several sizes, next to the word mark as in the header
const inner = transparent.replace(/<svg [^>]*>/, "").replace("</svg>", "");
let sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="620" viewBox="0 0 1200 620">`;
sheet += `<rect width="600" height="620" fill="${PAPER}"/><rect x="600" width="600" height="620" fill="${INK}"/>`;
for (const [x, color] of [[0, INK], [600, PAPER]]) {
  sheet += `<svg x="${x + 60}" y="50" width="260" height="260" viewBox="0 0 40 40">${inner}</svg>`;
  for (const [i, w] of [[0, 64], [1, 32], [2, 16]].map(([i, w]) => [i, w])) {
    sheet += `<svg x="${x + 360}" y="${60 + i * 90}" width="${w}" height="${w}" viewBox="0 0 40 40">${inner}</svg>`;
    sheet += `<text x="${x + 440}" y="${60 + i * 90 + w / 2 + 6}" font-family="sans-serif" font-size="16" fill="${color}" opacity="0.7">${w} px</text>`;
  }
  sheet += `<svg x="${x + 60}" y="380" width="40" height="40" viewBox="0 0 40 40">${inner}</svg>`;
  sheet += `<text x="${x + 112}" y="408" font-family="sans-serif" font-size="22" font-weight="800" letter-spacing="2" fill="${color}">TRENCHAMPIONSHIP</text>`;
  sheet += `<svg x="${x + 60}" y="450" width="130" height="130" viewBox="0 0 512 512">${(x === 0 ? files["brand-dark.svg"] : files["brand-light.svg"]).replace(/<svg [^>]*>/, "").replace("</svg>", "")}</svg>`;
  sheet += `<text x="${x + 210}" y="520" font-family="sans-serif" font-size="16" fill="${color}" opacity="0.7">avatar / token logo</text>`;
}
sheet += "</svg>";
writeFileSync(join(out, "preview.png"), new Resvg(sheet, { fitTo: { mode: "width", value: 1200 } }).render().asPng());
console.log(`wrote brand mark files to ${out}`);

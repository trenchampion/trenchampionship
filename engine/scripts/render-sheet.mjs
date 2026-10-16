// Contact sheet of vector portraits as PNG (no browser needed):
//   pnpm --filter @traitleague/engine build && node scripts/render-sheet.mjs <out.png> [count=24] [cols=6] [startId=1]
import { Resvg } from "@resvg/resvg-js";
import { writeFileSync } from "node:fs";
import { characterSvgV2 } from "../dist/vectorart.js";

const [, , out = "sheet.png", countArg = "24", colsArg = "6", startArg = "1"] = process.argv;
const count = Number(countArg), cols = Number(colsArg), start = Number(startArg);
const builds = [[15, 7, 15, 8], [9, 15, 8, 13], [11, 11, 11, 12], [10, 10, 15, 10], [11, 15, 9, 10], [9, 12, 12, 12], [15, 8, 10, 12], [12, 14, 8, 11], [13, 13, 9, 10], [8, 9, 14, 14]];
const cell = 512, rows = Math.ceil(count / cols);
let sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="${cols * cell}" height="${rows * cell}" viewBox="0 0 ${cols * cell} ${rows * cell}"><rect width="100%" height="100%" fill="#e9e6df"/>`;
let total = 0;
for (let i = 0; i < count; i++) {
  const id = BigInt(start + i);
  const b = builds[i % builds.length];
  const t = { strength: b[0], defense: b[1], speed: b[2], focus: b[3], element: i % 5, special: 1 + (i % 8), weakness: ((i % 5) + 1 + (i % 3)) % 5 };
  const svg = characterSvgV2(id, t);
  total += svg.length;
  // each portrait gets its own id namespace for gradients, patterns and clip paths
  const inner = svg.replace(/<svg [^>]*>/, "").replace("</svg>", "").replace(/id="([a-z]+)"/g, `id="$1${i}"`).replace(/url\(#([a-z]+)\)/g, `url(#$1${i})`);
  const x = (i % cols) * cell, y = Math.floor(i / cols) * cell;
  sheet += `<svg x="${x + 6}" y="${y + 6}" width="${cell - 12}" height="${cell - 12}" viewBox="0 0 512 512">${inner}</svg>`;
}
sheet += "</svg>";
writeFileSync(out, new Resvg(sheet, { fitTo: { mode: "width", value: Math.min(cols * cell, 1800) } }).render().asPng());
console.log(`wrote ${out}; ${count} portraits, average svg ${Math.round(total / count)} B`);

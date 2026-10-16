// Renders vector portraits for review: node scripts/vector-preview.mjs <out.html>
import { writeFileSync } from "node:fs";
import { characterSvgV2 } from "../dist/vectorart.js";

const out = process.argv[2] ?? "vector-preview.html";
const chars = [
  // Fire in three builds: fast glass cannon, tank, balanced
  [1n, [15, 7, 15, 8, 0, 1, 3], "Ember"], [4n, [9, 15, 8, 13, 0, 2, 3], "Pyra"], [8n, [11, 11, 11, 12, 0, 6, 1], "Cinder"],
  // the other species
  [2n, [10, 10, 15, 10, 1, 7, 2], "Gale"], [3n, [11, 15, 9, 10, 2, 3, 4], "Terra"], [5n, [9, 12, 12, 12, 3, 4, 0], "Tide"], [6n, [15, 8, 10, 12, 4, 5, 1], "Umbra"], [7n, [12, 14, 8, 11, 2, 8, 4], "Basalt"],
];
let html = `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#e9e6df;font-family:sans-serif"><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;padding:10px">`;
for (const [id, t, name] of chars) {
  const traits = { strength: t[0], defense: t[1], speed: t[2], focus: t[3], element: t[4], special: t[5], weakness: t[6] };
  const svg = characterSvgV2(id, traits);
  html += `<div style="background:#fff;border-radius:8px;padding:6px;text-align:center;font-size:12px">${svg.replace("<svg ", '<svg style="width:100%;height:auto;display:block;border-radius:6px" ')}<div style="margin-top:4px">#${id} ${name} · ${["Fire","Air","Earth","Water","Shadow"][t[4]]} · sp${t[5]} · S${t[0]} D${t[1]} V${t[2]} F${t[3]} · ${svg.length} B</div></div>`;
}
writeFileSync(out, html + "</div></body>");
console.log(`wrote ${out}`);

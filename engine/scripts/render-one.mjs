// One vector portrait as a large PNG:
//   node scripts/render-one.mjs <out.png> <id> <strength> <defense> <speed> <focus> <element> <special> <weakness>
import { Resvg } from "@resvg/resvg-js";
import { writeFileSync } from "node:fs";
import { characterSvgV2 } from "../dist/vectorart.js";

const [, , out, id, s, d, v, f, e, sp, w] = process.argv;
if (!w) throw new Error("usage: render-one.mjs <out.png> <id> <s> <d> <v> <f> <element> <special> <weakness>");
const svg = characterSvgV2(BigInt(id), { strength: +s, defense: +d, speed: +v, focus: +f, element: +e, special: +sp, weakness: +w });
writeFileSync(out, new Resvg(svg, { fitTo: { mode: "width", value: 768 } }).render().asPng());
console.log(`wrote ${out} (${svg.length} B svg)`);

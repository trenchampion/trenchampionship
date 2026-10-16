// Renders an SVG file to PNG at the given widths (no browser needed):
//   node scripts/render-logo.mjs <in.svg> <out-prefix> 200 512
import { Resvg } from "@resvg/resvg-js";
import { readFileSync, writeFileSync } from "node:fs";

const [, , input, prefix, ...widths] = process.argv;
if (!input || !prefix || widths.length === 0) throw new Error("usage: render-logo.mjs <in.svg> <out-prefix> <width>...");
const svg = readFileSync(input, "utf8");
for (const w of widths) {
  const out = `${prefix}-${w}.png`;
  writeFileSync(out, new Resvg(svg, { fitTo: { mode: "width", value: Number(w) } }).render().asPng());
  console.log(`wrote ${out}`);
}

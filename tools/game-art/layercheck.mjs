// Value-ladder / readability check for parallax layer art.
//   node layercheck.mjs <image.png> [logicalW] [logicalH]
// Prints a row-lightness profile, where the darkest pixels live, and a red-pixel
// count (red is reserved for Haide's collar and must not appear in backgrounds).
import sharp from "./lib/sharp.mjs";

const file = process.argv[2];
const W = +(process.argv[3] || 360);
const H = +(process.argv[4] || 640);
if (!file) {
  console.error("usage: node layercheck.mjs <image.png> [W] [H]");
  process.exit(1);
}

const { data } = await sharp(file)
  .resize(W, H, { kernel: sharp.kernel.cubic })
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const px = (x, y) => {
  const i = (y * W + x) * 3;
  return [data[i], data[i + 1], data[i + 2]];
};
const hsl = ([r, g, b]) => {
  r /= 255;
  g /= 255;
  b /= 255;
  const M = Math.max(r, g, b),
    m = Math.min(r, g, b),
    d = M - m,
    l = (M + m) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d) {
    if (M === r) h = 60 * (((g - b) / d) % 6);
    else if (M === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  return [h < 0 ? h + 360 : h, s, l];
};

const L = new Float64Array(W * H),
  S = new Float64Array(W * H),
  Hu = new Float64Array(W * H);
for (let y = 0; y < H; y++)
  for (let x = 0; x < W; x++) {
    const [h, s, l] = hsl(px(x, y));
    const i = y * W + x;
    L[i] = l;
    S[i] = s;
    Hu[i] = h;
  }

const STEP = 16;
console.log("row profile (each row = " + STEP + "px of " + H + "):");
console.log("   y      meanL  p2L  p98L  contrast  meanSat  bar");
for (let y0 = 0; y0 < H; y0 += STEP) {
  const ls = [],
    ss = [];
  for (let y = y0; y < Math.min(y0 + STEP, H); y++)
    for (let x = 0; x < W; x++) {
      ls.push(L[y * W + x]);
      ss.push(S[y * W + x]);
    }
  ls.sort((a, b) => a - b);
  const mean = ls.reduce((a, b) => a + b) / ls.length;
  const lo = ls[Math.floor(ls.length * 0.02)],
    hi = ls[Math.floor(ls.length * 0.98)];
  const sat = ss.reduce((a, b) => a + b) / ss.length;
  const bar = "#".repeat(Math.round((hi - lo) * 40));
  console.log(
    String(y0).padStart(5),
    (mean * 100).toFixed(0).padStart(9),
    (lo * 100).toFixed(0).padStart(5),
    (hi * 100).toFixed(0).padStart(5),
    ((hi - lo) * 100).toFixed(0).padStart(9),
    (sat * 100).toFixed(0).padStart(8),
    " " + bar,
  );
}

const idx = [...L.keys()].sort((a, b) => L[a] - L[b]);
const dark = idx.slice(0, Math.floor(idx.length * 0.02));
const buckets = {};
for (const i of dark) {
  const k = Math.floor(Math.floor(i / W) / 64) * 64;
  buckets[k] = (buckets[k] || 0) + 1;
}
console.log("\ndarkest 2% of pixels, by y band:");
for (const k of Object.keys(buckets).sort((a, b) => a - b)) {
  console.log(
    "  y " +
      k +
      "-" +
      (+k + 63) +
      ": " +
      ((100 * buckets[k]) / dark.length).toFixed(0) +
      "%",
  );
}
console.log(
  "  global darkest L = " +
    (L[idx[0]] * 100).toFixed(0) +
    "  at y=" +
    Math.floor(idx[0] / W),
);
console.log("  PASS if the darkest band is the ground strip at the bottom.");

let red = 0;
for (let i = 0; i < L.length; i++)
  if (S[i] > 0.35 && L[i] < 0.75 && (Hu[i] >= 335 || Hu[i] <= 20)) red++;
console.log(
  "\nred-ish pixels (hue 335-20, sat>35%, L<75%): " +
    red +
    " (" +
    ((100 * red) / (W * H)).toFixed(2) +
    "%)",
);
console.log("  PASS if well under 1% — red is reserved for the collar.");

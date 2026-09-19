// sharp is a dependency of website/, and these tools live outside that package,
// so resolve it from there rather than adding a second copy to the repo.
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
export const toolRoot = path.resolve(here, "..");
export const repoRoot = path.resolve(here, "../../..");

let sharp;
try {
  sharp = createRequire(path.join(repoRoot, "website", "package.json"))(
    "sharp",
  );
} catch {
  console.error("sharp not found — run `npm install` inside website/ first.");
  process.exit(1);
}
export default sharp;

export const SOURCE = path.join(toolRoot, "source");
export const ASSETS = path.join(toolRoot, "assets");

/** Vertical extent of the opaque pixels, for trimming a cutout layer to its band. */
export async function opaqueBand(file) {
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;
  let top = -1,
    bot = -1;
  for (let y = 0; y < H; y++) {
    let o = false;
    for (let x = 0; x < W; x++)
      if (data[(y * W + x) * C + 3] > 8) {
        o = true;
        break;
      }
    if (o) {
      if (top < 0) top = y;
      bot = y;
    }
  }
  return { W, H, top, bot, height: bot - top + 1 };
}

export function hsl(r, g, b) {
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
}

/** The obstacle's pinned five-colour ramp. Snapping to it removes the soft
 *  gradients the generator leaves behind and keeps the hue off Haide's collar red. */
export const OBSTACLE_RAMP = [
  "#3d2a12",
  "#6b4a1f",
  "#9c6f2f",
  "#c9954a",
  "#e4bd76",
].map((h) => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
]);

export function snapToRamp(buf, ramp = OBSTACLE_RAMP) {
  for (let i = 0; i < buf.length; i += 4) {
    if (buf[i + 3] < 128) {
      buf[i] = buf[i + 1] = buf[i + 2] = buf[i + 3] = 0;
      continue;
    }
    buf[i + 3] = 255;
    let best = 0,
      bd = Infinity;
    for (let k = 0; k < ramp.length; k++) {
      const d =
        (buf[i] - ramp[k][0]) ** 2 +
        (buf[i + 1] - ramp[k][1]) ** 2 +
        (buf[i + 2] - ramp[k][2]) ** 2;
      if (d < bd) {
        bd = d;
        best = k;
      }
    }
    [buf[i], buf[i + 1], buf[i + 2]] = ramp[best];
  }
  return buf;
}

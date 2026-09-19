// Composite the playfield from assets/manifest.json into a contact sheet.
//
//   node preview.mjs [--out preview.png] [--times 0,1.2,2.4,3.6] [--zoom 0.45]
//
// This is the readability test: obstacle against background, character against
// sky, and every tile wrapping at a different phase in every column.
import { readFileSync } from "node:fs";
import path from "node:path";
import sharp, { ASSETS, toolRoot } from "./lib/sharp.mjs";

const arg = (k, d) => {
  const i = process.argv.indexOf("--" + k);
  return i > 0 ? process.argv[i + 1] : d;
};
const M = JSON.parse(readFileSync(path.join(ASSETS, "manifest.json"), "utf8"));
const W = M.playArea.w,
  H = M.playArea.h,
  BASE = M.scrollPxPerSecond,
  R = M.renderScale;
const TIMES = arg("times", "0,1.2,2.4,3.6").split(",").map(Number);
const ZOOM = +arg("zoom", 0.45);
const OUT = path.resolve(arg("out", path.join(toolRoot, "preview.png")));

const load = async (f) => {
  const { data, info } = await sharp(path.join(ASSETS, f))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height, C: info.channels };
};

const layers = [];
for (const L of M.layers) layers.push({ ...L, ...(await load(L.id + ".png")) });
const ground = layers.pop(); // L6 is last and is drawn over the posts
const cap = await load("obstacle-cap.png");
const body = await load("obstacle-body.png");

const FW = M.haide.frameWidth,
  FH = M.haide.frameHeight;
const TILT = [-20, 0, 25, 70];
const haide = {};
for (let f = 0; f < M.haide.frames; f++) {
  haide[f] = {};
  for (const deg of TILT) {
    const { data, info } = await sharp(path.join(ASSETS, M.haide.sheet))
      .extract({ left: f * FW, top: 0, width: FW, height: FH })
      .rotate(deg, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .raw()
      .toBuffer({ resolveWithObject: true });
    haide[f][deg] = { data, w: info.width, h: info.height, C: 4 };
  }
}

// The sky is code-drawn, not shipped art: lift its stepped bands out of the
// approved key art by taking each row's median colour.
const key = await sharp(path.join(toolRoot, "source", "keyart.png"))
  .resize(W, H, { kernel: sharp.kernel.cubic })
  .removeAlpha()
  .raw()
  .toBuffer();
const skyRow = [];
for (let y = 0; y < H; y++) {
  const sy = Math.min(y, 405 * R);
  const r = [],
    g = [],
    b = [];
  for (let x = 0; x < W; x += 4) {
    const i = (sy * W + x) * 3;
    r.push(key[i]);
    g.push(key[i + 1]);
    b.push(key[i + 2]);
  }
  const med = (a) => a.sort((p, q) => p - q)[a.length >> 1];
  skyRow.push([med(r), med(g), med(b)]);
}

function blit(buf, spr, dx, dy, flipY = false) {
  for (let sy = 0; sy < spr.h; sy++) {
    const ty = dy + sy;
    if (ty < 0 || ty >= H) continue;
    const ry = flipY ? spr.h - 1 - sy : sy;
    for (let sx = 0; sx < spr.w; sx++) {
      const tx = dx + sx;
      if (tx < 0 || tx >= W) continue;
      const si = (ry * spr.w + sx) * spr.C;
      const a = spr.data[si + 3] / 255;
      if (a === 0) continue;
      const o = (ty * W + tx) * 3;
      for (let c = 0; c < 3; c++)
        buf[o + c] = Math.round(spr.data[si + c] * a + buf[o + c] * (1 - a));
    }
  }
}
const gapCenter = (n) =>
  (210 + 90 * Math.sin(n * 1.7) + 40 * Math.sin(n * 0.6)) * R;

function frame(t, tiltIdx, flapIdx) {
  const buf = Buffer.alloc(W * H * 3);
  for (let y = 0; y < H; y++) {
    const [r, g, b] = skyRow[y];
    for (let x = 0; x < W; x++) {
      const o = (y * W + x) * 3;
      buf[o] = r;
      buf[o + 1] = g;
      buf[o + 2] = b;
    }
  }
  for (const L of layers) {
    const off = Math.round(t * BASE * L.speed) % L.w;
    for (let ty = 0; ty < L.h; ty++) {
      const sy = L.y + ty;
      if (sy < 0 || sy >= H) continue;
      for (let x = 0; x < W; x++) {
        const si = (ty * L.w + ((x + off) % L.w)) * L.C;
        const a = L.data[si + 3] / 255;
        if (a === 0) continue;
        const o = (sy * W + x) * 3;
        for (let c = 0; c < 3; c++)
          buf[o + c] = Math.round(L.data[si + c] * a + buf[o + c] * (1 - a));
      }
    }
  }
  const { gap, spacing } = M.obstacle;
  const scroll = t * BASE;
  const firstN = Math.floor((scroll - W) / spacing) - 1;
  for (let n = firstN; n < firstN + 6; n++) {
    const x = Math.round(n * spacing - scroll + W);
    if (x > W || x < -cap.w) continue;
    const gc = gapCenter(n);
    const shaftX = x + Math.round((cap.w - body.w) / 2);
    const topEnd = Math.round(gc - gap / 2),
      botStart = Math.round(gc + gap / 2);
    for (let y = -body.h; y < topEnd - cap.h + 2; y += body.h)
      blit(buf, body, shaftX, y);
    blit(buf, cap, x, topEnd - cap.h, true);
    blit(buf, cap, x, botStart, false);
    for (let y = botStart + cap.h - 2; y < ground.y; y += body.h)
      blit(buf, body, shaftX, y);
  }
  const spr = haide[flapIdx][TILT[tiltIdx]];
  blit(
    buf,
    spr,
    M.haide.spawnX - (spr.w >> 1),
    [250, 300, 340, 380][tiltIdx] * R - (spr.h >> 1),
  );

  const goff = Math.round(t * BASE) % ground.w;
  for (let ty = 0; ty < ground.h; ty++) {
    const sy = ground.y + ty;
    if (sy >= H) break;
    for (let x = 0; x < W; x++) {
      const si = (ty * ground.w + ((x + goff) % ground.w)) * ground.C;
      const o = (sy * W + x) * 3;
      for (let c = 0; c < 3; c++) buf[o + c] = ground.data[si + c];
    }
  }
  return buf;
}

const PAD = 10,
  cw = Math.round(W * ZOOM),
  chh = Math.round(H * ZOOM);
const parts = [];
for (let k = 0; k < TIMES.length; k++) {
  const png = await sharp(frame(TIMES[k], k % 4, [0, 1, 2, 1][k % 4]), {
    raw: { width: W, height: H, channels: 3 },
  })
    .resize(cw, chh)
    .png()
    .toBuffer();
  parts.push({ input: png, left: k * (cw + PAD), top: 0 });
}
await sharp({
  create: {
    width: (cw + PAD) * TIMES.length - PAD,
    height: chh,
    channels: 3,
    background: "#1b1b1b",
  },
})
  .composite(parts)
  .png()
  .toFile(OUT);
console.log(`play area ${W}x${H} @ ${BASE}px/s -> ${OUT}`);

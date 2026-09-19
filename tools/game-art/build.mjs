// Build the whole game asset set from source/ into assets/.
//
//   node build.mjs [--scale 3]
//
// Physics runs in a 360x640 unit space; --scale is the render multiplier.
// 3 (1080x1920) is the practical ceiling: the clouds strip is the narrowest
// source and only supports a play area up to ~1086px before it would be
// upscaled.
//
// Each layer's seam is healed here, not by hand, so the build is reproducible:
//   L1 clouds   discrete objects  -> drop blobs touching either edge
//   L2 treeline continuous        -> cross-fade the tail onto the head
//   L3 pergola  periodic          -> crop between two whole post left-edges
//   L4 hedge    already wraps
//   L6 ground   continuous        -> cross-fade
import { writeFileSync } from "node:fs";
import path from "node:path";
import sharp, {
  SOURCE,
  ASSETS,
  opaqueBand,
  snapToRamp,
  hsl,
} from "./lib/sharp.mjs";
import { sliceBand } from "./slice-sprite.mjs";

const scaleArg = process.argv.indexOf("--scale");
const R = scaleArg > 0 ? +process.argv[scaleArg + 1] : 3;
const PLAY_W = 360 * R,
  PLAY_H = 640 * R,
  SCROLL = 150 * R;
const out = (f) => path.join(ASSETS, f);
const src = (f) => path.join(SOURCE, f);

const raw = (f) =>
  sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const save = (data, w, h, c, f) =>
  sharp(data, { raw: { width: w, height: h, channels: c } })
    .png()
    .toFile(f);

/** Cross-fade the last M columns onto the first M so the two edges converge. */
function wrapBlend(data, W, H, C, frac = 0.15) {
  const M = Math.max(2, Math.round(W * frac)),
    Wo = W - M;
  const o = Buffer.alloc(Wo * H * C);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < Wo; x++) {
      const d = (y * Wo + x) * C;
      if (x >= M) {
        data.copy(o, d, (y * W + x) * C, (y * W + x) * C + C);
        continue;
      }
      const t = x / M,
        a = (y * W + x) * C,
        b = (y * W + x + Wo) * C;
      const aa = (data[a + 3] / 255) * t,
        ab = (data[b + 3] / 255) * (1 - t),
        sum = aa + ab;
      o[d + 3] = Math.round(sum * 255);
      for (let c = 0; c < 3; c++)
        o[d + c] =
          sum > 0 ? Math.round((data[a + c] * aa + data[b + c] * ab) / sum) : 0;
    }
  return { data: o, W: Wo };
}

/** Delete every opaque blob that touches the left or right edge. */
function edgeClear(data, W, H, C) {
  const op = (i) => data[i * C + 3] > 8;
  const seen = new Uint8Array(W * H);
  const stack = [];
  let blobs = 0;
  for (let y = 0; y < H; y++)
    for (const x of [0, W - 1]) {
      const s = y * W + x;
      if (!op(s) || seen[s]) continue;
      blobs++;
      stack.push(s);
      seen[s] = 1;
      while (stack.length) {
        const i = stack.pop(),
          cx = i % W,
          cy = (i / W) | 0;
        data[i * C] = data[i * C + 1] = data[i * C + 2] = data[i * C + 3] = 0;
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const nx = cx + dx,
            ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const n = ny * W + nx;
          if (!seen[n] && op(n)) {
            seen[n] = 1;
            stack.push(n);
          }
        }
      }
    }
  return blobs;
}

/** Crop between two whole post left-edges so the tile holds an exact number of
 *  periods. Posts clipped by an edge must be excluded: starting the crop on a
 *  clipped post leaves it narrower than the rest once the tile wraps. */
function cropWholePeriods(data, W, H, C) {
  const y = Math.round(H * 0.8);
  const runs = [];
  let st = -1;
  for (let x = 0; x <= W; x++) {
    const on = x < W && data[(y * W + x) * C + 3] > 128;
    if (on && st < 0) st = x;
    if (!on && st >= 0) {
      runs.push([st, x - 1]);
      st = -1;
    }
  }
  const whole = runs.filter((r) => r[0] > 0 && r[1] < W - 1);
  if (whole.length < 2) return { data, W, periods: 0 };
  const from = whole[0][0],
    to = whole[whole.length - 1][0],
    w = to - from;
  const o = Buffer.alloc(w * H * C);
  for (let yy = 0; yy < H; yy++) {
    data.copy(o, yy * w * C, (yy * W + from) * C, (yy * W + from + w) * C);
  }
  return { data: o, W: w, periods: whole.length - 1 };
}

const LAYERS = [
  { id: "L1-clouds", tileW: 720, topY: 60, speed: 0.08, heal: "edgeclear" },
  {
    id: "L2-treeline",
    tileW: 540,
    bottomY: 430,
    speed: 0.2,
    heal: "wrapblend",
  },
  { id: "L3-pergola", tileW: 480, bottomY: 528, speed: 0.4, heal: "periods" },
  { id: "L4-hedge", tileW: 360, bottomY: 528, speed: 0.7, heal: null },
];

const manifest = {
  renderScale: R,
  playArea: { w: PLAY_W, h: PLAY_H },
  physicsUnits: { w: 360, h: 640 },
  scrollPxPerSecond: SCROLL,
  layers: [],
};

for (const L of LAYERS) {
  const file = src(L.id + ".png");
  const b = await opaqueBand(file);
  const tw = L.tileW * R,
    th = Math.round(b.height * (tw / b.W));
  let { data, info } = await sharp(file)
    .ensureAlpha()
    .extract({ left: 0, top: b.top, width: b.W, height: b.height })
    .resize(tw, th, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });
  let W = info.width;
  const { height: Hh, channels: Cc } = info;
  let note = "";
  if (L.heal === "edgeclear")
    note = `cleared ${edgeClear(data, W, Hh, Cc)} edge blob(s)`;
  else if (L.heal === "wrapblend") {
    const r = wrapBlend(data, W, Hh, Cc);
    data = r.data;
    W = r.W;
    note = `wrap-blended to ${W}`;
  } else if (L.heal === "periods") {
    const r = cropWholePeriods(data, W, Hh, Cc);
    data = r.data;
    W = r.W;
    note = `cropped to ${r.periods} whole periods, ${W}px`;
  }
  await save(data, W, Hh, Cc, out(L.id + ".png"));
  const y = L.topY !== undefined ? L.topY * R : L.bottomY * R - Hh;
  manifest.layers.push({
    id: L.id,
    tile: [W, Hh],
    y,
    speed: L.speed,
    loopSeconds: +(W / (SCROLL * L.speed)).toFixed(2),
  });
  console.log(
    `${L.id.padEnd(12)} ${String(W).padStart(4)}x${String(Hh).padEnd(3)} y=${String(y).padStart(4)} ${note}`,
  );
}

{
  // ground: opaque, with the boundary line lifted off near-black
  const tw = 288 * R,
    th = 112 * R;
  let { data } = await sharp(src("L6-ground.png"))
    .removeAlpha()
    .resize(tw, th, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 3) {
    const l =
      (Math.max(data[i], data[i + 1], data[i + 2]) +
        Math.min(data[i], data[i + 1], data[i + 2])) /
      510;
    if (l < 0.1) {
      const k = 0.15 / Math.max(l, 0.02);
      for (let c = 0; c < 3; c++)
        data[i + c] = Math.min(255, Math.round(data[i + c] * k));
    }
  }
  const r = wrapBlend(data, tw, th, 3);
  await save(r.data, r.W, th, 3, out("L6-ground.png"));
  manifest.layers.push({
    id: "L6-ground",
    tile: [r.W, th],
    y: 528 * R,
    speed: 1,
    loopSeconds: +(r.W / SCROLL).toFixed(2),
  });
  console.log(
    `L6-ground    ${String(r.W).padStart(4)}x${String(th).padEnd(3)} y=${528 * R} wrap-blended, edge line lifted to ~L15`,
  );
}

{
  // obstacle: a cap plus a vertically tileable shaft slice
  const file = src("obstacle-post.png");
  const { data, info } = await raw(file);
  const { width: W, height: H, channels: C } = info;
  const rows = [];
  for (let y = 0; y < H; y++) {
    let a = -1,
      b = -1;
    for (let x = 0; x < W; x++)
      if (data[(y * W + x) * C + 3] > 8) {
        if (a < 0) a = x;
        b = x;
      }
    rows.push(a < 0 ? null : { a, b, w: b - a + 1 });
  }
  const first = rows.findIndex(Boolean);
  const ws = rows.filter(Boolean).map((r) => r.w);
  const shaftW = ws[ws.length - 1];
  let capBottom = first;
  for (let y = first; y < H; y++)
    if (rows[y] && rows[y].w > shaftW * 1.05) capBottom = y;
  const scale = (64 * R) / shaftW;
  const cut = async (top, height, w, h, f) => {
    const row = rows[Math.min(top + 2, H - 1)] || rows[top];
    const left = Math.max(0, Math.round((row.a + row.b) / 2 - w / scale / 2));
    const buf = await sharp(file)
      .ensureAlpha()
      .extract({
        left,
        top,
        width: Math.min(W - left, Math.round(w / scale)),
        height,
      })
      .resize(w, h, { fit: "fill" })
      .raw()
      .toBuffer();
    await save(snapToRamp(buf), w, h, 4, f);
  };
  await cut(
    first,
    capBottom - first + 1,
    72 * R,
    18 * R,
    out("obstacle-cap.png"),
  );
  await cut(
    capBottom + 300,
    Math.round((16 * R) / scale),
    64 * R,
    16 * R,
    out("obstacle-body.png"),
  );
  manifest.obstacle = {
    cap: [72 * R, 18 * R],
    body: [64 * R, 16 * R],
    collision: "one rect at cap width, full column height",
    gap: 150 * R,
    spacing: 230 * R,
  };
  console.log(
    `obstacle     cap ${72 * R}x${18 * R}  body ${64 * R}x${16 * R} (tiles vertically)`,
  );
}

{
  // Haide
  const r = await sliceBand(src("haide-band3.png"), {
    frames: 3,
    width: 40 * R,
    landmark: "eye",
  });
  // The death frame is generated separately, so the generator redraws the body
  // slightly rather than copying it. Register it on the collar and match its
  // bounding-box width to the flight frames, or the sprite jumps on impact.
  const FW = r.frameWidth,
    FH = r.frameHeight;
  const frameOf = (i) => {
    const f = Buffer.alloc(FW * FH * 4);
    for (let y = 0; y < FH; y++) {
      r.sheet.copy(
        f,
        y * FW * 4,
        (y * FW * r.frames + i * FW) * 4,
        (y * FW * r.frames + (i + 1) * FW) * 4,
      );
    }
    return f;
  };
  const measure = (buf, w, h) => {
    let x0 = w,
      x1 = -1,
      y0 = h,
      y1 = -1,
      n = 0,
      cx = 0,
      cy = 0;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (buf[i + 3] < 200) continue;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
        const [hh, s, l] = hsl(buf[i], buf[i + 1], buf[i + 2]);
        if (s > 0.55 && l > 0.22 && l < 0.62 && (hh >= 348 || hh <= 12)) {
          n++;
          cx += x;
          cy += y;
        }
      }
    return { x0, x1, y0, y1, w: x1 - x0 + 1, h: y1 - y0 + 1, cx: cx / n, cy: cy / n };
  };

  const ref = measure(frameOf(1), FW, FH);
  const deadSrc = src("haide-dead.png");
  const dm = await sharp(deadSrc)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const dRef = measure(dm.data, dm.info.width, dm.info.height);
  const k = ref.w / dRef.w;
  const dw = Math.max(1, Math.round(dRef.w * k)),
    dh = Math.max(1, Math.round(dRef.h * k));
  const scaled = await sharp(deadSrc)
    .ensureAlpha()
    .extract({ left: dRef.x0, top: dRef.y0, width: dRef.w, height: dRef.h })
    .resize(dw, dh, { fit: "fill" })
    .raw()
    .toBuffer();
  // place so the death frame's collar lands on the flight frame's collar
  const offX = Math.round(ref.cx - (dRef.cx - dRef.x0) * k);
  const offY = Math.round(ref.cy - (dRef.cy - dRef.y0) * k);

  const frames = r.frames + 1;
  const sheet = Buffer.alloc(FW * frames * FH * 4);
  for (let y = 0; y < FH; y++) {
    r.sheet.copy(
      sheet,
      y * FW * frames * 4,
      y * FW * r.frames * 4,
      (y + 1) * FW * r.frames * 4,
    );
  }
  for (let y = 0; y < dh; y++) {
    const ty = offY + y;
    if (ty < 0 || ty >= FH) continue;
    for (let x = 0; x < dw; x++) {
      const tx = offX + x;
      if (tx < 0 || tx >= FW) continue;
      const s = (y * dw + x) * 4;
      if (scaled[s + 3] < 110) continue;
      const d = (ty * FW * frames + r.frames * FW + tx) * 4;
      sheet[d] = scaled[s];
      sheet[d + 1] = scaled[s + 1];
      sheet[d + 2] = scaled[s + 2];
      sheet[d + 3] = 255;
    }
  }

  await sharp(sheet, {
    raw: { width: FW * frames, height: FH, channels: 4 },
  })
    .png()
    .toFile(out("haide-fly.png"));
  manifest.haide = {
    sheet: "haide-fly.png",
    frameWidth: FW,
    frameHeight: FH,
    frames,
    order: ["wings-up", "wings-level", "wings-down", "dead"],
    playback: "ping-pong 0,1,2,1 while flying; hold frame 3 on death",
    deadFrame: r.frames,
    hitBox: r.hitBox,
    nativeCell: r.nativeCell,
    spawnX: 96 * R,
  };
  // A standalone still for the site's entry card. Cropping the sheet in CSS
  // works until the frame count changes; a real file does not.
  await sharp(frameOf(1), { raw: { width: FW, height: FH, channels: 4 } })
    .png()
    .toFile(out("haide-card.png"));
  manifest.haide.still = "haide-card.png";

  console.log(
    `haide        ${FW}x${FH} x${frames} (3 flap + dead)  hit box ${r.hitBox.w}x${r.hitBox.h}`,
  );
  console.log(`             still frame -> haide-card.png ${FW}x${FH}`);
  console.log(
    `             death frame scaled ${k.toFixed(3)}x, collar aligned to (${ref.cx.toFixed(1)},${ref.cy.toFixed(1)})`,
  );
}

writeFileSync(out("manifest.json"), JSON.stringify(manifest, null, 2));
console.log(
  `\nplay area ${PLAY_W}x${PLAY_H}, scroll ${SCROLL}px/s  ->  assets/manifest.json`,
);
console.log(
  "loop periods: " +
    manifest.layers
      .map((l) => `${l.id.replace(/^L\d-/, "")} ${l.loopSeconds}s`)
      .join(", "),
);

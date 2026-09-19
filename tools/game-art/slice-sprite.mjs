// Turn a generated frame band into a sprite sheet.
//
//   node slice-sprite.mjs <band.png> <out.png> [--frames 3] [--width 120]
//                         [--landmark eye|collar] [--native]
//
// Frames are registered on a colour landmark rather than on the cell grid,
// because the generator places the body a few pixels differently in each cell
// and that drift becomes a visible twitch once the sprite is small. Pick a
// landmark that is rigid in every frame: the eye survives a wing sweep, the
// collar does not (a swept-down wing occludes part of it and drags its
// centroid by tens of pixels).
import { writeFileSync } from "node:fs";
import sharp, { hsl } from "./lib/sharp.mjs";

const LANDMARKS = {
  eye: (h, s, l) => s > 0.45 && l > 0.3 && l < 0.75 && h >= 195 && h <= 235,
  collar: (h, s, l) => s > 0.5 && l < 0.6 && (h >= 345 || h <= 12),
};

export async function sliceBand(
  src,
  { frames = 3, width = null, landmark = "eye" } = {},
) {
  const test = LANDMARKS[landmark];
  if (!test)
    throw new Error("landmark must be one of: " + Object.keys(LANDMARKS));

  const { data, info } = await sharp(src)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;
  const op = (x, y) => data[(y * W + x) * C + 3] > 16;

  const cells = [];
  let st = -1;
  for (let x = 0; x <= W; x++) {
    let on = false;
    if (x < W)
      for (let y = 0; y < H; y++)
        if (op(x, y)) {
          on = true;
          break;
        }
    if (on && st < 0) st = x;
    if (!on && st >= 0) {
      if (x - st > 30) cells.push([st, x - 1]);
      st = -1;
    }
  }
  if (cells.length !== frames)
    throw new Error(`expected ${frames} frames, found ${cells.length}`);

  const anchor = ([a, b]) => {
    let n = 0,
      cx = 0,
      cy = 0;
    for (let y = 0; y < H; y++)
      for (let x = a; x <= b; x++) {
        const i = (y * W + x) * C;
        if (data[i + 3] < 200) continue;
        if (test(...hsl(data[i], data[i + 1], data[i + 2]))) {
          n++;
          cx += x;
          cy += y;
        }
      }
    if (!n) throw new Error(`landmark "${landmark}" not found in a frame`);
    return { x: cx / n, y: cy / n };
  };
  const anchors = cells.map(anchor);
  const ax = anchors[0].x - cells[0][0],
    ay = anchors[0].y;
  const origins = anchors.map((p) => ({
    ox: Math.round(p.x - ax),
    oy: Math.round(p.y - ay),
  }));

  let lx0 = Infinity,
    lx1 = -Infinity,
    ly0 = Infinity,
    ly1 = -Infinity;
  cells.forEach(([a, b], i) => {
    for (let y = 0; y < H; y++)
      for (let x = a; x <= b; x++) {
        if (!op(x, y)) continue;
        const rx = x - origins[i].ox,
          ry = y - origins[i].oy;
        if (rx < lx0) lx0 = rx;
        if (rx > lx1) lx1 = rx;
        if (ry < ly0) ly0 = ry;
        if (ry > ly1) ly1 = ry;
      }
  });
  const cw = lx1 - lx0 + 1,
    ch = ly1 - ly0 + 1;
  const outW = width || cw;
  const outH = Math.round(ch * (outW / cw));

  const cut = [];
  for (let i = 0; i < frames; i++) {
    const left = lx0 + origins[i].ox,
      top = ly0 + origins[i].oy;
    const cellBuf = Buffer.alloc(cw * ch * 4);
    for (let y = 0; y < ch; y++) {
      const sy = top + y;
      if (sy < 0 || sy >= H) continue;
      for (let x = 0; x < cw; x++) {
        const sx = left + x;
        if (sx < 0 || sx >= W) continue;
        const s = (sy * W + sx) * C,
          d = (y * cw + x) * 4;
        cellBuf[d] = data[s];
        cellBuf[d + 1] = data[s + 1];
        cellBuf[d + 2] = data[s + 2];
        cellBuf[d + 3] = data[s + 3];
      }
    }
    cut.push(
      outW === cw
        ? cellBuf
        : await sharp(cellBuf, { raw: { width: cw, height: ch, channels: 4 } })
            .resize(outW, outH, { fit: "fill" })
            .raw()
            .toBuffer(),
    );
  }

  const sheet = Buffer.alloc(outW * frames * outH * 4);
  cut.forEach((f, i) => {
    for (let y = 0; y < outH; y++) {
      f.copy(
        sheet,
        (y * outW * frames + i * outW) * 4,
        y * outW * 4,
        (y + 1) * outW * 4,
      );
    }
  });

  // Collision box from the pixels opaque in every frame: that is the body, with
  // whatever moves (the wings) excluded. Wings should not kill the player.
  let bx0 = outW,
    bx1 = -1,
    by0 = outH,
    by1 = -1;
  for (let y = 0; y < outH; y++)
    for (let x = 0; x < outW; x++) {
      const p = (y * outW + x) * 4;
      if (cut.every((f) => f[p + 3] > 0)) {
        if (x < bx0) bx0 = x;
        if (x > bx1) bx1 = x;
        if (y < by0) by0 = y;
        if (y > by1) by1 = y;
      }
    }
  const bw = bx1 - bx0 + 1,
    bh = by1 - by0 + 1,
    inset = 0.12;
  const hitBox = {
    x: Math.round(bx0 + bw * inset),
    y: Math.round(by0 + bh * inset),
    w: Math.round(bw * (1 - 2 * inset)),
    h: Math.round(bh * (1 - 2 * inset)),
  };

  return {
    sheet,
    frameWidth: outW,
    frameHeight: outH,
    frames,
    nativeCell: [cw, ch],
    bodyBox: { x: bx0, y: by0, w: bw, h: bh },
    hitBox,
    hitBoxNormalised: {
      x: +(hitBox.x / outW).toFixed(4),
      y: +(hitBox.y / outH).toFixed(4),
      w: +(hitBox.w / outW).toFixed(4),
      h: +(hitBox.h / outH).toFixed(4),
    },
  };
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}`) {
  const [src, out] = process.argv.slice(2);
  if (!src || !out) {
    console.error(
      "usage: slice-sprite.mjs <band.png> <out.png> [--frames N] [--width N] [--landmark eye|collar]",
    );
    process.exit(1);
  }
  const arg = (k, d) => {
    const i = process.argv.indexOf("--" + k);
    return i > 0 ? process.argv[i + 1] : d;
  };
  const r = await sliceBand(src, {
    frames: +arg("frames", 3),
    width: process.argv.includes("--native") ? null : +arg("width", 120),
    landmark: arg("landmark", "eye"),
  });
  await sharp(r.sheet, {
    raw: { width: r.frameWidth * r.frames, height: r.frameHeight, channels: 4 },
  })
    .png()
    .toFile(out);
  writeFileSync(
    out.replace(/\.png$/, ".json"),
    JSON.stringify(
      {
        sheet: out.split(/[\\/]/).pop(),
        frameWidth: r.frameWidth,
        frameHeight: r.frameHeight,
        frames: r.frames,
        order: ["wings-up", "wings-level", "wings-down"],
        playback: "ping-pong 0,1,2,1",
        bodyBox: r.bodyBox,
        hitBox: r.hitBox,
        hitBoxNormalised: r.hitBoxNormalised,
      },
      null,
      2,
    ),
  );
  console.log(
    `native cell ${r.nativeCell.join("x")} -> ${r.frames} x ${r.frameWidth}x${r.frameHeight}`,
  );
  console.log(
    `hit box ${r.hitBox.w}x${r.hitBox.h} at (${r.hitBox.x},${r.hitBox.y})  ->  ${out}`,
  );
}

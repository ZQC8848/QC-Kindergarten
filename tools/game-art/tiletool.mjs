// Seamless-tile pipeline helpers for the parallax layer art.
//
//   node tiletool.mjs down  <in> <out> <W> <H>   integer box downsample (alpha-aware)
//   node tiletool.mjs seam  <in>                 measure the wrap discontinuity
//   node tiletool.mjs roll  <in> <out> [dx]      circular shift (default: half width)
//   node tiletool.mjs join  <in> <out>           write tile|tile for eyeballing the seam
//   node tiletool.mjs band  <in>                 report the opaque vertical extent
//   node tiletool.mjs edgeclear <in> <out>       drop blobs touching either edge (discrete objects)
//   node tiletool.mjs wrapblend <in> <out> [frac] cross-fade the tail onto the head (continuous textures)
//   node tiletool.mjs pitch <in>                 autocorrelate the column profile for a period
//   node tiletool.mjs crop  <in> <out> <w>       crop to a width
import sharp from "./lib/sharp.mjs";

const [, , cmd, inFile, ...rest] = process.argv;

async function load(file) {
  const img = sharp(file).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  return { data, W: info.width, H: info.height, C: info.channels };
}

const save = (data, W, H, C, out) =>
  sharp(data, { raw: { width: W, height: H, channels: C } })
    .png()
    .toFile(out);

// Alpha-weighted box average. Straight RGB averaging drags transparent black
// into the edges of a cutout, which shows up as a dark fringe after keying.
function boxDown(data, W, H, C, w, h) {
  const fx = W / w,
    fy = H / h;
  if (!Number.isInteger(fx) || !Number.isInteger(fy)) return null;
  const out = Buffer.alloc(w * h * C);
  const n = fx * fy;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let ar = 0,
        ag = 0,
        ab = 0,
        aa = 0;
      for (let sy = 0; sy < fy; sy++) {
        for (let sx = 0; sx < fx; sx++) {
          const i = ((y * fy + sy) * W + (x * fx + sx)) * C;
          const a = C === 4 ? data[i + 3] : 255;
          ar += data[i] * a;
          ag += data[i + 1] * a;
          ab += data[i + 2] * a;
          aa += a;
        }
      }
      const o = (y * w + x) * C;
      if (aa === 0) {
        out[o] = out[o + 1] = out[o + 2] = 0;
      } else {
        out[o] = Math.round(ar / aa);
        out[o + 1] = Math.round(ag / aa);
        out[o + 2] = Math.round(ab / aa);
      }
      if (C === 4) out[o + 3] = Math.round(aa / n);
    }
  }
  return out;
}

function colDiff(data, W, H, C, xa, xb) {
  let s = 0;
  for (let y = 0; y < H; y++) {
    const ia = (y * W + xa) * C,
      ib = (y * W + xb) * C;
    for (let c = 0; c < C; c++) s += Math.abs(data[ia + c] - data[ib + c]);
  }
  return s / (H * C);
}

if (cmd === "down") {
  const [out, w, h] = [rest[0], +rest[1], +rest[2]];
  const { data, W, H, C } = await load(inFile);
  const box = boxDown(data, W, H, C, w, h);
  if (box) {
    await save(box, w, h, C, out);
    console.log(
      `${W}x${H} -> ${w}x${h}  (exact ${W / w}x box average)  ${out}`,
    );
  } else {
    // Codex ignores exact pixel sizes and only honours the aspect ratio, so the
    // reduction is rarely integer. sharp shrinks by the integer part first and
    // resolves the remainder with lanczos, which is close enough to area average.
    await sharp(inFile)
      .ensureAlpha()
      .resize(w, h, { fit: "fill" })
      .png()
      .toFile(out);
    console.log(
      `${W}x${H} -> ${w}x${h}  (non-integer ${(W / w).toFixed(3)}x, sharp resize)  ${out}`,
    );
  }
} else if (cmd === "seam") {
  // Compare the wrap against the WHOLE distribution of interior adjacent-column
  // differences, not against their median. On a sparse or structured layer most
  // neighbouring columns are identical, so the median collapses to ~0 and any
  // legitimate edge the seam happens to land on scores as a huge ratio. What
  // actually matters is whether the seam looks like an ordinary transition.
  const { data, W, H, C } = await load(inFile);
  const seam = colDiff(data, W, H, C, W - 1, 0);
  const interior = [];
  for (let x = 0; x + 1 < W; x++)
    interior.push(colDiff(data, W, H, C, x, x + 1));
  interior.sort((a, b) => a - b);
  const q = (p) =>
    interior[Math.min(interior.length - 1, Math.floor(interior.length * p))];
  let rank = 0;
  while (rank < interior.length && interior[rank] < seam) rank++;
  const pct = (100 * rank) / interior.length;
  console.log(`size        : ${W}x${H}`);
  console.log(
    `seam diff   : ${seam.toFixed(2)}  (last column vs first column)`,
  );
  console.log(
    `interior    : median ${q(0.5).toFixed(2)}  p95 ${q(0.95).toFixed(2)}  max ${interior[interior.length - 1].toFixed(2)}`,
  );
  console.log(
    `seam sits at the ${pct.toFixed(1)}th percentile of interior transitions`,
  );
  const pass = seam <= q(0.95);
  console.log(
    pass
      ? "PASS - the wrap is an ordinary transition for this layer"
      : "FAIL - the wrap is harsher than 95% of interior transitions; heal it",
  );
  if (!pass)
    console.log(
      "  discrete objects -> edgeclear | continuous -> wrapblend | periodic -> pitch + crop",
    );
  console.log(
    "  sparse layers: confirm with `join` before trusting either verdict",
  );
} else if (cmd === "roll") {
  const { data, W, H, C } = await load(inFile);
  const dx = rest[1] !== undefined ? +rest[1] : Math.floor(W / 2);
  const out = Buffer.alloc(data.length);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const sx = (((x - dx) % W) + W) % W;
      data.copy(out, (y * W + x) * C, (y * W + sx) * C, (y * W + sx) * C + C);
    }
  }
  await save(out, W, H, C, rest[0]);
  console.log(
    `rolled by ${dx}px -> ${rest[0]}  (seam is now at x=${dx}; heal it there, then roll back by ${W - dx})`,
  );
} else if (cmd === "join") {
  const { data, W, H, C } = await load(inFile);
  const out = Buffer.alloc(W * 2 * H * C);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W * 2; x++) {
      const sx = x % W;
      data.copy(
        out,
        (y * W * 2 + x) * C,
        (y * W + sx) * C,
        (y * W + sx) * C + C,
      );
    }
  }
  await save(out, W * 2, H, C, rest[0]);
  console.log(
    `wrote ${rest[0]} (${W * 2}x${H}) - the seam to inspect is at x=${W}`,
  );
} else if (cmd === "edgeclear") {
  // For a layer of discrete objects (clouds), the seam fails only because one
  // object is sliced by the left or right edge. Delete every opaque blob that
  // touches either vertical edge; both edges become empty and the tile wraps
  // exactly. Cheaper and cleaner than roll + heal, which needs repainting.
  const { data, W, H, C } = await load(inFile);
  if (C < 4) throw new Error("edgeclear needs an alpha channel");
  const op = (i) => data[i * C + 3] > 8;
  const seen = new Uint8Array(W * H);
  let cleared = 0,
    blobs = 0;
  const stack = [];
  for (let y = 0; y < H; y++) {
    for (const x of [0, W - 1]) {
      const s = y * W + x;
      if (!op(s) || seen[s]) continue;
      blobs++;
      stack.push(s);
      seen[s] = 1;
      while (stack.length) {
        const i = stack.pop();
        const cx = i % W,
          cy = (i / W) | 0;
        data[i * C + 3] = 0;
        data[i * C] = data[i * C + 1] = data[i * C + 2] = 0;
        cleared++;
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
  }
  await save(data, W, H, C, rest[0]);
  console.log(
    `cleared ${blobs} edge-touching blob(s), ${cleared}px -> ${rest[0]}`,
  );
} else if (cmd === "wrapblend") {
  // Continuous textures (grass, a foliage silhouette) cannot be healed by
  // deleting a blob. Cross-fade the tail onto the head instead: the tile loses
  // M columns and its two edges converge, so the wrap is continuous by
  // construction. Only the blend margin loses detail.
  const { data, W, H, C } = await load(inFile);
  const M = Math.max(
    2,
    Math.round(W * (rest[1] !== undefined ? +rest[1] : 0.15)),
  );
  const Wo = W - M;
  const out = Buffer.alloc(Wo * H * C);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < Wo; x++) {
      const d = (y * Wo + x) * C;
      if (x >= M) {
        data.copy(out, d, (y * W + x) * C, (y * W + x) * C + C);
        continue;
      }
      const t = x / M;
      const a = (y * W + x) * C,
        b = (y * W + x + Wo) * C;
      if (C === 4) {
        const aa = (data[a + 3] / 255) * t,
          ab = (data[b + 3] / 255) * (1 - t);
        const sum = aa + ab;
        out[d + 3] = Math.round((aa + ab) * 255);
        for (let c = 0; c < 3; c++)
          out[d + c] =
            sum > 0
              ? Math.round((data[a + c] * aa + data[b + c] * ab) / sum)
              : 0;
      } else {
        for (let c = 0; c < C; c++)
          out[d + c] = Math.round(data[a + c] * t + data[b + c] * (1 - t));
      }
    }
  }
  await save(out, Wo, H, C, rest[0]);
  console.log(`wrap-blended ${W} -> ${Wo} (margin ${M}px) -> ${rest[0]}`);
} else if (cmd === "pitch") {
  // A periodic structure (the pergola posts) tiles only if the tile holds a
  // whole number of periods. Find the period by autocorrelating the column
  // opacity profile, then report the nearest crop width.
  const { data, W, H, C } = await load(inFile);
  const prof = new Float64Array(W);
  for (let x = 0; x < W; x++) {
    let s = 0;
    for (let y = 0; y < H; y++) s += data[(y * W + x) * C + 3];
    prof[x] = s;
  }
  const mean = prof.reduce((a, b) => a + b) / W;
  for (let x = 0; x < W; x++) prof[x] -= mean;
  let best = 0,
    bestScore = -Infinity;
  for (let lag = Math.round(W * 0.03); lag < Math.round(W * 0.5); lag++) {
    let s = 0;
    for (let x = 0; x + lag < W; x++) s += prof[x] * prof[x + lag];
    s /= W - lag;
    if (s > bestScore) {
      bestScore = s;
      best = lag;
    }
  }
  const n = Math.round(W / best);
  console.log(
    `width ${W}  period ${best}px  ~${(W / best).toFixed(2)} periods`,
  );
  console.log(
    `crop to ${n} whole periods -> ${n * best}px  (drop ${W - n * best}px)`,
  );
} else if (cmd === "crop") {
  const { data, W, H, C } = await load(inFile);
  const w = +rest[1];
  const out = Buffer.alloc(w * H * C);
  for (let y = 0; y < H; y++)
    data.copy(out, y * w * C, y * W * C, (y * W + w) * C);
  await save(out, w, H, C, rest[0]);
  console.log(`cropped ${W} -> ${w} -> ${rest[0]}`);
} else if (cmd === "band") {
  const { data, W, H, C } = await load(inFile);
  let top = -1,
    bot = -1;
  for (let y = 0; y < H; y++) {
    let opaque = 0;
    for (let x = 0; x < W; x++)
      if (C < 4 || data[(y * W + x) * C + 3] > 8) opaque++;
    if (opaque > 0) {
      if (top < 0) top = y;
      bot = y;
    }
  }
  const pct = (v) => ((100 * v) / H).toFixed(0) + "%";
  console.log(`size          : ${W}x${H}`);
  console.log(
    `opaque rows   : ${top}..${bot}  (${bot - top + 1}px, ${pct(bot - top + 1)} of height)`,
  );
  console.log(
    `transparent   : top ${top}px (${pct(top)}), bottom ${H - 1 - bot}px (${pct(H - 1 - bot)})`,
  );
} else {
  console.error("usage: down|seam|roll|join|band");
  process.exit(1);
}

// Haide 会飞 — the game loop.
//
// Two coordinate systems, and keeping them apart is what makes the thing fit
// every screen:
//
//   UNITS   gameplay space. The width is ALWAYS 360 units, so the dog and the
//           obstacles occupy the same fraction of the screen on a phone and on
//           a desktop, and every tuned physics number stays valid. The height
//           follows the display box's aspect ratio, so a taller phone shows
//           more sky instead of black bars.
//   DEVICE  canvas backing-store pixels. scale = canvasWidth / 360.
//
// The CSS clamps the stage's aspect ratio into [0.4, 0.6] (w/h), so the derived
// unit height always lands in [600, 900] and no letterboxing is ever needed.

export const UNIT_W = 360;
export const UNIT_H_MIN = 600;
export const UNIT_H_MAX = 900;
const GROUND_UNITS = 112; // ground strip height, in units
const STEP = 1 / 60; // fixed timestep: identical feel at 60Hz and 144Hz

export type Physics = {
  gravity: number;
  jump: number;
  terminal: number;
  scroll: number;
  gap: number;
  spacing: number;
  leadIn: number;
  hitInset: number;
  jumpBuffer: number;
  tiltUp: number;
  tiltDown: number;
  flapMs: number;
};

// Tuned in M0. Units are px and px/s in the 360-wide unit space.
export const PHYSICS: Physics = {
  gravity: 1500,
  jump: 450,
  terminal: 700,
  scroll: 150,
  gap: 150,
  spacing: 230,
  leadIn: 240,
  hitInset: 12,
  jumpBuffer: 80,
  tiltUp: -20,
  tiltDown: 70,
  flapMs: 90,
};

type Manifest = {
  renderScale: number;
  playArea: { w: number; h: number };
  scrollPxPerSecond: number;
  layers: { id: string; tile: [number, number]; y: number; speed: number }[];
  obstacle: { cap: [number, number]; body: [number, number] };
  haide: {
    sheet: string;
    frameWidth: number;
    frameHeight: number;
    frames: number;
    deadFrame?: number;
    hitBox: { x: number; y: number; w: number; h: number };
    spawnX: number;
  };
};

type Sprite = { img: HTMLImageElement; w: number; h: number };
type Layer = Sprite & { y: number; speed: number };

export type Mode = 'ready' | 'playing' | 'dying' | 'gameover';
export type GameEvents = {
  onScore?: (score: number) => void;
  onGameOver?: (score: number, durationMs: number) => void;
  onModeChange?: (mode: Mode) => void;
};

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

async function loadImage(src: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.src = src;
  await img.decode();
  return img;
}

export class Game {
  private ctx: CanvasRenderingContext2D;
  private m!: Manifest;
  private layers: Layer[] = [];
  private ground!: Layer;
  private cap!: Sprite;
  private body!: Sprite;
  private dog!: HTMLImageElement;
  private skyRows: string[] = [];

  /** units per unit — set by resize(); everything drawn multiplies by this */
  private scale = 1;
  private unitH = 640;

  mode: Mode = 'ready';
  score = 0;
  private y = 0;
  private vy = 0;
  private scrolled = 0;
  private buffered = -1;
  private passed = new Set<number>();
  private acc = 0;
  private last = 0;
  private t = 0;
  private runStart = 0;
  private raf = 0;
  private stopped = false;

  constructor(
    private canvas: HTMLCanvasElement,
    private base: string,
    private ev: GameEvents = {},
    private p: Physics = PHYSICS,
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2d context unavailable');
    this.ctx = ctx;
  }

  async load() {
    const url = (f: string) => `${this.base}${f}`;
    this.m = await fetch(url('manifest.json')).then((r) => r.json());

    for (const L of this.m.layers) {
      const img = await loadImage(url(`${L.id}.png`));
      const layer: Layer = { img, w: img.width, h: img.height, y: L.y, speed: L.speed };
      if (L.id === 'L6-ground') this.ground = layer;
      else this.layers.push(layer);
    }
    const capImg = await loadImage(url('obstacle-cap.png'));
    this.cap = { img: capImg, w: capImg.width, h: capImg.height };
    const bodyImg = await loadImage(url('obstacle-body.png'));
    this.body = { img: bodyImg, w: bodyImg.width, h: bodyImg.height };
    this.dog = await loadImage(url(this.m.haide.sheet));
    this.buildSky();
    this.reset();
  }

  /** The sky is drawn, not shipped: sample the layer art's own top band once so
   *  its stepped colours extend to any height without a taller image. */
  private buildSky() {
    // The clouds layer sits on transparent pixels, so sample the approved
    // gradient from a 1px column of the treeline layer's backdrop instead —
    // it is opaque only at the bottom, so fall back to a fixed warm ramp.
    const ramp = ['#8fb4d4', '#9cc0dc', '#aecbe0', '#c3d7e2', '#d8e2de', '#e8e7d6', '#f2e8cf', '#f7e9c6'];
    const rows: string[] = [];
    const horizon = Math.round(this.unitH * 0.66);
    for (let y = 0; y < this.unitH; y++) {
      const k = clamp(Math.floor((y / horizon) * ramp.length), 0, ramp.length - 1);
      rows.push(ramp[k]);
    }
    this.skyRows = rows;
  }

  /** Recompute the unit height and backing store for the current display box.
   *  A ResizeObserver fires as soon as it starts observing, which is before
   *  load() has the manifest, so this has to be safe to call early. */
  resize(boxW: number, boxH: number, dpr: number) {
    if (!this.m || boxW <= 0 || boxH <= 0) return;
    this.unitH = clamp((UNIT_W * boxH) / boxW, UNIT_H_MIN, UNIT_H_MAX);

    // Fit the unit box inside whatever box the layout gave us, preserving
    // aspect. Within the usual phone/desktop range the clamp above is inert and
    // this fills the box exactly; only a squat screen (a tablet held in
    // portrait) letterboxes, and then it centres instead of distorting.
    const k = Math.min(boxW / UNIT_W, boxH / this.unitH);
    const cssW = UNIT_W * k;
    const cssH = this.unitH * k;
    this.canvas.style.width = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;

    // Cap the backing store at the assets' native scale; beyond it we would be
    // upscaling the art for no gain, and paying the fill rate for it.
    const targetW = Math.min(Math.round(cssW * dpr), UNIT_W * this.m.renderScale);
    this.scale = targetW / UNIT_W;
    this.canvas.width = targetW;
    this.canvas.height = Math.round(this.unitH * this.scale);
    this.ctx.imageSmoothingEnabled = true;
    this.buildSky();
    if (this.mode === 'ready') this.y = this.spawnY;
  }

  private get groundY() {
    return this.unitH - GROUND_UNITS;
  }
  private get spawnY() {
    return this.groundY * 0.45;
  }
  private get spawnX() {
    return this.m.haide.spawnX / this.m.renderScale;
  }
  private get frameW() {
    return this.m.haide.frameWidth / this.m.renderScale;
  }
  private get frameH() {
    return this.m.haide.frameHeight / this.m.renderScale;
  }
  private get capW() {
    return this.cap.w / this.m.renderScale;
  }
  private get capH() {
    return this.cap.h / this.m.renderScale;
  }

  /** Gap centres, kept a safe margin clear of both the ceiling and the ground so
   *  a taller screen adds sky rather than impossible or trivial openings. */
  private gapCenter(n: number) {
    const margin = this.p.gap / 2 + 40;
    const lo = margin;
    const hi = this.groundY - margin;
    const mid = (lo + hi) / 2;
    const swing = (hi - lo) / 2;
    const wave = 0.62 * Math.sin(n * 1.7) + 0.28 * Math.sin(n * 0.6);
    const ease = Math.min(1, n / 3);
    return mid + swing * wave * ease + (this.spawnY - mid) * (1 - ease);
  }

  private hitSize() {
    const f = this.p.hitInset / 100;
    return { w: this.frameW * (1 - 2 * f), h: this.frameH * (1 - 2 * f) };
  }

  private obstacleX(n: number) {
    return this.p.leadIn + n * this.p.spacing - this.scrolled;
  }
  private firstIndex() {
    return Math.max(0, Math.floor((this.scrolled - this.p.leadIn - this.capW) / this.p.spacing));
  }

  reset() {
    this.mode = 'ready';
    this.y = this.spawnY;
    this.vy = 0;
    this.scrolled = 0;
    this.score = 0;
    this.buffered = -1;
    this.passed = new Set();
    this.ev.onModeChange?.(this.mode);
  }

  flap() {
    if (this.mode === 'dying') return;
    if (this.mode === 'gameover') return;
    if (this.mode === 'ready') {
      this.mode = 'playing';
      this.runStart = performance.now();
      this.ev.onModeChange?.(this.mode);
    }
    this.buffered = performance.now();
  }

  private die(onGround: boolean) {
    if (this.mode === 'gameover') return;
    if (this.mode !== 'dying') {
      this.ev.onGameOver?.(this.score, this.runStart ? performance.now() - this.runStart : 0);
    }
    this.mode = onGround ? 'gameover' : 'dying';
    this.ev.onModeChange?.(this.mode);
  }

  private step() {
    if (this.mode !== 'playing' && this.mode !== 'dying') return;
    if (this.mode === 'playing') {
      if (this.buffered >= 0 && performance.now() - this.buffered <= this.p.jumpBuffer) {
        this.vy = -this.p.jump;
        this.buffered = -1;
      }
      this.scrolled += this.p.scroll * STEP;
    }
    this.vy = Math.min(this.p.terminal, this.vy + this.p.gravity * STEP);
    this.y += this.vy * STEP;

    const hb = this.hitSize();
    if (this.y + hb.h / 2 >= this.groundY) {
      this.y = this.groundY - hb.h / 2;
      this.die(true);
      return;
    }
    if (this.y - hb.h / 2 < 0) {
      this.y = hb.h / 2;
      this.vy = 0;
    }
    if (this.mode !== 'playing') return;

    const from = this.firstIndex();
    for (let n = from; n < from + 6; n++) {
      const x = this.obstacleX(n);
      const gc = this.gapCenter(n);
      // one rect at cap width for the whole column
      const overlapX = x < this.spawnX + hb.w / 2 && x + this.capW > this.spawnX - hb.w / 2;
      if (overlapX && (this.y - hb.h / 2 < gc - this.p.gap / 2 || this.y + hb.h / 2 > gc + this.p.gap / 2)) {
        this.die(false);
        return;
      }
      if (x + this.capW < this.spawnX - hb.w / 2 && !this.passed.has(n)) {
        this.passed.add(n);
        this.score++;
        this.ev.onScore?.(this.score);
      }
    }
  }

  private drawColumn(x: number, topEnd: number, botStart: number) {
    const { ctx, scale } = this;
    const bw = this.body.w / this.m.renderScale;
    const bh = this.body.h / this.m.renderScale;
    const sx = x + (this.capW - bw) / 2;
    for (let y = topEnd - this.capH + 2; y > -bh; y -= bh) {
      ctx.drawImage(this.body.img, sx * scale, y * scale, bw * scale, bh * scale);
    }
    ctx.save();
    ctx.translate((x + this.capW / 2) * scale, (topEnd - this.capH / 2) * scale);
    ctx.scale(1, -1);
    ctx.drawImage(
      this.cap.img,
      (-this.capW / 2) * scale,
      (-this.capH / 2) * scale,
      this.capW * scale,
      this.capH * scale,
    );
    ctx.restore();
    ctx.drawImage(this.cap.img, x * scale, botStart * scale, this.capW * scale, this.capH * scale);
    for (let y = botStart + this.capH - 2; y < this.groundY; y += bh) {
      ctx.drawImage(this.body.img, sx * scale, y * scale, bw * scale, bh * scale);
    }
  }

  private render() {
    const { ctx, scale } = this;
    const W = this.canvas.width;

    for (let y = 0; y < this.unitH; y++) {
      ctx.fillStyle = this.skyRows[y] ?? this.skyRows[this.skyRows.length - 1];
      ctx.fillRect(0, Math.floor(y * scale), W, Math.ceil(scale) + 1);
    }

    // Background layers are anchored to the ground, not to the top of the
    // screen: a taller display then adds sky above the horizon instead of
    // sliding the whole composition down.
    const u = 1 / this.m.renderScale; // asset device px -> units
    const designGround = this.ground.y * u;
    for (const L of this.layers) {
      const tileW = L.w * u;
      const tileH = L.h * u;
      const top = this.groundY - (designGround - L.y * u);
      const off = (this.scrolled * L.speed) % tileW;
      for (let x = -off; x < UNIT_W; x += tileW) {
        ctx.drawImage(L.img, x * scale, top * scale, tileW * scale, tileH * scale);
      }
    }

    const from = this.firstIndex();
    for (let n = from; n < from + 6; n++) {
      const x = this.obstacleX(n);
      if (x > UNIT_W || x < -this.capW) continue;
      const gc = this.gapCenter(n);
      this.drawColumn(x, gc - this.p.gap / 2, gc + this.p.gap / 2);
    }

    const gw = this.ground.w * u;
    const gh = this.ground.h * u;
    const goff = this.scrolled % gw;
    for (let x = -goff; x < UNIT_W; x += gw) {
      ctx.drawImage(this.ground.img, x * scale, this.groundY * scale, gw * scale, gh * scale);
    }

    const tilt = clamp((this.vy / this.p.terminal) * this.p.tiltDown, this.p.tiltUp, this.p.tiltDown);
    const dead = this.m.haide.deadFrame ?? 1;
    const frame =
      this.mode === 'playing'
        ? [0, 1, 2, 1][Math.floor(this.t / (this.p.flapMs / 1000)) % 4]
        : this.mode === 'dying' || this.mode === 'gameover'
          ? dead
          : 1;
    const fw = this.m.haide.frameWidth;
    const fh = this.m.haide.frameHeight;
    ctx.save();
    ctx.translate(this.spawnX * scale, this.y * scale);
    ctx.rotate((tilt * Math.PI) / 180);
    ctx.drawImage(
      this.dog,
      frame * fw,
      0,
      fw,
      fh,
      (-this.frameW / 2) * scale,
      (-this.frameH / 2) * scale,
      this.frameW * scale,
      this.frameH * scale,
    );
    ctx.restore();
  }

  private loop = (now: number) => {
    if (this.stopped) return;
    if (!this.last) this.last = now;
    // A backgrounded tab must not fast-forward the whole elapsed time on return.
    this.acc += Math.min(0.25, (now - this.last) / 1000);
    this.last = now;
    while (this.acc >= STEP) {
      this.step();
      this.acc -= STEP;
      this.t += STEP;
    }
    this.render();
    this.raf = requestAnimationFrame(this.loop);
  };

  start() {
    this.stopped = false;
    this.last = 0;
    this.raf = requestAnimationFrame(this.loop);
  }
  stop() {
    this.stopped = true;
    cancelAnimationFrame(this.raf);
  }
  /** Called on visibilitychange so the accumulator does not bank hidden time. */
  resume() {
    this.last = 0;
  }
}

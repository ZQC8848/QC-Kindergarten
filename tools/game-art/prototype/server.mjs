// Static file server + leaderboard API for the M0 prototype.
//
//   node tools/game-art/prototype/server.mjs [--port 4330]
//
// Storage is a JSON file next to this script. That is fine for a prototype on
// one machine; it is NOT what ships. A Vercel deployment has an ephemeral
// filesystem, so going live means swapping `store` for a hosted KV (Vercel KV,
// Upstash, Turso, Supabase) behind the same three methods. Nothing else in the
// client or the API shape has to change.
import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync, createReadStream, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, ".."); // tools/game-art
const DB = path.join(HERE, "scores.json");

const portArg = process.argv.indexOf("--port");
const PORT = portArg > 0 ? +process.argv[portArg + 1] : 4330;

const MAX_ENTRIES = 200; // what we keep
const TOP_N = 20; // what we hand back
const MAX_NAME = 16;
const MAX_SCORE = 9999;

// --- storage --------------------------------------------------------------
const store = {
  async read() {
    if (!existsSync(DB)) return [];
    try {
      const parsed = JSON.parse(await readFile(DB, "utf8"));
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      console.error("scores.json is unreadable; starting from empty");
      return [];
    }
  },
  async write(rows) {
    await mkdir(path.dirname(DB), { recursive: true });
    await writeFile(DB, JSON.stringify(rows, null, 2), "utf8");
  },
};

// Serialise writes: two submissions landing together would otherwise
// read-modify-write over each other and lose one.
let queue = Promise.resolve();
const serialise = (fn) => (queue = queue.then(fn, fn));

// --- validation -----------------------------------------------------------
/** Names are shown to other players, so strip anything that is not plain text.
 *  Rendering escapes as well; this keeps the stored data clean. */
function cleanName(raw) {
  if (typeof raw !== "string") return null;
  const name = raw
    .replace(/[\p{C}]/gu, "") // control chars, zero-width, directional marks
    .replace(/\s+/gu, " ")
    .trim()
    .slice(0, MAX_NAME);
  return name.length ? name : null;
}

/** A client can post anything, so this is a deterrent, not security. Scoring
 *  needs roughly one obstacle spacing of travel per point; allow a generous
 *  margin because M0 tunes spacing and speed live. */
function implausible(score, durationMs) {
  if (!Number.isFinite(durationMs) || durationMs <= 0) return false;
  return score > durationMs / 1000 + 3;
}

const rate = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const hits = (rate.get(ip) || []).filter((t) => now - t < 60_000);
  hits.push(now);
  rate.set(ip, hits);
  if (rate.size > 500) rate.clear();
  return hits.length > 12;
}

// --- api ------------------------------------------------------------------
const json = (res, code, body) => {
  const s = JSON.stringify(body);
  res.writeHead(code, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "content-length": Buffer.byteLength(s),
  });
  res.end(s);
};

const rank = (rows) =>
  rows
    .slice()
    .sort((a, b) => b.score - a.score || a.at - b.at)
    .slice(0, TOP_N)
    .map((r, i) => ({ rank: i + 1, name: r.name, score: r.score, at: r.at }));

async function handleApi(req, res, url) {
  if (url.pathname !== "/api/scores") return json(res, 404, { error: "not found" });

  if (req.method === "GET") {
    return json(res, 200, { top: rank(await store.read()) });
  }

  if (req.method === "POST") {
    const ip = req.socket.remoteAddress || "?";
    if (rateLimited(ip)) return json(res, 429, { error: "too many submissions" });

    let raw = "";
    for await (const chunk of req) {
      raw += chunk;
      if (raw.length > 2048) return json(res, 413, { error: "body too large" });
    }
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      return json(res, 400, { error: "bad json" });
    }

    const name = cleanName(body.name);
    const score = Number(body.score);
    if (!name) return json(res, 400, { error: "name required" });
    if (!Number.isInteger(score) || score < 0 || score > MAX_SCORE) {
      return json(res, 400, { error: "score out of range" });
    }
    if (implausible(score, Number(body.durationMs))) {
      return json(res, 400, { error: "score does not match run length" });
    }

    const entry = {
      name,
      score,
      at: Date.now(),
      // M0 tunes physics live, so a score is only comparable alongside the
      // settings it was made under. Kept for reading the board, not shown.
      physics: body.physics && typeof body.physics === "object" ? body.physics : null,
    };

    const out = await serialise(async () => {
      const rows = await store.read();
      rows.push(entry);
      rows.sort((a, b) => b.score - a.score || a.at - b.at);
      const kept = rows.slice(0, MAX_ENTRIES);
      await store.write(kept);
      const all = kept
        .slice()
        .sort((a, b) => b.score - a.score || a.at - b.at);
      const mine = all.findIndex((r) => r.at === entry.at && r.name === entry.name);
      return { top: rank(kept), yourRank: mine < 0 ? null : mine + 1, total: kept.length };
    });
    return json(res, 200, out);
  }

  res.writeHead(405, { allow: "GET, POST" });
  res.end();
}

// --- static ---------------------------------------------------------------
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".css": "text/css; charset=utf-8",
};

function serveStatic(req, res, url) {
  // There is no index at the served root; the prototype is the only page.
  if (url.pathname === "/") {
    res.writeHead(302, { location: "/prototype/" });
    res.end();
    return;
  }
  let rel = decodeURIComponent(url.pathname);
  if (rel.endsWith("/")) rel += "index.html";
  const file = path.join(ROOT, rel);
  // keep requests inside the served directory
  if (!file.startsWith(ROOT)) {
    res.writeHead(403).end();
    return;
  }
  if (!existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("not found: " + rel);
    return;
  }
  res.writeHead(200, {
    "content-type": TYPES[path.extname(file)] || "application/octet-stream",
    "cache-control": "no-cache",
  });
  createReadStream(file).pipe(res);
}

createServer((req, res) => {
  const url = new URL(req.url, "http://127.0.0.1");
  if (url.pathname.startsWith("/api/")) {
    handleApi(req, res, url).catch((e) => {
      console.error(e);
      json(res, 500, { error: "server error" });
    });
    return;
  }
  serveStatic(req, res, url);
}).listen(PORT, "127.0.0.1", () => {
  console.log(`serving ${ROOT} on http://127.0.0.1:${PORT}`);
  console.log(`prototype:   http://127.0.0.1:${PORT}/prototype/`);
  console.log(`leaderboard: ${DB}`);
});

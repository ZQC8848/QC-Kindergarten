// Leaderboard API. The only non-prerendered route on the site.
//
// Storage is a Redis sorted set on Upstash (the Vercel Marketplace store
// `qc-kindergarten-leaderboard`). A sorted set is the right shape here: ZADD is
// atomic, so two players finishing at once cannot overwrite each other, and
// ZRANGE REV returns the top N without reading the whole board.
//
// One member per name, holding that name's BEST score — resubmitting a worse
// run leaves the board alone (GT). That also caps the key's size at the number
// of distinct players.
export const prerender = false;

import type { APIRoute } from 'astro';
import { Redis } from '@upstash/redis';

const KEY = 'haide:leaderboard';
const TOP_N = 20;
const MAX_NAME = 16;
const MAX_SCORE = 9999;

let redis: Redis | null = null;
function client(): Redis | null {
  if (redis) return redis;
  // process.env only, never import.meta.env. These variables are marked
  // Sensitive in Vercel, so `vercel pull` writes the literal string
  // "[SENSITIVE]" into .env.production.local — and Vite would then inline THAT
  // at build time, where it is truthy and silently wins over the real runtime
  // value. Reading the runtime environment also keeps the token out of the
  // bundle, which matters because the deploy is built locally.
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token || !url.startsWith('https://')) return null;
  redis = new Redis({ url, token });
  return redis;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

/** Names are shown to other players. Strip anything that is not plain text;
 *  the page escapes on render as well. */
function cleanName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const name = raw.replace(/\p{C}/gu, '').replace(/\s+/gu, ' ').trim().slice(0, MAX_NAME);
  return name.length ? name : null;
}

/** A client can post anything, so this is a deterrent, not security: scoring
 *  needs roughly one obstacle spacing of travel per point. Real protection
 *  would mean moving scoring to the server. */
function implausible(score: number, durationMs: unknown): boolean {
  const ms = Number(durationMs);
  if (!Number.isFinite(ms) || ms <= 0) return false;
  return score > ms / 1000 + 3;
}

type Row = { rank: number; name: string; score: number };

async function top(r: Redis): Promise<Row[]> {
  const raw = (await r.zrange(KEY, 0, TOP_N - 1, { rev: true, withScores: true })) as (string | number)[];
  const rows: Row[] = [];
  for (let i = 0; i < raw.length; i += 2) {
    rows.push({ rank: rows.length + 1, name: String(raw[i]), score: Number(raw[i + 1]) });
  }
  return rows;
}

export const GET: APIRoute = async () => {
  const r = client();
  if (!r) return json({ error: 'leaderboard not configured' }, 503);
  try {
    return json({ top: await top(r) });
  } catch {
    return json({ error: 'leaderboard unavailable' }, 502);
  }
};

export const POST: APIRoute = async ({ request }) => {
  const r = client();
  if (!r) return json({ error: 'leaderboard not configured' }, 503);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'bad json' }, 400);
  }

  const name = cleanName(body.name);
  const score = Number(body.score);
  if (!name) return json({ error: 'name required' }, 400);
  if (!Number.isInteger(score) || score < 0 || score > MAX_SCORE) {
    return json({ error: 'score out of range' }, 400);
  }
  if (implausible(score, body.durationMs)) {
    return json({ error: 'score does not match run length' }, 400);
  }

  try {
    // GT: only raise an existing entry, never lower it.
    await r.zadd(KEY, { gt: true }, { score, member: name });
    const rows = await top(r);
    const reported = await r.zscore(KEY, name);
    const rank = await r.zrevrank(KEY, name);
    return json({
      top: rows,
      yourRank: rank === null ? null : rank + 1,
      yourBest: reported === null ? score : Number(reported),
      total: await r.zcard(KEY),
    });
  } catch {
    return json({ error: 'leaderboard unavailable' }, 502);
  }
};

// /api/setup.js
// One-time (or re-runnable) endpoint to resolve API-Football player IDs.
// Called from the admin setup page with the x-admin-key header.
// Never exposed in the browser dashboard.

import { Redis } from '@upstash/redis';
const kv = Redis.fromEnv();
const { PLAYERS } = require('./_data');

const META_KEY = 'wc2026:meta';
const API_BASE = 'https://v3.football.api-sports.io';

async function lookupPlayer(searchName, apiKey) {
  const url = `${API_BASE}/players?search=${encodeURIComponent(searchName)}&league=1&season=2026`;
  const res = await fetch(url, { headers: { 'x-apisports-key': apiKey } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const results = data.response || [];
  if (!results.length) return null;
  return { id: results[0].player.id, name: results[0].player.name };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const adminKey = req.headers['x-admin-key'];
  if (!adminKey || adminKey !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorised' });
  }

  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API_FOOTBALL_KEY not set' });

  const meta = (await kv.get(META_KEY)) || { playerIds: {}, fixtureIds: {}, processedTriggers: [], standingsLastFetched: null };

  const results = {};
  const starred = PLAYERS.filter(p => p.star);

  for (const p of starred) {
    try {
      const found = await lookupPlayer(p.starSearch, apiKey);
      if (found) {
        meta.playerIds[p.name] = found.id;
        results[p.name] = { id: found.id, apiName: found.name, star: p.star, ok: true };
      } else {
        results[p.name] = { star: p.star, ok: false, reason: 'No results' };
      }
    } catch (err) {
      results[p.name] = { star: p.star, ok: false, reason: err.message };
    }
  }

  await kv.set(META_KEY, meta);

  return res.status(200).json({ ok: true, results, savedIds: meta.playerIds });
}

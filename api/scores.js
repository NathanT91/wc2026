import { Redis } from '@upstash/redis';
const kv = Redis.fromEnv();
const { PLAYERS, calcTeamPts, calcStarPts, calcTotal } = require('./_data');

const SCORES_KEY = 'wc2026:scores';
const LOG_KEY    = 'wc2026:log';
const META_KEY   = 'wc2026:meta';

function defaultScores() {
  return PLAYERS.map(p => ({
    name:           p.name,
    teamGoals:      0,
    teamYellows:    0,
    teamYellowReds: 0,
    teamReds:       0,
    starGoals:      0,
    starAssists:    0,
    starYellows:    0,
    starYellowReds: 0,
    starReds:       0,
    eliminatedTeams: [],
  }));
}

export default async function handler(req, res) {
  // Allow the dashboard to call this from any origin
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── GET — return current state ────────────────────────────────────────────
  if (req.method === 'GET') {
    const [rawScores, rawLog, meta] = await Promise.all([
      kv.get(SCORES_KEY),
      kv.get(LOG_KEY),
      kv.get(META_KEY),
    ]);

    const scores = rawScores || defaultScores();

    // Attach calculated totals for convenience
    const enriched = scores.map(s => ({
      ...s,
      teamPts:  calcTeamPts(s),
      starPts:  calcStarPts(s),
      total:    calcTotal(s),
    }));

    return res.status(200).json({
      scores:      enriched,
      log:         rawLog  || [],
      lastUpdate:  meta?.lastUpdate  || null,
      playerIds:   meta?.playerIds   || {},
      fixtureIds:  meta?.fixtureIds  || {},
      processedTriggers: meta?.processedTriggers || [],
    });
  }

  // ── POST — write new state (server-side only, requires admin key) ─────────
  if (req.method === 'POST') {
    const adminKey = req.headers['x-admin-key'];
    if (!adminKey || adminKey !== process.env.ADMIN_KEY) {
      return res.status(401).json({ error: 'Unauthorised' });
    }

    const { scores, log, meta } = req.body;
    const ops = [];
    if (scores)  ops.push(kv.set(SCORES_KEY, scores));
    if (log)     ops.push(kv.set(LOG_KEY,    log));
    if (meta)    ops.push(kv.set(META_KEY,   meta));
    await Promise.all(ops);

    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

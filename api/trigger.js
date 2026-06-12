// /api/trigger.js
// Called by Vercel Cron every minute (see vercel.json).
// Checks whether any HT or FT trigger is due and processes it entirely
// server-side — the API key and score writes never touch the browser.

import { kv } from '@vercel/kv';
const { PLAYERS, FIXTURES, apiTeamName, calcTeamPts, calcStarPts, getTriggers } = require('./_data');

const SCORES_KEY = 'wc2026:scores';
const LOG_KEY    = 'wc2026:log';
const META_KEY   = 'wc2026:meta';
const API_BASE   = 'https://v3.football.api-sports.io';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function defaultScores() {
  return PLAYERS.map(p => ({
    name: p.name,
    teamGoals: 0, teamYellows: 0, teamYellowReds: 0, teamReds: 0,
    starGoals: 0, starAssists: 0, starYellows: 0, starYellowReds: 0, starReds: 0,
    eliminatedTeams: [],
  }));
}

async function apiFetch(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'x-apisports-key': process.env.API_FOOTBALL_KEY },
  });
  if (!res.ok) throw new Error(`API-Football ${res.status}: ${path}`);
  return res.json();
}

// Fuzzy team name match — handles slight naming differences between our data and the API
function teamsMatch(apiName, ourName) {
  const a = apiName.toLowerCase();
  const b = apiTeamName(ourName).toLowerCase();
  return a.includes(b.slice(0, 6)) || b.includes(a.slice(0, 6));
}

// ─────────────────────────────────────────────────────────────────────────────
// LOOK UP FIXTURE ID
// ─────────────────────────────────────────────────────────────────────────────
async function resolveFixtureId(home, away, fixtureIds) {
  const cacheKey = `${home}|${away}`;
  if (fixtureIds[cacheKey]) return fixtureIds[cacheKey];

  // Search by one team to get candidates, then match both sides
  const data = await apiFetch(
    `/fixtures?league=1&season=2026&team=${encodeURIComponent(apiTeamName(home))}`
  );
  const match = (data.response || []).find(f => {
    return teamsMatch(f.teams.home.name, home) && teamsMatch(f.teams.away.name, away);
  });
  if (!match) return null;

  fixtureIds[cacheKey] = match.fixture.id;
  return match.fixture.id;
}

// ─────────────────────────────────────────────────────────────────────────────
// PROCESS A SINGLE FIXTURE
// Fetches events, updates scores in-place, appends to log.
// ─────────────────────────────────────────────────────────────────────────────
async function processFixture(home, away, slot, scores, log, meta) {
  // Knockout slots have no team names yet — resolve via live fixtures endpoint
  if (!home) {
    const liveData = await apiFetch('/fixtures?league=1&season=2026&live=all');
    const live = (liveData.response || []);
    if (!live.length) return;
    // Process each live match we have players in
    for (const f of live) {
      await processFixtureById(f.fixture.id, f.teams.home.name, f.teams.away.name, scores, log, meta);
    }
    return;
  }

  const fid = await resolveFixtureId(home, away, meta.fixtureIds);
  if (!fid) {
    appendLog(log, `⚠️ Could not resolve fixture ID for ${home} vs ${away}`);
    return;
  }
  await processFixtureById(fid, home, away, scores, log, meta);
}

async function processFixtureById(fid, home, away, scores, log, meta) {
  const data = await apiFetch(`/fixtures/events?fixture=${fid}`);
  const events = data.response || [];
  const matchLabel = `${home} vs ${away}`;
  const logLines = [];

  for (const score of scores) {
    const p = PLAYERS.find(x => x.name === score.name);

    // ── Team points ────────────────────────────────────────────────────────
    const relevantTeams = p.teams.filter(t => t === home || t === away);
    for (const team of relevantTeams) {
      const te = events.filter(e => teamsMatch(e.team?.name || '', team));

      const goals      = te.filter(e => e.type === 'Goal' && e.detail !== 'Own Goal').length;
      const yellows    = te.filter(e => e.type === 'Card' && e.detail === 'Yellow Card').length;
      const yellowReds = te.filter(e => e.type === 'Card' && e.detail === 'Yellow-Red Card').length;
      const reds       = te.filter(e => e.type === 'Card' && e.detail === 'Red Card').length;

      score.teamGoals      += goals;
      score.teamYellows    += yellows;
      score.teamYellowReds += yellowReds;
      score.teamReds       += reds;

      if (goals)      logLines.push(`<b>${score.name}</b> +${goals * 2}pts — ${team} scored ${goals} goal${goals > 1 ? 's' : ''}`);
      if (yellows)    logLines.push(`<b>${score.name}</b> -${yellows}pt — ${team} yellow${yellows > 1 ? 's' : ''}`);
      if (yellowReds) logLines.push(`<b>${score.name}</b> -${yellowReds * 3}pts — ${team} second yellow (red)`);
      if (reds)       logLines.push(`<b>${score.name}</b> -${reds * 2}pts — ${team} straight red`);
    }

    // ── Star player points ─────────────────────────────────────────────────
    if (!p.star) continue;
    const pid = meta.playerIds[p.name];
    if (!pid) continue;

    const starGoals      = events.filter(e => e.player?.id === pid && e.type === 'Goal' && e.detail !== 'Own Goal').length;
    const starAssists    = events.filter(e => e.assist?.id === pid && e.type === 'Goal').length;
    const starYellows    = events.filter(e => e.player?.id === pid && e.type === 'Card' && e.detail === 'Yellow Card').length;
    const starYellowReds = events.filter(e => e.player?.id === pid && e.type === 'Card' && e.detail === 'Yellow-Red Card').length;
    const starReds       = events.filter(e => e.player?.id === pid && e.type === 'Card' && e.detail === 'Red Card').length;

    score.starGoals      += starGoals;
    score.starAssists    += starAssists;
    score.starYellows    += starYellows;
    score.starYellowReds += starYellowReds;
    score.starReds       += starReds;

    if (starGoals)      logLines.push(`<b>${score.name}</b> +${starGoals * 2}pts — ${p.star} goal${starGoals > 1 ? 's' : ''}`);
    if (starAssists)    logLines.push(`<b>${score.name}</b> +${starAssists}pt — ${p.star} assist${starAssists > 1 ? 's' : ''}`);
    if (starYellows)    logLines.push(`<b>${score.name}</b> -${starYellows}pt — ${p.star} yellow`);
    if (starYellowReds) logLines.push(`<b>${score.name}</b> -${starYellowReds * 3}pts — ${p.star} second yellow`);
    if (starReds)       logLines.push(`<b>${score.name}</b> -${starReds * 2}pts — ${p.star} red card`);
  }

  const t = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  if (logLines.length) {
    appendLog(log, `📊 ${matchLabel} update:`);
    for (const l of logLines) appendLog(log, l, '');
  } else {
    appendLog(log, `📊 ${matchLabel} — no scoring events for your players`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STANDINGS — used to mark teams as eliminated
// Only runs once per day (tracked in meta.standingsLastFetched)
// ─────────────────────────────────────────────────────────────────────────────
async function refreshStandings(scores, log, meta) {
  const data = await apiFetch('/standings?league=1&season=2026');
  const eliminated = new Set();

  for (const group of (data.response || [])) {
    const rows = group.league?.standings?.[0] || [];
    rows.sort((a, b) => a.rank - b.rank);
    // Fourth-placed team is definitively out; third-placed may still qualify
    if (rows[3]) eliminated.add(rows[3].team.name.toLowerCase());
  }

  for (const score of scores) {
    const p = PLAYERS.find(x => x.name === score.name);
    score.eliminatedTeams = p.teams.filter(t => {
      const mapped = apiTeamName(t).toLowerCase();
      return [...eliminated].some(e => e.includes(mapped.slice(0, 6)) || mapped.includes(e.slice(0, 6)));
    });
  }

  meta.standingsLastFetched = Date.now();
  appendLog(log, '📋 Standings refreshed — eliminations updated');
}

function appendLog(log, text, time) {
  const t = time !== undefined ? time : new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  log.unshift({ time: t, text });
  if (log.length > 150) log.length = 150;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  // Vercel Cron sends a special header; reject anything that doesn't have it
  // (in production). During development you can hit the endpoint manually.
  const isCron = req.headers['x-vercel-cron'] === '1';
  const isManual = req.headers['x-admin-key'] === process.env.ADMIN_KEY;
  if (!isCron && !isManual) {
    return res.status(401).json({ error: 'Not authorised' });
  }

  if (!process.env.API_FOOTBALL_KEY) {
    return res.status(500).json({ error: 'API_FOOTBALL_KEY not set' });
  }

  const now = Date.now();
  const allTriggers = getTriggers();

  // Load state from KV
  const [rawScores, rawLog, rawMeta] = await Promise.all([
    kv.get(SCORES_KEY),
    kv.get(LOG_KEY),
    kv.get(META_KEY),
  ]);

  const scores = rawScores || defaultScores();
  const log    = rawLog    || [];
  const meta   = rawMeta   || { playerIds: {}, fixtureIds: {}, processedTriggers: [], standingsLastFetched: null, lastUpdate: null };

  // Find triggers that are due (past their time) and not yet processed
  const processed = new Set(meta.processedTriggers || []);
  // Window: between now-3h and now (catches any missed cron runs)
  const dueTriggers = allTriggers.filter(t =>
    t.time <= now &&
    t.time > now - 3 * 60 * 60 * 1000 &&
    !processed.has(String(t.time))
  );

  if (!dueTriggers.length) {
    return res.status(200).json({ ok: true, message: 'No triggers due', now: new Date(now).toISOString() });
  }

  const fired = [];
  for (const trigger of dueTriggers) {
    // Mark as processed immediately so a slow run doesn't double-fire
    meta.processedTriggers.push(String(trigger.time));
    processed.add(String(trigger.time));

    appendLog(log, `⏱ ${trigger.phase}: ${trigger.home ?? 'Knockout'} ${trigger.away ? 'vs ' + trigger.away : ''}`);

    try {
      await processFixture(trigger.home, trigger.away, trigger.slot, scores, log, meta);
      fired.push(`${trigger.phase} ${trigger.slot}`);
    } catch (err) {
      appendLog(log, `❌ Error processing ${trigger.slot}: ${err.message}`);
    }
  }

  // Refresh standings once per day
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  if (!meta.standingsLastFetched || meta.standingsLastFetched < oneDayAgo) {
    try { await refreshStandings(scores, log, meta); }
    catch (err) { appendLog(log, `❌ Standings error: ${err.message}`); }
  }

  // Trim processed trigger history (keep last 1000)
  meta.processedTriggers = (meta.processedTriggers || []).slice(-1000);
  meta.lastUpdate = new Date().toLocaleString('en-GB');

  // Persist everything
  await Promise.all([
    kv.set(SCORES_KEY, scores),
    kv.set(LOG_KEY,    log),
    kv.set(META_KEY,   meta),
  ]);

  return res.status(200).json({ ok: true, fired });
}

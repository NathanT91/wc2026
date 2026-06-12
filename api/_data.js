// ─────────────────────────────────────────────
// PLAYERS & SQUADS
// ─────────────────────────────────────────────
const PLAYERS = [
  { name: 'Aaron',  teams: ['Spain','Croatia','Bosnia & Herzegovina','Jordan'],    star: 'Oyarzabal',      starSearch: 'Oyarzabal',       starId: null },
  { name: 'Ryan',   teams: ['Portugal','Ivory Coast','Saudi Arabia','Turkey'],     star: 'Bruno Fernandes', starSearch: 'Bruno Fernandes', starId: null },
  { name: 'Nathan', teams: ['France','Switzerland','Haiti','Algeria'],             star: 'Mbappé',          starSearch: 'Mbappe',          starId: null },
  { name: 'Anna',   teams: ['Brazil','Paraguay','Iran','Tunisia'],                 star: 'Vinicius Junior', starSearch: 'Vinicius',        starId: null },
  { name: 'Liam',   teams: ['England','Japan','Ecuador','Egypt'],                  star: 'Harry Kane',      starSearch: 'Kane',            starId: null },
  { name: 'Sophie', teams: ['Argentina','Uruguay','Ghana','DR Congo'],             star: null,              starSearch: null,              starId: null },
  { name: 'Danny',  teams: ['Germany','Senegal','Australia','Czech Republic'],     star: null,              starSearch: null,              starId: null },
  { name: 'Chris',  teams: ['Belgium','Morocco','South Africa','Iraq'],            star: 'Jeremy Doku',     starSearch: 'Doku',            starId: null },
  { name: 'Rob',    teams: ['Canada','Scotland','Uzbekistan','New Zealand'],       star: null,              starSearch: null,              starId: null },
  { name: 'James',  teams: ['Netherlands','Norway','Sweden','Cape Verde'],         star: 'Haaland',         starSearch: 'Haaland',         starId: null },
  { name: 'Gemma',  teams: ['Mexico','Colombia','Austria','Curaçao'],             star: 'Luis Díaz',       starSearch: 'Diaz',            starId: null },
  { name: 'Leo',    teams: ['USA','South Korea','Qatar','Panama'],                 star: null,              starSearch: null,              starId: null },
];

// API-Football uses slightly different team names for some nations
const TEAM_NAME_MAP = {
  'Bosnia & Herzegovina': 'Bosnia',
  'Ivory Coast':          "Cote d'Ivoire",
  'South Korea':          'Korea Republic',
  'Czech Republic':       'Czechia',
  'Curaçao':             'Curacao',
  'Turkey':               'Türkiye',
};
function apiTeamName(name) { return TEAM_NAME_MAP[name] || name; }

// ─────────────────────────────────────────────
// SCORING
// ─────────────────────────────────────────────
// Team:        goals +2, yellow -1, second yellow -1 then -2 (= -3 total), straight red -2
// Star player: goals +2, assists +1, yellow -1, second yellow -3 total, straight red -2
function calcTeamPts(s) {
  return (s.teamGoals * 2) - s.teamYellows - (s.teamYellowReds * 3) - (s.teamReds * 2);
}
function calcStarPts(s) {
  return (s.starGoals * 2) + s.starAssists - s.starYellows - (s.starYellowReds * 3) - (s.starReds * 2);
}
function calcTotal(s) { return calcTeamPts(s) + calcStarPts(s); }

// ─────────────────────────────────────────────
// FIXTURE SCHEDULE — all 104 matches, UTC kick-off times
// slot: ISO UTC string  home/away: team names  knockout: bool
// ─────────────────────────────────────────────
const FIXTURES = [
  // ── GROUP STAGE ──────────────────────────────
  // Jun 11
  { slot:'2026-06-11T19:00:00Z', home:'Mexico',                away:'South Africa' },
  { slot:'2026-06-12T02:00:00Z', home:'South Korea',           away:'Czechia' },
  // Jun 12
  { slot:'2026-06-12T19:00:00Z', home:'Canada',                away:'Bosnia & Herzegovina' },
  { slot:'2026-06-13T01:00:00Z', home:'USA',                   away:'Paraguay' },
  // Jun 13
  { slot:'2026-06-13T19:00:00Z', home:'Qatar',                 away:'Switzerland' },
  { slot:'2026-06-14T02:00:00Z', home:'Brazil',                away:'Morocco' },
  // Jun 14
  { slot:'2026-06-14T16:00:00Z', home:'Czechia',               away:'South Africa' },
  { slot:'2026-06-14T19:00:00Z', home:'Switzerland',           away:'Bosnia & Herzegovina' },
  { slot:'2026-06-14T22:00:00Z', home:'Canada',                away:'Qatar' },
  { slot:'2026-06-15T01:00:00Z', home:'Mexico',                away:'South Korea' },
  // Jun 15
  { slot:'2026-06-15T19:00:00Z', home:'USA',                   away:'Australia' },
  { slot:'2026-06-15T22:00:00Z', home:'Scotland',              away:'Morocco' },
  { slot:'2026-06-16T00:30:00Z', home:'Brazil',                away:'Haiti' },
  // Jun 16
  { slot:'2026-06-16T04:00:00Z', home:'Turkey',                away:'Paraguay' },
  { slot:'2026-06-16T17:00:00Z', home:'Netherlands',           away:'Sweden' },
  { slot:'2026-06-16T20:00:00Z', home:'Germany',               away:'Ivory Coast' },
  { slot:'2026-06-17T00:00:00Z', home:'Ecuador',               away:'Curaçao' },
  // Jun 17
  { slot:'2026-06-17T05:00:00Z', home:'Tunisia',               away:'Japan' },
  { slot:'2026-06-17T21:00:00Z', home:'Spain',                 away:'Saudi Arabia' },
  { slot:'2026-06-18T00:00:00Z', home:'Belgium',               away:'Iran' },
  { slot:'2026-06-18T03:00:00Z', home:'Uruguay',               away:'Cape Verde' },
  // Jun 18
  { slot:'2026-06-18T06:00:00Z', home:'New Zealand',           away:'Egypt' },
  { slot:'2026-06-18T22:00:00Z', home:'Argentina',             away:'Austria' },
  { slot:'2026-06-19T02:00:00Z', home:'France',                away:'Iraq' },
  // Jun 19
  { slot:'2026-06-19T05:00:00Z', home:'Norway',                away:'Senegal' },
  { slot:'2026-06-19T08:00:00Z', home:'Jordan',                away:'Algeria' },
  { slot:'2026-06-19T22:00:00Z', home:'England',               away:'Croatia' },
  // Jun 20
  { slot:'2026-06-20T01:00:00Z', home:'Portugal',              away:'DR Congo' },
  { slot:'2026-06-20T04:00:00Z', home:'Colombia',              away:'Uzbekistan' },
  // Jun 21
  { slot:'2026-06-21T00:00:00Z', home:'Ivory Coast',           away:'Ecuador' },
  { slot:'2026-06-21T03:00:00Z', home:'Germany',               away:'Curaçao' },
  { slot:'2026-06-21T20:00:00Z', home:'Netherlands',           away:'Japan' },
  // Jun 22
  { slot:'2026-06-22T01:00:00Z', home:'Haiti',                 away:'Scotland' },
  { slot:'2026-06-22T04:00:00Z', home:'Australia',             away:'Turkey' },
  { slot:'2026-06-22T19:00:00Z', home:'Spain',                 away:'Uruguay' },
  { slot:'2026-06-22T22:00:00Z', home:'Belgium',               away:'New Zealand' },
  // Jun 23
  { slot:'2026-06-23T01:00:00Z', home:'Saudi Arabia',          away:'Cape Verde' },
  { slot:'2026-06-23T04:00:00Z', home:'Egypt',                 away:'Iran' },
  { slot:'2026-06-23T19:00:00Z', home:'France',                away:'Senegal' },
  { slot:'2026-06-23T22:00:00Z', home:'Argentina',             away:'Jordan' },
  // Jun 24
  { slot:'2026-06-24T01:00:00Z', home:'Algeria',               away:'Austria' },
  { slot:'2026-06-24T04:00:00Z', home:'Iraq',                  away:'Norway' },
  { slot:'2026-06-24T19:00:00Z', home:'England',               away:'Ghana' },
  { slot:'2026-06-24T22:00:00Z', home:'Croatia',               away:'Panama' },
  // Jun 25
  { slot:'2026-06-25T01:00:00Z', home:'DR Congo',              away:'Uzbekistan' },
  { slot:'2026-06-25T04:00:00Z', home:'Portugal',              away:'Colombia' },
  // Jun 26 — final group matchdays (simultaneous pairs)
  { slot:'2026-06-26T19:00:00Z', home:'Mexico',                away:'Czechia' },
  { slot:'2026-06-26T19:00:00Z', home:'South Korea',           away:'South Africa' },
  { slot:'2026-06-26T23:00:00Z', home:'Canada',                away:'Switzerland' },
  { slot:'2026-06-26T23:00:00Z', home:'Qatar',                 away:'Bosnia & Herzegovina' },
  // Jun 27
  { slot:'2026-06-27T01:00:00Z', home:'Brazil',                away:'Scotland' },
  { slot:'2026-06-27T01:00:00Z', home:'Morocco',               away:'Haiti' },
  { slot:'2026-06-27T19:00:00Z', home:'USA',                   away:'Turkey' },
  { slot:'2026-06-27T19:00:00Z', home:'Australia',             away:'Paraguay' },
  { slot:'2026-06-27T23:00:00Z', home:'Netherlands',           away:'Tunisia' },
  { slot:'2026-06-27T23:00:00Z', home:'Japan',                 away:'Sweden' },
  { slot:'2026-06-28T01:00:00Z', home:'Germany',               away:'Ecuador' },
  { slot:'2026-06-28T01:00:00Z', home:'Ivory Coast',           away:'Curaçao' },
  { slot:'2026-06-28T19:00:00Z', home:'Spain',                 away:'Cape Verde' },
  { slot:'2026-06-28T19:00:00Z', home:'Saudi Arabia',          away:'Uruguay' },
  { slot:'2026-06-28T23:00:00Z', home:'Belgium',               away:'Egypt' },
  { slot:'2026-06-28T23:00:00Z', home:'Iran',                  away:'New Zealand' },
  { slot:'2026-06-29T01:00:00Z', home:'France',                away:'Norway' },
  { slot:'2026-06-29T01:00:00Z', home:'Iraq',                  away:'Senegal' },
  { slot:'2026-06-29T19:00:00Z', home:'Argentina',             away:'Algeria' },
  { slot:'2026-06-29T19:00:00Z', home:'Jordan',                away:'Austria' },
  { slot:'2026-06-29T23:00:00Z', home:'England',               away:'Panama' },
  { slot:'2026-06-29T23:00:00Z', home:'Croatia',               away:'Ghana' },
  { slot:'2026-06-30T01:00:00Z', home:'Portugal',              away:'Uzbekistan' },
  { slot:'2026-06-30T01:00:00Z', home:'DR Congo',              away:'Colombia' },
  // ── KNOCKOUT ROUNDS (slots only — teams TBD, resolved via API standings) ─
  // Round of 32  Jun 28 – Jul 3
  { slot:'2026-07-02T19:00:00Z', knockout:true },
  { slot:'2026-07-02T23:00:00Z', knockout:true },
  { slot:'2026-07-03T01:00:00Z', knockout:true },
  { slot:'2026-07-03T19:00:00Z', knockout:true },
  { slot:'2026-07-03T23:00:00Z', knockout:true },
  { slot:'2026-07-04T01:00:00Z', knockout:true },
  { slot:'2026-07-04T19:00:00Z', knockout:true },
  { slot:'2026-07-04T23:00:00Z', knockout:true },
  { slot:'2026-07-05T01:00:00Z', knockout:true },
  { slot:'2026-07-05T19:00:00Z', knockout:true },
  { slot:'2026-07-05T23:00:00Z', knockout:true },
  { slot:'2026-07-06T01:00:00Z', knockout:true },
  { slot:'2026-07-06T19:00:00Z', knockout:true },
  { slot:'2026-07-06T23:00:00Z', knockout:true },
  { slot:'2026-07-07T01:00:00Z', knockout:true },
  { slot:'2026-07-07T19:00:00Z', knockout:true },
  // Round of 16  Jul 9-11
  { slot:'2026-07-09T19:00:00Z', knockout:true },
  { slot:'2026-07-09T23:00:00Z', knockout:true },
  { slot:'2026-07-10T01:00:00Z', knockout:true },
  { slot:'2026-07-10T19:00:00Z', knockout:true },
  { slot:'2026-07-10T23:00:00Z', knockout:true },
  { slot:'2026-07-11T01:00:00Z', knockout:true },
  { slot:'2026-07-11T19:00:00Z', knockout:true },
  { slot:'2026-07-11T23:00:00Z', knockout:true },
  // Quarter-finals  Jul 14-16
  { slot:'2026-07-14T23:00:00Z', knockout:true },
  { slot:'2026-07-15T02:00:00Z', knockout:true },
  { slot:'2026-07-15T23:00:00Z', knockout:true },
  { slot:'2026-07-16T02:00:00Z', knockout:true },
  // Semi-finals  Jul 18-19
  { slot:'2026-07-18T23:00:00Z', knockout:true },
  { slot:'2026-07-19T02:00:00Z', knockout:true },
  // Third place + Final  Jul 22-23
  { slot:'2026-07-22T23:00:00Z', knockout:true },
  { slot:'2026-07-23T23:00:00Z', knockout:true },
];

// Generate HT/FT (and ET for knockouts) trigger timestamps for every fixture
function getTriggers() {
  const triggers = [];
  for (const f of FIXTURES) {
    const ko = new Date(f.slot).getTime();
    triggers.push({ time: ko + 50  * 60000, phase: 'HT',    slot: f.slot, knockout: !!f.knockout, home: f.home, away: f.away });
    triggers.push({ time: ko + 105 * 60000, phase: 'FT',    slot: f.slot, knockout: !!f.knockout, home: f.home, away: f.away });
    if (f.knockout) {
      triggers.push({ time: ko + 125 * 60000, phase: 'ET_HT', slot: f.slot, knockout: true, home: f.home, away: f.away });
      triggers.push({ time: ko + 145 * 60000, phase: 'ET_FT', slot: f.slot, knockout: true, home: f.home, away: f.away });
    }
  }
  return triggers.sort((a, b) => a.time - b.time);
}

module.exports = { PLAYERS, FIXTURES, TEAM_NAME_MAP, apiTeamName, calcTeamPts, calcStarPts, calcTotal, getTriggers };

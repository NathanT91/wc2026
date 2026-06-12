# World Cup 2026 Mini-Game

Live leaderboard dashboard powered by API-Football, hosted on Vercel.

---

## Deployment — step by step

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/wc2026-minigame.git
git push -u origin main
```

### 2. Create Vercel project
1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **Add New → Project**
3. Import your `wc2026-minigame` repo
4. Framework preset: **Other**
5. Root directory: leave as `/`
6. Click **Deploy** (it will fail on first deploy because env vars aren't set yet — that's fine)

### 3. Add Vercel KV (score storage)
1. In your Vercel project dashboard go to **Storage → Create → KV**
2. Name it `wc2026-kv`, click Create
3. Vercel automatically adds `KV_URL`, `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `KV_REST_API_READ_ONLY_TOKEN` to your environment variables

### 4. Add environment variables
In your Vercel project go to **Settings → Environment Variables** and add:

| Name | Value |
|---|---|
| `API_FOOTBALL_KEY` | Your API-Football free tier key |
| `ADMIN_KEY` | A secret string you make up (e.g. a long random password) — used to protect the setup and trigger endpoints |

### 5. Redeploy
Go to **Deployments** and click **Redeploy** on the latest deployment to pick up the new env vars.

### 6. Look up player IDs (one-time setup)
Run this once from your terminal (replace values with your own):
```bash
curl -X POST https://YOUR-PROJECT.vercel.app/api/setup \
  -H "x-admin-key: YOUR_ADMIN_KEY"
```
This calls API-Football to find the numeric player IDs for all 8 star players and saves them to KV. You only ever need to do this once.

Check the response — it will show each player name, whether their ID was found, and what API-Football calls them. If any fail, you can look them up manually at:
```
https://YOUR-PROJECT.vercel.app/api/proxy?path=/players?search=PLAYERNAME&league=1&season=2026
```
Then update the `playerIds` via the scores POST endpoint.

### 7. Done
Your dashboard is live at `https://YOUR-PROJECT.vercel.app`

---

## How it works

**Cron job** (`vercel.json`) fires `/api/trigger` every minute. The trigger checks whether any half-time or full-time moment has passed (based on the hardcoded fixture schedule), and if so:
1. Fetches `fixtures/events` from API-Football for that match
2. Calculates team points and star player points from the event list
3. Saves updated scores and a log entry to Vercel KV

**The dashboard** (`public/index.html`) calls `/api/scores` (GET) which reads from KV and returns scores, log, and metadata. It auto-refreshes every 5 minutes.

**The API key** lives only in Vercel environment variables. The browser never sees it. All API-Football calls go through `/api/trigger` (server-side cron) or `/api/proxy` (server-side pass-through with a whitelist).

---

## Request budget
- ~2 requests per group stage match (HT + FT)
- ~4 requests per knockout match (HT + FT + ET HT + ET FT)
- 1 standings request per day
- Total: ~150 requests across the whole tournament
- Free tier limit: 100 per day → easily within budget

---

## Files
```
/
├── api/
│   ├── _data.js      ← shared fixtures schedule + scoring logic (not a route)
│   ├── scores.js     ← GET scores / POST scores (KV read/write)
│   ├── proxy.js      ← safe pass-through to API-Football
│   ├── trigger.js    ← cron endpoint — processes HT/FT triggers
│   └── setup.js      ← one-time player ID lookup
├── public/
│   └── index.html    ← the dashboard
├── vercel.json       ← cron config
└── package.json
```

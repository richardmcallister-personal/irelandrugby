// Ireland rugby: Ireland + Munster, Leinster, Ulster, Connacht.
// Feed calls run on a schedule and are stored in KV, so page views never spend the daily allowance.
// Secret (Worker settings, never in the repo): HIGHLIGHTLY_KEY. KV binding: CACHE.
import FIXTURES from './fixtures.json';

const FEED = 'https://rugby.highlightly.net';
const DAILY_CAP = 80;      // our own ceiling, below the free plan's 100
const FEED_FLOOR = 10;     // stop if the feed says fewer than this remain
const TABLE_AGE = 12 * 3600e3;
const DETAILS_PER_RUN = 6;

const TEAMS = { ireland: 330972, munster: 347992, leinster: 347141, ulster: 348843, connacht: 339482 };
const COMPS = { 65460: 'urc', 46738: 'cc', 45036: 'ch', 44185: 'six', 124179: 'nc', 72268: 'test', 79927: 'anc' };
const TABLES = [['urc', 65460], ['cc', 46738], ['ch', 45036], ['nc', 124179], ['six', 44185]];

// Feed names to our image names, and tidy display names.
const SLUGS = [
  [/^ireland$/i, 'ireland', 'Ireland'], [/^munster/i, 'munster', 'Munster'], [/^leinster/i, 'leinster', 'Leinster'],
  [/^ulster/i, 'ulster', 'Ulster'], [/^connacht/i, 'connacht', 'Connacht'],
  [/^bath/i, 'bath', 'Bath'], [/bayonn/i, 'bayonne', 'Bayonne'], [/benetton|treviso/i, 'benetton', 'Benetton'],
  [/black lion/i, 'black-lion', 'Black Lion'], [/bordeaux/i, 'bordeaux-begles', 'Bordeaux Bègles'], [/bristol/i, 'bristol-bears', 'Bristol Bears'],
  [/bulls/i, 'bulls', 'Bulls'], [/cardiff/i, 'cardiff', 'Cardiff'], [/castres/i, 'castres', 'Castres'], [/cheetahs/i, 'cheetahs', 'Cheetahs'],
  [/clermont/i, 'clermont', 'Clermont'], [/dragons/i, 'dragons', 'Dragons'], [/edinburgh/i, 'edinburgh', 'Edinburgh'], [/exeter/i, 'exeter-chiefs', 'Exeter Chiefs'],
  [/glasgow/i, 'glasgow-warriors', 'Glasgow Warriors'], [/gloucester/i, 'gloucester', 'Gloucester'], [/harlequins/i, 'harlequins', 'Harlequins'],
  [/rochel/i, 'la-rochelle', 'La Rochelle'], [/leicester/i, 'leicester-tigers', 'Leicester Tigers'], [/^(10bet )?lions/i, 'lions', 'Lions'],
  [/lyon/i, 'lyon', 'Lyon'], [/montpellier/i, 'montpellier', 'Montpellier'], [/newcastle/i, 'newcastle', 'Newcastle'], [/northampton/i, 'northampton-saints', 'Northampton Saints'],
  [/ospreys/i, 'ospreys', 'Ospreys'], [/section paloise|^pau/i, 'pau', 'Pau'], [/perpignan|usap/i, 'perpignan', 'Perpignan'], [/racing/i, 'racing-92', 'Racing 92'],
  [/^sale/i, 'sale-sharks', 'Sale Sharks'], [/saracens/i, 'saracens', 'Saracens'], [/scarlets/i, 'scarlets', 'Scarlets'], [/sharks/i, 'sharks', 'Sharks'],
  [/stade fran/i, 'stade-francais', 'Stade Français'], [/stormers/i, 'stormers', 'Stormers'], [/toulon/i, 'toulon', 'Toulon'], [/toulous/i, 'toulouse', 'Toulouse'],
  [/vannes/i, 'vannes', 'Vannes'], [/zebre/i, 'zebre-parma', 'Zebre'],
  ...['England', 'France', 'Scotland', 'Wales', 'Italy', 'New Zealand', 'South Africa', 'Australia', 'Argentina', 'Fiji', 'Japan', 'Georgia', 'Portugal', 'Romania', 'Samoa', 'Spain', 'Tonga', 'Uruguay', 'USA', 'Canada', 'Chile', 'Namibia']
    .map((n) => [new RegExp('^' + n + '$', 'i'), n.toLowerCase().replace(/ /g, '-'), n]),
];
const NAME_BY_SLUG = Object.fromEntries(SLUGS.map(([, s, n]) => [s, n]));
const team = (t) => {
  const hit = SLUGS.find(([re]) => re.test(t.name || ''));
  return hit ? { s: hit[1], n: hit[2] } : { s: null, n: t.name, logo: /^https:/.test(t.logo || '') ? t.logo : null };
};

const json = (body, status = 200, maxAge = 0) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': maxAge ? `public, max-age=${maxAge}` : 'no-store' },
});

// --- feed, with a daily budget -------------------------------------------------
const budgetKey = () => 'budget:' + new Date().toISOString().slice(0, 10);

async function feed(env, path, params = {}) {
  const key = budgetKey();
  const used = Number(await env.CACHE.get(key)) || 0;
  const floor = Number(await env.CACHE.get('feed:remaining'));
  if (used >= DAILY_CAP || (await env.CACHE.get('feed:remaining') !== null && floor < FEED_FLOOR)) return null;
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(FEED + path + (qs ? '?' + qs : ''), { headers: { 'x-rapidapi-key': env.HIGHLIGHTLY_KEY } });
  await env.CACHE.put(key, String(used + 1), { expirationTtl: 172800 });
  const left = res.headers.get('x-ratelimit-requests-remaining');
  if (left !== null) await env.CACHE.put('feed:remaining', left, { expirationTtl: 3600 });
  if (!res.ok) { console.log('feed', path, res.status); return null; }
  return res.json();
}

function slimMatch(m) {
  const score = /(\d+)\s*-\s*(\d+)/.exec(m.state?.score || '');
  return {
    id: m.id, date: m.date, week: m.week || null,
    comp: COMPS[m.league?.id] || null, compName: m.league?.name || '', season: m.league?.season || null,
    h: team(m.homeTeam), a: team(m.awayTeam),
    score: score ? [Number(score[1]), Number(score[2])] : null,
    state: m.state?.description || 'Unknown',
  };
}

// --- scheduled refresh ---------------------------------------------------------
async function refresh(env) {
  if (await env.CACHE.get('lock')) return;
  await env.CACHE.put('lock', '1', { expirationTtl: 120 });
  const prev = JSON.parse((await env.CACHE.get('data')) || '{}');
  const rows = new Map();
  let ok = 0;
  for (const id of Object.values(TEAMS)) {
    for (const side of ['homeTeamId', 'awayTeamId']) {
      const r = await feed(env, '/matches', { [side]: id, limit: 30 });
      if (!r?.data) continue;
      ok++;
      for (const m of r.data) rows.set(m.id, slimMatch(m));
    }
  }
  const feedMatches = ok ? [...rows.values()] : (prev.feed || []);

  let tables = prev.tables || {};
  if (!prev.tablesAt || Date.now() - prev.tablesAt > TABLE_AGE) {
    const next = {};
    for (const [code, id] of TABLES) {
      const season = 2026;
      const r = await feed(env, '/standings', { leagueId: id, season });
      if (!r?.groups) { if (tables[code]) next[code] = tables[code]; continue; }
      next[code] = r.groups.map((g) => ({
        name: g.name || null,
        rows: (g.standings || []).map((s) => ({
          pos: s.position, ...team(s.team), p: s.gamesPlayed, w: s.wins, d: s.draws, l: s.loses, pf: s.scoredPoints, pa: s.receivedPoints, pts: s.points,
        })),
      }));
    }
    tables = next;
    prev.tablesAt = Date.now();
  }

  await env.CACHE.put('data', JSON.stringify({ updated: Date.now(), tablesAt: prev.tablesAt, feed: feedMatches, tables }));
  await env.CACHE.delete('lock');
  await fillDetails(env, feedMatches);
}

// Team sheets for finished matches, newest first, a few per run. These build up the player data for later.
async function fillDetails(env, matches) {
  const done = matches.filter((m) => /^Finished/.test(m.state)).sort((a, b) => (a.date < b.date ? 1 : -1));
  let spent = 0;
  for (const m of done) {
    if (spent >= DETAILS_PER_RUN) break;
    const have = JSON.parse((await env.CACHE.get('m:' + m.id)) || 'null');
    if (have && !stale(have, m)) continue;
    if (!(await loadDetail(env, m))) break;
    spent++;
  }
}

function stale(rec, m) {
  const sheets = rec.lineups && (rec.lineups.home.length || rec.lineups.away.length);
  if (/^Finished/.test(m.state) && sheets) return false;
  return Date.now() - rec.at > 24 * 3600e3;
}

const slimPlayer = (p) => ({ n: p.name, no: p.shirtNumber, born: (p.birth || '').slice(0, 10) || null, ht: p.height || null, c: p.countryName || null });
const slimSide = (s) => (s ? [...(s.initialLineup || []), ...(s.substitutions || [])].map(slimPlayer).sort((a, b) => a.no - b.no) : []);

async function loadDetail(env, m) {
  const r = await feed(env, '/matches/' + m.id);
  const d = Array.isArray(r) ? r[0] : (Array.isArray(r?.data) ? r.data[0] : r?.data || r);
  if (!d?.id) return null;
  const rec = {
    at: Date.now(),
    venue: d.venue?.name ? { name: d.venue.name, city: d.venue.city || null } : null,
    referee: d.referee?.name || null,
    lineups: { home: slimSide(d.lineups?.home), away: slimSide(d.lineups?.away) },
    highlights: [],
  };
  if (/^Finished/.test(m.state)) {
    const h = await feed(env, '/highlights', { matchId: m.id, limit: 4 });
    rec.highlights = (h?.data || []).filter((x) => /^https:/.test(x.url || '')).map((x) => ({ title: x.title, url: x.url, img: /^https:/.test(x.imgUrl || '') ? x.imgUrl : null, channel: x.channel || null, verified: x.type === 'VERIFIED' }));
  }
  await env.CACHE.put('m:' + m.id, JSON.stringify(rec));
  return rec;
}

// --- what the pages read -------------------------------------------------------
function withFixtures(store) {
  const now = Date.now();
  const list = (store.feed || []).slice();
  const seen = new Set(list.map((m) => `${m.date.slice(0, 10)}|${m.h.s}|${m.a.s}`));
  for (const f of FIXTURES) {
    if (seen.has(`${f.date.slice(0, 10)}|${f.h}|${f.a}`)) continue;
    if (Date.parse(f.date) < now - 3 * 86400e3) continue; // played: the feed takes over
    list.push({ id: null, date: f.date, comp: f.comp, compName: '', venue: f.venue, h: { s: f.h, n: NAME_BY_SLUG[f.h] || f.h }, a: { s: f.a, n: NAME_BY_SLUG[f.a] || f.a }, score: null, state: 'Not started', listed: true });
  }
  return list.sort((a, b) => (a.date < b.date ? -1 : 1));
}

async function apiData(env, ctx) {
  const raw = await env.CACHE.get('data');
  if (!raw) { await refresh(env); }
  const store = JSON.parse(raw || (await env.CACHE.get('data')) || '{}');
  if (store.updated && Date.now() - store.updated > 7 * 3600e3) ctx.waitUntil(refresh(env));
  return json({ updated: store.updated || null, matches: withFixtures(store), tables: store.tables || {} }, 200, 300);
}

async function apiMatch(env, url) {
  const id = Number(url.searchParams.get('id'));
  const store = JSON.parse((await env.CACHE.get('data')) || '{}');
  const m = (store.feed || []).find((x) => x.id === id);
  if (!m) return json({ error: 'not found' }, 404);
  let rec = JSON.parse((await env.CACHE.get('m:' + id)) || 'null');
  if (!rec || stale(rec, m)) rec = (await loadDetail(env, m)) || rec;
  return json({ match: m, detail: rec }, 200, 300);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const p = url.pathname;
    let res;
    if (p === '/api/data') res = await apiData(env, ctx);
    else if (p === '/api/match') res = await apiMatch(env, url);
    else if (/^\/(ireland|munster|leinster|ulster|connacht)\/?$/.test(p)) {
      if (!p.endsWith('/')) return Response.redirect(url.origin + p + '/', 301);
      res = await env.ASSETS.fetch(new Request(new URL('/team/', url), request));
    } else res = await env.ASSETS.fetch(request);
    // Not for search engines until Richard launches it.
    const out = new Response(res.body, res);
    out.headers.set('X-Robots-Tag', 'noindex');
    return out;
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(refresh(env));
  },
};

// Ireland rugby: Ireland + Munster, Leinster, Ulster, Connacht.
// Feed calls run on a schedule and are stored in KV, so page views never spend the daily allowance.
// Secret (Worker settings, never in the repo): HIGHLIGHTLY_KEY. KV binding: CACHE.
import FIXTURES from './fixtures.json';

const FEED = 'https://rugby.highlightly.net';
const DAILY_CAP = 80;      // our own ceiling, below the free plan's 100
const FEED_FLOOR = 10;     // stop if the feed says fewer than this remain
const TABLE_AGE = 24 * 3600e3;
const ARCHIVE_AGE = 7 * 86400e3;
const DETAILS_PER_RUN = 20;
const FRESH = 14 * 86400e3; // younger matches keep being re-checked for late team sheets

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
// Lists only when a match may have finished since last time, or once a day. That leaves the
// rest of the daily allowance for collecting team sheets.
function matchDue(prev) {
  if (!prev.updated || Date.now() - prev.updated > 24 * 3600e3) return true;
  const from = prev.updated - 3 * 3600e3, to = Date.now();
  const hit = (d) => { const t = Date.parse(d); return t >= from && t <= to; };
  return (prev.feed || []).some((m) => hit(m.date)) || FIXTURES.some((f) => hit(f.date));
}

async function loadList(env, side, id, limit) {
  const out = [];
  let offset = 0;
  for (let page = 0; page < 3; page++) {
    const r = await feed(env, '/matches', { [side]: id, limit, offset });
    if (!r?.data) return page ? out : null;
    out.push(...r.data.map(slimMatch));
    offset += limit;
    if (limit < 100 || offset >= (r.pagination?.totalCount || 0)) break;
  }
  return out;
}

async function refresh(env) {
  if (await env.CACHE.get('lock')) return;
  await env.CACHE.put('lock', '1', { expirationTtl: 120 });
  try {
    const prev = JSON.parse((await env.CACHE.get('data')) || '{}');
    const due = matchDue(prev);
    let feedMatches = prev.feed || [];
    if (due) {
      const rows = new Map();
      let ok = 0;
      for (const id of Object.values(TEAMS)) {
        for (const side of ['homeTeamId', 'awayTeamId']) {
          const list = await loadList(env, side, id, 30);
          if (!list) continue;
          ok++;
          for (const m of list) rows.set(m.id, m);
        }
      }
      if (ok) feedMatches = [...rows.values()];
    }

    let tables = prev.tables || {};
    let tablesAt = prev.tablesAt;
    if (!tablesAt || Date.now() - tablesAt > TABLE_AGE || (due && prev.updated)) {
      const next = {};
      for (const [code, id] of TABLES) {
        const r = await feed(env, '/standings', { leagueId: id, season: 2026 });
        if (!r?.groups) { if (tables[code]) next[code] = tables[code]; continue; }
        next[code] = r.groups.map((g) => ({
          name: g.name || null,
          rows: (g.standings || []).map((s) => ({
            pos: s.position, ...team(s.team), p: s.gamesPlayed, w: s.wins, d: s.draws, l: s.loses, pf: s.scoredPoints, pa: s.receivedPoints, pts: s.points,
          })),
        }));
      }
      tables = next;
      tablesAt = Date.now();
    }
    await env.CACHE.put('data', JSON.stringify({ updated: due ? Date.now() : prev.updated, tablesAt, feed: feedMatches, tables }));

    // Every match since 2020, refreshed weekly: this is what player pages hang off.
    const archived = JSON.parse((await env.CACHE.get('archive')) || '{}');
    let old = archived.rows || [];
    if (!archived.at || Date.now() - archived.at > ARCHIVE_AGE) {
      const rows = new Map();
      for (const id of Object.values(TEAMS)) {
        for (const side of ['homeTeamId', 'awayTeamId']) {
          for (const m of (await loadList(env, side, id, 100)) || []) rows.set(m.id, m);
        }
      }
      if (rows.size) {
        old = [...rows.values()];
        await env.CACHE.put('archive', JSON.stringify({ at: Date.now(), rows: old }));
      }
    }
    const all = new Map(old.map((m) => [m.id, m]));
    for (const m of feedMatches) all.set(m.id, m);
    const history = [...all.values()];
    await env.CACHE.put('history', JSON.stringify(history));
    await fillSheets(env, history);
  } finally {
    await env.CACHE.delete('lock');
  }
}

const IRISH = new Set(Object.keys(TEAMS));
const norm = (n) => String(n || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[’'`.]/g, '').toLowerCase().trim();
const playerKey = (n, born) => norm(n).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + (born ? '-' + born.slice(0, 4) : '');

// Compact store: people, plus for each match the [person, shirt] pairs for our teams' sides.
// A match is 0 when no team sheet ever arrived. Pages do the adding up in the browser.
function addSide(store, index, side) {
  return side.map((p) => {
    const name = norm(p.n);
    let i = p.born ? index.get(name + '|' + p.born) : undefined;
    if (i === undefined) i = index.get(name + '|') ;
    if (i === undefined && !p.born) i = index.get(name + '|*');
    if (i === undefined) {
      i = store.people.length;
      store.people.push({ k: playerKey(p.n, p.born), n: p.n, b: p.born || null, h: p.ht || null, c: p.c || null });
    } else if (p.born && !store.people[i].b) {
      store.people[i].b = p.born;
      store.people[i].k = playerKey(p.n, p.born);
    }
    index.set(name + '|' + (store.people[i].b || ''), i);
    index.set(name + '|*', i);
    return [i, p.no];
  });
}

async function fillSheets(env, matches) {
  const store = JSON.parse((await env.CACHE.get('players')) || '{"people":[],"apps":{}}');
  const index = new Map();
  store.people.forEach((p, i) => { index.set(norm(p.n) + '|' + (p.b || ''), i); index.set(norm(p.n) + '|*', i); });
  const done = matches.filter((m) => /^Finished/.test(m.state)).sort((a, b) => (a.date < b.date ? 1 : -1));
  let spent = 0, reads = 0, dirty = 0;
  const save = async () => { if (dirty) { await env.CACHE.put('players', JSON.stringify(store)); dirty = 0; } };
  for (const m of done) {
    if (store.apps[m.id] !== undefined) continue;
    if (spent >= DETAILS_PER_RUN || reads >= 300) break;
    reads++;
    let rec = JSON.parse((await env.CACHE.get('m:' + m.id)) || 'null');
    if (!rec || stale(rec, m)) {
      const got = await loadDetail(env, m, Date.now() - Date.parse(m.date) < FRESH);
      if (!got) break; // out of calls for today
      rec = got;
      spent++;
    }
    const home = rec.lineups?.home || [], away = rec.lineups?.away || [];
    if (!home.length && !away.length) {
      if (Date.now() - Date.parse(m.date) > FRESH) { store.apps[m.id] = 0; dirty++; }
      continue;
    }
    store.apps[m.id] = { h: IRISH.has(m.h.s) ? addSide(store, index, home) : null, a: IRISH.has(m.a.s) ? addSide(store, index, away) : null };
    if (++dirty >= 8) await save();
  }
  await save();
}

function stale(rec, m) {
  const sheets = rec.lineups && (rec.lineups.home.length || rec.lineups.away.length);
  if (/^Finished/.test(m.state) && sheets) return false;
  if (Date.now() - Date.parse(m.date) > FRESH && /^Finished/.test(m.state)) return false; // it isn't coming now
  return Date.now() - rec.at > 24 * 3600e3;
}

const slimPlayer = (p) => ({ n: p.name, no: p.shirtNumber, born: (p.birth || '').slice(0, 10) || null, ht: p.height || null, c: p.countryName || null });
const slimSide = (s) => (s ? [...(s.initialLineup || []), ...(s.substitutions || [])].map(slimPlayer).sort((a, b) => a.no - b.no) : []);

async function loadHighlights(env, id) {
  const h = await feed(env, '/highlights', { matchId: id, limit: 4 });
  return (h?.data || []).filter((x) => /^https:/.test(x.url || '')).map((x) => ({ title: x.title, url: x.url, img: /^https:/.test(x.imgUrl || '') ? x.imgUrl : null, channel: x.channel || null, verified: x.type === 'VERIFIED' }));
}

async function loadDetail(env, m, withHighlights = true) {
  const r = await feed(env, '/matches/' + m.id);
  const d = Array.isArray(r) ? r[0] : (Array.isArray(r?.data) ? r.data[0] : r?.data || r);
  if (!d?.id) return null;
  const rec = {
    at: Date.now(),
    venue: d.venue?.name ? { name: d.venue.name, city: d.venue.city || null } : null,
    referee: d.referee?.name || null,
    lineups: { home: slimSide(d.lineups?.home), away: slimSide(d.lineups?.away) },
    highlights: [],
    hl: false,
  };
  if (withHighlights && /^Finished/.test(m.state)) { rec.highlights = await loadHighlights(env, m.id); rec.hl = true; }
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
  let m = (store.feed || []).find((x) => x.id === id);
  if (!m) m = JSON.parse((await env.CACHE.get('history')) || '[]').find((x) => x.id === id);
  if (!m) return json({ error: 'not found' }, 404);
  let rec = JSON.parse((await env.CACHE.get('m:' + id)) || 'null');
  if (!rec || stale(rec, m)) rec = (await loadDetail(env, m)) || rec;
  if (rec && !rec.hl && !rec.highlights?.length && /^Finished/.test(m.state)) {
    rec.highlights = await loadHighlights(env, id);
    rec.hl = true;
    await env.CACHE.put('m:' + id, JSON.stringify(rec));
  }
  return json({ match: m, detail: rec }, 200, 300);
}

// --- calendar feed: /cal/ireland-munster.ics ------------------------------------
// Phones and calendar apps poll this, so kickoff changes reach a supporter's calendar on their own.
const COMP_NAME = { urc: 'United Rugby Championship', cc: 'Champions Cup', ch: 'Challenge Cup', six: 'Six Nations', nc: 'Nations Championship', test: 'Test match', anc: 'Autumn Nations Cup' };
const icsText = (s) => String(s ?? '').replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const icsTime = (ms) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
// Lines longer than 75 bytes are folded, as the format asks.
function fold(line) {
  const out = []; let cur = '', n = 0;
  for (const ch of line) { const b = new TextEncoder().encode(ch).length; if (n + b > (out.length ? 74 : 75)) { out.push(cur); cur = ''; n = 0; } cur += ch; n += b; }
  out.push(cur); return out.join('\r\n ');
}
async function calendar(env, url, p) {
  const teams = [...new Set(p.replace(/^\/cal\//, '').replace(/\.ics$/, '').toLowerCase().split(/[-+,]/))].filter((t) => IRISH.has(t));
  if (!teams.length) return new Response('Choose teams at /calendar/', { status: 404 });
  const store = JSON.parse((await env.CACHE.get('data')) || '{}');
  const hist = JSON.parse((await env.CACHE.get('history')) || '[]');
  const since = Date.now() - 120 * 86400e3, seen = new Set(), list = [];
  for (const m of [...withFixtures(store), ...hist]) {
    if (!teams.includes(m.h.s) && !teams.includes(m.a.s)) continue;
    const t = Date.parse(m.date); if (!(t > since)) continue;
    const key = `${m.date.slice(0, 10)}|${m.h.s}|${m.a.s}`; if (seen.has(key)) continue; seen.add(key); list.push(m);
  }
  list.sort((a, b) => (a.date < b.date ? -1 : 1));
  const names = teams.map((t) => NAME_BY_SLUG[t] || t);
  const stamp = icsTime(store.updated || Date.now());
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//irelandrugby.wiki//Fixtures//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    `X-WR-CALNAME:${icsText('Rugby: ' + names.join(', '))}`, `X-WR-CALDESC:${icsText('Fixtures and results for ' + names.join(', ') + ' from irelandrugby.wiki. Times can change; this calendar updates itself.')}`,
    'X-WR-TIMEZONE:Europe/Dublin', 'REFRESH-INTERVAL;VALUE=DURATION:PT6H', 'X-PUBLISHED-TTL:PT6H'];
  for (const m of list) {
    const t = Date.parse(m.date), done = /^Finished/.test(m.state) && m.score;
    const comp = COMP_NAME[m.comp] || m.compName || 'Rugby';
    const title = done ? `${m.h.n} ${m.score[0]}-${m.score[1]} ${m.a.n}` : `${m.h.n} v ${m.a.n}`;
    const irish = new Intl.DateTimeFormat('en-IE', { timeZone: 'Europe/Dublin', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(t));
    const link = m.id ? `${url.origin}/match/?id=${m.id}` : `${url.origin}/${teams.find((x) => x === m.h.s || x === m.a.s)}/`;
    // Same id across kickoff changes, so calendars move the event rather than add a second one.
    const uid = `${m.h.s}-${m.a.s}-${m.comp || 'x'}-${m.date.slice(0, 7)}@irelandrugby.wiki`;
    L.push('BEGIN:VEVENT', `UID:${uid}`, `DTSTAMP:${stamp}`, `DTSTART:${icsTime(t)}`, `DTEND:${icsTime(t + 2 * 3600e3)}`,
      `SUMMARY:${icsText(title)}`, ...(m.venue ? [`LOCATION:${icsText(m.venue)}`] : []),
      `DESCRIPTION:${icsText(`${comp}. Kickoff ${irish} Irish time.${m.listed ? ' Copied from the team\'s published list; the time can change.' : ''}\n${link}`)}`,
      `URL:${link}`, `CATEGORIES:${icsText(comp)}`, `STATUS:${/postpon|cancel/i.test(m.state) ? 'CANCELLED' : 'CONFIRMED'}`, 'TRANSP:TRANSPARENT', 'END:VEVENT');
  }
  L.push('END:VCALENDAR');
  return new Response(L.map(fold).join('\r\n') + '\r\n', { headers: { 'content-type': 'text/calendar; charset=utf-8', 'cache-control': 'public, max-age=1800', 'content-disposition': `inline; filename="rugby-${teams.join('-')}.ics"` } });
}

// Passed straight through from KV without parsing; the browser does the adding up.
async function apiRaw(env, ctx, key, empty) {
  const raw = await env.CACHE.get(key);
  if (!raw) ctx.waitUntil(refresh(env));
  return new Response(raw || empty, { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=600' } });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const p = url.pathname;
    let res;
    if (p === '/api/data') res = await apiData(env, ctx);
    else if (p === '/api/match') res = await apiMatch(env, url);
    else if (p === '/api/players') res = await apiRaw(env, ctx, 'players', '{"people":[],"apps":{}}');
    else if (p === '/api/history') res = await apiRaw(env, ctx, 'history', '[]');
    else if (/^\/cal\/[a-z+,-]+\.ics$/i.test(p)) res = await calendar(env, url, p);
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

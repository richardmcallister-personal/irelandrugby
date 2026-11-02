// Shared helpers and page shell for the Ireland rugby site.
const IR = (() => {
  const TEAMS = { ireland: 'Ireland', munster: 'Munster', leinster: 'Leinster', ulster: 'Ulster', connacht: 'Connacht' };
  const COMP = {
    urc: ['United Rugby Championship', 'URC', 'urc'], cc: ['Champions Cup', 'Champions Cup', 'champions-cup'], ch: ['Challenge Cup', 'Challenge Cup', 'challenge-cup'],
    six: ['Six Nations', 'Six Nations', 'six-nations'], nc: ['Nations Championship', 'Nations Championship', 'nations-championship'], test: ['Test match', 'Test', null], anc: ['Autumn Nations Cup', 'Autumn Nations Cup', null],
  };
  // Logos that are white or mostly white, so they need a dark tile.
  const DARK = new Set(['leinster', 'ulster', 'connacht', 'benetton', 'ospreys', 'scarlets', 'sharks', 'stormers', 'zebre-parma', 'edinburgh', 'fiji', 'new-zealand', 'argentina', 'south-africa', 'georgia']);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const irish = (t) => !!TEAMS[t?.s];
  const provincial = (t) => irish(t) && t.s !== 'ireland';
  const has = (m, s) => m.h.s === s || m.a.s === s;
  const done = (m) => /^Finished/.test(m.state) && m.score;

  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const fmt = (d, o, tz) => new Intl.DateTimeFormat('en-IE', { timeZone: tz || zone, ...o }).format(d);
  const fmtDay = (iso) => fmt(new Date(iso), { weekday: 'short', day: 'numeric', month: 'short' });
  const fmtDayLong = (iso) => fmt(new Date(iso), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const fmtTime = (iso, tz) => fmt(new Date(iso), { hour: '2-digit', minute: '2-digit', hour12: false }, tz);
  const irishTime = (iso) => { const a = fmtTime(iso), b = fmtTime(iso, 'Europe/Dublin'); return a === b ? '' : b + ' Irish'; };

  const logo = (t, cls = '') => {
    if (t?.s) {
      const tint = ['leinster', 'ulster', 'connacht'].includes(t.s) ? ' ' + t.s : '';
      return `<span class="lg${DARK.has(t.s) ? ' dark' : ''}${tint} ${cls}"><img src="/img/t/${t.s}.webp" alt="" width="48" height="48" loading="lazy"></span>`;
    }
    if (t?.logo) return `<span class="lg ${cls}"><img src="${esc(t.logo)}" alt="" width="48" height="48" loading="lazy"></span>`;
    return `<span class="lg txt ${cls}">${esc((t?.n || '?').slice(0, 2).toUpperCase())}</span>`;
  };
  const compName = (m) => (COMP[m.comp] ? COMP[m.comp][1] : m.compName) || '';

  const result = (m, s) => {
    if (!done(m)) return null;
    const [x, y] = m.h.s === s ? m.score : [m.score[1], m.score[0]];
    return x > y ? 'W' : x < y ? 'L' : 'D';
  };

  function row(m) {
    const d = done(m), started = Date.parse(m.date) < Date.now();
    const won = d ? (m.score[0] > m.score[1] ? 'h' : m.score[1] > m.score[0] ? 'a' : '') : '';
    const side = (t, sc, w) => `<div class="side${w ? ' won' : ''}">${logo(t)}<span class="nm">${esc(t.n)}</span><span class="sc">${sc ?? ''}</span></div>`;
    const derby = provincial(m.h) && provincial(m.a) ? '<span class="tag">Interpro</span>' : '';
    const pend = !d && started ? ' · Score to come' : '';
    const when = d ? `<b>FT</b>` : `<b>${fmtTime(m.date)}</b><span>${irishTime(m.date)}</span>`;
    const meta = `<div class="meta">${esc(compName(m))}${m.venue ? ' · ' + esc(m.venue) : ''}${pend}${derby}</div>`;
    const inner = `<div class="when">${when}</div><div>${side(m.h, d ? m.score[0] : '', won === 'h')}${side(m.a, d ? m.score[1] : '', won === 'a')}</div>${meta}`;
    return m.id ? `<a class="row link" href="/match/?id=${m.id}">${inner}</a>` : `<div class="row">${inner}</div>`;
  }

  function byDay(list) {
    let out = '', last = '';
    for (const m of list) {
      const k = fmtDay(m.date);
      if (k !== last) { out += `<div class="day">${k}</div>`; last = k; }
      out += row(m);
    }
    return out;
  }

  const upcoming = (ms) => ms.filter((m) => !done(m) && Date.parse(m.date) > Date.now() - 6 * 3600e3).sort((a, b) => (a.date < b.date ? -1 : 1));
  const results = (ms) => ms.filter(done).sort((a, b) => (a.date > b.date ? -1 : 1));

  async function data() {
    const r = await fetch('/api/data');
    if (!r.ok) throw new Error('data ' + r.status);
    return r.json();
  }

  function shell(active) {
    const on = (k) => (active === k ? ' aria-current="page"' : '');
    const nav = Object.entries(TEAMS).map(([s, n]) => `<a href="/${s}/"${on(s)}>${n}</a>`).join('');
    const sub = [['tables', 'Tables'], ['players', 'Players'], ['selection', 'Selection'], ['scorers', 'Scorers'], ['h2h', 'Head to head'], ['history', 'History'], ['shirts', 'Shirts']].map(([k, n]) => `<a href="/${k}/"${on(k)}>${n}</a>`).join('');
    document.body.insertAdjacentHTML('afterbegin', `<a class="skip" href="#main">Skip to content</a><header class="top"><div class="in"><a class="brand" href="/">Ireland Rugby</a><nav class="nav" aria-label="Teams">${nav}</nav></div><nav class="sub" aria-label="Sections"><div>${sub}</div></nav><div class="stripe" aria-hidden="true">${Object.keys(TEAMS).map((s) => `<i style="background:var(--${s})"></i>`).join('')}</div></header>`);
  }

  function footer(updated) {
    const u = updated ? ' Last update: ' + fmt(new Date(updated), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }) + '.' : '';
    document.body.insertAdjacentHTML('beforeend', `<footer class="foot"><p>Results and tables update every few hours, so scores are not live.${u}</p><p>Provincial fixtures are copied from the teams' published lists and can change. Results data: Highlightly. Scorers: Wikipedia (CC BY-SA).</p><p>Unofficial fan site. Not connected with the IRFU, the provinces or any competition. Crests, logos and kits belong to their owners.</p></footer>`);
  }

  // Same key as the Worker builds, so match pages can link to player pages.
  const norm = (n) => String(n || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[’'`.]/g, '').toLowerCase().trim();
  const playerKey = (n, born) => norm(n).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + (born ? '-' + born.slice(0, 4) : '');
  const POS = { 1: 'Loosehead prop', 2: 'Hooker', 3: 'Tighthead prop', 4: 'Lock', 5: 'Lock', 6: 'Flanker', 7: 'Flanker', 8: 'Number 8', 9: 'Scrum-half', 10: 'Fly-half', 11: 'Wing', 12: 'Centre', 13: 'Centre', 14: 'Wing', 15: 'Full-back' };
  const season = (iso) => { const d = new Date(iso), y = d.getUTCFullYear(), s = d.getUTCMonth() >= 6 ? y : y - 1; return s + '/' + String(s + 1).slice(2); };

  // Everyone selected for our five teams: each person gets a list of {m, team, no}, newest first.
  async function squadData() {
    const [pr, hr] = await Promise.all([fetch('/api/players'), fetch('/api/history')]);
    if (!pr.ok || !hr.ok) throw new Error('players');
    const store = await pr.json(), hist = await hr.json();
    const byId = new Map(hist.map((m) => [m.id, m]));
    const people = store.people.map((p) => ({ ...p, sel: [] }));
    let have = 0;
    for (const [id, a] of Object.entries(store.apps)) {
      const m = byId.get(Number(id));
      if (!m || !a) continue;
      have++;
      for (const [side, t] of [['h', m.h.s], ['a', m.a.s]]) for (const [i, no] of a[side] || []) people[i]?.sel.push({ m, team: t, no });
    }
    for (const p of people) {
      p.sel.sort((x, y) => (x.m.date < y.m.date ? 1 : -1));
      const c = {}; for (const s of p.sel) if (s.no <= 15) c[POS[s.no]] = (c[POS[s.no]] || 0) + 1;
      p.pos = Object.entries(c).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Replacement';
    }
    const finished = hist.filter((m) => /^Finished/.test(m.state));
    return { people, hist, store, have, total: finished.length };
  }

  // Scorers from Wikipedia; h and a are sides, each {try, con, pen, drop} of [full, shown, count, minutes].
  const scoreLine = (rows, label) => rows.length ? `<p class="scl"><b>${label}</b> ${rows.map((r) => esc(/penalty try/i.test(r[0]) ? 'Penalty try' : r[1]) + (r[2] > 1 ? ' ' + r[2] : '') + (label === 'Tries' && r[3].length ? ` <small>${r[3].map((m) => m + "'").join(', ')}</small>` : '')).join(', ')}</p>` : '';
  const sideScorers = (s) => scoreLine(s.try, 'Tries') + scoreLine(s.con, 'Conversions') + scoreLine(s.pen, 'Penalties') + scoreLine(s.drop, 'Drop goals');

  const fail = (el) => { el.innerHTML = '<p class="empty">Could not load the data. Please try again shortly.</p>'; };
  return { sideScorers, POS, season, playerKey, squadData, TEAMS, COMP, esc, irish, has, done, fmtDay, fmtDayLong, fmtTime, irishTime, logo, compName, result, row, byDay, upcoming, results, data, shell, footer, fail };
})();

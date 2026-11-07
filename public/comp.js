// Shared code for the competition, final and competitions pages.
const C = (() => {
  const LOGOS = new Set(['argentina', 'australia', 'canada', 'chile', 'england', 'fiji', 'france', 'georgia', 'ireland', 'italy', 'japan', 'namibia', 'new-zealand', 'portugal', 'romania', 'samoa', 'scotland', 'south-africa', 'spain', 'tonga', 'uruguay', 'usa', 'wales']);
  let NAMES = {}, IMG = {};
  const esc = IR.esc;
  const name = (c) => NAMES[c] || c;
  const slug = (c) => { const s = c === 'USA' ? 'usa' : c === 'WSM' ? 'samoa' : name(c).toLowerCase().replace(/[^a-z]+/g, '-'); return LOGOS.has(s) ? s : null; };
  const team = (c) => ({ s: slug(c), n: name(c) });
  const fd = (d, long = true) => d ? new Date(d + 'T12:00:00Z').toLocaleDateString('en-IE', { weekday: long ? 'short' : undefined, day: 'numeric', month: long ? 'long' : 'short', year: 'numeric', timeZone: 'UTC' }) : 'Date not recorded';
  const ord = (n) => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th');
  const credit = (k) => IMG[k] ? `${esc(IMG[k].by)}, <a href="${esc(IMG[k].src)}" target="_blank" rel="noopener">${esc(IMG[k].lic)}</a>` : '';
  const img = (k, alt, lazy = true) => IMG[k] ? `<img src="/img/seasons/${k}.webp" alt="${esc(alt)}"${lazy ? ' loading="lazy"' : ''} width="${IMG[k].w}" height="${IMG[k].h}">` : '';
  const has = (k) => !!IMG[k];
  async function index() {
    const d = await (await fetch('/data/competitions.json')).json();
    NAMES = d.names; IMG = d.images; return d.comps;
  }
  const one = async (id) => { const r = await fetch(`/data/comp/${id}.json`); if (!r.ok) throw new Error(id); return r.json(); };
  // What Ireland did in a competition, in a few words.
  function finish(c) {
    if (c.kind === 'wc') return c.finish;
    if (c.kind === 'anc') return 'Third place';
    if (c.won) return c.shared ? 'Shared champions' : 'Champions';
    if (c.spoon) return 'Wooden spoon';
    return c.pos ? `${ord(c.pos)} of ${c.of}` : '';
  }
  const href = (c) => `/competition/?id=${c.id}`;
  const title = (c) => c.kind === 'wc' ? `${c.y} Rugby World Cup` : `${c.y} ${c.comp}`;
  // Scorer lines for one side: {try, con, pen, drop} of [full, shown, count, minutes]
  function lines(s) {
    const L = [['try', 'Tries'], ['con', 'Conversions'], ['pen', 'Penalties'], ['drop', 'Drop goals']].filter(([k]) => (s?.[k] || []).length)
      .map(([k, lab]) => `<p class="scl"><b>${lab}</b> ${s[k].map((r) => esc(r[1]) + (r[2] > 1 ? ' ' + r[2] : '') + (r[3].length && k === 'try' ? ` <small>${r[3].map((x) => x + "'").join(', ')}</small>` : '')).join(', ')}</p>`).join('');
    return L || '<p class="note" style="margin:0">Scorers not recorded in the source.</p>';
  }
  const xi = (p) => `<ol class="xi">${p.map((x) => `<li><b>${x[0]}</b>${esc(x[1])}</li>`).join('')}</ol>`;
  // One match as a card. Ireland's view when Ireland played; neutral otherwise.
  function card(m, opt = {}) {
    const ie = m.h === 'IRE' || m.a === 'IRE';
    let res = '';
    if (ie) { const [x, z] = m.h === 'IRE' ? m.s : [m.s[1], m.s[0]], r = x > z ? 'W' : x < z ? 'L' : 'D'; res = `<small class="res-${r}">${r === 'W' ? 'Ireland won' : r === 'L' ? 'Ireland lost' : 'Draw'}</small>`; }
    else if (m.s[0] !== m.s[1]) res = `<small>${esc(name(m.s[0] > m.s[1] ? m.h : m.a))} won</small>`;
    const kit = has('kit-' + m.date) ? 'kit-' + m.date : null;
    const teams = Object.entries(m.xi || {}).filter(([c, p]) => p.length && (!ie || c === 'IRE'));
    const stage = opt.stage && m.stage ? `<p class="kick">${esc(m.stage)}</p>` : '';
    return `<div class="mcard">${stage}<div class="mhd"><div class="t">${IR.logo(team(m.h), 'big')}${esc(name(m.h))}</div><div class="s">${m.s[0]}-${m.s[1]}${res}</div><div class="t">${IR.logo(team(m.a), 'big')}${esc(name(m.a))}</div></div>
      <p class="mmeta">${fd(m.date)}${m.venue ? ' · ' + esc(m.venue) : ''}${m.att ? ' · Crowd ' + m.att : ''}${m.ref ? ' · Referee ' + esc(m.ref) : ''}</p>
      <div class="mbody"><div><h3>${esc(name(m.h))} scorers</h3>${lines(m.sc.h)}</div><div><h3>${esc(name(m.a))} scorers</h3>${lines(m.sc.a)}</div>
      ${teams.length === 1 ? `<div style="grid-column:1/-1"><h3>${esc(name(teams[0][0]))} team</h3>${xi(teams[0][1])}</div>` : teams.map(([c, p]) => `<div><h3>${esc(name(c))} team</h3>${xi(p)}</div>`).join('')}</div>
      ${kit ? `<details class="diag"><summary>Line-up diagram</summary>${img(kit, `Line-ups and kits, ${name(m.h)} v ${name(m.a)}`)}<p class="note">Diagram: ${credit(kit)}</p></details>` : ''}${opt.after || ''}</div>`;
  }
  function table(t) {
    const rule = { '2': 'Two points for a win, one for a draw. Points worked out with that rule.', '4': 'Four points for a win, two for a draw, plus bonus points.', '2-1-0': 'Two points for a win, one for a draw.', '3-2-1': 'Three points for a win, two for a draw, one for a loss.', '4-2-0': 'Four points for a win, two for a draw, plus bonus points.' }[t.rule] || '';
    return `<table class="tbl"><thead><tr><th></th><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th class="wide">PF</th><th class="wide">PA</th><th>Pts</th></tr></thead><tbody>${t.rows.map((r, k) => `<tr class="${r.c === 'IRE' ? 'irish' : ''}"><td>${k + 1}</td><td class="tm"><span class="tmi">${IR.logo(team(r.c))}${esc(name(r.c))}</span></td><td>${r.w + r.d + r.l}</td><td>${r.w}</td><td>${r.d}</td><td>${r.l}</td><td class="wide">${r.pf}</td><td class="wide">${r.pa}</td><td class="pts">${r.pts}</td></tr>`).join('')}</tbody></table>${rule ? `<p class="note">${rule}</p>` : ''}`;
  }
  // Final venue photo for each World Cup.
  const WCV = { 1987: 'eden-park', 1991: 'twickenham', 1995: 'ellis-park', 1999: 'millennium', 2003: 'stadium-australia', 2007: 'stade-de-france', 2011: 'eden-park', 2015: 'twickenham', 2019: 'yokohama', 2023: 'stade-de-france' };
  const wiki = (p) => `<a href="https://en.wikipedia.org/wiki/${encodeURIComponent(p.replace(/ /g, '_'))}" target="_blank" rel="noopener">${esc(p)}</a>`;
  return { esc, name, team, fd, ord, credit, img, has, index, one, finish, href, title, lines, card, table, WCV, wiki, xi };
})();

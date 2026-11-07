// Team details shared by the team pages (/side/) and the Irish team sections (/ireland/, /munster/ ...).
const SIDE = (() => {
  // Plain numbers: no thousands separators
  const esc = (v) => IR.esc(String(v ?? '').replace(/(\d),(?=\d{3}\b)/g, '$1'));
  const ICON = { web: ['Website', '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>'], x: ['X', '<path d="M4 4l16 16M20 4 4 20"/>'], ig: ['Instagram', '<rect x="4" y="4" width="16" height="16" rx="4"/><circle cx="12" cy="12" r="3.5"/>'], fb: ['Facebook', '<path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8z"/>'], yt: ['YouTube', '<rect x="3" y="6" width="18" height="12" rx="4"/><path d="M10 9.5v5l4.5-2.5z"/>'], tt: ['TikTok', '<path d="M14 4v10a3.5 3.5 0 1 1-3.5-3.5M14 4c0 2.5 2 4.5 4.5 4.5"/>'] };
  const BASE = { web: '', x: 'https://x.com/', ig: 'https://www.instagram.com/', fb: 'https://www.facebook.com/', yt: 'https://www.youtube.com/channel/', tt: 'https://www.tiktok.com/@' };
  const url = (k, v) => (/^https?:/.test(v) ? v : BASE[k] + v);
  const NAT = { ENG: 'England', SCO: 'Scotland', WAL: 'Wales', IRE: 'Ireland', FRA: 'France', ITA: 'Italy', RSA: 'South Africa', NZL: 'New Zealand', AUS: 'Australia', ARG: 'Argentina', FIJ: 'Fiji', SAM: 'Samoa', TGA: 'Tonga', TON: 'Tonga', JPN: 'Japan', GEO: 'Georgia', USA: 'United States', CAN: 'Canada', URU: 'Uruguay', ROU: 'Romania', ROM: 'Romania', NAM: 'Namibia', POR: 'Portugal', ESP: 'Spain', CHI: 'Chile', ZIM: 'Zimbabwe', NED: 'Netherlands', BEL: 'Belgium', GER: 'Germany', HKG: 'Hong Kong', RUS: 'Russia' };
  const POSN = { HK: 'Hookers', PR: 'Props', LK: 'Locks', LF: 'Back row', FL: 'Back row', BR: 'Back row', N8: 'Back row', SH: 'Scrum-halves', HB: 'Scrum-halves', FH: 'Fly-halves', FF: 'Fly-halves', CE: 'Centres', MF: 'Centres', WG: 'Wings', FB: 'Full-backs', UB: 'Utility backs', OB: 'Wings and full-backs' };
  const load = () => fetch('/data/sides.json').then((r) => r.json());
  function links(t) {
    const L = Object.keys(ICON).filter((k) => t[k]).map((k) => `<a href="${esc(url(k, t[k]))}" target="_blank" rel="noopener"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON[k][1]}</svg>${ICON[k][0]}</a>`).join('');
    return L ? `<section class="card"><h2>Official links</h2><div class="links">${L}</div></section>` : '';
  }
  function ground(t) {
    const nation = t.kind === 'nation';
    const map = t.lat != null ? `https://www.openstreetmap.org/?mlat=${t.lat}&mlon=${t.lon}#map=15/${t.lat}/${t.lon}` : null;
    const g = (t.grounds || []).length ? t.grounds.map((x) => `<div class="ground"><b>${esc(x[0])}</b><span>${x[1] || ''}</span><small class="note" style="margin:0">${x[1] ? 'Capacity' : 'Capacity not recorded'}</small></div>`).join('') : `<p class="empty">${nation ? 'Plays home games at several grounds.' : 'Not recorded.'}</p>`;
    return `<section class="card"><h2>${(t.grounds || []).length > 1 ? 'Grounds' : 'Ground'}</h2>${g}${t.record_att ? `<p class="note">Ground record crowd: ${esc(t.record_att)}</p>` : ''}${t.note ? `<p class="note">${esc(t.note)}</p>` : ''}<p class="note">${esc(t.location || t.country || '')}${map ? ` · <a href="${map}" target="_blank" rel="noopener">Map</a>` : ''}</p></section>`;
  }
  function about(t) {
    const f = [['Coach', t.coach], ['Captain', t.captain], ['Founded', t.founded], ['League', t.league], ['Nickname', t.nick], ['Most caps', t.most_caps], ['Top points scorer', t.top_scorer], ['Most tries', t.top_try]].filter((x) => x[1]);
    return `<section class="card"><h2>About</h2><dl class="facts txt">${f.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></section>`;
  }
  function squad(t) {
    const nation = t.kind === 'nation', groups = {};
    for (const p of t.squad || []) { const g = nation ? POSN[p.pos] || p.pos || 'Squad' : p.pos || 'Squad'; (groups[g] || (groups[g] = [])).push(p); }
    const body = Object.entries(groups).map(([g, ps]) => `<section><h3>${esc(g)}</h3><ul>${ps.map((p) => `<li><span>${esc(p.n)}${p.c ? ' <b title="Captain">(c)</b>' : ''}</span><small>${nation ? [p.caps != null ? p.caps + (p.caps === 1 ? ' cap' : ' caps') : '', p.club].filter(Boolean).map(esc).join(' · ') : esc(NAT[p.nat] || p.nat || '') + (p.cap ? ' · international' : '')}</small></li>`).join('')}</ul></section>`).join('');
    return `<section class="card"><h2>${nation ? 'Latest squad' : 'Squad'}</h2>${body ? `<div class="squad">${body}</div>` : '<p class="empty">Squad not listed in the source.</p>'}<p class="note">${nation ? 'The most recent squad named, with caps at the time.' : 'This season\'s senior squad. International means capped by a country.'}</p></section>`;
  }
  const source = (t) => `<p class="note">Squad, ground and club details: <a href="https://en.wikipedia.org/wiki/${encodeURIComponent(t.page.replace(/ /g, '_'))}" target="_blank" rel="noopener">${esc(t.page)}</a>, Wikipedia (CC BY-SA), and Wikidata, checked 7 November 2026. Links go to the team's own accounts.</p>`;
  return { load, links, ground, about, squad, source };
})();

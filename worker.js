// Ireland rugby: Ireland + Munster, Leinster, Ulster, Connacht.
// For now this only holds a guarded route for testing the Highlightly feed.
// Secrets (Worker settings, never in the repo): HIGHLIGHTLY_KEY, PROBE_TOKEN.
const FEED = 'https://rugby.highlightly.net';
const CACHE_SECONDS = 3600; // the free plan allows 100 calls a day

const json = (body, status = 200) =>
  new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

async function sameToken(a, b) {
  const hash = async (s) => new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
  const [x, y] = await Promise.all([hash(a), hash(b)]);
  return x.every((v, i) => v === y[i]);
}

async function probe(request, url, env) {
  if (!env.PROBE_TOKEN || !env.HIGHLIGHTLY_KEY) return json({ error: 'secrets not set' }, 503);
  const given = request.headers.get('x-probe-token') || url.searchParams.get('t') || '';
  if (!(await sameToken(given, env.PROBE_TOKEN))) return json({ error: 'not found' }, 404);

  const path = url.pathname.slice('/probe'.length);
  if (!/^(\/[a-z0-9-]+)+$/i.test(path)) return json({ error: 'bad path' }, 400);

  const params = new URLSearchParams(url.search);
  params.delete('t');
  const qs = params.toString();
  const target = FEED + path + (qs ? '?' + qs : '');

  const cacheKey = new Request('https://probe.cache' + path + (qs ? '?' + qs : ''));
  const hit = await caches.default.match(cacheKey);
  if (hit) return new Response(hit.body, { headers: { 'content-type': 'application/json; charset=utf-8', 'x-probe-cache': 'hit' } });

  const res = await fetch(target, { headers: { 'x-rapidapi-key': env.HIGHLIGHTLY_KEY } });
  const body = await res.text();
  const headers = { 'content-type': 'application/json; charset=utf-8', 'x-probe-cache': 'miss', 'x-feed-status': String(res.status) };
  for (const [k, v] of res.headers) if (/ratelimit|requests/i.test(k)) headers['x-feed-' + k] = v;
  if (res.ok) await caches.default.put(cacheKey, new Response(body, { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=' + CACHE_SECONDS } }));
  return new Response(body, { status: res.status, headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/probe/') && request.method === 'GET') return probe(request, url, env);
    if (url.pathname === '/') return new Response('Ireland rugby: coming soon.', { headers: { 'content-type': 'text/plain; charset=utf-8' } });
    return new Response('Not found', { status: 404 });
  },
};

import { digest, issueSession, matchingOwner, reserveAttempt, rotatePassword } from './cms-auth.mjs';
import { readForm } from './form.mjs';

const siteOrigin = 'https://tao355667.github.io';
const pageSizes = [20, 50, 100];
const dayMs = 86400000;
const beijingOffset = 8 * 3600000;

function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      'Access-Control-Allow-Origin': siteOrigin,
      'Cache-Control': 'no-store',
      'Vary': 'Origin',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

function sqlTime(ms) {
  return new Date(ms).toISOString().slice(0, 19).replace('T', ' ');
}

function beijingMinute(value) {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return NaN;
  const ms = Date.parse(value + ':00+08:00');
  return Number.isFinite(ms) && new Date(ms + beijingOffset).toISOString().slice(0, 16) === value ? ms : NaN;
}

function readQuery(params) {
  const size = Number(params.get('size') ?? pageSizes[0]);
  const before = Number(params.get('before') ?? 0);
  const snapshot = Number(params.get('snapshot') ?? 0);
  const from = beijingMinute(params.get('from'));
  const to = beijingMinute(params.get('to'));
  const ip = (params.get('ip') || '').trim();
  const city = (params.get('city') || '').trim();
  if (!pageSizes.includes(size) || !Number.isSafeInteger(before) || before < 0 ||
      !Number.isSafeInteger(snapshot) || snapshot < 0 || Number.isNaN(from) || Number.isNaN(to) ||
      (from !== null && to !== null && from > to) || ip.length > 64 || city.length > 100) return null;
  return { size, before, snapshot, from, to, ip, city };
}

async function report(db, query) {
  const now = Date.now();
  const days = Array.from({ length: 7 }, (_, i) =>
    new Date(now + beijingOffset - (6 - i) * dayMs).toISOString().slice(0, 10));
  const start = sqlTime(Date.parse(days[0] + 'T00:00:00+08:00'));
  const terms = ['visited_at >= ?'];
  const args = [sqlTime(now - 7 * dayMs)];
  function add(term, value) {
    terms.push(term);
    args.push(value);
  }
  if (query.snapshot) add('id <= ?', query.snapshot);
  if (query.from !== null) add('visited_at >= ?', sqlTime(query.from));
  if (query.to !== null) add('visited_at < ?', sqlTime(query.to + 60000));
  if (query.ip) add('instr(lower(ip), lower(?)) > 0', query.ip);
  if (query.city) add("instr(lower(COALESCE(NULLIF(city, ''), '未知')), lower(?)) > 0", query.city);
  const where = ' FROM visits WHERE ' + terms.join(' AND ');
  const details = 'SELECT id, visited_at, ip, city, context' + where +
    (query.before ? ' AND id < ?' : '') + ' ORDER BY id DESC LIMIT ?';
  const [daily, overview, cities, matched, detail] = await db.batch([
    db.prepare(`SELECT date(visited_at, '+8 hours') AS day, COUNT(*) AS total
      FROM visits WHERE visited_at >= ? GROUP BY day`).bind(start),
    db.prepare(`SELECT COUNT(DISTINCT ip) AS ips, COUNT(DISTINCT NULLIF(city, '')) AS cities
      FROM visits WHERE visited_at >= ?`).bind(start),
    db.prepare(`SELECT city, COUNT(*) AS count FROM visits WHERE visited_at >= ? AND city IS NOT NULL AND city != ''
      GROUP BY city ORDER BY count DESC, city LIMIT 5`).bind(start),
    db.prepare('SELECT COUNT(*) AS total, MAX(id) AS highest' + where).bind(...args),
    db.prepare(details).bind(...args, ...(query.before ? [query.before] : []), query.size + 1),
  ]);
  const counts = new Map(daily.results.map(row => [row.day, row.total]));
  const rows = detail.results.slice(0, query.size).map(({ context, ...visit }) =>
    ({ ...visit, details: context ? JSON.parse(context) : null }));
  return {
    days: days.map(day => ({ day, count: counts.get(day) || 0 })),
    overview: overview.results[0],
    cities: cities.results,
    total: matched.results[0].total,
    snapshot: query.snapshot || matched.results[0].highest || 0,
    rows,
    next: detail.results.length > query.size ? rows[rows.length - 1].id : null,
  };
}

export async function handleCms(request, env) {
  const url = new URL(request.url);
  if (request.headers.get('Origin') !== siteOrigin) return new Response(null, { status: 403 });
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: {
      'Access-Control-Allow-Origin': siteOrigin,
      'Access-Control-Allow-Methods': 'GET, POST',
      'Access-Control-Allow-Headers': 'Authorization',
      'Access-Control-Max-Age': '600',
      'Vary': 'Origin',
    } });
  }
  const path = url.pathname;
  const login = path === '/cms/login' && request.method === 'POST';
  const logout = path === '/cms/logout' && request.method === 'POST';
  const change = path === '/cms/password' && request.method === 'POST';
  if (!login && !logout && !change && !(path === '/cms/visits' && request.method === 'GET')) {
    return json(null, 404);
  }
  const bearer = /^Bearer ([A-Za-z0-9_-]{32,128})$/.exec(request.headers.get('Authorization') || '')?.[1];
  if (!login && !bearer) return json(null, 401);
  const db = env.DB;
  try {
    if (login) {
      const fields = await readForm(request, 8192);
      if (!fields) return json(null, 413);
      const password = fields.get('password') ?? bearer;
      if (!password || password.length > 256) return json(null, 401);
      const bucket = await reserveAttempt(db, request);
      if (!bucket) return json(null, 429);
      const owner = await matchingOwner(db, password);
      if (!owner) return json(null, 401);
      const session = await issueSession(db, owner, bucket);
      return session ? json({ session }) : json(null, 401);
    }
    const keyHash = await digest(bearer);
    if (logout) {
      await env.DB.prepare('DELETE FROM cms_access WHERE key_hash = ? AND expires_at IS NOT NULL')
        .bind(keyHash).run();
      return json(null);
    }
    const valid = await env.DB.prepare('SELECT 1 FROM cms_access WHERE key_hash = ? AND expires_at > unixepoch()')
      .bind(keyHash).first();
    if (!valid) return json(null, 401);
    if (change) {
      const fields = await readForm(request, 8192);
      if (!fields) return json(null, 413);
      const current = fields.get('current') || '';
      const password = fields.get('new') || '';
      const length = Array.from(password).length;
      if (!current || current.length > 256 || !password.trim() || length < 15 || length > 128 || current === password) {
        return json(null, 400);
      }
      const bucket = await reserveAttempt(db, request);
      if (!bucket) return json(null, 429);
      const owner = await matchingOwner(db, current);
      if (!owner) return json(null, 403);
      return await rotatePassword(db, owner, keyHash, password, bucket) ? json(null) : json(null, 401);
    }
    const query = readQuery(url.searchParams);
    if (!query) return json(null, 400);
    return json(await report(env.DB, query));
  } catch {
    return json(null, 503);
  }
}

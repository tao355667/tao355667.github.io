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

function hex(bytes) {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

async function digest(value) {
  return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))));
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
  if (!login && !logout && !(path === '/cms/visits' && request.method === 'GET')) {
    return json(null, 404);
  }
  const match = /^Bearer ([A-Za-z0-9_-]{32,128})$/.exec(request.headers.get('Authorization') || '');
  if (!match) return json(null, 401);
  const keyHash = await digest(match[1]);
  try {
    if (login) {
      const owner = await env.DB.prepare('SELECT 1 FROM cms_access WHERE key_hash = ? AND expires_at IS NULL')
        .bind(keyHash).first();
      if (!owner) return json(null, 401);
      const session = hex(crypto.getRandomValues(new Uint8Array(32)));
      await env.DB.prepare('INSERT INTO cms_access (key_hash, expires_at) VALUES (?, unixepoch() + 28800)')
        .bind(await digest(session)).run();
      return json({ session });
    }
    if (logout) {
      await env.DB.prepare('DELETE FROM cms_access WHERE key_hash = ? AND expires_at IS NOT NULL')
        .bind(keyHash).run();
      return json(null);
    }
    const valid = await env.DB.prepare('SELECT 1 FROM cms_access WHERE key_hash = ? AND expires_at > unixepoch()')
      .bind(keyHash).first();
    if (!valid) return json(null, 401);
    const query = readQuery(url.searchParams);
    if (!query) return json(null, 400);
    return json(await report(env.DB, query));
  } catch {
    return json(null, 503);
  }
}

const siteOrigin = 'https://tao355667.github.io';
const pageSize = 30;
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

async function report(db, before) {
  const localNow = Date.now() + beijingOffset;
  const days = Array.from({ length: 7 }, (_, i) =>
    new Date(localNow - (6 - i) * dayMs).toISOString().slice(0, 10));
  const start = new Date(Date.parse(days[0] + 'T00:00:00+08:00'))
    .toISOString().slice(0, 19).replace('T', ' ');
  const detailQuery = `SELECT id, visited_at, ip, city FROM visits WHERE visited_at >= ?
    ${before ? 'AND id < ?' : ''} ORDER BY id DESC LIMIT ?`;
  const [daily, detail] = await db.batch([
    db.prepare(`SELECT date(visited_at, '+8 hours') AS day, COUNT(*) AS total
      FROM visits WHERE visited_at >= ? GROUP BY day`).bind(start),
    db.prepare(detailQuery).bind(...(before ? [start, before, pageSize + 1] : [start, pageSize + 1])),
  ]);
  const counts = new Map(daily.results.map(row => [row.day, row.total]));
  const rows = detail.results.slice(0, pageSize);
  return {
    days: days.map(day => ({ day, count: counts.get(day) || 0 })),
    rows,
    next: detail.results.length > pageSize ? rows[rows.length - 1].id : null,
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
    const cursor = url.searchParams.get('before');
    const before = Number(cursor);
    if (cursor !== null && (!Number.isSafeInteger(before) || before < 1)) return json(null, 400);
    return json(await report(env.DB, before));
  } catch {
    return json(null, 503);
  }
}

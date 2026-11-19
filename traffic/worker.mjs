const homepage = 'https://tao355667.github.io';

export default {
  async fetch(request, env) {
    if (new URL(request.url).pathname !== '/visit') {
      return new Response(null, { status: 404 });
    }
    if (request.method !== 'POST') {
      return new Response(null, { status: 405, headers: { Allow: 'POST' } });
    }
    if (request.headers.get('Origin') !== homepage) {
      return new Response(null, { status: 403 });
    }

    const ip = request.headers.get('CF-Connecting-IP');
    if (!ip) return new Response(null, { status: 400 });

    const headers = { 'Access-Control-Allow-Origin': homepage, 'Cache-Control': 'no-store' };
    try {
      await env.DB.prepare('INSERT INTO visits (ip, city) VALUES (?, ?)')
        .bind(ip, request.cf?.city || null)
        .run();
      return new Response(null, { status: 204, headers });
    } catch {
      return new Response(null, { status: 503, headers });
    }
  },

  async scheduled(_event, env) {
    await env.DB.prepare("DELETE FROM visits WHERE visited_at <= datetime('now', '-7 days')").run();
  },
};

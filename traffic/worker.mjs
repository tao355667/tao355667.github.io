import { handleCms } from './cms.mjs';

const homepage = 'https://tao355667.github.io';

function clientInfo(ua) {
  const browserRules = [
    [/MicroMessenger/i, '微信'], [/Edg(?:e|A|iOS)?\//i, 'Edge'], [/SamsungBrowser\//i, 'Samsung Internet'],
    [/OPR\/|OPiOS\//i, 'Opera'], [/Firefox\/|FxiOS\//i, 'Firefox'],
    [/Chrome\/|Chromium\/|CriOS\//i, 'Chrome'], [/Safari\//i, 'Safari'],
  ];
  const systemRules = [
    [/iPad|iPhone|iPod/i, 'iOS'], [/Android/i, 'Android'], [/Windows/i, 'Windows'],
    [/CrOS/i, 'ChromeOS'], [/Macintosh|Mac OS X/i, 'macOS'], [/Linux/i, 'Linux'],
  ];
  const browser = browserRules.find(([pattern]) => pattern.test(ua))?.[1] || null;
  const system = systemRules.find(([pattern]) => pattern.test(ua))?.[1] || null;
  let device = null;
  if (/bot\b|crawler|spider/i.test(ua)) device = '爬虫';
  else if (/iPad|Tablet/i.test(ua) || (system === 'Android' && !/Mobile/i.test(ua))) device = '平板';
  else if (/iPhone|iPod|Mobile/i.test(ua)) device = '手机';
  else if (system) device = '电脑';
  return { browser, system, device };
}

async function readVisitFields(request) {
  if (!request.body) return new URLSearchParams();
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let length = 0;
  let text = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) return new URLSearchParams(text + decoder.decode());
    length += value.byteLength;
    if (length > 2048) {
      await reader.cancel();
      return null;
    }
    text += decoder.decode(value, { stream: true });
  }
}

function visitContext(request, fields) {
  const now = Date.now();
  const timestamp = Number(fields.get('opened'));
  const openedAt = Number.isSafeInteger(timestamp) && timestamp >= now - 7 * 86400000 && timestamp <= now + 300000
    ? new Date(timestamp).toISOString() : null;
  const source = fields.get('source') || '';
  return {
    openedAt,
    source: source.length <= 253 && /^[a-z0-9.-]+$/i.test(source) ? source.toLowerCase() : null,
    country: request.cf?.country || null,
    region: request.cf?.region || null,
    ...clientInfo(request.headers.get('User-Agent') || ''),
  };
}

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path.startsWith('/cms/')) return handleCms(request, env);
    if (path !== '/visit') {
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
      const fields = await readVisitFields(request);
      if (!fields) return new Response(null, { status: 413, headers });
      await env.DB.prepare('INSERT INTO visits (ip, city, context) VALUES (?, ?, ?)')
        .bind(ip, request.cf?.city || null, JSON.stringify(visitContext(request, fields)))
        .run();
      return new Response(null, { status: 204, headers });
    } catch {
      return new Response(null, { status: 503, headers });
    }
  },

  async scheduled(_event, env) {
    await env.DB.prepare("DELETE FROM visits WHERE visited_at <= datetime('now', '-7 days')").run();
    await env.DB.prepare('DELETE FROM cms_access WHERE expires_at <= unixepoch()').run();
  },
};

// Start the visit report independently of the page's navigation and settings.
(() => {
  if (location.origin !== 'https://tao355667.github.io'
      || !['/', '/index.html'].includes(location.pathname)) return;

  const checking = location.hash === '#visit-check';
  let message;
  function display() {
    const status = document.getElementById('visit-check');
    if (status) status.textContent = message;
  }
  if (checking && document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', display, { once: true });
  }
  function showResult(zh, en) {
    if (!checking) return;
    message = zh + ' / ' + en;
    display();
  }

  async function reportVisit() {
    const started = Date.now();
    const fields = new URLSearchParams({ opened: String(started) });
    try {
      const referrer = new URL(document.referrer);
      if (['https:', 'http:'].includes(referrer.protocol) && referrer.origin !== location.origin) {
        fields.set('source', referrer.hostname);
      }
    } catch { /* The browser may omit the referring site. */ }
    let confirmationTimer;
    if (checking) {
      const openedAt = new Date(started + 8 * 3600000).toISOString().slice(11, 19);
      showResult('正在等待统计服务响应。', 'Waiting for the traffic service.');
      confirmationTimer = setTimeout(() => {
        showResult('10 秒内未收到写入确认。请按打开时间（北京时间 ' + openedAt + '）在后台核对。',
          'No confirmation within 10 seconds. Check the dashboard near ' + openedAt + ' (UTC+8).');
      }, 10000);
    }
    try {
      const response = await fetch('https://academic-homepage-traffic.xct714328058.workers.dev/visit', {
        method: 'POST',
        body: fields,
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        keepalive: true,
      });
      if (response.status === 204) {
        showResult('本次主页访问已写入后台。', 'This page view was recorded.');
      } else {
        showResult('本次上报未获确认（HTTP ' + response.status + '）。',
          'The service did not confirm this page view (HTTP ' + response.status + ').');
      }
    } catch {
      showResult('浏览器未收到统计服务的响应，请检查网络或浏览器的拦截提示。',
        'No response from the traffic service. Check the network or browser blocking notices.');
    } finally {
      clearTimeout(confirmationTimer);
    }
  }

  reportVisit();
})();

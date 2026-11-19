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

  showResult('正在等待统计服务响应。', 'Waiting for the traffic service.');
  fetch('https://academic-homepage-traffic.xct714328058.workers.dev/visit', {
    method: 'POST',
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
    keepalive: true,
  }).then(response => {
    if (response.status === 204) {
      showResult('本次主页访问已写入后台。', 'This page view was recorded.');
    } else {
      showResult('本次上报未获确认（HTTP ' + response.status + '）。',
        'The service did not confirm this page view (HTTP ' + response.status + ').');
    }
  }).catch(() => {
    showResult('浏览器未收到统计服务的响应，请检查网络或浏览器的拦截提示。',
      'No response from the traffic service. Check the network or browser blocking notices.');
  });
})();

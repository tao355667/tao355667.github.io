'use strict';

const endpoint = 'https://academic-homepage-traffic.xct714328058.workers.dev/cms';
const sessionKey = 'homepage-cms-session';
const $ = id => document.getElementById(id);
const numberFormat = new Intl.NumberFormat('zh-CN');
const timeFormat = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
});
let session = '';
let cursors = [null];
let nextCursor = null;
let snapshot = 0;
let pageSize = 20;
let filters = {};
const countryNames = typeof Intl.DisplayNames === 'function'
  ? new Intl.DisplayNames('zh-CN', { type: 'region' }) : null;
let busy = false;

function remember(value) {
  session = value;
  try {
    if (value) sessionStorage.setItem(sessionKey, value);
    else sessionStorage.removeItem(sessionKey);
  } catch { /* The current tab can still use its in-memory session. */ }
}

function showLogin() {
  remember('');
  cursors = [null];
  nextCursor = null;
  $('rows').replaceChildren();
  $('trend').replaceChildren();
  $('cities').replaceChildren();
  $('filters').reset();
  filters = {};
  snapshot = 0;
  pageSize = 20;
  for (const id of ['today', 'week', 'ips', 'city-count', 'page-number']) $(id).textContent = '—';
  $('period').textContent = '近 7 天 · 北京时间';
  $('matches').textContent = '';
  $('password-form').reset();
  $('login-form').reset();
  $('workspace').hidden = true;
  $('dashboard').hidden = $('logout').hidden = true;
  $('login').hidden = false;
  $('password').focus();
}

async function api(path, method, token, fields) {
  const res = await fetch(endpoint + path, {
    method, headers: token ? { Authorization: 'Bearer ' + token } : {},
    body: fields,
    credentials: 'omit', cache: 'no-store', signal: AbortSignal.timeout(15000),
  });
  if (res.status === 401) {
    showLogin();
    throw new Error(path === '/login' ? '密码不正确，请重新输入。' : '登录已过期，请重新输入管理密码。');
  }
  if (res.status === 429) throw new Error('尝试次数过多，请在 10 分钟后重试。');
  if (path === '/password' && res.status === 403) throw new Error('当前密码不正确。');
  if (path === '/password' && res.status === 400) throw new Error('新密码需为 6 至 128 个字符，并与当前密码不同。');
  if (res.status === 400) throw new Error('请检查筛选条件和时间范围。');
  if (!res.ok) throw new Error('暂时无法读取后台，请稍后重试。');
  return res.json();
}

function element(tag, value, className) {
  const node = document.createElement(tag);
  if (value !== null) node.textContent = value;
  if (className) node.className = className;
  return node;
}

function drawTrend(days) {
  const peak = Math.max(1, ...days.map(item => item.count));
  const items = days.map(({day, count}) => {
    const item = element('li', null);
    const track = element('span', null, 'track');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 10 40');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('aria-hidden', 'true');
    const bar = document.createElementNS(svg.namespaceURI, 'rect');
    const height = count ? Math.max(1, 40 * count / peak) : 0;
    bar.setAttribute('width', '10');
    bar.setAttribute('height', height);
    bar.setAttribute('y', 40 - height);
    svg.append(bar);
    track.append(svg);
    item.setAttribute('aria-label', day + '，' + count + ' 次浏览');
    item.append(element('span', numberFormat.format(count), 'count'), track, element('span', day.slice(5).replace('-', '/'), 'day'));
    return item;
  });
  $('trend').replaceChildren(...items);
}

function detailCell(label, value, note, className) {
  const cell = element('td', null);
  cell.dataset.label = label;
  cell.append(element('span', value, className));
  if (note) cell.append(element('small', note));
  return cell;
}

function visitRow(visit) {
  const info = visit.details;
  const received = timeFormat.format(new Date(visit.visited_at.replace(' ', 'T') + 'Z'));
  const opened = info?.openedAt ? timeFormat.format(new Date(info.openedAt)) : '';
  const openLabel = opened ? '打开 ' + (received.slice(0, 10) === opened.slice(0, 10) ? opened.slice(11) : opened) : '';
  const iso = info?.country || '';
  const country = countryNames && /^[A-Z]{2}$/.test(iso) ? countryNames.of(iso) : iso;
  const row = element('tr', null);
  row.append(
    detailCell('入库时间', received, openLabel, 'stamp'),
    detailCell('公网 IP', visit.ip, visit.ip.includes(':') ? 'IPv6' : 'IPv4', 'ip-address'),
    detailCell('推测位置', visit.city || '未知城市', [country, info?.region].filter(Boolean).join(' · ')),
    detailCell('访问环境', info ? [info.device, info.browser].filter(Boolean).join(' · ') || '未知' : '未记录', info?.system),
    detailCell('来源网站', info ? info.source || '未提供' : '未记录'),
  );
  return row;
}

function showOverview(data) {
  const days = data.days;
  $('today').textContent = numberFormat.format(days[days.length - 1].count);
  $('week').textContent = numberFormat.format(days.reduce((sum, day) => sum + day.count, 0));
  $('ips').textContent = numberFormat.format(data.overview.ips);
  $('city-count').textContent = numberFormat.format(data.overview.cities);
  $('period').textContent = days[0].day + ' 至 ' + days[days.length - 1].day + ' · 北京时间';
  drawTrend(days);
  $('cities').replaceChildren(...data.cities.map(({city, count}, index) => {
    const item = element('li', null);
    item.append(element('span', String(index + 1), 'rank'), element('span', city, 'city-name'),
      element('span', numberFormat.format(count) + ' 次', 'city-total'));
    return item;
  }));
  $('city-empty').hidden = data.cities.length > 0;
}

async function loadPage(history, selection = filters, size = pageSize, ceiling = 0) {
  const params = new URLSearchParams({ ...selection, size });
  if (history.length > 1) params.set('before', history[history.length - 1]);
  if (ceiling) params.set('snapshot', ceiling);
  const data = await api('/visits?' + params, 'GET', session);
  if (!data.rows.length && history.length > 1) return loadPage([null], selection, size);
  cursors = history;
  nextCursor = data.next;
  snapshot = data.snapshot;
  filters = selection;
  pageSize = size;
  showOverview(data);
  const rows = data.rows.map(visitRow);
  if (!rows.length) {
    const row = element('tr', null);
    const cell = element('td', Object.keys(selection).length ? '没有符合筛选条件的访问记录。' : '最近七天内暂无访问记录。', 'empty');
    cell.colSpan = 5;
    row.append(cell);
    rows.push(row);
  }
  $('rows').replaceChildren(...rows);
  $('matches').textContent = (Object.keys(selection).length ? '筛选结果' : '最近七天') + ' · 共 ' + numberFormat.format(data.total) + ' 条';
  $('page-number').textContent = data.total ? '第 ' + cursors.length + ' / ' + Math.ceil(data.total / pageSize) + ' 页' : '0 页';
  for (const button of document.querySelectorAll('[data-size]')) {
    button.setAttribute('aria-pressed', String(Number(button.dataset.size) === pageSize));
  }
}

function selectSection(settings) {
  $('dashboard').hidden = settings;
  $('settings').hidden = !settings;
  $('nav-traffic').setAttribute('aria-pressed', String(!settings));
  $('nav-settings').setAttribute('aria-pressed', String(settings));
  if (!settings) $('password-form').reset();
  $('status').textContent = '';
}

function showDashboard() {
  $('login').hidden = true;
  $('logout').hidden = $('workspace').hidden = false;
  selectSection(false);
}

async function run(action, message, successMessage = '') {
  if (busy) return;
  busy = true;
  const controls = document.querySelectorAll('button, #filters input, #password-form input');
  controls.forEach(control => { control.disabled = true; });
  $('status').textContent = message;
  try {
    await action();
    $('status').textContent = successMessage;
  } catch (error) {
    $('status').textContent = error instanceof TypeError || error.name === 'TimeoutError'
      ? '连接后台失败，请检查网络后重试。' : error.message;
  } finally {
    busy = false;
    controls.forEach(control => { control.disabled = false; });
    $('previous').disabled = cursors.length < 2;
    $('next').disabled = !nextCursor;
  }
}

$('login-form').addEventListener('submit', event => {
  event.preventDefault();
  run(async () => {
    const data = await api('/login', 'POST', null, new URLSearchParams({ password: $('password').value }));
    $('password').value = '';
    remember(data.session);
    showDashboard();
    await loadPage([null]);
  }, '正在登录…');
});
$('nav-traffic').addEventListener('click', () => selectSection(false));
$('nav-settings').addEventListener('click', () => selectSection(true));
$('password-form').addEventListener('submit', event => {
  event.preventDefault();
  const current = $('current-password').value;
  const password = $('new-password').value;
  const confirmed = $('confirm-password').value;
  run(async () => {
    const length = Array.from(password).length;
    if (!password.trim() || length < 6 || length > 128) throw new Error('新密码需为 6 至 128 个字符。');
    if (password === current) throw new Error('新密码应与当前密码不同。');
    if (password !== confirmed) throw new Error('两次输入的新密码不一致。');
    await api('/password', 'POST', session, new URLSearchParams({ current, new: password }));
    showLogin();
  }, '正在保存…', '密码已修改。请使用新密码重新登录。');
});
$('filters').addEventListener('submit', event => {
  event.preventDefault();
  const selection = {};
  for (const [name, value] of new FormData(event.currentTarget)) {
    if (value.trim()) selection[name] = value.trim();
  }
  run(async () => {
    if (selection.from && selection.to && selection.from > selection.to) {
      throw new Error('结束时间应等于或晚于开始时间。');
    }
    await loadPage([null], selection);
  }, '正在筛选…');
});
$('clear').addEventListener('click', () => run(async () => {
  await loadPage([null], {});
  $('filters').reset();
}, '正在更新…'));
async function navigateDetails(history, size, ceiling) {
  await loadPage(history, filters, size, ceiling);
  document.querySelector('.records').scrollIntoView({ block: 'start' });
}

for (const button of document.querySelectorAll('[data-size]')) {
  button.addEventListener('click', () => run(() => navigateDetails([null], Number(button.dataset.size), 0), '正在读取…'));
}
$('refresh').addEventListener('click', () => run(() => loadPage([null]), '正在更新…'));
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && session && !$('dashboard').hidden && cursors.length === 1 && !busy) {
    run(() => loadPage([null]), '正在更新…');
  }
});
$('previous').addEventListener('click', () => run(() => navigateDetails(cursors.slice(0, -1), pageSize, snapshot), '正在读取…'));
$('next').addEventListener('click', () => run(() => navigateDetails([...cursors, nextCursor], pageSize, snapshot), '正在读取…'));
$('logout').addEventListener('click', () => run(async () => {
  try { await api('/logout', 'POST', session); }
  finally { showLogin(); }
}, '正在退出…'));

try { session = sessionStorage.getItem(sessionKey) || ''; } catch { /* Storage is optional. */ }
if (session) {
  showDashboard();
  run(() => loadPage([null]), '正在读取…');
}

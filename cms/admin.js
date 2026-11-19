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
  $('today').textContent = $('week').textContent = '—';
  $('pager').hidden = $('dashboard').hidden = $('logout').hidden = true;
  $('login').hidden = false;
  $('password').focus();
}

async function api(path, method, token) {
  const res = await fetch(endpoint + path, {
    method, headers: { Authorization: 'Bearer ' + token },
    credentials: 'omit', cache: 'no-store', signal: AbortSignal.timeout(15000),
  });
  if (res.status === 401) {
    showLogin();
    throw new Error(path === '/login' ? '口令不正确，请重新输入。' : '登录已过期，请重新输入管理口令。');
  }
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

async function loadPage(history) {
  const cursor = history[history.length - 1];
  const data = await api('/visits' + (cursor ? '?before=' + cursor : ''), 'GET', session);
  cursors = history;
  nextCursor = data.next;
  $('today').textContent = numberFormat.format(data.days[data.days.length - 1].count);
  $('week').textContent = numberFormat.format(data.days.reduce((sum, day) => sum + day.count, 0));
  drawTrend(data.days);
  const rows = data.rows.map(visit => {
    const row = element('tr', null);
    const localTime = timeFormat.format(new Date(visit.visited_at.replace(' ', 'T') + 'Z'));
    row.append(element('td', localTime), element('td', visit.ip), element('td', visit.city || '未知'));
    return row;
  });
  if (!rows.length) {
    const row = element('tr', null);
    const cell = element('td', '该范围内暂无访问记录。', 'empty');
    cell.colSpan = 3;
    row.append(cell);
    rows.push(row);
  }
  $('rows').replaceChildren(...rows);
  $('page-number').textContent = '第 ' + cursors.length + ' 页';
  $('pager').hidden = cursors.length === 1 && !nextCursor;
}

function showDashboard() {
  $('login').hidden = true;
  $('logout').hidden = $('dashboard').hidden = false;
}

async function run(action, message) {
  if (busy) return;
  busy = true;
  document.querySelectorAll('button').forEach(button => { button.disabled = true; });
  $('status').textContent = message;
  try {
    await action();
    $('status').textContent = '';
  } catch (error) {
    $('status').textContent = error instanceof TypeError || error.name === 'TimeoutError'
      ? '连接后台失败，请检查网络后重试。' : error.message;
  } finally {
    busy = false;
    document.querySelectorAll('button').forEach(button => { button.disabled = false; });
    $('previous').disabled = cursors.length < 2;
    $('next').disabled = !nextCursor;
  }
}

$('login-form').addEventListener('submit', event => {
  event.preventDefault();
  run(async () => {
    const data = await api('/login', 'POST', $('password').value.trim());
    $('password').value = '';
    remember(data.session);
    showDashboard();
    await loadPage([null]);
  }, '正在登录…');
});
$('refresh').addEventListener('click', () => run(() => loadPage([null]), '正在更新…'));
$('previous').addEventListener('click', () => run(() => loadPage(cursors.slice(0, -1)), '正在读取…'));
$('next').addEventListener('click', () => run(() => loadPage([...cursors, nextCursor]), '正在读取…'));
$('logout').addEventListener('click', () => run(async () => {
  try { await api('/logout', 'POST', session); }
  finally { showLogin(); }
}, '正在退出…'));

try { session = sessionStorage.getItem(sessionKey) || ''; } catch { /* Storage is optional. */ }
if (session) {
  showDashboard();
  run(() => loadPage([null]), '正在读取…');
}

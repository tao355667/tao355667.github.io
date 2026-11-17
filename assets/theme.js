// Apply a saved theme before the stylesheet paints the page.
(() => {
  const root = document.documentElement;
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
  const validThemes = ['system', 'light', 'dark'];
  let preferredTheme = 'system';
  try {
    const saved = localStorage.getItem('preferred-theme');
    if (validThemes.includes(saved)) preferredTheme = saved;
  } catch {
    // System appearance remains available without browser storage.
  }

  function updateControls() {
    const chinese = root.lang.startsWith('zh');
    const labels = chinese
      ? { system: '跟随系统', light: '浅色', dark: '深色' }
      : { system: 'System', light: 'Light', dark: 'Dark' };
    const menu = document.querySelector('.settings-menu');
    if (!menu) return;
    menu.hidden = false;
    const toggle = menu.querySelector('.settings-toggle');
    toggle.setAttribute('aria-label', chinese ? '设置' : 'Settings');
    toggle.title = chinese ? '设置' : 'Settings';
    menu.querySelector('.settings-label').textContent = chinese ? '主题' : 'Theme';
    const select = menu.querySelector('.theme-select');
    select.setAttribute('aria-label', chinese ? '显示主题' : 'Color theme');
    select.value = preferredTheme;
    for (const option of select.options) {
      option.textContent = labels[option.value];
    }
  }

  function applyTheme() {
    root.dataset.theme = preferredTheme;
    const dark = preferredTheme === 'dark' || (preferredTheme === 'system' && systemTheme.matches);
    for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
      meta.content = dark ? '#151b22' : '#ffffff';
    }
    updateControls();
  }

  applyTheme();
  systemTheme.addEventListener('change', applyTheme);
  document.addEventListener('languagechange', updateControls);
  document.addEventListener('DOMContentLoaded', () => {
    updateControls();
    const menu = document.querySelector('.settings-menu');
    if (!menu) return;
    menu.querySelector('.theme-select').addEventListener('change', (event) => {
      preferredTheme = event.target.value;
      applyTheme();
      try {
        localStorage.setItem('preferred-theme', preferredTheme);
      } catch {
        // Manual switching also works when persistent storage is unavailable.
      }
    });
    document.addEventListener('click', (event) => {
      if (!menu.contains(event.target)) menu.open = false;
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && menu.open) {
        menu.open = false;
        menu.querySelector('.settings-toggle').focus();
      }
    });
  });
})();

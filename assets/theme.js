// Apply reading preferences before the stylesheet paints the page.
(() => {
  const root = document.documentElement;
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
  const favicon = document.querySelector('link[rel="icon"]');
  const validThemes = ['system', 'light', 'dark'];
  const validFontSizes = ['small', 'medium', 'large'];
  let preferredTheme = 'system';
  let preferredFontSize = 'medium';
  try {
    const saved = localStorage.getItem('preferred-theme');
    if (validThemes.includes(saved)) preferredTheme = saved;
    const savedFontSize = localStorage.getItem('preferred-font-size');
    if (validFontSizes.includes(savedFontSize)) preferredFontSize = savedFontSize;
  } catch {
    // System appearance and medium text remain available without browser storage.
  }

  function updateControls() {
    const chinese = root.lang.startsWith('zh');
    const labels = chinese
      ? { system: '跟随系统', light: '浅色模式', dark: '深色模式' }
      : { system: 'Follow system', light: 'Light theme', dark: 'Dark theme' };
    const menu = document.querySelector('.settings-menu');
    if (!menu) return;
    menu.hidden = false;
    const toggle = menu.querySelector('.settings-toggle');
    toggle.setAttribute('aria-label', chinese ? '设置' : 'Settings');
    toggle.title = chinese ? '设置' : 'Settings';
    menu.querySelector('.theme-label').textContent = chinese ? '主题' : 'Theme';
    const group = menu.querySelector('.theme-switch');
    group.setAttribute('aria-label', chinese ? '显示主题' : 'Color theme');
    for (const button of group.querySelectorAll('.theme-option')) {
      const mode = button.dataset.theme;
      button.setAttribute('aria-pressed', String(mode === preferredTheme));
      button.setAttribute('aria-label', labels[mode]);
      button.title = labels[mode];
    }
    const sizeLabels = chinese
      ? { large: '大', medium: '中', small: '小' }
      : { large: 'L', medium: 'M', small: 'S' };
    const sizeNames = chinese
      ? { large: '大字号', medium: '中字号', small: '小字号' }
      : { large: 'Large text', medium: 'Medium text', small: 'Small text' };
    menu.querySelector('.font-size-label').textContent = chinese ? '字号' : 'Text size';
    const sizeGroup = menu.querySelector('.font-size-switch');
    sizeGroup.setAttribute('aria-label', chinese ? '字号' : 'Text size');
    for (const button of sizeGroup.querySelectorAll('.font-size-option')) {
      const size = button.dataset.fontSize;
      button.textContent = sizeLabels[size];
      button.setAttribute('aria-pressed', String(size === preferredFontSize));
      button.setAttribute('aria-label', sizeNames[size]);
      button.title = sizeNames[size];
    }
  }

  function applyTheme() {
    root.dataset.theme = preferredTheme;
    const dark = preferredTheme === 'dark' || (preferredTheme === 'system' && systemTheme.matches);
    for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
      meta.content = dark ? '#1a1b1f' : '#ffffff';
    }
    if (favicon) {
      const iconUrl = new URL(dark ? 'favicon-dark.svg' : 'favicon-light.svg', favicon.href).href;
      if (favicon.href !== iconUrl) favicon.href = iconUrl;
    }
    updateControls();
  }

  function applyFontSize() {
    root.dataset.fontSize = preferredFontSize;
    updateControls();
    document.dispatchEvent(new Event('fontsizechange'));
  }

  applyFontSize();
  applyTheme();
  systemTheme.addEventListener('change', applyTheme);
  document.addEventListener('languagechange', updateControls);
  document.addEventListener('DOMContentLoaded', () => {
    updateControls();
    const menu = document.querySelector('.settings-menu');
    if (!menu) return;
    for (const button of menu.querySelectorAll('.theme-option')) {
      button.addEventListener('click', () => {
        preferredTheme = button.dataset.theme;
        applyTheme();
        try {
          localStorage.setItem('preferred-theme', preferredTheme);
        } catch {
          // Manual switching also works when persistent storage is unavailable.
        }
      });
    }
    for (const button of menu.querySelectorAll('.font-size-option')) {
      button.addEventListener('click', () => {
        preferredFontSize = button.dataset.fontSize;
        applyFontSize();
        try {
          localStorage.setItem('preferred-font-size', preferredFontSize);
        } catch {
          // Reading preferences still work without persistent storage.
        }
      });
    }
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

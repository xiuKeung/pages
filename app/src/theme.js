(() => {
  const storageKey = 'anjia-theme-preference';
  const validThemes = new Set(['system', 'dark', 'light']);
  const readTheme = () => {
    try {
      const saved = localStorage.getItem(storageKey);
      return validThemes.has(saved) ? saved : 'system';
    } catch (_) { return 'system'; }
  };
  const syncNativeTheme = theme => {
    const bridge = window.Capacitor?.Plugins?.ThemeBridge;
    if (bridge?.setTheme) bridge.setTheme({ theme }).catch(() => {});
  };
  const applyTheme = theme => {
    const selected = validThemes.has(theme) ? theme : 'system';
    const root = document.documentElement;
    root.dataset.theme = selected;
    root.style.colorScheme = selected === 'system' ? 'light dark' : selected;
    // 主题样式始终加载；这里只设置状态，不再通过禁用整份 CSS 来切换主题。
    // 这样输入尺寸、弹窗层级等基础规则不会因为用户选择浅色/深色而失效。
    syncNativeTheme(selected);
    document.dispatchEvent(new CustomEvent('anjia-theme-change', { detail: selected }));
    return selected;
  };
  window.AnjiaTheme = {
    get: readTheme,
    set(theme) {
      const selected = validThemes.has(theme) ? theme : 'system';
      try { localStorage.setItem(storageKey, selected); } catch (_) {}
      return applyTheme(selected);
    },
    apply: applyTheme
  };
  // Loaded from <head>; apply before the body is parsed to prevent a light/dark flash.
  const initialTheme = readTheme();
  applyTheme(initialTheme);
  // Capacitor injects its bridge during startup; retry once after parsing in case
  // it was not available during the pre-paint application above.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => syncNativeTheme(initialTheme), { once: true });
  } else {
    syncNativeTheme(initialTheme);
  }
})();

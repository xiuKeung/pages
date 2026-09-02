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
    const systemTheme = document.querySelector('link[data-theme-system]');
    const darkTheme = document.querySelector('link[data-theme-dark]');
    if (systemTheme) systemTheme.disabled = selected !== 'system';
    if (darkTheme) darkTheme.disabled = selected !== 'dark';
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

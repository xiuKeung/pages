(() => {
  const storageKey = 'anjia-theme-preference';
  const validThemes = new Set(['system', 'dark', 'light']);
  const readTheme = () => {
    try {
      const saved = localStorage.getItem(storageKey);
      return validThemes.has(saved) ? saved : 'system';
    } catch (_) { return 'system'; }
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
  const start = () => applyTheme(readTheme());
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();

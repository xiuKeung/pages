/* 小区名称快捷操作：复制，并使用系统地图搜索。 */
(() => {
  const formCommunity = document.getElementById('community');
  const toast = document.getElementById('toast');
  const records = () => {
    try { return JSON.parse(window.NativeStore.viewingRecordsJson() || '[]'); }
    catch (_) { return []; }
  };
  const notify = text => {
    if (!toast) return;
    toast.textContent = text;
    clearTimeout(notify.timer);
    notify.timer = setTimeout(() => { toast.textContent = ''; }, 2200);
  };
  const copy = async value => {
    try { await navigator.clipboard.writeText(value); }
    catch (_) {
      const area = document.createElement('textarea');
      area.value = value;
      area.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
      document.body.append(area);
      area.select();
      document.execCommand('copy');
      area.remove();
    }
  };
  const openMap = async community => {
    const query = `${community} 深圳`;
    const nativeLauncher = window.Capacitor?.Plugins?.MapLauncher;
    if (nativeLauncher?.open) {
      try {
        await nativeLauncher.open({ query });
        return;
      } catch (_) { /* 使用网页地图链接兜底。 */ }
    }
    const encoded = encodeURIComponent(query);
    const appleDevice = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    window.open(appleDevice ? `https://maps.apple.com/?q=${encoded}` : `https://www.google.com/maps/search/?api=1&query=${encoded}`, '_blank', 'noopener');
  };
  window.ViewingPlaceActions = { copy, openMap, notify };
  const addEditorActions = () => {
    const label = formCommunity?.closest('label');
    if (!label || label.querySelector('.community-field-heading')) return;
    const textNode = [...label.childNodes].find(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
    if (!textNode) return;
    textNode.textContent = '';
    const heading = document.createElement('span');
    heading.className = 'community-field-heading';
    const title = document.createElement('span');
    title.textContent = '小区名称';
    const actions = document.createElement('span');
    actions.className = 'community-field-actions';
    const copyButton = document.createElement('button');
    copyButton.type = 'button';
    copyButton.textContent = '复制';
    const mapButton = document.createElement('button');
    mapButton.type = 'button';
    mapButton.textContent = '地图';
    copyButton.addEventListener('click', async () => {
      const value = formCommunity.value.trim();
      if (!value) return;
      await copy(value);
      notify('小区名称已复制');
    });
    mapButton.addEventListener('click', () => {
      const value = formCommunity.value.trim();
      if (value) void openMap(value);
    });
    actions.append(copyButton, mapButton);
    heading.append(title, actions);
    // 不能把按钮放在 input 前：label 会把整行点击错误关联到第一个按钮。
    // 视觉顺序由 CSS 调整，DOM 中仍让 input 成为 label 的第一个可标记控件。
    label.append(heading);
  };
  addEditorActions();
  document.addEventListener('click', async event => {
    const copyButton = event.target.closest('[data-copy-community]');
    const mapButton = event.target.closest('[data-open-map]');
    if (!copyButton && !mapButton) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const button = copyButton || mapButton;
    const id = button.dataset.copyCommunity || button.dataset.openMap;
    const community = records().find(record => String(record.id) === String(id))?.community?.trim();
    if (!community) return notify('未找到小区名称');
    if (copyButton) {
      await copy(community);
      notify('小区名称已复制');
    } else {
      void openMap(community);
    }
  }, true);
})();

(() => {
  let activeDialog = null;
  let scrollState = null;
  const lockScroll = () => {
    if (scrollState) return;
    const body = document.body;
    scrollState = { top: window.scrollY, position: body.style.position, topStyle: body.style.top, left: body.style.left, right: body.style.right, width: body.style.width, overflow: body.style.overflow };
    Object.assign(body.style, { position: 'fixed', top: `-${scrollState.top}px`, left: '0', right: '0', width: '100%', overflow: 'hidden' });
  };
  const unlockScroll = () => {
    if (!scrollState) return;
    const state = scrollState;
    Object.assign(document.body.style, { position: state.position, top: state.topStyle, left: state.left, right: state.right, width: state.width, overflow: state.overflow });
    scrollState = null;
    window.scrollTo(0, state.top);
  };
  function confirm({ title = '确认操作', message = '', confirmText = '确认', cancelText = '取消' } = {}) {
    if (activeDialog) activeDialog.close(false);
    return new Promise(resolve => {
      const dialog = document.createElement('div');
      dialog.className = 'app-dialog';
      dialog.innerHTML = '<section class="app-dialog-panel" role="dialog" aria-modal="true"><h2></h2><p></p><div class="app-dialog-actions"><button type="button" data-app-dialog-cancel></button><button type="button" class="primary" data-app-dialog-confirm></button></div></section>';
      dialog.querySelector('h2').textContent = title;
      dialog.querySelector('p').textContent = message;
      dialog.querySelector('[data-app-dialog-cancel]').textContent = cancelText;
      dialog.querySelector('[data-app-dialog-confirm]').textContent = confirmText;
      const onKeydown = event => { if (event.key === 'Escape') close(false); };
      const close = result => {
        if (!dialog.isConnected) return;
        document.removeEventListener('keydown', onKeydown);
        dialog.remove();
        activeDialog = null;
        unlockScroll();
        resolve(result);
      };
      activeDialog = { close };
      dialog.addEventListener('click', event => {
        if (event.target === dialog || event.target.closest('[data-app-dialog-cancel]')) close(false);
        if (event.target.closest('[data-app-dialog-confirm]')) close(true);
      });
      document.addEventListener('keydown', onKeydown);
      document.activeElement?.blur?.();
      lockScroll();
      document.body.append(dialog);
      dialog.querySelector('[data-app-dialog-cancel]')?.focus();
    });
  }
  window.AppDialog = { confirm };
})();

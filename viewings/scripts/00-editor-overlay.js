/* 独立编辑层：不依赖后续表单模块，保证新增和查看均能稳定进入专注编辑状态。 */
(() => {
  const editor = document.getElementById('editor');
  const overlay = document.getElementById('editorOverlay');
  const overlayScroll = document.getElementById('editorOverlayScroll');
  const overlayTitle = document.getElementById('editorOverlayTitle');
  const overlayContext = document.getElementById('editorOverlayContext');
  const community = document.getElementById('community');
  if (!editor || !overlay || !overlayScroll || !community) return;

  overlayScroll.append(editor);
  let scrollLockState = null;

  const updateHeading = title => {
    if (overlayTitle) {
      overlayTitle.textContent = title || document.getElementById('editorTitle')?.textContent || '编辑房源';
    }
    if (overlayContext) overlayContext.textContent = community.value.trim() || '未填写小区名称';
  };
  const lockPage = () => {
    if (document.body.classList.contains('editor-overlay-open')) return;
    // 不要将 body 设为 position:fixed。Android WebView 在解除固定定位后会偶发
    // 把页面跳到文档底部；覆盖层本身已占满视口，只需锁住根节点的溢出滚动。
    scrollLockState = {
      bodyOverflow: document.body.style.overflow,
      rootOverflow: document.documentElement.style.overflow
    };
    document.body.classList.add('editor-overlay-open');
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
  };
  const unlockPage = () => {
    if (!document.body.classList.contains('editor-overlay-open')) return;
    document.body.classList.remove('editor-overlay-open');
    document.body.style.overflow = scrollLockState?.bodyOverflow || '';
    document.documentElement.style.overflow = scrollLockState?.rootOverflow || '';
    scrollLockState = null;
  };
  const releaseList = recordId => {
    document.querySelectorAll('#records .record').forEach(record => {
      record.classList.remove('is-editing', 'is-muted');
    });
    document.getElementById('records')?.classList.remove('is-editing-active');
    if (!recordId) return;
    // 等覆盖层隐藏、列表重绘完成后再定位；避免 Android WebView 在同一帧内按照
    // 已失效的固定定位滚动上下文计算位置。
    setTimeout(() => requestAnimationFrame(() => requestAnimationFrame(() => {
      const record = [...document.querySelectorAll('#records .record')]
        .find(item => item.dataset.recordId === recordId);
      record?.scrollIntoView({ behavior: 'auto', block: 'start' });
    })), 0);
  };

  window.ViewingEditorOverlay = {
    open({ title } = {}) {
      lockPage();
      overlay.hidden = false;
      editor.classList.remove('hidden');
      overlayScroll.scrollTop = 0;
      updateHeading(title);
    },
    close() {
      const recordId = editor.dataset.returnRecordId;
      editor.classList.add('hidden');
      overlay.hidden = true;
      unlockPage();
      releaseList(recordId);
      delete editor.dataset.returnRecordId;
    },
    updateHeading,
    isOpen: () => !overlay.hidden
  };
})();

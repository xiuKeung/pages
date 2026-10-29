/* 列表按批追加；编辑时暂停，避免改变详情返回的位置。 */
(() => {
  const records = document.getElementById('records');
  if (!records) return;
  const more = document.createElement('div');
  more.className = 'records-more';
  more.setAttribute('role', 'status');
  more.setAttribute('aria-live', 'polite');
  const button = document.createElement('button');
  button.type = 'button';
  const end = document.createElement('span');
  end.textContent = '我是有底线的哦';
  more.append(button, end);
  records.after(more);
  let busy = false;
  const remaining = () => Math.max(0, Number(records.dataset.total || 0) - records.querySelectorAll('.record').length);
  const editing = () => !document.getElementById('editor').classList.contains('hidden');
  const update = () => {
    const left = remaining();
    more.hidden = !Number(records.dataset.total || 0);
    button.hidden = !left;
    end.hidden = !!left;
    button.disabled = busy;
    button.textContent = busy ? '正在加载…' : `加载更多（还有 ${left} 条）`;
    more.classList.toggle('is-loading', busy);
  };
  const load = () => {
    if (busy || editing() || !remaining()) return;
    busy = true;
    update();
    // 让加载提示先绘制，再追加下一批卡片。
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (!editing()) window.dispatchEvent(new Event('viewing:load-more'));
      busy = false;
      update();
    }));
  };
  button.addEventListener('click', load);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) load();
    }, { rootMargin: '0px 0px 240px 0px' }).observe(more);
  }
  window.addEventListener('viewing:list-rendered', update);
  new MutationObserver(update).observe(records, { childList: true });
  update();
})();

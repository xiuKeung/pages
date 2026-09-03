/* 模块 12：看房列表按需加载，避免记录较多时一次生成大量卡片。 */
(() => {
  const records = document.getElementById('records');
  if (!records) return;
  const more = document.createElement('div');
  more.className = 'records-more';
  const button = document.createElement('button');
  button.type = 'button';
  more.append(button);
  records.after(more);

  const update = () => {
    const total = Number(records.dataset.total || 0);
    const shown = records.querySelectorAll('.record').length;
    const remaining = Math.max(0, total - shown);
    more.hidden = remaining === 0;
    button.textContent = remaining ? `加载更多（还有 ${remaining} 条）` : '';
  };
  button.addEventListener('click', () => window.dispatchEvent(new Event('viewing:load-more')));
  new MutationObserver(update).observe(records, { childList:true });
  update();
})();

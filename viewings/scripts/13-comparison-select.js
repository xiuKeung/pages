/* 房源对比选择：支持多条，跳转到独立对比页。 */
(() => {
  const recordsNode = document.getElementById('records');
  const selectButton = document.getElementById('compareSelect');
  const openButton = document.getElementById('compareOpen');
  const toast = document.getElementById('toast');
  if (!recordsNode || !selectButton || !openButton) return;

  const selected = new Set();
  let selecting = false;
  const showToast = text => {
    toast.textContent = text;
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => { toast.textContent = ''; }, 2200);
  };
  const update = () => {
    selectButton.textContent = selecting ? '取消对比' : '对比房源';
    selectButton.classList.toggle('is-active', selecting);
    openButton.hidden = !selecting;
    openButton.disabled = selected.size < 2;
    openButton.setAttribute('aria-disabled', String(selected.size < 2));
    openButton.textContent = `查看对比（${selected.size}）`;
    recordsNode.classList.toggle('is-comparison-selecting', selecting);
    recordsNode.querySelectorAll('.record').forEach(card => {
      const id = card.querySelector('[data-edit]')?.dataset.edit;
      if (!id) return;
      const isSelected = selected.has(id);
      card.classList.toggle('is-comparison-selected', isSelected);
      let button = card.querySelector('[data-compare-choice]');
      if (!selecting) {
        button?.remove();
        return;
      }
      if (!button) {
        button = document.createElement('button');
        button.type = 'button';
        button.dataset.compareChoice = id;
        card.querySelector('.record-actions')?.prepend(button);
      }
      button.textContent = isSelected ? '已选入对比' : '选入对比';
      button.classList.toggle('primary', isSelected);
      button.setAttribute('aria-pressed', String(isSelected));
    });
  };
  selectButton.addEventListener('click', () => {
    selecting = !selecting;
    if (!selecting) selected.clear();
    update();
  });
  openButton.addEventListener('click', () => {
    if (selected.size < 2) return;
    window.location.href = `../comparison/index.html?ids=${encodeURIComponent([...selected].join(','))}`;
  });
  recordsNode.addEventListener('click', event => {
    const button = event.target.closest('[data-compare-choice]');
    if (!button) return;
    const id = button.dataset.compareChoice;
    if (selected.has(id)) selected.delete(id);
    else selected.add(id);
    update();
  });
  new MutationObserver(update).observe(recordsNode, { childList: true });
})();

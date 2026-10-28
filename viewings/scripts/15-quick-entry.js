/* 现场录入：常用字段、同小区新记录、快捷描述、手动罗盘。 */
(() => {
  const form = document.getElementById('recordForm');
  const orientation = document.getElementById('orientation');
  if (!form || !orientation) return;
  const notify = text => window.ViewingPlaceActions?.notify(text);
  const { dial, parseAngle } = window.ViewingCompass;

  // 移动实际表单字段，仍使用原有保存和恢复流程。
  const quick = document.createElement('section');
  quick.className = 'quick-entry wide';
  quick.innerHTML = '<h3>现场快速记录</h3><div class="quick-entry-grid"></div>';
  const fold = form.querySelector('.editor-fold');
  fold?.before(quick);
  const grid = quick.querySelector('div');
  ['primarySchools', 'middleSchools', 'building', 'totalFloor', 'area', 'layout',
    'builtYear', 'elevatorRatio', 'targetPrice', 'orientation'].forEach(id => {
    const label = document.getElementById(id)?.closest('label');
    if (label) { label.classList.remove('wide'); grid.append(label); }
  });
  const photos = document.getElementById('imagePicker')?.closest('label')?.parentElement;
  if (photos) quick.append(photos);
  form.querySelectorAll('.field-pair-row').forEach(row => { if (!row.children.length) row.remove(); });
  if (fold) {
    fold.open = true;
    fold.querySelector('summary').textContent = '更多房源与贷款信息';
    document.addEventListener('click', event => {
      if (event.target.closest('#add, [data-edit]')) fold.open = true;
    });
  }

  const another = document.createElement('button');
  another.type = 'button'; another.textContent = '同小区再记一套';
  form.querySelector('.form-actions')?.append(another);
  const startAnother = values => {
    document.getElementById('add').click();
    setTimeout(() => {
      ['community', 'propertyCompany', 'propertyFee', 'builtYear', 'parkingStatus', 'parkingFee', 'primarySchools', 'middleSchools'].forEach(key => {
        const input = form.elements.namedItem(key);
        if (input) input.value = values[key] || '';
      });
      window.ViewingEditorOverlay?.updateHeading();
      form.dispatchEvent(new Event('input', { bubbles: true }));
      notify('已带入小区公共信息，请填写这套房的信息');
    }, 0);
  };
  const recordsList = document.getElementById('records');
  const addListActions = () => {
    recordsList.querySelectorAll('[data-delete]').forEach(remove => {
      if (remove.parentElement.querySelector('[data-another]')) return;
      const button = document.createElement('button');
      button.type = 'button'; button.textContent = '再记一套';
      button.title = '同小区再记一套';
      button.dataset.another = remove.dataset.delete;
      const view = remove.parentElement.querySelector('[data-edit]');
      if (view) view.after(button);
      else remove.before(button);
    });
  };
  new MutationObserver(addListActions).observe(recordsList, { childList: true });
  addListActions();
  recordsList.addEventListener('click', event => {
    const button = event.target.closest('[data-another]');
    if (!button || button.disabled || !document.getElementById('editor').classList.contains('hidden')) return;
    const record = JSON.parse(window.NativeStore.viewingRecordsJson() || '[]')
      .find(item => String(item.id) === button.dataset.another);
    if (record) startAnother(record);
  });
  another.addEventListener('click', async () => {
    if (another.disabled) return;
    if (!document.getElementById('community').value.trim()) return notify('请先填写小区名称');
    const values = Object.fromEntries(new FormData(form));
    // 等待旧记录的保存完成，避免异步回调把旧 ID 写进新表单。
    another.disabled = true;
    let saved = false;
    try { saved = await window.ViewingAutosave.flush(); }
    finally { another.disabled = false; }
    if (!saved) return notify('保存未完成，请稍后重试');
    window.dispatchEvent(new Event('viewing:close-editor'));
    if (!document.getElementById('editor').classList.contains('hidden')) return;
    startAnother(values);
  });

  [['pros', ['采光好', '安静', '通风好', '户型方正', '视野开阔', '交通方便', '高赠送', '高得房率', '大阳台', '南北通透', '明厨明卫', '人车分流', '绿化好']],
   ['cons', ['临街噪音', '采光遮挡', '装修旧', '有渗水', '户型不规则', '停车困难', '西晒', '暗卫', '对视严重', '电梯等待久', '人车混行', '物业维护差']]].forEach(([id, tags]) => {
    const input = document.getElementById(id);
    const group = document.createElement('div'); group.className = 'quick-tags';
    tags.forEach(tag => {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = tag;
      button.addEventListener('click', () => {
        const parts = input.value.split(/[；;\n]/).map(s => s.trim()).filter(Boolean);
        if (!parts.includes(tag)) parts.push(tag);
        input.value = parts.join('；'); input.dispatchEvent(new Event('input', { bubbles: true }));
      }); group.append(button);
    });
    // 按钮放在 label 外，避免点击标题误触第一个快捷标签。
    const wrapper = document.createElement('div'); wrapper.className = 'wide';
    input.closest('label').before(wrapper); wrapper.append(input.closest('label'), group);
  });

  const preview = document.createElement('button'); preview.type = 'button'; preview.className = 'compass-preview';
  const orientationField = document.createElement('div');
  orientationField.className = 'quick-orientation-field';
  orientation.closest('label').before(orientationField);
  orientationField.append(orientation.closest('label'), preview);
  orientation.placeholder = '可填写，或点击罗盘选择';
  const refreshPreview = () => {
    const angle = parseAngle(orientation.value);
    preview.replaceChildren();
    if (angle !== null) {
      const thumbnail = document.createElement('span');
      thumbnail.className = 'compass-thumbnail';
      thumbnail.innerHTML = dial(angle);
      preview.append(thumbnail);
    }
    const caption = document.createElement('span');
    caption.textContent = angle === null ? '选择阳台朝向' : '点击调整朝向';
    preview.append(caption);
    preview.setAttribute('aria-label', angle === null ? '选择阳台朝向' : `调整朝向：${orientation.value}`);
  };
  orientation.addEventListener('input', refreshPreview);
  new MutationObserver(refreshPreview).observe(document.getElementById('editor'), { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('click', e => { if (e.target.closest('#add, [data-edit]')) setTimeout(refreshPreview, 0); });
  refreshPreview();

  preview.addEventListener('click', () => window.ViewingCompass.open(orientation));
})();

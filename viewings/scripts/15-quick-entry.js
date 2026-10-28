/* 现场录入：常用字段、同小区新记录、快捷描述、磁北罗盘。 */
(() => {
  const form = document.getElementById('recordForm');
  const orientation = document.getElementById('orientation');
  if (!form || !orientation) return;
  const notify = text => window.ViewingPlaceActions?.notify(text);
  const directions = ['北', '东北', '东', '东南', '南', '西南', '西', '西北'];
  const normalize = n => (n % 360 + 360) % 360;
  const direction = n => directions[Math.round(normalize(n) / 45) % 8];
  const dial = angle => `<svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="44" fill="none" stroke="currentColor" opacity=".3"/><text x="60" y="12" text-anchor="middle">北</text><text x="111" y="64" text-anchor="middle">东</text><text x="60" y="118" text-anchor="middle">南</text><text x="9" y="64" text-anchor="middle">西</text><g transform="rotate(${Number(angle) || 0} 60 60)"><path d="M60 23 L51 66 L60 61 L69 66 Z" fill="currentColor"/><path d="M60 97 L51 66 L60 61 L69 66 Z" fill="currentColor" opacity=".25"/></g><circle cx="60" cy="60" r="3" fill="currentColor"/></svg>`;
  const parseAngle = value => {
    const match = value.match(/(\d+(?:\.\d+)?)\s*°/);
    if (match) return normalize(Number(match[1]));
    const index = directions.indexOf(value.trim());
    return index < 0 ? null : index * 45;
  };

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
      remove.before(button);
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

  [['pros', ['采光好', '安静', '通风好', '户型方正', '视野开阔', '交通方便']],
   ['cons', ['临街噪音', '采光遮挡', '装修旧', '有渗水', '户型不规则', '停车困难']]].forEach(([id, tags]) => {
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
  orientation.placeholder = '可填写，或点击罗盘实测';
  const refreshPreview = () => {
    const angle = parseAngle(orientation.value);
    preview.innerHTML = dial(angle ?? 0) + '<span></span>';
    preview.querySelector('span').textContent = orientation.value || '测量阳台朝向';
  };
  orientation.addEventListener('input', refreshPreview);
  new MutationObserver(refreshPreview).observe(document.getElementById('editor'), { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('click', e => { if (e.target.closest('#add, [data-edit]')) setTimeout(refreshPreview, 0); });
  refreshPreview();

  preview.addEventListener('click', () => {
    const dialog = document.createElement('dialog'); dialog.className = 'compass-dialog';
    dialog.innerHTML = '<h2>阳台朝向</h2><p>手机平放，顶部朝向阳台外侧。实测以磁北为准，请远离磁性手机壳和金属物体。</p><div class="compass-dial"></div><strong class="compass-value"></strong><p class="compass-status" role="status">点击开始实测，也可手动选择方向</p><button type="button" data-start>开始实测</button><div class="quick-tags compass-directions"></div><label>手动调整角度<input type="range" min="0" max="359" step="1" aria-label="朝向角度"></label><div class="compass-actions"><button type="button" data-cancel>取消</button><button type="button" data-clear>清空</button><button type="button" class="primary" data-use disabled>使用当前方向</button></div>';
    document.body.append(dialog);
    const oldOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
    dialog.showModal();
    let angle = parseAngle(orientation.value), timer, timeout, session = 0, running = false, closed = false;
    const plugin = window.Capacitor?.isNativePlatform?.() ? window.Capacitor.Plugins.Compass : null;
    const status = dialog.querySelector('.compass-status');
    const range = dialog.querySelector('input');
    const use = dialog.querySelector('[data-use]');
    const draw = () => {
      dialog.querySelector('.compass-dial').innerHTML = dial(angle ?? 0);
      dialog.querySelector('.compass-value').textContent = angle == null ? '尚未选择' : `${direction(angle)} · ${Math.round(angle) % 360}°`;
      range.value = angle ?? 0; use.disabled = angle == null;
    };
    const stop = () => {
      running = false; ++session; clearTimeout(timer); clearTimeout(timeout);
      window.removeEventListener('deviceorientationabsolute', onOrientation);
      window.removeEventListener('deviceorientation', onOrientation);
      if (plugin) void plugin.stop().catch(() => {});
      dialog.querySelector('[data-start]').disabled = false;
    };
    const reading = (value, reliable) => {
      if (!running || !Number.isFinite(value)) return;
      clearTimeout(timeout); angle = normalize(value); draw();
      status.textContent = reliable ? '正在实测，方向稳定后点击使用' : '读数精度较低，请远离金属并校准后再确认';
    };
    function onOrientation(event) {
      if (Number.isFinite(event.webkitCompassHeading)) reading(event.webkitCompassHeading, event.webkitCompassAccuracy >= 0 && event.webkitCompassAccuracy <= 20);
      else if (event.absolute && Number.isFinite(event.alpha)) reading(360 - event.alpha, false);
    }
    const manual = value => { stop(); angle = normalize(value); status.textContent = '手动选择'; draw(); };
    directions.forEach((label, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = label;
      b.onclick = () => manual(i * 45); dialog.querySelector('.compass-directions').append(b);
    });
    range.oninput = () => manual(Number(range.value));
    dialog.querySelector('[data-start]').onclick = async () => {
      stop(); running = true; const token = session;
      dialog.querySelector('[data-start]').disabled = true;
      status.textContent = '正在等待罗盘读数…';
      timeout = setTimeout(() => { if (running) { stop(); status.textContent = '未收到有效方位，请重试或手动选择'; } }, 8000);
      try {
        if (plugin) {
          await plugin.start();
          if (closed || token !== session) { await plugin.stop(); return; }
          const poll = async () => {
            try { const result = await plugin.read(); if (token === session) reading(result.heading, result.reliable); }
            catch (_) { if (token === session) { stop(); status.textContent = '读取失败，请重试或手动选择'; } }
            if (running && token === session) timer = setTimeout(poll, 120);
          }; void poll();
        } else {
          if (!window.isSecureContext) throw new Error('浏览器实测需要 HTTPS，请使用 App 或手动选择');
          if (typeof DeviceOrientationEvent === 'undefined') throw new Error('此浏览器不支持罗盘，请手动选择');
          if (DeviceOrientationEvent.requestPermission && await DeviceOrientationEvent.requestPermission(true) !== 'granted') throw new Error('未获得方向传感器权限，请手动选择');
          if (closed || token !== session) return;
          window.addEventListener('deviceorientationabsolute', onOrientation);
          window.addEventListener('deviceorientation', onOrientation);
        }
      } catch (error) { if (token === session) { stop(); status.textContent = error.message || '无法测量，请手动选择'; } }
    };
    const onHidden = () => { if (document.hidden) { stop(); status.textContent = '测量已暂停，回来后可重新开始实测'; } };
    document.addEventListener('visibilitychange', onHidden);
    window.addEventListener('pagehide', stop);
    dialog.addEventListener('close', () => {
      closed = true; stop(); document.removeEventListener('visibilitychange', onHidden);
      window.removeEventListener('pagehide', stop);
      document.body.style.overflow = oldOverflow; dialog.remove();
    }, { once: true });
    dialog.querySelector('[data-cancel]').onclick = () => dialog.close();
    const save = value => { orientation.value = value; orientation.dispatchEvent(new Event('input', { bubbles: true })); dialog.close(); };
    dialog.querySelector('[data-clear]').onclick = () => save('');
    use.onclick = () => { if (angle != null) save(`${direction(angle)} · ${Math.round(angle) % 360}°`); };
    draw();
  });
})();

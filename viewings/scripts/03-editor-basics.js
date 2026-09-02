/* 模块 4：由原 index.html 内联脚本迁移。 */
(() => {
    const orientationLabel = document.getElementById('orientation')?.closest('label');
    if (orientationLabel?.firstChild?.nodeType === Node.TEXT_NODE) {
      orientationLabel.firstChild.nodeValue = '客厅朝向';
    }
    [
      ['pros', '优点（采光、楼层、户型、交通等）'],
      ['cons', '缺点 / 风险（噪音、学位、装修、产权等）'],
      ['notes', '个人备注（记录和家人讨论后的结论）']
    ].forEach(([id, title]) => {
      const input = document.getElementById(id);
      const label = input?.closest('label');
      if (label?.firstChild?.nodeType === Node.TEXT_NODE) label.firstChild.nodeValue = title;
      input?.removeAttribute('placeholder');
    });
    const totalFloorInput = document.getElementById('totalFloor');
    if (totalFloorInput?.tagName === 'INPUT') {
      const totalFloorSelect = document.createElement('select');
      totalFloorSelect.id = 'totalFloor';
      totalFloorSelect.name = 'totalFloor';
      totalFloorSelect.innerHTML = '<option value="">请选择</option>';
      for (let floor = 1; floor <= 40; floor += 1) {
        totalFloorSelect.add(new Option(`${floor}层`, floor));
      }
      totalFloorInput.replaceWith(totalFloorSelect);
    }
    const floorLabel = document.getElementById('floor')?.closest('label');
    const totalFloorLabel = document.getElementById('totalFloor')?.closest('label');
    if (!floorLabel || !totalFloorLabel || floorLabel.parentElement?.classList.contains('floor-row')) return;
    const row = document.createElement('div');
    row.className = 'floor-row';
    floorLabel.before(row);
    row.append(floorLabel, totalFloorLabel);
  })();

/* 模块 5：由原 index.html 内联脚本迁移。 */
(() => {
    const input = document.getElementById('community');
    const field = input?.closest('label');
    if (!input || !field) return;

    field.classList.add('community-field');
    input.removeAttribute('list');
    const panel = document.createElement('div');
    panel.className = 'community-suggestions';
    panel.hidden = true;
    field.append(panel);

    const officialNames = [...new Set(
      (globalThis.NanshanDistrictData?.schools || []).flatMap(school => school.homes || [])
    )].filter(Boolean);
    const normalize = value => String(value).replace(/[\s（）()]/g, '').toLowerCase();
    const names = () => [...new Set([
      ...officialNames,
      ...[...document.querySelectorAll('#communityHistory option')].map(option => option.value)
    ])];
    const hide = () => { panel.hidden = true; panel.replaceChildren(); };
    const show = () => {
      const query = normalize(input.value);
      if (!query) return hide();
      const matches = names()
        .filter(name => normalize(name).includes(query))
        .sort((a, b) => a.length - b.length || a.localeCompare(b, 'zh-CN'))
        .slice(0, 8);
      panel.replaceChildren(...matches.map(name => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'community-suggestion';
        button.textContent = name;
        button.addEventListener('pointerdown', event => {
          event.preventDefault();
          input.value = name;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          hide();
          input.focus();
        });
        return button;
      }));
      panel.hidden = matches.length === 0;
    };

    input.addEventListener('input', show);
    input.addEventListener('focus', show);
    input.addEventListener('blur', () => setTimeout(hide, 160));
  })();

/* 模块 6：由原 index.html 内联脚本迁移。 */
(() => {
    const community = document.getElementById('community');
    const form = document.getElementById('recordForm');
    const editor = document.getElementById('editor');
    if (!community || !form || !editor) return;
    const editorAnchor = document.createComment('看房记录编辑器原始位置');
    editor.before(editorAnchor);
    const restoreEditorPosition = () => {
      editorAnchor.after(editor);
      document.querySelectorAll('#records .record').forEach(record => {
        record.classList.remove('is-editing', 'is-muted');
      });
      document.getElementById('records')?.classList.remove('is-editing-active');
    };

    const communityLabel = community.closest('label');
    let previousField = communityLabel;
    const addSchoolField = (id, title) => {
      const label = document.createElement('label');
      label.className = 'auto-school-field';
      label.textContent = title;
      const input = document.createElement('input');
      input.id = id;
      input.name = id;
      input.placeholder = '未匹配';
      label.append(input);
      previousField.after(label);
      previousField = label;
      return input;
    };
    const primaryInput = addSchoolField('primarySchools', '小学（自动匹配，可修改）');
    const middleInput = addSchoolField('middleSchools', '中学（自动匹配，可修改）');
    const normalize = value => String(value || '').replace(/[\s（）()]/g, '').toLowerCase();
    const schools = globalThis.NanshanDistrictData?.schools || [];
    const homes = [...new Set(schools.flatMap(school => school.homes || []).filter(Boolean))];

    const relatedHomes = query => {
      const key = normalize(query);
      if (key.length < 2) return [];
      const related = new Set(homes.filter(home => normalize(home).includes(key)));
      let changed = true;
      while (changed) {
        changed = false;
        for (const home of homes) {
          const homeKey = normalize(home);
          if ([...related].some(item => {
            const itemKey = normalize(item);
            return itemKey.length >= 4 && homeKey.length >= 4
              && (itemKey.includes(homeKey) || homeKey.includes(itemKey));
          }) && !related.has(home)) {
            related.add(home);
            changed = true;
          }
        }
      }
      return [...related];
    };
    const schoolNames = query => {
      const keys = new Set(relatedHomes(query).map(normalize));
      const grouped = { '小学': new Set(), '初中': new Set() };
      schools.forEach(school => {
        if (!grouped[school.level]) return;
        if ((school.homes || []).some(home => keys.has(normalize(home)))) grouped[school.level].add(school.name);
      });
      return {
        primary: [...grouped['小学']],
        middle: [...grouped['初中']]
      };
    };
    const updateSchools = () => {
      const result = schoolNames(community.value);
      primaryInput.value = result.primary.join('、');
      middleInput.value = result.middle.join('、');
      primaryInput.title = primaryInput.value;
      middleInput.title = middleInput.value;
      return result;
    };
    const updateRecordCards = () => {
      document.querySelectorAll('#records .record').forEach(card => {
        const name = card.querySelector('h2')?.textContent;
        const block = card.querySelector('.schools');
        if (!name || !block) return;
        const result = schoolNames(name);
        block.textContent = [
          result.primary.length ? `小学：${result.primary.join('、')}` : '',
          result.middle.length ? `中学：${result.middle.join('、')}` : ''
        ].filter(Boolean).join('\n') || '学区：未匹配官方数据';
      });
    };

    community.addEventListener('input', updateSchools);
    const restoreSavedSchools = () => {
      const id = document.getElementById('recordId')?.value;
      const saved = JSON.parse(window.NativeStore.viewingRecordsJson() || '[]')
        .find(record => String(record.id) === String(id));
      if (!saved) return updateSchools();
      const matched = schoolNames(community.value);
      primaryInput.value = saved.primarySchools || matched.primary.join('、');
      middleInput.value = saved.middleSchools || matched.middle.join('、');
    };
    document.addEventListener('click', event => {
      if (event.target.closest('#add')) {
        setTimeout(() => {
          // 新增时编辑器仍回到列表前，但保留由下面编辑状态逻辑设置的灰显效果。
          editorAnchor.after(editor);
          primaryInput.value = '';
          middleInput.value = '';
        }, 0);
      }
      const editButton = event.target.closest('[data-edit]');
      if (editButton) {
        const record = editButton.closest('.record');
        setTimeout(() => {
          if (record) record.after(editor);
          restoreSavedSchools();
          editor.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 0);
      }
      if (event.target.closest('#cancel')) setTimeout(restoreEditorPosition, 0);
    });
    form.addEventListener('submit', () => setTimeout(restoreEditorPosition, 0));
    document.addEventListener('pointerdown', event => {
      if (event.target.closest('.community-suggestion')) setTimeout(updateSchools, 0);
    });
    new MutationObserver(updateRecordCards).observe(document.getElementById('records'), { childList: true });
    updateSchools();
    updateRecordCards();
  })();

/* 模块 7：由原 index.html 内联脚本迁移。 */
(() => {
    const form = document.getElementById('recordForm');
    const targetPrice = document.getElementById('targetPrice');
    if (!form || !targetPrice) return;
    const priorityLabel = document.getElementById('priority')?.closest('label');
    const viewedAtLabel = document.getElementById('viewedAt')?.closest('label');
    if (priorityLabel && viewedAtLabel) {
      viewedAtLabel.classList.add('priority-date-field');
      priorityLabel.after(viewedAtLabel);
    }

    let previousField = targetPrice.closest('label');
    const addInputField = (id, title, attributes = {}) => {
      const label = document.createElement('label');
      label.textContent = title;
      const input = document.createElement('input');
      input.id = id;
      input.name = id;
      Object.entries(attributes).forEach(([key, value]) => input.setAttribute(key, value));
      label.append(input);
      previousField.after(label);
      previousField = label;
      return input;
    };
    const downPaymentRate = addInputField('downPaymentRate', '首付比例（%）', {
      type: 'number', inputmode: 'decimal', min: '0', max: '100', step: '0.1', value: '20'
    });
    const commercialRate = addInputField('commercialRate', '商贷年利率（%）', {
      type: 'number', inputmode: 'decimal', min: '0', max: '30', step: '0.01', value: '3.05'
    });
    const loanInputRow = document.createElement('div');
    loanInputRow.className = 'loan-input-row';
    const targetPriceLabel = targetPrice.closest('label');
    targetPriceLabel.before(loanInputRow);
    loanInputRow.append(targetPriceLabel, downPaymentRate.closest('label'), commercialRate.closest('label'));
    previousField = loanInputRow;
    const loanYearsLabel = document.createElement('label');
    loanYearsLabel.textContent = '贷款年限';
    const loanYears = document.createElement('select');
    loanYears.id = 'loanYears';
    loanYears.name = 'loanYears';
    for (let year = 1; year <= 40; year += 1) loanYears.add(new Option(`${year}年`, year));
    loanYears.value = '30';
    loanYearsLabel.append(loanYears);
    loanInputRow.replaceChildren(
      targetPriceLabel,
      loanYearsLabel,
      downPaymentRate.closest('label'),
      commercialRate.closest('label')
    );
    previousField = loanInputRow;

    const preview = document.createElement('p');
    preview.className = 'loan-preview';
    previousField.after(preview);
    const format = value => new Intl.NumberFormat('zh-CN', {
      maximumFractionDigits: 0
    }).format(Math.round(value));
    const calculate = () => {
      const plan = window.calculateViewingLoan({
        targetPrice: targetPrice.value,
        downPaymentRate: downPaymentRate.value,
        commercialRate: commercialRate.value,
        loanYears: loanYears.value
      });
      if (!plan) {
        preview.textContent = '填写报价后，自动计算月供。';
        return;
      }
      preview.innerHTML = `预计首付 <strong>${format(plan.downPaymentAmount)} 元</strong>；预计贷款 <strong>${format(plan.loan)} 元</strong><br>等额本息：月供 <strong>${format(plan.equalPayment)} 元</strong><br>等额本金：首月月供 <strong>${format(plan.firstPrincipalPayment)} 元</strong>，末月约 ${format(plan.lastPrincipalPayment)} 元（逐月递减）`;
    };
    const setPlan = plan => {
      downPaymentRate.value = plan?.downPaymentRate || '20';
      commercialRate.value = plan?.commercialRate || '3.05';
      loanYears.value = plan?.loanYears || '30';
      calculate();
    };
    const currentRecord = () => {
      const id = document.getElementById('recordId')?.value;
      return JSON.parse(window.NativeStore.viewingRecordsJson() || '[]')
        .find(record => String(record.id) === String(id));
    };
    [targetPrice, downPaymentRate, commercialRate].forEach(input => input.addEventListener('input', calculate));
    loanYears.addEventListener('change', calculate);
    document.addEventListener('click', event => {
      if (event.target.closest('#add')) setTimeout(() => setPlan(), 0);
      if (event.target.closest('[data-edit]')) {
        setTimeout(() => setPlan(currentRecord()), 0);
      }
    });
    setPlan();
  })();

/* 模块 8：由原 index.html 内联脚本迁移。 */
(() => {
    const form = document.getElementById('recordForm');
    const editor = document.getElementById('editor');
    const status = document.createElement('p');
    const storageKey = 'shenzhen-viewing-records-v1';
    if (!form || !editor) return;
    status.className = 'autosave-status';
    status.setAttribute('aria-live', 'polite');
    form.querySelector('.form-actions')?.before(status);

    let timer;
    const formatTime = value => new Date(value).toLocaleTimeString('zh-CN', {
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    });
    const saveDraft = () => {
      clearTimeout(timer);
      if (editor.classList.contains('hidden')) return;
      const data = Object.fromEntries(new FormData(form));
      if (!String(data.community || '').trim()) {
        status.textContent = '填写小区名称后自动保存';
        return;
      }
      const now = Date.now();
      try {
        const records = JSON.parse(window.NativeStore.viewingRecordsJson() || '[]');
        if (!data.recordId) data.recordId = String(now);
        const index = records.findIndex(record => String(record.id) === String(data.recordId));
        const record = { ...data, id: data.recordId, updatedAt: now };
        delete record.recordId;
        record.createdAt = index >= 0
          ? (records[index].createdAt || records[index].updatedAt || now)
          : now;
        if (index >= 0) records[index] = record;
        else records.push(record);
        void window.NativeStore.saveViewingRecords(records);
        document.getElementById('recordId').value = record.id;
        status.textContent = `已自动保存 · ${formatTime(now)}`;
      } catch (_) {
        status.textContent = '自动保存失败，请使用“保存记录”';
      }
    };
    const scheduleSave = () => {
      if (editor.classList.contains('hidden')) return;
      status.textContent = '正在自动保存…';
      clearTimeout(timer);
      timer = setTimeout(saveDraft, 650);
    };

    form.addEventListener('input', scheduleSave);
    form.addEventListener('change', scheduleSave);
    window.addEventListener('pagehide', saveDraft);
    document.addEventListener('click', event => {
      if (event.target.closest('#add, [data-edit]')) {
        setTimeout(() => { status.textContent = '编辑内容将自动保存'; }, 0);
      }
    });
  })();

/* 模块 9：由原 index.html 内联脚本迁移。 */
(() => {
    const editor = document.getElementById('editor');
    const form = document.getElementById('recordForm');
    if (!editor || !form) return;
    const setValue = (id, value) => {
      const field = document.getElementById(id);
      if (field) field.value = value ?? '';
    };
    document.addEventListener('click', event => {
      if (event.target.closest('#add')) {
        const recordsNode = document.getElementById('records');
        recordsNode?.classList.add('is-editing-active');
        document.querySelectorAll('#records .record').forEach(card => {
          card.classList.remove('is-editing');
          card.classList.add('is-muted');
        });
        return;
      }
      const button = event.target.closest('[data-edit]');
      if (!button) return;
      event.preventDefault();
      event.stopImmediatePropagation();

      const records = JSON.parse(window.NativeStore.viewingRecordsJson() || '[]');
      const record = records.find(item => String(item.id) === String(button.dataset.edit));
      if (!record) return;
      [
        'recordId', 'community', 'priority', 'totalPrice', 'area', 'layout',
        'orientation', 'floor', 'totalFloor', 'builtYear', 'targetPrice',
        'viewedAt', 'building', 'sourceLink', 'pros', 'cons', 'notes',
        'downPaymentRate', 'commercialRate', 'loanYears'
      ].forEach(id => setValue(id, id === 'recordId' ? record.id : record[id]));

      editor.classList.remove('hidden');
      document.getElementById('editorTitle').textContent = '编辑房源';
      document.getElementById('community')?.dispatchEvent(new Event('input', { bubbles: true }));
      const suggestionPanel = document.querySelector('.community-suggestions');
      if (suggestionPanel) {
        suggestionPanel.hidden = true;
        suggestionPanel.replaceChildren();
      }
      if (record.primarySchools) setValue('primarySchools', record.primarySchools);
      if (record.middleSchools) setValue('middleSchools', record.middleSchools);
      document.getElementById('targetPrice')?.dispatchEvent(new Event('input', { bubbles: true }));
      const recordCard = button.closest('.record');
      document.getElementById('records')?.classList.add('is-editing-active');
      document.querySelectorAll('#records .record').forEach(card => {
        card.classList.toggle('is-editing', card === recordCard);
        card.classList.toggle('is-muted', card !== recordCard);
      });
      recordCard?.after(editor);
      editor.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, true);
  })();

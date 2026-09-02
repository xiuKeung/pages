/* 模块 13：由原 index.html 内联脚本迁移。 */
(() => {
    const select = document.getElementById('builtYear');
    if (!select) return;
    const selected = select.value;
    const latestYear = new Date().getFullYear() + 10;
    select.replaceChildren(new Option('不详', ''));
    for (let year = latestYear; year >= 1950; year -= 1) {
      select.add(new Option(`${year}年`, year));
    }
    select.value = selected;
  })();

/* 模块 14：由原 index.html 内联脚本迁移。 */
(() => {
    const viewedAt = document.getElementById('viewedAt');
    if (!viewedAt || document.getElementById('building')) return;
    const label = document.createElement('label');
    label.className = 'building-field';
    label.textContent = '楼栋 / 单元';
    const input = document.createElement('input');
    input.id = 'building';
    input.name = 'building';
    input.type = 'text';
    input.placeholder = '如：1栋10A';
    label.append(input);
    viewedAt.closest('label')?.after(label);

    const today = () => {
      const date = new Date();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${date.getFullYear()}-${month}-${day}`;
    };
    document.addEventListener('click', event => {
      if (event.target.closest('#add')) {
        setTimeout(() => {
          viewedAt.value = today();
          input.value = '';
        }, 0);
      }
    });
  })();

/* 模块 15：由原 index.html 内联脚本迁移。 */
(() => {
    const currentPriceLabel = document.getElementById('totalPrice')?.closest('label');
    const targetPriceLabel = document.getElementById('targetPrice')?.closest('label');
    const buildingLabel = document.getElementById('building')?.closest('label');
    const floorRow = document.querySelector('.floor-row');
    if (currentPriceLabel) currentPriceLabel.hidden = true;
    if (targetPriceLabel?.firstChild?.nodeType === Node.TEXT_NODE) {
      targetPriceLabel.firstChild.nodeValue = '报价（万元）';
    }
    const floorLabel = document.getElementById('floor')?.closest('label');
    const totalFloorLabel = document.getElementById('totalFloor')?.closest('label');
    if (buildingLabel && totalFloorLabel) {
      const buildingTotalRow = document.createElement('div');
      buildingTotalRow.className = 'building-total-row';
      buildingLabel.before(buildingTotalRow);
      buildingTotalRow.append(buildingLabel, totalFloorLabel);
    }
    if (floorLabel) floorLabel.hidden = true;
    if (floorRow) floorRow.hidden = true;
  })();

/* 模块 16：由原 index.html 内联脚本迁移。 */
(() => {
    const editor = document.getElementById('editor');
    const community = document.getElementById('community');
    const cancel = document.getElementById('cancel');
    if (!editor || !community || !cancel) return;
    const updateCancel = () => {
      cancel.classList.toggle('is-visible', !editor.classList.contains('hidden') && !community.value.trim());
    };
    community.addEventListener('input', updateCancel);
    new MutationObserver(updateCancel).observe(editor, {
      attributes: true,
      attributeFilter: ['class']
    });
    document.addEventListener('click', () => setTimeout(updateCancel, 0));
    updateCancel();
  })();

/* 模块 17：由原 index.html 内联脚本迁移。 */
(() => {
    const form = document.getElementById('recordForm');
    const retireField = id => {
      const field = document.getElementById(id);
      const label = field?.closest('label');
      if (!field || !form) return;
      field.removeAttribute('name');
      field.hidden = true;
      field.setAttribute('aria-hidden', 'true');
      form.append(field);
      label?.remove();
    };
    retireField('totalPrice');
    retireField('floor');
    document.getElementById('unitPrice')?.remove();
  })();

/* 模块 18：由原 index.html 内联脚本迁移。 */
(() => {
    const areaLabel = document.getElementById('area')?.closest('label');
    const layoutLabel = document.getElementById('layout')?.closest('label');
    const viewedAtLabel = document.getElementById('viewedAt')?.closest('label');
    const builtYearLabel = document.getElementById('builtYear')?.closest('label');
    if (areaLabel && layoutLabel) {
      const row = document.createElement('div');
      row.className = 'area-layout-row';
      areaLabel.before(row);
      row.append(areaLabel, layoutLabel);
    }
    if (viewedAtLabel && builtYearLabel) {
      builtYearLabel.classList.add('viewed-year-field');
      viewedAtLabel.after(builtYearLabel);
    }
  })();

/* 模块 19：由原 index.html 内联脚本迁移。 */
(() => {
    const viewedAtLabel = document.getElementById('viewedAt')?.closest('label');
    const priorityLabel = document.getElementById('priority')?.closest('label');
    const builtYearLabel = document.getElementById('builtYear')?.closest('label');
    if (!viewedAtLabel || !priorityLabel) return;
    const row = document.createElement('div');
    row.className = 'date-priority-row';
    priorityLabel.before(row);
    row.append(viewedAtLabel, priorityLabel);
    if (builtYearLabel) row.after(builtYearLabel);
  })();

/* 模块 20：由原 index.html 内联脚本迁移。 */
(() => {
    const form = document.getElementById('recordForm');
    const labelFor = id => document.getElementById(id)?.closest('label');
    const builtYear = labelFor('builtYear');
    const building = labelFor('building');
    const totalFloor = labelFor('totalFloor');
    const area = labelFor('area');
    const layout = labelFor('layout');
    const orientation = labelFor('orientation');
    if (!form || !builtYear || !building || !totalFloor || !area || !layout || !orientation) return;

    const makeRow = (...labels) => {
      const row = document.createElement('div');
      row.className = 'field-pair-row';
      labels.forEach(label => row.append(label));
      return row;
    };
    const firstRow = makeRow(builtYear, building);
    const secondRow = makeRow(totalFloor, area);
    const thirdRow = makeRow(layout, orientation);
    form.querySelector('.date-priority-row')?.after(firstRow);
    firstRow.after(secondRow);
    secondRow.after(thirdRow);
    document.querySelectorAll('.building-total-row, .area-layout-row').forEach(row => {
      if (!row.children.length) row.remove();
    });
  })();

/* 模块 21：由原 index.html 内联脚本迁移。 */
(() => {
    const sourceLink = document.getElementById('sourceLink');
    if (!sourceLink) return;
    sourceLink.type = 'text';
    sourceLink.placeholder = '可选：网址或小程序口令';
  })();

/* 模块 22：由原 index.html 内联脚本迁移。 */
(() => {
    const form = document.getElementById('recordForm');
    const dateRow = form?.querySelector('.date-priority-row');
    if (!form || !dateRow || document.getElementById('propertyCompany')) return;
    const createField = (labelText, id, placeholder) => {
      const label = document.createElement('label');
      label.textContent = labelText;
      const input = document.createElement('input');
      input.id = id;
      input.name = id;
      input.type = 'text';
      input.placeholder = placeholder;
      label.append(input);
      return label;
    };
    const row = document.createElement('div');
    row.className = 'field-pair-row property-row';
    row.append(
      createField('物业公司', 'propertyCompany', '如：万科物业'),
      createField('物业费（元/㎡·月）', 'propertyFee', '如：3.8')
    );
    dateRow.after(row);

    const company = document.getElementById('propertyCompany');
    const fee = document.getElementById('propertyFee');
    const restore = () => {
      const id = document.getElementById('recordId')?.value;
      if (!id) return;
      const record = JSON.parse(window.NativeStore.viewingRecordsJson() || '[]')
        .find(item => String(item.id) === String(id));
      company.value = record?.propertyCompany || '';
      fee.value = record?.propertyFee || '';
    };
    new MutationObserver(() => {
      if (!document.getElementById('editor')?.classList.contains('hidden')) restore();
    }).observe(document.getElementById('editor'), { attributes: true, attributeFilter: ['class'] });
    document.addEventListener('click', event => {
      if (event.target.closest('#add')) {
        setTimeout(() => { company.value = ''; fee.value = ''; }, 0);
      }
    }, true);
  })();

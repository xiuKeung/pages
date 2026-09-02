/* 模块 25：由原 index.html 内联脚本迁移。 */
(() => {
    const form = document.getElementById('recordForm');
    const dateRow = form?.querySelector('.date-priority-row');
    const propertyRow = form?.querySelector('.property-row');
    const loanRow = form?.querySelector('.loan-input-row');
    const preview = form?.querySelector('.loan-preview');
    if (!form || !dateRow || !propertyRow || !loanRow || !preview || form.querySelector('.editor-fold')) return;

    const section = document.createElement('details');
    section.className = 'editor-fold';
    section.open = true;
    const summary = document.createElement('summary');
    summary.textContent = '看房与贷款信息';
    const content = document.createElement('div');
    content.className = 'editor-fold-content';
    section.append(summary, content);
    dateRow.before(section);

    const fieldRows = [...form.querySelectorAll('.field-pair-row')]
      .filter(row => row !== propertyRow);
    [dateRow, propertyRow, ...fieldRows, loanRow, preview].forEach(item => content.append(item));
  })();

/* 模块 26：由原 index.html 内联脚本迁移。 */
(() => {
    const form = document.getElementById('recordForm');
    const layoutRow = document.getElementById('layout')?.closest('.field-pair-row');
    const builtYearRow = document.getElementById('builtYear')?.closest('.field-pair-row');
    const builtYearLabel = document.getElementById('builtYear')?.closest('label');
    const buildingLabel = document.getElementById('building')?.closest('label');
    const notesLabel = document.getElementById('notes')?.closest('label');
    if (!form || !layoutRow || !builtYearRow || !builtYearLabel || !buildingLabel || !notesLabel || document.getElementById('elevatorRatio')) return;

    const createField = (title, id, placeholder, className = '') => {
      const label = document.createElement('label');
      label.className = className;
      label.textContent = title;
      const input = document.createElement('input');
      input.id = id;
      input.name = id;
      input.type = 'text';
      input.placeholder = placeholder;
      label.append(input);
      return label;
    };
    const createElevatorRatioField = () => {
      const label = document.createElement('label');
      label.textContent = '梯户比';
      const select = document.createElement('select');
      select.id = 'elevatorRatio';
      select.name = 'elevatorRatio';
      ['1梯1户', '1梯2户', '1梯3户', '2梯2户', '2梯3户', '2梯4户', '2梯5户', '2梯6户',
        '3梯4户', '3梯6户', '3梯8户', '4梯6户', '4梯8户', '4梯10户', '4梯12户',
        '6梯12户'].forEach(value => select.add(new Option(value, value)));
      select.prepend(new Option('请选择', ''));
      select.add(new Option('其他（手动填写）', '其他'));
      const custom = document.createElement('input');
      custom.id = 'elevatorRatioCustom';
      custom.type = 'text';
      custom.placeholder = '如：5梯9户';
      custom.hidden = true;
      const setMode = isCustom => {
        select.name = isCustom ? '' : 'elevatorRatio';
        custom.name = isCustom ? 'elevatorRatio' : '';
        custom.hidden = !isCustom;
      };
      select.addEventListener('change', () => setMode(select.value === '其他'));
      label.append(select, custom);
      return label;
    };
    const parkingStatus = createField('车位情况', 'parkingStatus', '如：固定车位 / 无车位');
    const parkingFee = createField('车位费用', 'parkingFee', '如：600 元/月');
    const buildingParkingRow = document.createElement('div');
    buildingParkingRow.className = 'field-pair-row parking-row';
    buildingLabel.classList.remove('building-field');
    buildingParkingRow.append(buildingLabel, parkingFee);
    builtYearRow.replaceChildren(builtYearLabel, parkingStatus);
    builtYearRow.after(buildingParkingRow);

    const elevatorRow = document.createElement('div');
    elevatorRow.className = 'field-pair-row elevator-row';
    elevatorRow.append(createElevatorRatioField());
    layoutRow.after(elevatorRow);

    const landmark = document.createElement('label');
    landmark.className = 'wide';
    landmark.textContent = '附近地标';
    const landmarkInput = document.createElement('textarea');
    landmarkInput.id = 'nearbyLandmark';
    landmarkInput.name = 'nearbyLandmark';
    landmark.append(landmarkInput);
    notesLabel.before(landmark);

    const fields = ['parkingStatus', 'parkingFee', 'nearbyLandmark'];
    const restore = () => {
      const id = document.getElementById('recordId')?.value;
      if (!id) return;
      const record = JSON.parse(window.NativeStore.viewingRecordsJson() || '[]')
        .find(item => String(item.id) === String(id));
      const ratio = record?.elevatorRatio || '';
      const ratioSelect = document.getElementById('elevatorRatio');
      const ratioCustom = document.getElementById('elevatorRatioCustom');
      const isPreset = [...ratioSelect.options].some(option => option.value === ratio);
      ratioSelect.value = isPreset ? ratio : ratio ? '其他' : '';
      ratioSelect.name = ratio && !isPreset ? '' : 'elevatorRatio';
      ratioCustom.name = ratio && !isPreset ? 'elevatorRatio' : '';
      ratioCustom.hidden = !ratio || isPreset;
      ratioCustom.value = ratio && !isPreset ? ratio : '';
      fields.forEach(field => {
        const input = document.getElementById(field);
        const value = record?.[field] || '';
        input.value = value;
      });
    };
    new MutationObserver(() => {
      if (!document.getElementById('editor')?.classList.contains('hidden')) restore();
    }).observe(document.getElementById('editor'), { attributes: true, attributeFilter: ['class'] });
    document.addEventListener('click', event => {
      if (event.target.closest('#add')) {
        setTimeout(() => {
          const ratioSelect = document.getElementById('elevatorRatio');
          const ratioCustom = document.getElementById('elevatorRatioCustom');
          ratioSelect.value = '';
          ratioSelect.name = 'elevatorRatio';
          ratioCustom.value = '';
          ratioCustom.name = '';
          ratioCustom.hidden = true;
          fields.forEach(field => { document.getElementById(field).value = ''; });
        }, 0);
      }
    }, true);
  })();

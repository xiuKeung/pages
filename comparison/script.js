(() => {
  const root = document.getElementById('comparison');
  const onlyDifferences = document.getElementById('onlyDifferences');
  const count = document.getElementById('compareCount');
  const landscapeButton = document.getElementById('landscapeToggle');
  const orientationHint = document.getElementById('orientationHint');
  const format = value => Number(value || 0).toLocaleString('zh-CN', { maximumFractionDigits:2 });
  const text = value => String(value || '').trim() || '—';
  const priority = value => value === 'focus' ? '重点关注' : value === 'excluded' ? '已排除' : '普通';
  const monthly = record => window.calculateViewingLoan?.({ targetPrice:record.targetPrice, downPaymentRate:record.downPaymentRate || 30, commercialRate:record.commercialRate || 3.05, loanYears:record.loanYears || 30 });
  const rows = [
    ['基本信息', [
      ['小区', r => r.community], ['楼栋 / 单元', r => r.building], ['看房日期', r => r.viewedAt], ['关注等级', r => priority(r.priority)], ['房源链接', r => r.sourceLink]
    ]],
    ['房屋信息', [
      ['报价', r => r.targetPrice && `${format(r.targetPrice)} 万`], ['面积', r => r.area && `${format(r.area)} ㎡`], ['单价', r => r.targetPrice && r.area && `${format(Number(r.targetPrice) / Number(r.area))} 万/㎡`], ['户型', r => r.layout], ['客厅朝向', r => r.orientation], ['总楼层', r => r.totalFloor && `${r.totalFloor} 层`], ['建成年份', r => r.builtYear && `${r.builtYear} 年`], ['梯户比', r => r.elevatorRatio]
    ]],
    ['配套与成本', [
      ['物业公司', r => r.propertyCompany], ['物业费', r => r.propertyFee && `${r.propertyFee} 元/㎡·月`], ['车位情况', r => r.parkingStatus], ['车位费用', r => r.parkingFee], ['附近地标', r => r.nearbyLandmark]
    ]],
    ['学区与贷款', [
      ['小学', r => r.primarySchools], ['中学', r => r.middleSchools], ['首付比例', r => r.downPaymentRate && `${r.downPaymentRate}%`], ['贷款年限', r => r.loanYears && `${r.loanYears} 年`], ['商贷年利率', r => r.commercialRate && `${r.commercialRate}%`], ['等额本息月供', r => { const plan = monthly(r); return plan && `${format(Math.round(plan.equalPayment))} 元`; }], ['等额本金首月月供', r => { const plan = monthly(r); return plan && `${format(Math.round(plan.firstPrincipalPayment))} 元`; }]
    ]],
    ['主观记录', [
      ['优点', r => r.pros], ['缺点 / 风险', r => r.cons], ['个人备注', r => r.notes], ['图片数量', r => { try { return `${JSON.parse(r.imageRefs || '[]').length} 张`; } catch (_) { return '0 张'; } }]
    ]]
  ];
  let records = [];
  const selectedIds = new URLSearchParams(location.search).get('ids')?.split(',').filter(Boolean) || [];
  const same = values => new Set(values.map(value => text(value))).size <= 1;
  const render = () => {
    if (records.length < 2) {
      root.innerHTML = '<div class="empty">请从看房记录中选择至少 2 条房源进行对比。</div>';
      count.textContent = records.length ? '已选择 1 条' : '未选择记录';
      return;
    }
    count.textContent = `已对比 ${records.length} 条`;
    root.replaceChildren(...rows.map(([title, items]) => {
      const visible = onlyDifferences.checked ? items.filter(([, get]) => !same(records.map(get))) : items;
      if (!visible.length) return null;
      const section = document.createElement('section');
      section.className = 'comparison-group';
      const heading = document.createElement('h2'); heading.textContent = title;
      const wrap = document.createElement('div'); wrap.className = 'table-wrap';
      const table = document.createElement('table');
      const thead = document.createElement('thead');
      const header = document.createElement('tr');
      const labelHeader = document.createElement('th');
      labelHeader.scope = 'col';
      labelHeader.textContent = '项目';
      header.append(labelHeader);
      records.forEach(record => {
        const th = document.createElement('th');
        th.scope = 'col';
        th.append(document.createTextNode(text(record.community)));
        if (record.building) {
          const building = document.createElement('small');
          building.textContent = text(record.building);
          th.append(document.createElement('br'), building);
        }
        header.append(th);
      });
      thead.append(header);
      const tbody = document.createElement('tbody');
      visible.forEach(([label, get]) => {
        const values = records.map(get);
        const different = !same(values);
        const tr = document.createElement('tr');
        const th = document.createElement('th'); th.scope = 'row'; th.textContent = label; tr.append(th);
        values.forEach(value => { const td = document.createElement('td'); td.textContent = text(value); td.classList.toggle('is-different', different); tr.append(td); });
        tbody.append(tr);
      });
      table.append(thead, tbody); wrap.append(table); section.append(heading, wrap); return section;
    }).filter(Boolean));
  };
  const toggleLandscape = async () => {
    const enabled = document.body.classList.toggle('manual-landscape');
    landscapeButton.textContent = enabled ? '退出横屏' : '横屏查看';
    orientationHint.hidden = !enabled;
    try {
      if (enabled) await screen.orientation?.lock?.('landscape');
      else screen.orientation?.unlock?.();
    } catch (_) {
      // 浏览器和 iOS 通常不允许脚本锁定方向；用户仍可手动横置查看。
    }
  };
  onlyDifferences.addEventListener('change', render);
  landscapeButton.addEventListener('click', () => { void toggleLandscape(); });
  document.querySelector('[data-back]')?.addEventListener('click', event => { if (history.length > 1) { event.preventDefault(); history.back(); } });
  (async () => {
    const all = await window.NativeStore.getViewingRecords({ force:true });
    records = selectedIds.map(id => all.find(record => String(record.id) === id)).filter(Boolean).slice(0, 4);
    render();
  })().catch(() => { root.innerHTML = '<div class="empty">读取看房记录失败，请返回后重试。</div>'; });
})();

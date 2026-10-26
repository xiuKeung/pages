(() => {
  const root = document.getElementById('comparison');
  const onlyDifferences = document.getElementById('onlyDifferences');
  const count = document.getElementById('compareCount');
  const landscapeButton = document.getElementById('landscapeToggle');
  const orientationHint = document.getElementById('orientationHint');
  const stickyHeader = document.createElement('div');
  stickyHeader.className = 'comparison-sticky-header';
  stickyHeader.hidden = true;
  document.body.append(stickyHeader);
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
      syncStickyHeader();
      return;
    }
    count.textContent = `已对比 ${records.length} 条`;
    let addedHeader = false;
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
      if (!addedHeader) {
        table.append(thead);
        addedHeader = true;
      }
      table.append(tbody); wrap.append(table); section.append(heading, wrap); return section;
    }).filter(Boolean));
    syncStickyHeader();
  };
  const syncStickyHeader = () => {
    const sourceTable = root.querySelector('.comparison-group table');
    const sourceHeader = sourceTable?.tHead;
    if (!sourceHeader) {
      stickyHeader.hidden = true;
      return;
    }
    // 先显式布局，才能读取含安全区的固定位置。
    stickyHeader.hidden = false;
    stickyHeader.style.visibility = 'hidden';
    const top = stickyHeader.getBoundingClientRect().top;
    const pageBounds = root.getBoundingClientRect();
    const headerBounds = sourceHeader.getBoundingClientRect();
    if (headerBounds.bottom > top || pageBounds.bottom <= top + headerBounds.height) {
      stickyHeader.hidden = true;
      return;
    }
    const wrap = sourceTable.closest('.table-wrap');
    const wrapRect = wrap.getBoundingClientRect();
    const clone = document.createElement('table');
    clone.style.width = `${sourceTable.getBoundingClientRect().width}px`;
    clone.style.minWidth = `${sourceTable.getBoundingClientRect().width}px`;
    clone.append(sourceHeader.cloneNode(true));
    stickyHeader.replaceChildren(clone);
    stickyHeader.style.left = `${wrapRect.left}px`;
    stickyHeader.style.width = `${wrapRect.width}px`;
    stickyHeader.style.setProperty('--comparison-scroll-x', `${-wrap.scrollLeft}px`);
    stickyHeader.style.visibility = '';
  };
  const setNativeOrientation = async orientation => {
    const nativeBridge = window.Capacitor?.Plugins?.OrientationBridge;
    try {
      if (nativeBridge?.setOrientation) {
        await nativeBridge.setOrientation({ orientation });
        return true;
      }
      if (orientation === 'landscape' && screen.orientation?.lock) {
        await screen.orientation.lock('landscape');
        return true;
      }
      if (orientation === 'portrait' && screen.orientation?.unlock) {
        screen.orientation.unlock();
        return true;
      }
      return false;
    } catch (_) {
      return false;
    }
  };
  const toggleLandscape = async () => {
    const enabled = document.body.classList.toggle('manual-landscape');
    landscapeButton.textContent = enabled ? '退出横屏' : '横屏查看';
    const rotated = await setNativeOrientation(enabled ? 'landscape' : 'portrait');
    orientationHint.hidden = !enabled || rotated;
    if (enabled && !rotated) orientationHint.textContent = '当前浏览器不允许页面主动旋转，请手动横置手机查看';
  };
  onlyDifferences.addEventListener('change', render);
  landscapeButton.addEventListener('click', () => { void toggleLandscape(); });
  window.addEventListener('scroll', syncStickyHeader, { passive:true });
  window.addEventListener('resize', syncStickyHeader);
  root.addEventListener('scroll', syncStickyHeader, true);
  document.querySelector('[data-back]')?.addEventListener('click', event => { if (history.length > 1) { event.preventDefault(); history.back(); } });
  (async () => {
    const all = await window.NativeStore.getViewingRecords({ force:true });
    records = selectedIds.map(id => all.find(record => String(record.id) === id)).filter(Boolean);
    render();
  })().catch(() => { root.innerHTML = '<div class="empty">读取看房记录失败，请返回后重试。</div>'; });
  window.addEventListener('pagehide', () => { void setNativeOrientation('portrait'); });
})();

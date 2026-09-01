/* 模块 23：由原 index.html 内联脚本迁移。 */
(() => {
    const form = document.getElementById('recordForm');
    const copy = async text => {
      try {
        await navigator.clipboard.writeText(text);
      } catch (_) {
        const area = document.createElement('textarea');
        area.value = text;
        area.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
        document.body.append(area);
        area.select();
        document.execCommand('copy');
        area.remove();
      }
    };
    document.addEventListener('click', async event => {
      if (!event.target.closest('#copyRecord') || !form) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const data = Object.fromEntries(new FormData(form));
      const plan = window.calculateViewingLoan?.({
        targetPrice: data.targetPrice,
        downPaymentRate: data.downPaymentRate || 20,
        commercialRate: data.commercialRate || 3.05,
        loanYears: data.loanYears || 30
      });
      const currency = value => Math.round(value).toLocaleString('zh-CN') + ' 元';
      const rows = [
        ['小区', data.community],
        ['小学', data.primarySchools],
        ['中学', data.middleSchools],
        ['看房日期', data.viewedAt],
        ['关注等级', data.priority === 'focus' ? '重点关注' : data.priority === 'excluded' ? '已排除' : '普通'],
        ['物业公司', data.propertyCompany],
        ['物业费', data.propertyFee && data.propertyFee + ' 元/㎡·月'],
        ['建成年份', data.builtYear && data.builtYear + ' 年'],
        ['车位情况', data.parkingStatus],
        ['楼栋 / 单元', data.building],
        ['车位费用', data.parkingFee],
        ['总楼层', data.totalFloor && '总' + data.totalFloor + '层'],
        ['面积', data.area && data.area + ' ㎡'],
        ['户型', data.layout],
        ['客厅朝向', data.orientation],
        ['梯户比', data.elevatorRatio],
        ['报价', data.targetPrice && data.targetPrice + ' 万元'],
        ['贷款年限', data.loanYears && data.loanYears + ' 年'],
        ['首付比例', data.downPaymentRate && data.downPaymentRate + '%'],
        ['商贷年利率', data.commercialRate && data.commercialRate + '%'],
        ['等额本息月供', plan && currency(plan.equalPayment)],
        ['等额本金首月月供', plan && currency(plan.firstPrincipalPayment)],
        ['房源链接', data.sourceLink],
        ['优点', data.pros],
        ['缺点 / 风险', data.cons],
        ['附近地标', data.nearbyLandmark],
        ['个人备注', data.notes]
      ].filter(([, value]) => value).map(([label, value]) => label + '：' + value);
      await copy(rows.join('\n'));
      const toast = document.getElementById('toast');
      if (toast) toast.textContent = '当前编辑信息已复制。';
    }, true);
  })();

/* 模块 24：由原 index.html 内联脚本迁移。 */
(() => {
    const recordsNode = document.getElementById('records');
    if (!recordsNode) return;
    const updateIndices = () => {
      let records = [];
      try { records = JSON.parse(window.NativeStore.viewingRecordsJson() || '[]'); }
      catch (_) { return; }
      const ids = new Map(
        records.slice().sort((a, b) => {
          const timeOf = record => Number(record.createdAt || record.updatedAt || 0);
          return timeOf(a) - timeOf(b);
        }).map((record, index) => [String(record.id), index + 1])
      );
      recordsNode.querySelectorAll('.record').forEach(card => {
        const id = card.querySelector('[data-edit]')?.dataset.edit;
        const title = card.querySelector('.record-top h2');
        if (!id || !title) return;
        let badge = [...title.children].find(node => node.classList.contains('record-index'));
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'record-index';
          title.prepend(badge);
        }
        badge.textContent = '记录 ' + String(ids.get(String(id)) || '');
      });
    };
    new MutationObserver(updateIndices).observe(recordsNode, { childList: true });
    updateIndices();
  })();

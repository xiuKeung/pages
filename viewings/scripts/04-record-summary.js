/* 模块 10：由原 index.html 内联脚本迁移。 */
(() => {
    const recordsNode = document.getElementById('records');
    if (!recordsNode) return;
    const format = value => Number(value || 0).toLocaleString('zh-CN', {
      maximumFractionDigits: 2
    });
    const collapse = (card, selector, title) => {
      const content = card.querySelector(selector);
      if (!content || content.closest('details')) return;
      const details = document.createElement('details');
      details.className = 'record-extra';
      const summary = document.createElement('summary');
      summary.textContent = title;
      content.before(details);
      details.append(summary, content);
    };
    const updateCards = () => {
      const records = JSON.parse(window.NativeStore.viewingRecordsJson() || '[]');
      recordsNode.querySelectorAll('.record').forEach(card => {
        const id = card.querySelector('[data-edit]')?.dataset.edit;
        const record = records.find(item => String(item.id) === String(id));
        if (!record) return;
        const buildingFloor = [
          record.building,
          record.totalFloor ? `${record.totalFloor}层` : ''
        ].filter(Boolean).join(' / ');
        const unit = record.targetPrice && record.area
          ? `${format(Number(record.targetPrice) / Number(record.area))} 万/㎡`
          : '';
        const detail = [
          record.area && `${format(record.area)}㎡`, record.layout, record.orientation, buildingFloor,
          record.targetPrice && `报价 ${format(record.targetPrice)}万`, unit
        ].filter(Boolean);
        const meta = card.querySelector('.record-top .meta');
        if (meta) {
          meta.classList.add('summary-meta');
          meta.replaceChildren(...(detail.length ? detail : ['暂未填写报价']).map(part => {
            const span = document.createElement('span');
            span.className = 'summary-part';
            span.textContent = part;
            return span;
          }));
        }
        const editedMeta = [...card.querySelectorAll('.record-top .meta')]
          .filter(item => !item.classList.contains('payment-meta'))[1];
        let paymentMeta = card.querySelector('.payment-meta');
        if (!paymentMeta) {
          paymentMeta = document.createElement('p');
          paymentMeta.className = 'meta payment-meta';
          editedMeta?.before(paymentMeta);
        }
        const plan = window.calculateViewingLoan({
          targetPrice: record.targetPrice,
          downPaymentRate: record.downPaymentRate || 20,
          commercialRate: record.commercialRate || 3.05,
          loanYears: record.loanYears || 30
        });
        if (plan) {
          paymentMeta.textContent = `月供：等额本息 ${format(plan.equalPayment)} 元；等额本金首月 ${format(plan.firstPrincipalPayment)} 元 · ${record.loanYears || 30}年`;
          paymentMeta.hidden = false;
        } else {
          paymentMeta.hidden = true;
        }
        if (editedMeta) {
          const editedText = editedMeta.textContent.replace(/ · 看房：.*$/, '');
          editedMeta.textContent = `${editedText}${record.viewedAt ? ` · 看房：${record.viewedAt}` : ''}`;
        }
        collapse(card, '.schools', '学校信息');
        collapse(card, '.notes', '优点、缺点、地标与备注');
      });
    };
    new MutationObserver(updateCards).observe(recordsNode, { childList: true });
    updateCards();
  })();

/* 模块 11：由原 index.html 内联脚本迁移。 */
(() => {
    const storageKey = 'shenzhen-viewing-records-v1';
    const toast = document.getElementById('toast');
    const loadRecords = () => {
      try { return JSON.parse(window.NativeStore.viewingRecordsJson() || '[]'); }
      catch (_) { return []; }
    };
    const showToast = text => {
      if (!toast) return;
      toast.textContent = text;
      clearTimeout(showToast.timer);
      showToast.timer = setTimeout(() => { toast.textContent = ''; }, 2200);
    };
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
    const recordText = record => {
      const plan = window.calculateViewingLoan({
        targetPrice: record.targetPrice,
        downPaymentRate: record.downPaymentRate || 20,
        commercialRate: record.commercialRate || 3.05,
        loanYears: record.loanYears || 30
      });
      const currency = value => `${Math.round(value).toLocaleString('zh-CN')} 元`;
      const editedAt = record.updatedAt || record.createdAt;
      return [
        ['小区', record.community],
        ['小学', record.primarySchools],
        ['中学', record.middleSchools],
        ['看房日期', record.viewedAt],
        ['关注等级', record.priority === 'focus' ? '重点关注' : record.priority === 'excluded' ? '已排除' : '普通'],
        ['物业公司', record.propertyCompany],
        ['物业费', record.propertyFee && record.propertyFee + ' 元/㎡·月'],
        ['建成年份', record.builtYear && `${record.builtYear} 年`],
        ['车位情况', record.parkingStatus],
        ['楼栋 / 单元', record.building],
        ['车位费用', record.parkingFee],
        ['总楼层', record.totalFloor && `总${record.totalFloor}层`],
        ['面积', record.area && `${record.area} ㎡`],
        ['户型', record.layout],
        ['客厅朝向', record.orientation],
        ['梯户比', record.elevatorRatio],
        ['报价', record.targetPrice && `${record.targetPrice} 万元`],
        ['贷款年限', record.loanYears && `${record.loanYears} 年`],
        ['首付比例', record.downPaymentRate && `${record.downPaymentRate}%`],
        ['商贷年利率', record.commercialRate && `${record.commercialRate}%`],
        ['等额本息月供', plan && currency(plan.equalPayment)],
        ['等额本金首月月供', plan && currency(plan.firstPrincipalPayment)],
        ['房源链接', record.sourceLink],
        ['优点', record.pros],
        ['缺点 / 风险', record.cons],
        ['附近地标', record.nearbyLandmark],
        ['个人备注', record.notes],
        ['最后编辑', editedAt && new Date(Number(editedAt)).toLocaleString('zh-CN', { hour12: false })]
      ].filter(([, value]) => value).map(([label, value]) => `${label}：${value}`).join('\n');
    };

    document.addEventListener('click', async event => {
      const copyButton = event.target.closest('[data-copy]');
      const deleteButton = event.target.closest('[data-delete]');
      const button = copyButton || deleteButton;
      if (!button) return;
      event.preventDefault();
      event.stopImmediatePropagation();

      const id = button.dataset.copy || button.dataset.delete;
      const records = loadRecords();
      const record = records.find(item => String(item.id) === String(id));
      if (!record) {
        showToast('未找到这条记录，请刷新页面后重试。');
        return;
      }
      if (copyButton) {
        await copy(recordText(record));
        showToast('复制成功');
        return;
      }
      if (!confirm(`删除“${record.community}”这条看房记录？`)) return;
      void window.NativeStore.saveViewingRecords(records.filter(item => String(item.id) !== String(id)));
      showToast('记录已删除。');
      setTimeout(() => location.reload(), 180);
    }, true);
  })();

/* 模块 12：由原 index.html 内联脚本迁移。 */
(() => {
    const toolbar = document.querySelector('.toolbar');
    const recordsNode = document.getElementById('records');
    if (!toolbar || !recordsNode) return;
    const input = document.createElement('input');
    input.id = 'recordSearch';
    input.className = 'record-search';
    input.type = 'search';
    input.placeholder = '搜索小区、学校、备注…';
    input.autocomplete = 'off';
    input.setAttribute('list', 'recordSearchSuggestions');
    const suggestions = document.createElement('datalist');
    suggestions.id = 'recordSearchSuggestions';
    input.after(suggestions);
    toolbar.querySelector('.filter')?.after(input);
    const count = document.createElement('span');
    count.className = 'record-count';
    toolbar.querySelector('.filter')?.after(count);

    const empty = document.createElement('p');
    empty.className = 'search-empty';
    empty.hidden = true;
    empty.textContent = '没有匹配的看房记录。';
    recordsNode.before(empty);
    const loadRecords = () => {
      try { return JSON.parse(window.NativeStore.viewingRecordsJson() || '[]'); }
      catch (_) { return []; }
    };
    const refresh = () => {
      const records = loadRecords();
      const names = [...new Set(records.map(record => String(record.community || '').trim()).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, 'zh-CN'));
      suggestions.innerHTML = names.map(name => `<option value="${name}"></option>`).join('');
      const query = input.value.trim().toLocaleLowerCase();
      const hasStatusFilter = document.getElementById('filter')?.value !== 'all';
      let visible = 0;
      recordsNode.querySelectorAll('.record').forEach(card => {
        const id = card.querySelector('[data-edit]')?.dataset.edit;
        const record = records.find(item => String(item.id) === String(id));
        const match = !query || JSON.stringify(record || {}).toLocaleLowerCase().includes(query);
        card.hidden = !match;
        if (match) visible += 1;
      });
      count.textContent = !query && !hasStatusFilter
        ? `共 ${visible} 条记录`
        : `当前 ${visible} 条 / 共 ${records.length} 条`;
      empty.hidden = !query || visible > 0;
    };
    input.addEventListener('input', refresh);
    new MutationObserver(refresh).observe(recordsNode, { childList: true });
    refresh();
  })();

/* 模块 31：由原 index.html 内联脚本迁移。 */
(() => {
    const records = document.getElementById('records');
    if (!records) return;
    const updateActions = () => {
      let savedRecords = [];
      try { savedRecords = JSON.parse(window.NativeStore.viewingRecordsJson() || '[]'); }
      catch (_) {}
      records.querySelectorAll('.record-actions').forEach(actions => {
        const view = actions.querySelector('[data-edit]');
        if (!view) return;
        view.textContent = '查看';
        actions.prepend(view);

        const record = savedRecords.find(item => String(item.id) === String(view.dataset.edit));
        const calculator = actions.querySelector('a[href*="../calculator/index.html"]');
        if (!record || !calculator) return;
        const housePrice = record.targetPrice ?? record.totalPrice ?? '';
        const calculatorState = {
          type: 'commercial', amountMode: 'auto', housePrice, downPaymentRate: '15'
        };
        calculator.href = '../calculator/index.html?c=' + encodeURIComponent(btoa(JSON.stringify(calculatorState)));
      });
    };
    new MutationObserver(updateActions).observe(records, { childList: true });
    updateActions();
  })();

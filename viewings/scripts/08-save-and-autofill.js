/* 模块 27：由原 index.html 内联脚本迁移。 */
(() => {
    const form = document.getElementById('recordForm');
    const recordsNode = document.getElementById('records');
    if (!form || !recordsNode) return;
    form.addEventListener('submit', () => {
      const idBeforeSave = document.getElementById('recordId')?.value;
      const community = document.getElementById('community')?.value.trim();
      setTimeout(() => {
        let id = idBeforeSave;
        if (!id) {
          try {
            const records = JSON.parse(window.NativeStore.viewingRecordsJson() || '[]');
            id = records
              .filter(record => record.community === community)
              .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0))[0]?.id;
          } catch (_) {}
        }
        const card = [...recordsNode.querySelectorAll('.record')]
          .find(item => String(item.querySelector('[data-edit]')?.dataset.edit) === String(id));
        card?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 0);
    });
  })();

/* 模块 28：由原 index.html 内联脚本迁移。 */
(() => {
    const form = document.getElementById('recordForm');
    const community = document.getElementById('community');
    const recordId = document.getElementById('recordId');
    if (!form || !community || !recordId) return;

    const fieldIds = ['propertyCompany', 'propertyFee', 'builtYear', 'parkingFee'];
    const autoValues = new Map();
    const normalize = value => String(value || '').replace(/[\s（）()]/g, '').toLocaleLowerCase();
    const savedRecords = () => {
      try { return JSON.parse(window.NativeStore.viewingRecordsJson() || '[]'); }
      catch (_) { return []; }
    };
    const clearAutoFill = () => {
      autoValues.clear();
      fieldIds.forEach(id => {
        const field = document.getElementById(id);
        if (field) field.value = '';
      });
    };
    const fillFromRecentCommunity = () => {
      if (recordId.value) return;
      const key = normalize(community.value);
      if (!key) return;
      const latest = savedRecords()
        .filter(record => normalize(record.community) === key)
        .sort((a, b) => Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0))[0];
      if (!latest) return;

      let filled = false;
      fieldIds.forEach(id => {
        const field = document.getElementById(id);
        const value = latest[id] ?? '';
        if (!field || value === '') return;
        if (!field.value || field.value === autoValues.get(id)) {
          field.value = value;
          autoValues.set(id, value);
          filled = true;
        }
      });
      if (filled) {
        const toast = document.getElementById('toast');
        if (toast) toast.textContent = '已带入同小区最近记录的物业、建成年份和车位费用信息。';
      }
    };

    document.addEventListener('click', event => {
      if (event.target.closest('#add')) clearAutoFill();
    }, true);
    community.addEventListener('input', fillFromRecentCommunity);
    community.addEventListener('change', fillFromRecentCommunity);
    document.addEventListener('pointerdown', event => {
      if (event.target.closest('.community-suggestion')) setTimeout(fillFromRecentCommunity, 0);
    });
  })();

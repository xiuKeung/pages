(() => {
  const stages = [
    ['看房前准备', [['budget', '确认首付预算与可承受月供', '先使用房贷计算器预估现金流。', '../calculator/index.html', '计算月供'], ['credit', '核验征信与贷款资格', '向银行或贷款经理进行预审。'], ['school', '核对目标小区官方学区', '学区与招生政策应以当年官方信息为准。', '../school/index.html', '查学区'], ['fund', '确认公积金余额与可贷额度', '公积金额度、首付比例请以审批结果为准。'], ['cash', '确认首付与税费资金来源', '避免将装修、税费、应急资金全部计入首付。']]],
    ['选房与核验', [['viewing', '实地看房并记录优缺点', '查看采光、噪音、楼层、漏水、公共区域等。', '../viewings/index.html', '记录看房'], ['price', '核对报价、成交参考与单价', '重点比较同小区、同户型、同楼层条件。'], ['title', '核验产权、抵押与交易限制', '签约前请向专业人士、登记部门或中介核验。'], ['schoolLock', '确认学位占用与入学风险', '尤其关注共享学区、多校选择与学位锁定。', '../school/index.html', '查学区'], ['taxEstimate', '估算税费', '不要只比较首付与挂牌总价。'], ['agentEstimate', '估算中介费', '确认收费标准、服务范围与付款节点。'], ['renovationEstimate', '估算装修与持有成本', '预留装修、物业、维修与应急资金。']]],
    ['贷款与签约', [['loanPlan', '确定商贷 / 公积金 / 组合贷方案', '将实际银行报价填入计算器复核。', '../calculator/index.html', '复核贷款'], ['contract', '逐项核对买卖合同与补充协议', '重点确认付款节点、违约责任与交付条件。'], ['funds', '确认资金监管和付款路径', '付款前核对收款账户及监管要求。'], ['identityDocs', '整理身份证明材料', '按银行和交易流程要求准备。'], ['marriageDocs', '整理婚姻状况材料', '按实际婚姻状况准备相关证明。'], ['incomeDocs', '整理银行流水与收入材料', '按银行要求准备流水、收入或资产证明。']]],
    ['过户与交楼', [['taxPayment', '确认应缴税费', '以交易中心实际核定金额和通知为准。'], ['transfer', '确认过户安排', '核对预约时间、到场人员和所需材料。'], ['certificate', '确认领证安排', '确认不动产权证领取方式与时间。'], ['inspection', '验房', '检查房屋现状、设施设备与约定交付物。'], ['propertyHandover', '办理物业交割', '核对物业费、停车费、门禁与钥匙清单。'], ['utilityHandover', '办理水电燃气交割', '拍照记录表计数值并完成账户交接。'], ['schoolPlan', '按招生时间节点准备入学材料', '最终资格和材料要求以当年教育部门通知为准。', '../school/index.html', '查看学区图'], ['contractArchive', '保存买卖合同与补充协议', '建议同时保留电子备份。'], ['receiptArchive', '保存税费及付款票据', '保留资金监管、税费、佣金等凭证。'], ['loanArchive', '保存贷款与交割资料', '保留贷款合同、还款计划、交割单等。']]]
  ];

  const $ = id => document.getElementById(id);
  const esc = value => String(value || '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
  let state = {};

  function toast(message) {
    $('toast').textContent = message;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => { $('toast').textContent = ''; }, 2200);
  }

  function save() {
    window.NativeStore.saveChecklistState(state).catch(error => {
      console.error('保存购房清单失败', error);
      toast('保存失败，请稍后重试。');
    });
  }

  function renderProgress() {
    const tasks = stages.flatMap(([, items]) => items);
    const done = tasks.filter(([id]) => state[id]?.done).length;
    $('progressText').textContent = `${done} / ${tasks.length} 已完成`;
    $('progressBar').style.width = `${tasks.length ? done / tasks.length * 100 : 0}%`;
  }

  function render() {
    $('stages').innerHTML = stages.map(([title, items]) => {
      const done = items.filter(([id]) => state[id]?.done).length;
      return `<section class="card stage"><h2>${title}<span>${done} / ${items.length} 已完成</span></h2>${items.map(([id, name, desc, href, link]) => `<article class="task ${state[id]?.done ? 'done' : ''}"><div class="task-main"><input id="check-${id}" type="checkbox" data-check="${id}" ${state[id]?.done ? 'checked' : ''}><label for="check-${id}">${name}<p>${desc}</p></label></div><div class="task-actions">${href ? `<a class="button" href="${href}">${link} →</a>` : ''}<button data-note="${id}" type="button">${state[id]?.note ? '编辑备注' : '添加备注'}</button></div><textarea class="note" data-note-box="${id}" placeholder="写下个人备注…" ${state[id]?.open ? '' : 'hidden'}>${esc(state[id]?.note)}</textarea></article>`).join('')}</section>`;
    }).join('');
    document.querySelectorAll('[data-check]').forEach(node => {
      node.onchange = () => {
        const id = node.dataset.check;
        state[id] = { ...(state[id] || {}), done: node.checked };
        save();
        render();
        renderProgress();
      };
    });
    document.querySelectorAll('[data-note]').forEach(node => {
      node.onclick = () => {
        const id = node.dataset.note;
        state[id] = { ...(state[id] || {}), open: !state[id]?.open };
        save();
        render();
      };
    });
    document.querySelectorAll('[data-note-box]').forEach(node => {
      node.oninput = () => {
        const id = node.dataset.noteBox;
        state[id] = { ...(state[id] || {}), note: node.value, open: true };
        save();
        renderProgress();
      };
    });
    renderProgress();
  }

  async function init() {
    try {
      await window.NativeStore.ready();
      state = await window.NativeStore.getChecklistState();
      render();
    } catch (error) {
      console.error('初始化购房清单失败', error);
      toast('本地数据库初始化失败。');
    }
  }

  $('reset').onclick = () => {
    if (!confirm('重置所有勾选和备注？')) return;
    state = {};
    save();
    render();
    toast('清单已重置。');
  };

  init();
})();

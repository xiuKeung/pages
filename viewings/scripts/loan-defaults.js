/* 本设备的新增房源偏好；不更改已有记录或房贷计算器。 */
(() => {
  const key = 'anjia-viewing-loan-defaults-v1';
  const initial = { loanYears: '30', downPaymentRate: '30', commercialRate: '3.05' };
  const valid = value => value && Number.isInteger(Number(value.loanYears)) && Number(value.loanYears) >= 1 && Number(value.loanYears) <= 40
    && String(value.downPaymentRate).trim() !== '' && Number.isFinite(Number(value.downPaymentRate)) && Number(value.downPaymentRate) >= 0 && Number(value.downPaymentRate) <= 100
    && String(value.commercialRate).trim() !== '' && Number.isFinite(Number(value.commercialRate)) && Number(value.commercialRate) >= 0 && Number(value.commercialRate) <= 30;
  const read = () => {
    try { const value = JSON.parse(localStorage.getItem(key)); return valid(value) ? value : { ...initial }; }
    catch (_) { return { ...initial }; }
  };
  window.ViewingLoanDefaults = { read };
  document.getElementById('viewingSettings').onclick = () => {
    const dialog = document.createElement('dialog'); dialog.className = 'viewing-settings-dialog';
    dialog.innerHTML = '<form><h2>新增房源默认值</h2><p>仅用于后续新增房源和“再记一套”，已有记录不变。</p><label>贷款年限<select name="loanYears"></select></label><label>首付比例（%）<input name="downPaymentRate" type="number" inputmode="decimal" min="0" max="100" step="0.1" required></label><label>商贷年利率（%）<input name="commercialRate" type="number" inputmode="decimal" min="0" max="30" step="0.01" required></label><p class="settings-error" role="alert"></p><div class="compass-actions"><button type="button" data-cancel>取消</button><button type="submit" class="primary">保存</button></div></form>';
    const form = dialog.querySelector('form'), values = read();
    for (let i = 1; i <= 40; i++) form.elements.loanYears.add(new Option(`${i}年`, String(i)));
    Object.entries(values).forEach(([name, value]) => { if (form.elements.namedItem(name)) form.elements.namedItem(name).value = value; });
    document.body.append(dialog);
    const overflow = [document.body.style.overflow, document.documentElement.style.overflow];
    document.body.style.overflow = document.documentElement.style.overflow = 'hidden';
    dialog.addEventListener('close', () => { document.body.style.overflow = overflow[0]; document.documentElement.style.overflow = overflow[1]; dialog.remove(); }, { once: true });
    dialog.querySelector('[data-cancel]').onclick = () => dialog.close();
    form.onsubmit = event => {
      event.preventDefault(); const value = Object.fromEntries(new FormData(form));
      if (!valid(value)) return;
      try { localStorage.setItem(key, JSON.stringify(value)); }
      catch (_) { dialog.querySelector('.settings-error').textContent = '保存失败，请检查设备存储空间后重试'; return; }
      dialog.close(); window.ViewingPlaceActions?.notify('默认值已保存');
    };
    dialog.showModal();
  };
})();

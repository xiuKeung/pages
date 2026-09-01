/* 模块 30：由原 index.html 内联脚本迁移。 */
(() => {
    const input = document.getElementById('viewedAt');
    const label = input?.closest('label');
    if (!input || !label || document.querySelector('.date-control')) return;

    const control = document.createElement('div');
    control.className = 'date-control';
    const value = document.createElement('span');
    value.className = 'date-control-value';
    const render = () => {
      if (!input.value) {
        value.textContent = '请选择日期';
        return;
      }
      const [year, month, day] = input.value.split('-');
      value.textContent = `${year}年${Number(month)}月${Number(day)}日`;
    };
    input.before(control);
    control.append(value, input);
    input.addEventListener('input', render);
    input.addEventListener('change', render);
    new MutationObserver(() => setTimeout(render, 0)).observe(document.getElementById('editor'), {
      attributes: true,
      attributeFilter: ['class']
    });
    document.addEventListener('click', event => {
      if (event.target.closest('#add, [data-edit]')) setTimeout(render, 0);
    });
    render();
  })();

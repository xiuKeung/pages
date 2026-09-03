/* 模块 30：由原 index.html 内联脚本迁移。 */
(() => {
    const input = document.getElementById('viewedAt');
    const label = input?.closest('label');
    if (!input || !label || document.querySelector('.date-control')) return;

    const control = document.createElement('div');
    control.className = 'date-control';
    control.tabIndex = 0;
    control.setAttribute('role', 'button');
    control.setAttribute('aria-label', '选择看房日期');
    const value = document.createElement('span');
    value.className = 'date-control-value';
    // 日期展示层可随双列布局收窄；透明的原生 input 仍保持 16px，避免 iOS 自动缩放页面。
    const canvas = document.createElement('canvas');
    const measure = canvas.getContext('2d');
    const fitValue = () => {
      let size = 16;
      const available = Math.max(0, control.clientWidth - 20);
      const styles = getComputedStyle(value);
      const textWidth = fontSize => {
        measure.font = `${styles.fontWeight} ${fontSize}px ${styles.fontFamily}`;
        return measure.measureText(value.textContent || '').width;
      };
      while (size > 10 && textWidth(size) > available) size -= 0.5;
      value.style.fontSize = `${size}px`;
    };
    const render = () => {
      if (!input.value) {
        value.textContent = '请选择日期';
        requestAnimationFrame(fitValue);
        return;
      }
      const [year, month, day] = input.value.split('-');
      value.textContent = `${year}年${Number(month)}月${Number(day)}日`;
      requestAnimationFrame(fitValue);
    };
    input.before(control);
    control.append(value, input);
    // 部分浏览器不会为透明的 date input 自动拉起日期选择器，
    // 由可见的控制层显式触发，Safari 则回退到聚焦和点击原生控件。
    const openPicker = () => {
      try {
        if (typeof input.showPicker === 'function') {
          input.showPicker();
          return;
        }
      } catch (_) {}
      input.focus();
      input.click();
    };
    control.addEventListener('click', openPicker);
    control.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openPicker();
      }
    });
    input.addEventListener('input', render);
    input.addEventListener('change', render);
    if (window.ResizeObserver) new ResizeObserver(fitValue).observe(control);
    else window.addEventListener('resize', fitValue);
    new MutationObserver(() => setTimeout(render, 0)).observe(document.getElementById('editor'), {
      attributes: true,
      attributeFilter: ['class']
    });
    document.addEventListener('click', event => {
      if (event.target.closest('#add, [data-edit]')) setTimeout(render, 0);
    });
    render();
  })();

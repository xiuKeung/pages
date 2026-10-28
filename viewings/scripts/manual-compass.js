/* 纯手动方位选择：固定读数线、旋转刻度盘，不访问设备传感器。 */
(() => {
  const normalize = n => (n % 360 + 360) % 360;
  const delta = n => normalize(n + 180) - 180;
  const names = ['北', '东', '南', '西'];
  const format = value => {
    const angle = normalize(Math.round(value));
    if (angle % 90 === 0) return `正${names[angle / 90]}`;
    // 恰好 45° 时，优先以南/北为主方向。
    const base = [0, 180, 90, 270].sort((a, b) => Math.abs(delta(angle - a)) - Math.abs(delta(angle - b)))[0];
    const offset = delta(angle - base);
    const side = base === 0 ? (offset > 0 ? '东' : '西')
      : base === 180 ? (offset > 0 ? '西' : '东')
      : base === 90 ? (offset > 0 ? '南' : '北') : (offset > 0 ? '北' : '南');
    return `${names[base / 90]}偏${side}${Math.abs(offset)}°`;
  };
  const parseAngle = value => {
    const relative = value.match(/^([北东南西])偏([北东南西])(\d+(?:\.\d+)?)[°度]/);
    if (relative) {
      const sign = { 北东: 1, 北西: -1, 东南: 1, 东北: -1, 南西: 1, 南东: -1, 西北: 1, 西南: -1 }[relative[1] + relative[2]];
      return sign ? normalize(names.indexOf(relative[1]) * 90 + sign * Number(relative[3])) : null;
    }
    const old = value.match(/(\d+(?:\.\d+)?)\s*°/);
    if (old) return normalize(Number(old[1]));
    const index = ['北', '东北', '东', '东南', '南', '西南', '西', '西北'].indexOf(value.trim().replace(/^正/, ''));
    return index < 0 ? null : index * 45;
  };
  const point = (degrees, radius) => [180 + Math.sin(degrees * Math.PI / 180) * radius, 180 - Math.cos(degrees * Math.PI / 180) * radius];
  const dial = (angle = 0) => {
    const ticks = Array.from({ length: 180 }, (_, i) => {
      const d = i * 2, major = d % 30 === 0;
      return `<path d="M180 54V${major ? 76 : 66}" transform="rotate(${d} 180 180)" stroke="currentColor" stroke-width="${major ? 2 : 1}"/>`;
    }).join('');
    const text = (d, radius, label, size) => {
      const [x, y] = point(d, radius);
      return `<text data-x="${x}" data-y="${y}" x="${x}" y="${y}" transform="rotate(${angle} ${x} ${y})" text-anchor="middle" dominant-baseline="central" font-size="${size}" fill="currentColor">${label}</text>`;
    };
    return `<svg viewBox="0 0 360 360" aria-hidden="true"><g class="compass-ring" transform="rotate(${-angle} 180 180)">${ticks}${Array.from({ length: 12 }, (_, i) => text(i * 30, 151, i * 30, 14)).join('')}${names.map((name, i) => text(i * 90, 88, name, 24)).join('')}<path d="M180 43L174 52H186Z" fill="#f04438"/></g><circle cx="180" cy="180" r="34" fill="currentColor" opacity=".08"/><path d="M124 180H236M180 124V236" stroke="currentColor" opacity=".4"/><path d="M180 16V76" stroke="currentColor" stroke-width="3"/></svg>`;
  };
  const open = input => {
    const dialog = document.createElement('dialog'); dialog.className = 'compass-dialog manual-compass';
    dialog.innerHTML = '<h2>阳台朝向</h2><p>拖动外圈旋转，或点击刻度选定方向。顶部白线指向当前方位。</p><div class="compass-dial" role="slider" tabindex="0" aria-label="阳台朝向角度" aria-valuemin="0" aria-valuemax="359"></div><strong class="compass-value" aria-live="polite"></strong><p class="compass-bearing"></p><div class="compass-actions"><button type="button" data-cancel>取消</button><button type="button" data-clear>清空</button><button type="button" class="primary" data-use>使用当前方向</button></div>';
    document.body.append(dialog);
    const overflow = [document.body.style.overflow, document.documentElement.style.overflow];
    document.body.style.overflow = document.documentElement.style.overflow = 'hidden';
    let angle = parseAngle(input.value) ?? 0;
    const wheel = dialog.querySelector('.compass-dial'); wheel.innerHTML = dial(angle);
    const draw = () => {
      wheel.querySelector('.compass-ring').setAttribute('transform', `rotate(${-angle} 180 180)`);
      wheel.querySelectorAll('text').forEach(text => text.setAttribute('transform', `rotate(${angle} ${text.dataset.x} ${text.dataset.y})`));
      const label = format(angle);
      dialog.querySelector('.compass-value').textContent = label;
      dialog.querySelector('.compass-bearing').textContent = `方位角 ${normalize(Math.round(angle))}°`;
      wheel.setAttribute('aria-valuenow', normalize(Math.round(angle)));
      wheel.setAttribute('aria-valuetext', label);
    };
    const position = event => {
      const r = wheel.getBoundingClientRect(), x = event.clientX - r.left - r.width / 2, y = event.clientY - r.top - r.height / 2;
      return { bearing: Math.atan2(x, -y) * 180 / Math.PI, radius: Math.hypot(x, y), size: r.width };
    };
    let drag = null;
    wheel.addEventListener('pointerdown', event => {
      if (!event.isPrimary || event.button !== 0) return;
      const p = position(event);
      if (p.radius < p.size * .24 || p.radius > p.size * .5) return;
      event.preventDefault(); wheel.setPointerCapture(event.pointerId);
      drag = { id: event.pointerId, last: p.bearing, initial: p.bearing, angle, x: event.clientX, y: event.clientY, moved: false };
    });
    wheel.addEventListener('pointermove', event => {
      if (!drag || drag.id !== event.pointerId) return;
      const p = position(event);
      if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 4) drag.moved = true;
      if (drag.moved) { angle = normalize(angle - delta(p.bearing - drag.last)); draw(); }
      drag.last = p.bearing;
    });
    wheel.addEventListener('pointerup', event => {
      if (!drag || drag.id !== event.pointerId) return;
      if (!drag.moved) angle = normalize(drag.angle + drag.initial);
      angle = normalize(Math.round(angle)); drag = null; draw();
    });
    wheel.addEventListener('pointercancel', () => { drag = null; });
    wheel.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home'].includes(event.key)) return;
      event.preventDefault(); angle = event.key === 'Home' ? 0 : normalize(angle + (['ArrowRight', 'ArrowUp'].includes(event.key) ? 1 : -1)); draw();
    });
    dialog.addEventListener('close', () => { document.body.style.overflow = overflow[0]; document.documentElement.style.overflow = overflow[1]; dialog.remove(); }, { once: true });
    dialog.querySelector('[data-cancel]').onclick = () => dialog.close();
    const save = value => { input.value = value; input.dispatchEvent(new Event('input', { bubbles: true })); dialog.close(); };
    dialog.querySelector('[data-clear]').onclick = () => save('');
    dialog.querySelector('[data-use]').onclick = () => save(format(angle));
    draw(); dialog.showModal();
  };
  window.ViewingCompass = { format, parseAngle, dial, open };
})();

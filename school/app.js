globalThis.SchoolDistrictDataReady.then(() => {
  const input = document.querySelector('#community');
  const searchButton = document.querySelector('#search');
  const result = document.querySelector('#result');
  const schools = globalThis.NanshanDistrictData?.schools || [];
  const loadError = globalThis.NanshanDistrictData?.loadError;
  const normalize = value => String(value || '').replace(/[\s（）()·、，,.-]/g, '').replace(/(小区|花园|广场|名苑|住宅楼)$/g, '').toLowerCase();
  const escape = value => String(value || '').replace(/[&<>'"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' })[char]);

  const allHomes = [...new Set(schools.flatMap(school => school.homes || []))];

  // 以官方小区名单的并集反查学校：候选名称无论是简称、全称还是括号别名，
  // 只要本次检索命中，就共同决定小学与中学结果。
  function findMatches(homes) {
    const keys = new Set(homes.map(normalize));
    const matches = [];
    schools.forEach(school => (school.homes || []).forEach(home => {
      const homeKey = normalize(home);
      if (keys.has(homeKey)) matches.push({ school, home });
    }));
    return matches;
  }

  function candidates(value) {
    const key = normalize(value);
    if (key.length < 2) return [];
    // 即使存在完全相同的小区名，也保留同一输入命中的其他官方名称；
    // 例如“简称 / 全称（别名）”可能分别承载不同学段的官方关联。
    return allHomes
      .filter(home => normalize(home).includes(key))
      .sort((a, b) => {
        const aExact = normalize(a) === key ? 0 : 1;
        const bExact = normalize(b) === key ? 0 : 1;
        return aExact - bExact || a.length - b.length;
      });
  }

  // 结果过多需先选定一个小区时，仍要合并与它通过“全称/别名”连通的官方名称。
  function relatedHomes(seed) {
    const related = new Set([seed]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const home of allHomes) {
        const homeKey = normalize(home);
        if ([...related].some(item => {
          const itemKey = normalize(item);
          return itemKey.length >= 4 && homeKey.length >= 4
            && (itemKey.includes(homeKey) || homeKey.includes(itemKey));
        }) && !related.has(home)) {
          related.add(home);
          changed = true;
        }
      }
    }
    return [...related];
  }

  function grouped(matches) {
    return [...matches.reduce((map, item) => {
      const key = `${item.school.level}|${item.school.name}`;
      if (!map.has(key)) map.set(key, { ...item.school, homes: [] });
      map.get(key).homes.push(item.home);
      return map;
    }, new Map()).values()];
  }

  function renderResult(homes, label) {
    const rows = grouped(findMatches(homes));
    const primary = rows.filter(row => row.level === '小学');
    const middle = rows.filter(row => row.level === '初中');
    const block = (title, list, className) => list.length ? `<section class="school-group ${className}"><h3>${title}</h3><ul>${list.map(row => `<li>${escape(row.name)}</li>`).join('')}</ul></section>` : '';
    const officialHomes = rows.length
      ? `<p class="community-name">官方匹配小区：${homes.map(escape).join('、')}</p>`
      : '<p class="hint">未找到对应学校，请先查看官方学区图核验。</p>';
    result.innerHTML = `<p class="community-name">${escape(label)}</p>${officialHomes}${block('小学', primary, 'primary')}${block('中学', middle, 'middle')}`;
  }

  function search() {
    if (loadError) {
      result.innerHTML = `<div class="empty"><span class="empty-icon">!</span><p>官方数据加载失败</p><small>${escape(loadError)}。请使用本地网页服务器或将本目录部署到静态网站后再打开。</small></div>`;
      return;
    }
    const query = input.value.trim();
    if (!query) { result.innerHTML = '<div class="empty"><span class="empty-icon">⌕</span><p>输入小区名称开始查询</p></div>'; return; }
    const homes = candidates(query);
    // 一般的局部输入会命中少量官方名称，直接合并反查，不让某一个名称丢失学段。
    if (homes.length >= 1 && homes.length <= 12) { renderResult(homes, `搜索：${query}`); return; }
    if (homes.length > 12) {
      result.innerHTML = `<h2>选择小区</h2><p class="hint">找到 ${homes.length} 个相近小区：</p><div class="candidates">${homes.map(home => `<button type="button" data-home="${escape(home)}">${escape(home)}</button>`).join('')}</div>`;
      result.querySelectorAll('[data-home]').forEach(button => button.addEventListener('click', () => {
        const officialHomes = relatedHomes(button.dataset.home);
        renderResult(officialHomes, button.dataset.home);
      }));
      return;
    }
    result.innerHTML = '<div class="empty"><span class="empty-icon">?</span><p>未找到该小区</p><small>可尝试完整名称，或到下方官方学区图核验。</small></div>';
  }

  if (loadError) {
    result.innerHTML = `<div class="empty"><span class="empty-icon">!</span><p>官方数据加载失败</p><small>${escape(loadError)}。请使用本地网页服务器或将本目录部署到静态网站后再打开。</small></div>`;
  }
  searchButton.addEventListener('click', search);
  input.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); search(); } });
  input.addEventListener('input', () => { if (!input.value.trim()) result.innerHTML = '<div class="empty"><span class="empty-icon">⌕</span><p>输入小区名称开始查询</p></div>'; });
});

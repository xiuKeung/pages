globalThis.SchoolDistrictDataReady.then(() => {
  const input = document.querySelector('#community');
  const searchButton = document.querySelector('#search');
  const result = document.querySelector('#result');
  const communityModeButton = document.querySelector('#mode-community');
  const schoolModeButton = document.querySelector('#mode-school');
  const queryLabel = document.querySelector('#query-label');
  const queryHint = document.querySelector('#query-hint');
  const suggestions = document.querySelector('#suggestions');
  const snapshotTime = document.querySelector('#snapshot-time');
  const dataSummary = document.querySelector('#data-summary');
  const savedRecentButton = document.querySelector('#saved-recent');
  const savedFavoriteButton = document.querySelector('#saved-favorite');
  const clearSavedButton = document.querySelector('#clear-saved');
  const savedList = document.querySelector('#saved-list');
  const schools = globalThis.NanshanDistrictData?.schools || [];
  const loadError = globalThis.NanshanDistrictData?.loadError;
  const normalize = value => String(value || '').replace(/[\s（）()·、，,.-]/g, '').replace(/(小区|花园|广场|名苑|住宅楼)$/g, '').toLowerCase();
  const escape = value => String(value || '').replace(/[&<>'"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' })[char]);

  const allHomes = [...new Set(schools.flatMap(school => school.homes || []))];
  const allSchools = [...new Map(schools.map(school => [
    `${school.district}|${school.level}|${school.name}`, school
  ])).values()];
  const schoolByKey = new Map(allSchools.map(school => [
    `${school.district}|${school.level}|${school.name}`, school
  ]));
  let mode = 'community';
  const modeState = { community: { value: '' }, school: { value: '' } };
  let savedPanel = 'recent';
  let activeResultQuery = null;
  const storageKey = (type, queryMode = mode) => `sz-school-district-${type}-${queryMode}-v1`;

  function readSaved(type, queryMode = mode) {
    try { return JSON.parse(localStorage.getItem(storageKey(type, queryMode)) || '[]'); } catch { return []; }
  }

  function writeSaved(type, rows, queryMode = mode) {
    try { localStorage.setItem(storageKey(type, queryMode), JSON.stringify(rows)); } catch { /* 浏览器禁用本地存储时静默降级 */ }
  }

  function queryKey(query) {
    return `${query.mode}|${query.value}`;
  }

  function recordRecent(query) {
    modeState[query.mode].value = query.value;
    const rows = readSaved('recent', query.mode).filter(row => queryKey(row) !== queryKey(query));
    rows.unshift(query);
    writeSaved('recent', rows.slice(0, 6), query.mode);
    renderSaved();
  }

  function isFavorite(query) {
    return readSaved('favorite', query.mode).some(row => queryKey(row) === queryKey(query));
  }

  function toggleFavorite(query) {
    const rows = readSaved('favorite', query.mode);
    const index = rows.findIndex(row => queryKey(row) === queryKey(query));
    if (index >= 0) rows.splice(index, 1);
    else rows.unshift(query);
    writeSaved('favorite', rows, query.mode);
    renderSaved();
    return index < 0;
  }

  function refreshFavoriteToggle() {
    if (!activeResultQuery) return;
    const button = result.querySelector('.favorite-toggle');
    if (!button) return;
    const favorite = isFavorite(activeResultQuery);
    button.classList.toggle('is-favorite', favorite);
    button.textContent = favorite ? '★ 已收藏' : '☆ 收藏';
  }

  function renderSaved() {
    const rows = readSaved(savedPanel);
    savedRecentButton.classList.toggle('is-active', savedPanel === 'recent');
    savedFavoriteButton.classList.toggle('is-active', savedPanel === 'favorite');
    savedRecentButton.setAttribute('aria-selected', String(savedPanel === 'recent'));
    savedFavoriteButton.setAttribute('aria-selected', String(savedPanel === 'favorite'));
    clearSavedButton.textContent = savedPanel === 'recent' ? '清空最近' : '清空收藏';
    if (!rows.length) {
      savedList.innerHTML = `<p class="saved-empty">${savedPanel === 'recent' ? '暂无最近查询' : '暂无收藏'} </p>`;
      return;
    }
    savedList.innerHTML = rows.map((row, index) => {
      const icon = row.mode === 'community' ? '🏘' : '🏫';
      return `<span class="saved-item"><button class="saved-open" type="button" data-saved-open="${index}">${icon} ${escape(row.value)}</button><button class="saved-remove" type="button" aria-label="删除 ${escape(row.value)}" data-saved-remove="${index}">×</button></span>`;
    }).join('');
    savedList.querySelectorAll('[data-saved-open]').forEach(button => button.addEventListener('click', () => {
      const query = rows[Number(button.dataset.savedOpen)];
      setMode(query.mode, false);
      input.value = query.value;
      search();
    }));
    savedList.querySelectorAll('[data-saved-remove]').forEach(button => button.addEventListener('click', () => {
      const next = readSaved(savedPanel, mode);
      next.splice(Number(button.dataset.savedRemove), 1);
      writeSaved(savedPanel, next, mode);
      renderSaved();
      refreshFavoriteToggle();
    }));
  }

  function resultHeader(label, query) {
    const favorite = isFavorite(query);
    return `<div class="result-title-row"><p class="community-name">${escape(label)}</p><button class="share-toggle" type="button">分享</button><button class="favorite-toggle ${favorite ? 'is-favorite' : ''}" type="button">${favorite ? '★ 已收藏' : '☆ 收藏'}</button></div>`;
  }

  function showToast(message) {
    document.querySelector('.page-toast')?.remove();
    const toast = document.createElement('div');
    toast.className = 'page-toast';
    toast.textContent = message;
    document.body.append(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  function bindResultControls(query) {
    result.querySelector('.share-toggle')?.addEventListener('click', async event => {
      const url = new URL(location.href);
      url.search = new URLSearchParams({ mode: query.mode, q: query.value }).toString();
      let copied = false;
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(url.href);
          copied = true;
        }
      } catch { /* 回退到传统复制方式 */ }
      if (!copied) {
        const textarea = document.createElement('textarea');
        textarea.value = url.href;
        textarea.setAttribute('readonly', '');
        textarea.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
        document.body.append(textarea);
        textarea.select();
        copied = document.execCommand('copy');
        textarea.remove();
      }
      event.currentTarget.textContent = copied ? '链接已复制' : '复制失败';
      showToast(copied ? '链接已复制' : '复制失败，请长按地址栏复制当前链接');
      setTimeout(() => { event.currentTarget.textContent = '分享'; }, 1500);
    });
    result.querySelector('.favorite-toggle')?.addEventListener('click', event => {
      const favorite = toggleFavorite(query);
      event.currentTarget.classList.toggle('is-favorite', favorite);
      event.currentTarget.textContent = favorite ? '★ 已收藏' : '☆ 收藏';
    });
    result.querySelectorAll('[data-school-key]').forEach(button => button.addEventListener('click', () => {
      const school = schoolByKey.get(button.dataset.schoolKey);
      if (!school) return;
      setMode('school', false);
      input.value = school.name;
      renderSchoolResult([school], school.name, { mode: 'school', value: school.name });
    }));
    result.querySelectorAll('[data-home]').forEach(button => button.addEventListener('click', () => {
      const home = button.dataset.home;
      setMode('community', false);
      input.value = home;
      renderResult(candidates(home), home, { mode: 'community', value: home });
    }));
    result.querySelectorAll('[data-expand-homes]').forEach(button => button.addEventListener('click', () => {
      const section = button.closest('.school-group');
      section.querySelectorAll('[hidden]').forEach(item => { item.hidden = false; });
      button.remove();
    }));
  }

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
    return expandRelatedHomes(allHomes.filter(home => normalize(home).includes(key)))
      .sort((a, b) => {
        const aExact = normalize(a) === key ? 0 : 1;
        const bExact = normalize(b) === key ? 0 : 1;
        return aExact - bExact || a.length - b.length;
      });
  }

  // 递归合并官方名称：A 包含 B、B 又包含 C 时，A/B/C 视为同一名称族。
  // 这避免“简称 → 括号别名 → 全称”链条中漏掉某个学段。
  function expandRelatedHomes(initialHomes) {
    const related = new Set(initialHomes);
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

  // 结果过多需先选定一个小区时，同样合并与它通过“全称/别名”连通的官方名称。
  function relatedHomes(seed) {
    return expandRelatedHomes([seed]);
  }

  function grouped(matches) {
    return [...matches.reduce((map, item) => {
      const key = `${item.school.level}|${item.school.name}`;
      if (!map.has(key)) map.set(key, { ...item.school, homes: [] });
      map.get(key).homes.push(item.home);
      return map;
    }, new Map()).values()];
  }

  function renderResult(homes, label, query) {
    const rows = grouped(findMatches(homes));
    const primary = rows.filter(row => row.level === '小学');
    const middle = rows.filter(row => row.level === '初中');
    const block = (title, list, className) => list.length ? `<section class="school-group ${className}"><h3>${title}</h3><ul>${list.map(row => `<li><button class="result-link" type="button" data-school-key="${escape(`${row.district}|${row.level}|${row.name}`)}">${escape(row.name)}</button></li>`).join('')}</ul></section>` : '';
    const officialHomes = rows.length
      ? `<p class="community-name">官方匹配小区：${homes.map(escape).join('、')}</p>`
      : '<p class="hint">未找到对应学校，请先查看官方学区图核验。</p>';
    const multiNotice = primary.length > 1 || middle.length > 1
      ? '<p class="multi-notice">此小区对应多所学校，可能涉及多校选择或共享学区；最终入学安排请以当年官方招生政策为准。</p>'
      : '';
    result.innerHTML = `${resultHeader(label, query)}${officialHomes}${multiNotice}${block('小学', primary, 'primary')}${block('中学', middle, 'middle')}`;
    activeResultQuery = query;
    recordRecent(query);
    bindResultControls(query);
  }

  function schoolCandidates(value) {
    const key = normalize(value);
    if (key.length < 2) return [];
    return allSchools
      .filter(school => normalize(school.name).includes(key))
      .sort((a, b) => {
        const aExact = normalize(a.name) === key ? 0 : 1;
        const bExact = normalize(b.name) === key ? 0 : 1;
        return aExact - bExact || a.name.length - b.name.length;
      });
  }

  function hideSuggestions() {
    suggestions.classList.remove('is-visible');
    suggestions.innerHTML = '';
  }

  function renderSuggestions() {
    const query = input.value.trim();
    const key = normalize(query);
    if (key.length < 2) { hideSuggestions(); return; }
    const rows = mode === 'community' ? candidates(query) : schoolCandidates(query);
    if (!rows.length) { hideSuggestions(); return; }
    const label = mode === 'community' ? '🏘 小区' : '🏫 学校';
    const shown = rows.slice(0, 8);
    const items = shown.map((row, index) => {
      const text = mode === 'community' ? row : `${row.district} · ${row.level} · ${row.name}`;
      return `<button class="suggestion-item" type="button" data-suggestion="${index}"><strong>${label}</strong>${escape(text)}</button>`;
    }).join('');
    const note = rows.length > 8 ? `<p class="suggestion-note">共匹配 ${rows.length} 项，请继续输入 1–2 个字缩小范围。</p>` : '';
    suggestions.innerHTML = items + note;
    suggestions.classList.add('is-visible');
    suggestions.querySelectorAll('[data-suggestion]').forEach(button => button.addEventListener('click', () => {
      const row = rows[Number(button.dataset.suggestion)];
      input.value = mode === 'community' ? row : row.name;
      hideSuggestions();
      search();
    }));
  }

  function renderSchoolResult(rows, label, query) {
    const blocks = rows.map(school => {
      const className = school.level === '小学' ? 'primary' : 'middle';
      const homes = [...new Set(school.homes || [])];
      const visibleHomes = homes.slice(0, 10);
      const extraHomes = homes.slice(10);
      const list = visibleHomes.map(home => `<li><button class="result-link" type="button" data-home="${escape(home)}">${escape(home)}</button></li>`).join('')
        + extraHomes.map(home => `<li hidden><button class="result-link" type="button" data-home="${escape(home)}">${escape(home)}</button></li>`).join('');
      const more = extraHomes.length ? `<button class="show-homes" type="button" data-expand-homes>展开全部（另 ${extraHomes.length} 个）</button>` : '';
      return `<section class="school-group ${className}"><h3>${escape(school.district)} · ${escape(school.level)} · ${escape(school.name)}</h3><p class="hint">官方学区小区（${homes.length} 个）</p><ul>${list}</ul>${more}</section>`;
    }).join('');
    result.innerHTML = `${resultHeader(label, query)}${blocks}`;
    activeResultQuery = query;
    recordRecent(query);
    bindResultControls(query);
  }

  function renderSchoolChoices(rows) {
    result.innerHTML = `<h2>选择学校</h2><p class="hint">找到 ${rows.length} 所相近学校：</p><div class="candidates">${rows.map((school, index) => `<button type="button" data-school-index="${index}">${escape(school.district)} · ${escape(school.level)} · ${escape(school.name)}</button>`).join('')}</div>`;
    result.querySelectorAll('[data-school-index]').forEach(button => button.addEventListener('click', () => {
      const school = rows[Number(button.dataset.schoolIndex)];
      renderSchoolResult([school], school.name, { mode: 'school', value: school.name });
    }));
  }

  function setMode(nextMode, restore = true) {
    modeState[mode].value = input.value;
    mode = nextMode;
    const communityMode = mode === 'community';
    communityModeButton.classList.toggle('is-active', communityMode);
    schoolModeButton.classList.toggle('is-active', !communityMode);
    communityModeButton.setAttribute('aria-selected', String(communityMode));
    schoolModeButton.setAttribute('aria-selected', String(!communityMode));
    queryLabel.textContent = communityMode ? '小区名称' : '学校名称';
    input.placeholder = communityMode ? '如：诺德假日花园' : '如：南山实验教育集团荔林小学';
    queryHint.textContent = communityMode
      ? '支持模糊搜索；命中多个官方小区名称时，会合并展示其对应学校。'
      : '支持学校名模糊搜索；同名或不同校区学校会先请你选择。';
    renderSaved();
    if (restore) {
      input.value = modeState[mode].value;
      if (input.value.trim()) search();
      else result.innerHTML = `<div class="empty"><span class="empty-icon">⌕</span><p>输入${communityMode ? '小区名称' : '学校名称'}开始查询</p></div>`;
      input.focus();
    }
  }

  function search() {
    hideSuggestions();
    if (loadError) {
      result.innerHTML = `<div class="empty"><span class="empty-icon">!</span><p>官方数据加载失败</p><small>${escape(loadError)}。请使用本地网页服务器或将本目录部署到静态网站后再打开。</small></div>`;
      return;
    }
    const query = input.value.trim();
    modeState[mode].value = query;
    if (!query) { result.innerHTML = `<div class="empty"><span class="empty-icon">⌕</span><p>输入${mode === 'community' ? '小区名称' : '学校名称'}开始查询</p></div>`; return; }
    if (mode === 'school') {
      const matchedSchools = schoolCandidates(query);
      if (matchedSchools.length === 1) { renderSchoolResult(matchedSchools, `搜索：${query}`, { mode: 'school', value: query }); return; }
      if (matchedSchools.length > 50) {
        result.innerHTML = `<div class="empty"><span class="empty-icon">⌕</span><p>找到 ${matchedSchools.length} 所相近学校</p><small>关键词范围较宽，请继续输入 1–2 个字缩小范围。</small></div>`;
        return;
      }
      if (matchedSchools.length > 1) { renderSchoolChoices(matchedSchools); return; }
      result.innerHTML = '<div class="empty"><span class="empty-icon">?</span><p>未找到该学校</p><small>可尝试学校名称的一部分，或到下方官方学区图核验。</small></div>';
      return;
    }
    const homes = candidates(query);
    // 一般的局部输入会命中少量官方名称，直接合并反查，不让某一个名称丢失学段。
    if (homes.length >= 1 && homes.length <= 12) { renderResult(homes, `搜索：${query}`, { mode: 'community', value: query }); return; }
    if (homes.length > 50) {
      result.innerHTML = `<div class="empty"><span class="empty-icon">⌕</span><p>找到 ${homes.length} 个相近小区</p><small>关键词范围较宽，请继续输入 1–2 个字缩小范围。</small></div>`;
      return;
    }
    if (homes.length > 12) {
      result.innerHTML = `<h2>选择小区</h2><p class="hint">找到 ${homes.length} 个相近小区：</p><div class="candidates">${homes.map(home => `<button type="button" data-home="${escape(home)}">${escape(home)}</button>`).join('')}</div>`;
      result.querySelectorAll('[data-home]').forEach(button => button.addEventListener('click', () => {
        const officialHomes = relatedHomes(button.dataset.home);
        renderResult(officialHomes, button.dataset.home, { mode: 'community', value: button.dataset.home });
      }));
      return;
    }
    result.innerHTML = '<div class="empty"><span class="empty-icon">?</span><p>未找到该小区</p><small>可尝试完整名称，或到下方官方学区图核验。</small></div>';
  }

  if (loadError) {
    result.innerHTML = `<div class="empty"><span class="empty-icon">!</span><p>官方数据加载失败</p><small>${escape(loadError)}。请使用本地网页服务器或将本目录部署到静态网站后再打开。</small></div>`;
  }
  searchButton.addEventListener('click', search);
  communityModeButton.addEventListener('click', () => setMode('community'));
  schoolModeButton.addEventListener('click', () => setMode('school'));
  savedRecentButton.addEventListener('click', () => { savedPanel = 'recent'; renderSaved(); });
  savedFavoriteButton.addEventListener('click', () => { savedPanel = 'favorite'; renderSaved(); });
  clearSavedButton.addEventListener('click', () => {
    writeSaved(savedPanel, [], mode);
    renderSaved();
    refreshFavoriteToggle();
  });
  input.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); search(); } });
  input.addEventListener('input', () => {
    modeState[mode].value = input.value.trim();
    if (!input.value.trim()) result.innerHTML = `<div class="empty"><span class="empty-icon">⌕</span><p>输入${mode === 'community' ? '小区名称' : '学校名称'}开始查询</p></div>`;
    renderSuggestions();
  });
  input.addEventListener('blur', () => setTimeout(hideSuggestions, 160));
  const officialData = globalThis.NanshanDistrictData || {};
  const timestamp = officialData.exportedAt || officialData.updatedAt;
  if (timestamp) {
    const date = new Date(timestamp);
    snapshotTime.textContent = '更新时间：' + date.getFullYear() + ' 年 ' + (date.getMonth() + 1) + ' 月 ' + date.getDate() + ' 日';
  }
  const associationCount = schools.reduce((count, school) => count + (school.homes || []).length, 0);
  dataSummary.textContent = '当前快照包含 ' + schools.length + ' 所学校、' + associationCount + ' 条学校—小区官方关联。';
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('./sw.js').catch(error => console.warn('离线缓存注册失败：', error));
  }
  renderSaved();
  const shared = new URLSearchParams(location.search);
  const sharedMode = shared.get('mode');
  const sharedQuery = shared.get('q');
  if (sharedQuery && (sharedMode === 'community' || sharedMode === 'school')) {
    setMode(sharedMode, false);
    input.value = sharedQuery;
    search();
  }
});

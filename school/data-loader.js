/* 统一学区数据源：内置快照兜底，本地已下载快照优先，后台检查 GitHub Pages 更新。 */
(() => {
  const OFFICIAL_SOURCES = new Set([
    'https://nszs.szns.gov.cn/visitnsgbxyxqdt',
    'https://nszs.szns.gov.cn/visitnsgbcyxqdt',
    'https://zs.szft.gov.cn/visitftgbxyxqdt',
    'https://zs.szft.gov.cn/visitftgbcyxqdt'
  ]);
  // GitHub Pages is published from the repository's /pages directory, rather
  // than from the domain root. Keep this explicit for native App WebViews,
  // whose local capacitor:// origin cannot infer the public path.
  const defaultRemoteBase = 'https://xiukeung.github.io/pages/school/';
  const rawGitHubDataUrl = 'https://raw.githubusercontent.com/xiuKeung/Pages/main/school/school-districts-official.json';
  const remoteBase = /^https?:$/.test(location.protocol)
    ? new URL('./', location.href).href
    : defaultRemoteBase;
  const normalize = raw => {
    if (!raw || !Array.isArray(raw.schools)) return null;
    const sources = Array.isArray(raw.sources) ? raw.sources : [];
    if (sources.some(source => !OFFICIAL_SOURCES.has(source))) return null;
    const schools = raw.schools
      .filter(school => school && typeof school.name === 'string' && Array.isArray(school.homes))
      .map(({ district, level, name, homes }) => ({ district, level, name, homes }));
    if (!schools.length) return null;
    return {
      updatedAt: Number(raw.updatedAt || Date.parse(raw.exportedAt) || 0),
      exportedAt: raw.exportedAt || new Date(Number(raw.updatedAt || 0)).toISOString(),
      sources,
      schools
    };
  };
  const apply = data => {
    const normalized = normalize(data);
    if (!normalized) return false;
    globalThis.NanshanDistrictData = normalized;
    return true;
  };
  const readJson = async url => {
    const nativeHttp = globalThis.Capacitor?.Plugins?.CapacitorHttp;
    if (globalThis.NativeStore?.isNative?.() && nativeHttp?.get) {
      const response = await nativeHttp.get({ url, headers: { 'Cache-Control': 'no-cache' } });
      return typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
    }
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`远程数据请求失败（${response.status}）`);
    return response.json();
  };
  const emit = (name, detail) => window.dispatchEvent(new CustomEvent(name, { detail }));
  const builtIn = normalize(globalThis.NanshanDistrictData) || { updatedAt: 0, schools: [], sources: [] };
  let current = builtIn;

  async function readRemoteDataset() {
    try {
      const versionUrl = new URL('data-version.json', remoteBase);
      versionUrl.searchParams.set('t', String(Date.now()));
      const version = await readJson(versionUrl.href);
      const remoteUpdatedAt = Number(version.updatedAt || 0);
      const dataUrl = new URL(version.dataUrl || 'school-districts-official.json', remoteBase);
      dataUrl.searchParams.set('v', String(remoteUpdatedAt || Date.now()));
      const data = normalize(await readJson(dataUrl.href));
      if (!data || (remoteUpdatedAt && Number(data.updatedAt || 0) < remoteUpdatedAt)) {
        throw new Error('GitHub Pages 学区数据校验失败');
      }
      return data;
    } catch (pagesError) {
      // GitHub Pages 尚未发布或临时不可达时，直接使用同一仓库的公开原始数据作兜底。
      const fallback = normalize(await readJson(`${rawGitHubDataUrl}?v=${Date.now()}`));
      if (!fallback) throw pagesError;
      return fallback;
    }
  }

  async function checkForUpdate({ manual = false } = {}) {
    try {
      emit('schooldistrictdatastatus', { state: 'checking', manual });
      const next = await readRemoteDataset();
      if (Number(next.updatedAt || 0) <= Number(current.updatedAt || 0)) {
        emit('schooldistrictdatastatus', { state: 'current', manual, data: current });
        return false;
      }
      await globalThis.NativeStore.saveSchoolDistrictDataset(next);
      current = next;
      apply(next);
      emit('schooldistrictdataupdated', next);
      emit('schooldistrictdatastatus', { state: 'updated', manual, data: next });
      return true;
    } catch (error) {
      console.warn('学区数据更新检查失败：', error);
      emit('schooldistrictdatastatus', { state: 'failed', manual, error });
      return false;
    }
  }

  globalThis.SchoolDistrictDataReady = (async () => {
    await globalThis.NativeStore?.ready?.();
    const stored = await globalThis.NativeStore?.getSchoolDistrictDataset?.();
    const local = normalize(stored);
    if (local && Number(local.updatedAt || 0) > Number(current.updatedAt || 0)) {
      current = local;
      apply(local);
    }
    void checkForUpdate();
    return current;
  })();
  globalThis.SchoolDistrictData = { checkForUpdate, getCurrent: () => current };
})();

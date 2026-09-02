import JSZip from 'jszip';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { FilePicker } from '@capawesome/capacitor-file-picker';

const FORMAT = 'shenzhen-home-tools-backup';
const VERSION = 1;
const BackupFile = registerPlugin('BackupFile');
const validPath = path => typeof path === 'string' && path && !path.startsWith('/') && !path.includes('..') && !path.includes('\\');
const BROWSER_IMAGE_DATABASE = 'shenzhen-viewing-images-v1';
const BROWSER_IMAGE_STORE = 'images';
const toast = text => {
  const node = document.getElementById('toast');
  if (!node) return;
  node.textContent = text;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { node.textContent = ''; }, 3000);
};
let pageScrollLock;
function lockPageScroll() {
  if (pageScrollLock) { pageScrollLock.count += 1; return; }
  const body = document.body;
  const root = document.documentElement;
  pageScrollLock = {
    count: 1,
    top: window.scrollY,
    body: { position: body.style.position, top: body.style.top, left: body.style.left, right: body.style.right, width: body.style.width, overflow: body.style.overflow },
    rootOverflow: root.style.overflow
  };
  body.style.position = 'fixed';
  body.style.top = `-${pageScrollLock.top}px`;
  body.style.left = '0';
  body.style.right = '0';
  body.style.width = '100%';
  body.style.overflow = 'hidden';
  root.style.overflow = 'hidden';
}
function unlockPageScroll() {
  if (!pageScrollLock || --pageScrollLock.count > 0) return;
  const { body, rootOverflow, top } = pageScrollLock;
  Object.assign(document.body.style, body);
  document.documentElement.style.overflow = rootOverflow;
  pageScrollLock = null;
  window.scrollTo(0, top);
}
function openDialog(dialog) {
  document.activeElement?.blur?.();
  lockPageScroll();
  document.body.append(dialog);
}
function closeDialog(dialog) {
  dialog.remove();
  unlockPageScroll();
}

function showImportProgress() {
  const dialog = document.createElement('div');
  dialog.className = 'import-progress-dialog';
  dialog.innerHTML = '<div class="import-progress-panel" role="status" aria-live="polite" aria-label="正在导入备份"><div class="import-progress-ring"><span>0%</span></div><h3>正在导入备份</h3><p class="import-progress-status">正在准备导入…</p><p class="import-progress-detail">请勿关闭页面或切换应用</p></div>';
  const ring = dialog.querySelector('.import-progress-ring');
  const percent = ring.querySelector('span');
  const status = dialog.querySelector('.import-progress-status');
  const detail = dialog.querySelector('.import-progress-detail');
  openDialog(dialog);
  return {
    update(value, message, hint) {
      const progress = Math.max(0, Math.min(100, Math.round(value)));
      ring.style.setProperty('--progress', `${progress * 3.6}deg`);
      percent.textContent = `${progress}%`;
      if (message) status.textContent = message;
      if (hint) detail.textContent = hint;
    },
    complete(message) {
      ring.classList.add('is-complete');
      ring.style.setProperty('--progress', '360deg');
      percent.textContent = '✓';
      status.textContent = message || '导入完成';
      detail.textContent = '正在刷新数据…';
    },
    close() { if (dialog.isConnected) closeDialog(dialog); }
  };
}

function fileName() {
  const time = new Date().toISOString().replace(/[:.]/g, '-');
  return `安家笔记备份-${time}.zip`;
}

function download(blob, name) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = name;
  document.body.append(link);
  link.click();
  setTimeout(() => { URL.revokeObjectURL(link.href); link.remove(); }, 500);
}

async function clearIOSBackupCache() {
  if (!window.NativeStore.isNative() || Capacitor.getPlatform() !== 'ios') return;
  try {
    const result = await Filesystem.readdir({ path: 'backups', directory: Directory.Cache });
    await Promise.all((result.files || [])
      .filter(file => String(file.name || '').startsWith('安家笔记备份-'))
      .map(file => Filesystem.deleteFile({ path: `backups/${file.name}`, directory: Directory.Cache })));
  } catch (_) {
    // Cache may not have been created yet, which is already clean.
  }
}
void clearIOSBackupCache();

function browserImageStore(mode, action) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(BROWSER_IMAGE_DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(BROWSER_IMAGE_STORE);
    request.onerror = () => reject(request.error || new Error('无法打开浏览器图片库'));
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction(BROWSER_IMAGE_STORE, mode);
      const store = transaction.objectStore(BROWSER_IMAGE_STORE);
      let result;
      try { result = action(store); }
      catch (error) { database.close(); reject(error); return; }
      transaction.oncomplete = () => { database.close(); resolve(result?.result); };
      transaction.onerror = () => { database.close(); reject(transaction.error || result?.error); };
      transaction.onabort = () => { database.close(); reject(transaction.error || new Error('浏览器图片库操作失败')); };
    };
  });
}
const getBrowserImage = id => browserImageStore('readonly', store => store.get(id));
const putBrowserImage = (id, blob) => browserImageStore('readwrite', store => store.put(blob, id));
const clearBrowserImages = () => browserImageStore('readwrite', store => store.clear());
const parseImageRefs = value => {
  try { const refs = JSON.parse(value || '[]'); return Array.isArray(refs) ? refs : []; }
  catch (_) { return []; }
};

async function browserPhotosForRecords(records) {
  const photos = [];
  for (const record of records || []) {
    for (const [sortOrder, ref] of parseImageRefs(record.imageRefs).entries()) {
      if (!ref?.id) continue;
      const blob = await getBrowserImage(ref.id);
      if (!blob) continue;
      photos.push({
        id: String(ref.id), recordId: String(record.id), name: ref.name || '房源图片',
        type: ref.type || blob.type || 'image/jpeg', width: ref.width || null, height: ref.height || null,
        sortOrder, createdAt: Number(ref.createdAt || record.updatedAt || Date.now()),
        updatedAt: Number(record.updatedAt || Date.now()), blob
      });
    }
  }
  return photos;
}

async function createBackup(dataOverride = null) {
  const native = window.NativeStore.isNative();
  const data = dataOverride || await window.NativeStore.getBackupData();
  const zip = new JSZip();
  const portablePhotos = [];
  const photos = native ? (data.photos || []) : await browserPhotosForRecords(data.records);
  for (const photo of photos) {
    const originalPath = `images/${photo.id}.original`;
    const thumbnailPath = `images/${photo.id}.thumb.jpg`;
    if (native) {
      const [original, thumbnail] = await Promise.all([
        window.NativeStore.readPrivateFile(photo.filePath),
        window.NativeStore.readPrivateFile(photo.thumbnailPath)
      ]);
      zip.file(originalPath, original.data, { base64: true });
      zip.file(thumbnailPath, thumbnail.data, { base64: true });
    } else {
      zip.file(originalPath, photo.blob);
      zip.file(thumbnailPath, photo.blob);
    }
    portablePhotos.push({
      ...photo,
      blob: undefined,
      filePath: undefined,
      thumbnailPath: undefined,
      archiveOriginalPath: originalPath,
      archiveThumbnailPath: thumbnailPath
    });
  }
  zip.file('manifest.json', JSON.stringify({ format: FORMAT, version: VERSION, exportedAt: Date.now() }, null, 2));
  zip.file('data/data.json', JSON.stringify({
    ...data,
    records: data.records.map(record => ({ ...record, imageRefs: '[]' })),
    photos: portablePhotos
  }, null, 2));
  const name = fileName();
  if (!native) {
    download(await zip.generateAsync({ type: 'blob' }), name);
    return;
  }
  const base64 = await zip.generateAsync({ type: 'base64' });
  if (Capacitor.getPlatform() === 'android') {
    await BackupFile.save({ filename: name, data: base64 });
    return;
  }
  const path = `backups/${name}`;
  await Filesystem.writeFile({ path, data: base64, directory: Directory.Cache, recursive: true });
  const uri = await Filesystem.getUri({ path, directory: Directory.Cache });
  try {
    await Share.share({ title: '安家笔记备份', files: [uri.uri], dialogTitle: '导出备份' });
  } finally {
    await Filesystem.deleteFile({ path, directory: Directory.Cache }).catch(() => {});
  }
}

async function chooseBackup() {
  if (window.NativeStore.isNative()) {
    const result = await FilePicker.pickFiles({
      types: ['application/zip', 'application/x-zip-compressed'], limit: 1, readData: true
    });
    const file = result.files[0];
    if (!file?.data) throw new Error('没有读取到备份文件');
    return { base64: file.data, name: file.name };
  }
  const input = document.getElementById('importFile');
  input.accept = '.zip,application/zip';
  return new Promise(resolve => {
    input.onchange = async () => {
      const file = input.files?.[0];
      input.value = '';
      if (!file) return resolve(null);
      resolve({ base64: await new Promise((done, fail) => {
        const reader = new FileReader();
        reader.onload = () => done(String(reader.result).split(',', 2)[1]);
        reader.onerror = () => fail(reader.error);
        reader.readAsDataURL(file);
      }), name: file.name });
    };
    input.click();
  });
}

function chooseImportMode() {
  return new Promise(resolve => {
    const dialog = document.createElement('div');
    dialog.className = 'backup-mode-dialog';
    dialog.innerHTML = '<div class="backup-mode-panel" role="dialog" aria-modal="true" aria-label="选择导入方式"><h3>选择导入方式</h3><p><strong>增量导入</strong>会保留本机已有数据，仅补充新记录，并以最后编辑时间较新的记录为准。</p><p><strong>覆盖导入</strong>会清空本机现有数据，再完整恢复备份。</p><div><button type="button" data-mode="merge">增量导入</button><button type="button" class="danger" data-mode="replace">覆盖导入</button></div><button type="button" class="cancel" data-mode="cancel">取消</button></div>';
    const finish = mode => { closeDialog(dialog); resolve(mode === 'cancel' ? null : mode); };
    dialog.addEventListener('click', event => {
      if (event.target === dialog) return finish('cancel');
      const button = event.target.closest('[data-mode]');
      if (button) finish(button.dataset.mode);
    });
    openDialog(dialog);
  });
}

function chooseExportMode() {
  return new Promise(resolve => {
    const dialog = document.createElement('div');
    dialog.className = 'backup-mode-dialog';
    dialog.innerHTML = '<div class="backup-mode-panel" role="dialog" aria-modal="true" aria-label="选择导出方式"><h3>选择导出方式</h3><p><strong>全量导出</strong>会导出全部看房记录、图片、购房清单、贷款方案和学区收藏。</p><p><strong>手动选择记录导出</strong>仅导出你勾选的看房记录及其图片。</p><div><button type="button" data-mode="full">全量导出</button><button type="button" data-mode="records">选择记录</button></div><button type="button" class="cancel" data-mode="cancel">取消</button></div>';
    const finish = mode => { closeDialog(dialog); resolve(mode === 'cancel' ? null : mode); };
    dialog.addEventListener('click', event => {
      if (event.target === dialog) return finish('cancel');
      const button = event.target.closest('[data-mode]');
      if (button) finish(button.dataset.mode);
    });
    openDialog(dialog);
  });
}

async function chooseRecordsForExport() {
  const records = (await window.NativeStore.getViewingRecords()).sort((a, b) => {
    const time = record => record.viewedAt ? Date.parse(`${record.viewedAt}T00:00:00`) : Number(record.updatedAt || record.createdAt || 0);
    return time(b) - time(a);
  });
  if (!records.length) throw new Error('暂无可导出的看房记录');
  const priority = value => ({ focus: ['重点关注', 'focus'], excluded: ['已排除', 'excluded'], normal: ['普通', ''] }[value] || ['普通', '']);
  return new Promise(resolve => {
    const dialog = document.createElement('div');
    dialog.className = 'backup-mode-dialog backup-record-dialog';
    dialog.innerHTML = `<div class="backup-mode-panel backup-record-picker" role="dialog" aria-modal="true" aria-label="选择要导出的记录"><h3>选择要导出的记录</h3><p>仅导出所选记录及其图片。</p><div class="backup-record-list">${records.map(record => { const [label, kind] = priority(record.priority); const esc = value => String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); const building = record.building ? ` · ${esc(record.building)}` : ''; return `<label><input type="checkbox" value="${esc(record.id)}"><span class="backup-record-info"><b>${esc(record.community || '未命名小区')}${building}</b><span><i class="badge ${kind}">${label}</i><small>看房：${esc(record.viewedAt || '未填写')}</small></span></span></label>`; }).join('')}</div><button type="button" class="primary" data-export-selected disabled>导出 0 条记录</button><button type="button" class="cancel" data-cancel>取消</button></div>`;
    const button = dialog.querySelector('[data-export-selected]');
    const update = () => {
      const count = dialog.querySelectorAll('input:checked').length;
      button.disabled = count === 0;
      button.textContent = `导出 ${count} 条记录`;
    };
    dialog.addEventListener('change', update);
    dialog.addEventListener('click', event => {
      if (event.target === dialog || event.target.closest('[data-cancel]')) { closeDialog(dialog); return resolve(null); }
      if (!event.target.closest('[data-export-selected]')) return;
      const ids = new Set([...dialog.querySelectorAll('input:checked')].map(input => input.value));
      closeDialog(dialog);
      resolve(records.filter(record => ids.has(String(record.id))));
    });
    openDialog(dialog);
  });
}

async function prepareIncrementalRecords(data) {
  const makeId = () => crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  const ids = new Map();
  const records = (data.records || []).map(record => {
    const id = makeId();
    ids.set(String(record.id), id);
    return { ...record, id };
  });
  return {
    ...data,
    records,
    photos: (data.photos || []).filter(photo => ids.has(String(photo.recordId))).map(photo => ({
      ...photo, id: makeId(), recordId: ids.get(String(photo.recordId))
    }))
  };
}

async function restoreBrowserBackup(data, zip, mode, progress) {
  const photosByRecord = new Map();
  const images = [];
  const photoCount = Math.max(data.photos.length, 1);
  for (const [index, photo] of data.photos.entries()) {
    if (!photo?.id || !photo?.recordId || !validPath(photo.archiveOriginalPath)) {
      throw new Error('备份图片索引不正确');
    }
    const entry = zip.file(photo.archiveOriginalPath);
    if (!entry) throw new Error('备份图片文件缺失');
    const blob = await entry.async('blob');
    images.push({ id: String(photo.id), blob });
    const refs = photosByRecord.get(String(photo.recordId)) || [];
    refs.push({
      id: String(photo.id), name: photo.name || '房源图片', type: photo.type || blob.type || 'image/jpeg',
      width: photo.width || null, height: photo.height || null, createdAt: Number(photo.createdAt || Date.now()),
      sortOrder: Number(photo.sortOrder || 0)
    });
    photosByRecord.set(String(photo.recordId), refs);
    progress.update(14 + ((index + 1) / photoCount) * 42, '正在读取备份图片', `已读取 ${index + 1} / ${data.photos.length} 张图片`);
  }
  const records = data.records.map(record => ({
    ...record,
    imageRefs: JSON.stringify((photosByRecord.get(String(record.id)) || []).sort(
      (a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0)
    ))
  }));
  if (mode === 'replace') {
    progress.update(58, '正在清理旧数据', '正在准备恢复备份');
    await clearBrowserImages();
  }
  for (const [index, image] of images.entries()) {
    await putBrowserImage(image.id, image.blob);
    progress.update(58 + ((index + 1) / photoCount) * 27, '正在保存图片', `已保存 ${index + 1} / ${images.length} 张图片`);
  }
  progress.update(88, '正在保存看房记录', `正在写入 ${records.length} 条记录`);
  const existing = await window.NativeStore.getViewingRecords();
  await window.NativeStore.saveViewingRecords(mode === 'merge' ? [...existing, ...records] : records);
  if (mode === 'replace') {
    await window.NativeStore.saveChecklistState(data.checklist && typeof data.checklist === 'object' ? data.checklist : {});
    const mortgage = Array.isArray(data.mortgage)
      ? (data.mortgage.find(item => item.id === 'current')?.data || null)
      : (data.mortgage || null);
    await window.NativeStore.saveMortgageCurrent(mortgage);
    const school = Array.isArray(data.school)
      ? {
          recentCommunity: data.school.filter(item => item.list_type === 'recent' && item.mode === 'community'),
          recentSchool: data.school.filter(item => item.list_type === 'recent' && item.mode === 'school'),
          favoriteCommunity: data.school.filter(item => item.list_type === 'favorite' && item.mode === 'community'),
          favoriteSchool: data.school.filter(item => item.list_type === 'favorite' && item.mode === 'school')
        }
      : (data.school || {});
    await Promise.all([
      window.NativeStore.saveSchoolSaved('recent', 'community', school.recentCommunity || []),
      window.NativeStore.saveSchoolSaved('recent', 'school', school.recentSchool || []),
      window.NativeStore.saveSchoolSaved('favorite', 'community', school.favoriteCommunity || []),
      window.NativeStore.saveSchoolSaved('favorite', 'school', school.favoriteSchool || [])
    ]);
  }
  progress.update(97, '正在整理数据', '即将完成');
  return { records: records.length };
}

async function restoreBackup(mode) {
  const selected = await chooseBackup();
  if (!selected) return;
  let progress;
  let written = [];
  try {
    progress = showImportProgress();
    progress.update(4, '正在读取备份', '正在打开备份文件');
    const zip = await JSZip.loadAsync(selected.base64, { base64: true });
    progress.update(9, '正在校验备份', '正在检查备份内容');
    const manifestEntry = zip.file('manifest.json');
    const dataEntry = zip.file('data/data.json');
    if (!manifestEntry || !dataEntry) throw new Error('备份文件缺少必要数据');
    const manifest = JSON.parse(await manifestEntry.async('text'));
    if (manifest.format !== FORMAT || manifest.version !== VERSION) throw new Error('不是可识别的完整备份文件');
    let data = JSON.parse(await dataEntry.async('text'));
    if (!Array.isArray(data.records) || !Array.isArray(data.photos)) throw new Error('备份数据格式不正确');
    if (mode === 'replace' && !confirm('覆盖导入会清空当前设备内的所有本地数据，确认继续吗？')) {
      progress.close();
      return;
    }
    progress.update(12, '正在准备导入', `共 ${data.records.length} 条记录、${data.photos.length} 张图片`);
    if (mode === 'merge') {
      data = await prepareIncrementalRecords(data);
      progress.update(14, '正在准备增量导入', `共 ${data.records.length} 条记录、${data.photos.length} 张图片`);
    }

    if (!window.NativeStore.isNative()) {
      const result = await restoreBrowserBackup(data, zip, mode, progress);
      progress.complete(mode === 'merge' ? `已增量导入 ${result.records} 条看房记录` : `已恢复 ${result.records} 条看房记录`);
      setTimeout(() => location.reload(), 700);
      return;
    }

    const prefix = `viewings/restored-${Date.now()}`;
    const totalWrites = Math.max(data.photos.length * 2, 1);
    let completedWrites = 0;
    for (const photo of data.photos) {
      if (!photo?.id || !photo?.recordId || !validPath(photo.archiveOriginalPath) || !validPath(photo.archiveThumbnailPath)) {
        throw new Error('备份图片索引不正确');
      }
      const originalEntry = zip.file(photo.archiveOriginalPath);
      const thumbnailEntry = zip.file(photo.archiveThumbnailPath);
      if (!originalEntry || !thumbnailEntry) throw new Error('备份图片文件缺失');
      const base = `${prefix}/${photo.recordId}/${photo.id}`;
      photo.filePath = `${base}.original`;
      photo.thumbnailPath = `${base}.thumb.jpg`;
      written.push({ filePath: photo.filePath, thumbnailPath: photo.thumbnailPath });
      await window.NativeStore.writePrivateFile(photo.filePath, await originalEntry.async('base64'));
      completedWrites += 1;
      progress.update(14 + (completedWrites / totalWrites) * 74, '正在保存图片', `已保存 ${Math.ceil(completedWrites / 2)} / ${data.photos.length} 张图片`);
      await window.NativeStore.writePrivateFile(photo.thumbnailPath, await thumbnailEntry.async('base64'));
      completedWrites += 1;
      progress.update(14 + (completedWrites / totalWrites) * 74, '正在保存图片', `已保存 ${Math.ceil(completedWrites / 2)} / ${data.photos.length} 张图片`);
      written.push(photo.filePath, photo.thumbnailPath);
    }
    progress.update(90, '正在保存看房记录', `正在写入 ${data.records.length} 条记录`);
    const result = mode === 'merge'
      ? await window.NativeStore.mergeBackupData(data)
      : await window.NativeStore.restoreBackupData(data);
    progress.complete(mode === 'merge' ? `已增量导入 ${result.records} 条看房记录` : `已恢复 ${data.records.length} 条看房记录`);
  } catch (error) {
    await Promise.all(written.map(image => window.NativeStore.deleteViewingImage(image).catch(() => {})));
    progress?.close();
    throw error;
  }
  setTimeout(() => location.reload(), 700);
}

document.getElementById('export')?.addEventListener('click', async event => {
  event.preventDefault();
  event.stopImmediatePropagation();
  event.currentTarget?.blur?.();
  try {
    const mode = await chooseExportMode();
    if (!mode) return;
    if (mode === 'full') {
      toast('正在生成全量备份…');
      await createBackup();
      toast('全量备份已生成。');
    } else {
      const records = await chooseRecordsForExport();
      if (!records) return;
      const data = await window.NativeStore.getBackupData();
      const ids = new Set(records.map(record => String(record.id)));
      toast(`正在生成 ${records.length} 条记录的备份…`);
      await createBackup({
        ...data,
        records,
        photos: (data.photos || []).filter(photo => ids.has(String(photo.recordId))),
        checklist: {}, mortgage: [], school: []
      });
      toast(`已导出 ${records.length} 条记录。`);
    }
  } catch (error) {
    console.error(error);
    toast(`导出失败：${error.message || '请重试'}`);
  }
}, true);

document.getElementById('importButton')?.addEventListener('click', async event => {
  event.preventDefault();
  event.stopImmediatePropagation();
  event.currentTarget?.blur?.();
  try {
    const mode = await chooseImportMode();
    if (!mode) return;
    await restoreBackup(mode);
  } catch (error) {
    console.error(error);
    toast(`导入失败：${error.message || '请选择正确的 ZIP 备份'}`);
  }
}, true);

import JSZip from 'jszip';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { FilePicker } from '@capawesome/capacitor-file-picker';

const FORMAT = 'shenzhen-home-tools-backup';
const VERSION = 1;
const BackupFile = registerPlugin('BackupFile');
const validPath = path => typeof path === 'string' && path && !path.startsWith('/') && !path.includes('..') && !path.includes('\\');
const toast = text => {
  const node = document.getElementById('toast');
  if (!node) return;
  node.textContent = text;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { node.textContent = ''; }, 3000);
};

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

async function createBackup(dataOverride = null) {
  const native = window.NativeStore.isNative();
  const data = dataOverride || await window.NativeStore.getBackupData();
  const zip = new JSZip();
  const portablePhotos = [];
  for (const photo of data.photos) {
    const originalPath = `images/${photo.id}.original`;
    const thumbnailPath = `images/${photo.id}.thumb.jpg`;
    const [original, thumbnail] = await Promise.all([
      window.NativeStore.readPrivateFile(photo.filePath),
      window.NativeStore.readPrivateFile(photo.thumbnailPath)
    ]);
    zip.file(originalPath, original.data, { base64: true });
    zip.file(thumbnailPath, thumbnail.data, { base64: true });
    portablePhotos.push({
      ...photo,
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
  await Share.share({ title: '安家笔记备份', files: [uri.uri], dialogTitle: '导出备份' });
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
    const finish = mode => { dialog.remove(); resolve(mode === 'cancel' ? null : mode); };
    dialog.addEventListener('click', event => {
      if (event.target === dialog) return finish('cancel');
      const button = event.target.closest('[data-mode]');
      if (button) finish(button.dataset.mode);
    });
    document.body.append(dialog);
  });
}

function chooseExportMode() {
  return new Promise(resolve => {
    const dialog = document.createElement('div');
    dialog.className = 'backup-mode-dialog';
    dialog.innerHTML = '<div class="backup-mode-panel" role="dialog" aria-modal="true" aria-label="选择导出方式"><h3>选择导出方式</h3><p><strong>全量导出</strong>会导出全部看房记录、图片、购房清单、贷款方案和学区收藏。</p><p><strong>手动选择记录导出</strong>仅导出你勾选的看房记录及其图片。</p><div><button type="button" data-mode="full">全量导出</button><button type="button" data-mode="records">选择记录</button></div><button type="button" class="cancel" data-mode="cancel">取消</button></div>';
    const finish = mode => { dialog.remove(); resolve(mode === 'cancel' ? null : mode); };
    dialog.addEventListener('click', event => {
      if (event.target === dialog) return finish('cancel');
      const button = event.target.closest('[data-mode]');
      if (button) finish(button.dataset.mode);
    });
    document.body.append(dialog);
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
    dialog.className = 'backup-mode-dialog';
    dialog.innerHTML = `<div class="backup-mode-panel backup-record-picker" role="dialog" aria-modal="true" aria-label="选择要导出的记录"><h3>选择要导出的记录</h3><p>仅导出所选记录及其图片。</p><div class="backup-record-list">${records.map(record => { const [label, kind] = priority(record.priority); return `<label><input type="checkbox" value="${String(record.id).replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"><span class="backup-record-info"><b>${String(record.community || '未命名小区').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</b><span><i class="badge ${kind}">${label}</i><small>看房：${String(record.viewedAt || '未填写').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</small></span></span></label>`; }).join('')}</div><button type="button" class="primary" data-export-selected disabled>导出 0 条记录</button><button type="button" class="cancel" data-cancel>取消</button></div>`;
    const button = dialog.querySelector('[data-export-selected]');
    const update = () => {
      const count = dialog.querySelectorAll('input:checked').length;
      button.disabled = count === 0;
      button.textContent = `导出 ${count} 条记录`;
    };
    dialog.addEventListener('change', update);
    dialog.addEventListener('click', event => {
      if (event.target === dialog || event.target.closest('[data-cancel]')) { dialog.remove(); return resolve(null); }
      if (!event.target.closest('[data-export-selected]')) return;
      const ids = new Set([...dialog.querySelectorAll('input:checked')].map(input => input.value));
      dialog.remove();
      resolve(records.filter(record => ids.has(String(record.id))));
    });
    document.body.append(dialog);
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

async function restoreBackup(mode) {
  const selected = await chooseBackup();
  if (!selected) return;
  const zip = await JSZip.loadAsync(selected.base64, { base64: true });
  const manifestEntry = zip.file('manifest.json');
  const dataEntry = zip.file('data/data.json');
  if (!manifestEntry || !dataEntry) throw new Error('备份文件缺少必要数据');
  const manifest = JSON.parse(await manifestEntry.async('text'));
  if (manifest.format !== FORMAT || manifest.version !== VERSION) throw new Error('不是可识别的完整备份文件');
  let data = JSON.parse(await dataEntry.async('text'));
  if (!Array.isArray(data.records) || !Array.isArray(data.photos)) throw new Error('备份数据格式不正确');
  if (!window.NativeStore.isNative()) throw new Error('浏览器仅支持导出；完整恢复请在 App 中进行');
  if (mode === 'replace' && !confirm('覆盖导入会清空当前 App 内的所有本地数据，确认继续吗？')) return;
  if (mode === 'merge') data = await prepareIncrementalRecords(data);

  const prefix = `viewings/restored-${Date.now()}`;
  const written = [];
  try {
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
      await window.NativeStore.writePrivateFile(photo.filePath, await originalEntry.async('base64'));
      await window.NativeStore.writePrivateFile(photo.thumbnailPath, await thumbnailEntry.async('base64'));
      written.push(photo.filePath, photo.thumbnailPath);
    }
    const result = mode === 'merge'
      ? await window.NativeStore.mergeBackupData(data)
      : await window.NativeStore.restoreBackupData(data);
    const message = mode === 'merge'
      ? `已增量导入 ${result.records} 条看房记录，页面即将刷新。`
      : `已恢复 ${data.records.length} 条看房记录，页面即将刷新。`;
    toast(message);
  } catch (error) {
    await Promise.all(written.map(path => window.NativeStore.deleteViewingImage({ filePath: path, thumbnailPath: path })));
    throw error;
  }
  setTimeout(() => location.reload(), 700);
}

document.getElementById('export')?.addEventListener('click', async event => {
  event.preventDefault();
  event.stopImmediatePropagation();
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
  try {
    const mode = await chooseImportMode();
    if (!mode) return;
    await restoreBackup(mode);
  } catch (error) {
    console.error(error);
    toast(`导入失败：${error.message || '请选择正确的 ZIP 备份'}`);
  }
}, true);

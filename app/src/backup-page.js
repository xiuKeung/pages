import JSZip from 'jszip';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { FilePicker } from '@capawesome/capacitor-file-picker';

const FORMAT = 'shenzhen-home-tools-backup';
const VERSION = 1;
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
  return `深圳买房工具备份-${time}.zip`;
}

function download(blob, name) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = name;
  document.body.append(link);
  link.click();
  setTimeout(() => { URL.revokeObjectURL(link.href); link.remove(); }, 500);
}

async function createBackup() {
  const native = window.NativeStore.isNative();
  const data = await window.NativeStore.getBackupData();
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
  const path = `backups/${name}`;
  await Filesystem.writeFile({
    path,
    data: await zip.generateAsync({ type: 'base64' }),
    directory: Directory.Cache,
    recursive: true
  });
  const uri = await Filesystem.getUri({ path, directory: Directory.Cache });
  await Share.share({ title: '深圳买房工具完整备份', files: [uri.uri], dialogTitle: '导出完整备份' });
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

async function restoreBackup() {
  const selected = await chooseBackup();
  if (!selected) return;
  const zip = await JSZip.loadAsync(selected.base64, { base64: true });
  const manifestEntry = zip.file('manifest.json');
  const dataEntry = zip.file('data/data.json');
  if (!manifestEntry || !dataEntry) throw new Error('备份文件缺少必要数据');
  const manifest = JSON.parse(await manifestEntry.async('text'));
  if (manifest.format !== FORMAT || manifest.version !== VERSION) throw new Error('不是可识别的完整备份文件');
  const data = JSON.parse(await dataEntry.async('text'));
  if (!Array.isArray(data.records) || !Array.isArray(data.photos)) throw new Error('备份数据格式不正确');
  if (!window.NativeStore.isNative()) throw new Error('浏览器仅支持导出；完整恢复请在 App 中进行');

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
    await window.NativeStore.restoreBackupData(data);
  } catch (error) {
    await Promise.all(written.map(path => window.NativeStore.deleteViewingImage({ filePath: path, thumbnailPath: path })));
    throw error;
  }
  toast(`已恢复 ${data.records.length} 条看房记录，页面即将刷新。`);
  setTimeout(() => location.reload(), 700);
}

document.getElementById('export')?.addEventListener('click', async event => {
  event.preventDefault();
  event.stopImmediatePropagation();
  try {
    toast('正在生成完整备份…');
    await createBackup();
    toast('完整备份已生成。');
  } catch (error) {
    console.error(error);
    toast(`导出失败：${error.message || '请重试'}`);
  }
}, true);

document.getElementById('importButton')?.addEventListener('click', async event => {
  event.preventDefault();
  event.stopImmediatePropagation();
  try {
    await restoreBackup();
  } catch (error) {
    console.error(error);
    toast(`导入失败：${error.message || '请选择正确的 ZIP 备份'}`);
  }
}, true);

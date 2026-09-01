import { Capacitor, registerPlugin } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite';
import { Directory, Filesystem } from '@capacitor/filesystem';

const DATABASE = 'shenzhen_home_tools';
const CHECKLIST_BROWSER_KEY = 'shenzhen-purchase-checklist-v1';
const MORTGAGE_BROWSER_KEY = 'sz-mortgage-calculator-state';
const VIEWINGS_BROWSER_KEY = 'shenzhen-viewing-records-v1';
let db;
let sqlite;
let readyPromise;
let viewingCache;
const BackupFile = registerPlugin('BackupFile');
const PhotoLibrary = registerPlugin('PhotoLibrary');
const BROWSER_IMAGE_DATABASE = 'shenzhen-viewing-images-v1';
const BROWSER_IMAGE_STORE = 'images';

function dataUrlPayload(dataUrl) {
  return dataUrl.split(',', 2)[1] || '';
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error || new Error('无法读取图片'));
    reader.readAsDataURL(blob);
  });
}

function browserImageStore(mode, action) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(BROWSER_IMAGE_DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(BROWSER_IMAGE_STORE);
    request.onerror = () => reject(request.error || new Error('无法打开浏览器图片库'));
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction(BROWSER_IMAGE_STORE, mode);
      try { action(transaction.objectStore(BROWSER_IMAGE_STORE)); }
      catch (error) { database.close(); reject(error); return; }
      transaction.oncomplete = () => { database.close(); resolve(); };
      transaction.onerror = () => { database.close(); reject(transaction.error || new Error('浏览器图片库操作失败')); };
      transaction.onabort = () => { database.close(); reject(transaction.error || new Error('浏览器图片库操作失败')); };
    };
  });
}

function imageRefsForRecord(record) {
  try {
    const refs = JSON.parse(record?.imageRefs || '[]');
    return Array.isArray(refs) ? refs : [];
  } catch {
    return [];
  }
}

async function makeThumbnail(blob) {
  const sourceUrl = URL.createObjectURL(blob);
  try {
    const image = await new Promise((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('无法生成图片缩略图'));
      element.src = sourceUrl;
    });
    const longestEdge = Math.max(image.naturalWidth, image.naturalHeight) || 1;
    const scale = Math.min(1, 480 / longestEdge);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
    const thumbnail = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.78));
    if (!thumbnail) throw new Error('无法生成图片缩略图');
    return { blob: thumbnail, width: image.naturalWidth, height: image.naturalHeight };
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

async function removePrivateFile(path) {
  if (!path || !isNative()) return;
  try {
    await Filesystem.deleteFile({ path, directory: Directory.Data });
  } catch {
    // A missing file is already the desired state.
  }
}

const schema = `
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS app_meta (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS viewing_records (
    id TEXT PRIMARY KEY NOT NULL,
    community TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'normal',
    viewed_at TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    data_json TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS viewing_photos (
    id TEXT PRIMARY KEY NOT NULL,
    record_id TEXT NOT NULL,
    file_path TEXT NOT NULL,
    thumbnail_path TEXT NOT NULL,
    original_name TEXT,
    mime_type TEXT NOT NULL,
    width INTEGER,
    height INTEGER,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (record_id) REFERENCES viewing_records(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS checklist_items (
    item_id TEXT PRIMARY KEY NOT NULL,
    done INTEGER NOT NULL DEFAULT 0,
    note TEXT NOT NULL DEFAULT '',
    is_open INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS mortgage_schemes (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL DEFAULT '当前方案',
    data_json TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS school_saved_queries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    list_type TEXT NOT NULL CHECK (list_type IN ('recent', 'favorite')),
    mode TEXT NOT NULL CHECK (mode IN ('community', 'school')),
    value TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    UNIQUE (list_type, mode, value)
  );
  CREATE TABLE IF NOT EXISTS app_json (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_viewing_photos_record
    ON viewing_photos(record_id, sort_order);
  CREATE INDEX IF NOT EXISTS idx_school_saved_queries_list
    ON school_saved_queries(list_type, mode, created_at DESC);
`;

function browserJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

function isNative() {
  return Capacitor.isNativePlatform();
}

async function openNativeDatabase() {
  if (db) return db;
  sqlite = new SQLiteConnection(CapacitorSQLite);
  const consistency = await sqlite.checkConnectionsConsistency();
  const connectionExists = await sqlite.isConnection(DATABASE, false);
  db = consistency.result && connectionExists.result
    ? await sqlite.retrieveConnection(DATABASE, false)
    : await sqlite.createConnection(DATABASE, false, 'no-encryption', 1, false);
  await db.open();
  await db.execute(schema, false);
  await db.run(
    `INSERT INTO app_meta (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    ['schema_version', '1', Date.now()],
    false
  );
  return db;
}

async function ready() {
  if (!isNative()) return null;
  if (!readyPromise) readyPromise = openNativeDatabase();
  return readyPromise;
}

async function getChecklistState() {
  if (!isNative()) return browserJson(CHECKLIST_BROWSER_KEY, {});
  const connection = await ready();
  const result = await connection.query(
    'SELECT item_id, done, note, is_open FROM checklist_items ORDER BY item_id'
  );
  return (result.values || []).reduce((state, row) => {
    state[row.item_id] = {
      done: Boolean(row.done),
      note: row.note || '',
      open: Boolean(row.is_open)
    };
    return state;
  }, {});
}

async function saveChecklistState(state) {
  if (!isNative()) {
    localStorage.setItem(CHECKLIST_BROWSER_KEY, JSON.stringify(state));
    return;
  }
  const connection = await ready();
  const now = Date.now();
  await connection.beginTransaction();
  try {
    await connection.run('DELETE FROM checklist_items', [], false);
    for (const [itemId, item] of Object.entries(state)) {
      await connection.run(
        `INSERT INTO checklist_items (item_id, done, note, is_open, updated_at)
         VALUES (?, ?, ?, ?, ?)`,
        [itemId, item.done ? 1 : 0, item.note || '', item.open ? 1 : 0, now],
        false
      );
    }
    await connection.commitTransaction();
  } catch (error) {
    await connection.rollbackTransaction();
    throw error;
  }
}

async function getMortgageCurrent() {
  if (!isNative()) return browserJson(MORTGAGE_BROWSER_KEY, null);
  const connection = await ready();
  const result = await connection.query(
    'SELECT data_json FROM mortgage_schemes WHERE id = ?',
    ['current']
  );
  const serialized = result.values?.[0]?.data_json;
  try {
    return serialized ? JSON.parse(serialized) : null;
  } catch {
    return null;
  }
}

async function saveMortgageCurrent(state) {
  if (!isNative()) {
    localStorage.setItem(MORTGAGE_BROWSER_KEY, JSON.stringify(state));
    return;
  }
  const now = Date.now();
  const connection = await ready();
  await connection.run(
    `INSERT INTO mortgage_schemes (id, name, data_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET name = excluded.name, data_json = excluded.data_json,
       updated_at = excluded.updated_at`,
    ['current', '当前方案', JSON.stringify(state), now, now],
    false
  );
}

async function getSchoolSaved(type, mode) {
  const key = `sz-school-district-${type}-${mode}-v1`;
  if (!isNative()) return browserJson(key, []);
  const connection = await ready();
  const result = await connection.query(
    `SELECT mode, value FROM school_saved_queries
     WHERE list_type = ? AND mode = ? ORDER BY created_at DESC`,
    [type, mode]
  );
  return (result.values || []).map(row => ({ mode: row.mode, value: row.value }));
}

async function saveSchoolSaved(type, mode, rows) {
  const key = `sz-school-district-${type}-${mode}-v1`;
  if (!isNative()) {
    localStorage.setItem(key, JSON.stringify(rows));
    return;
  }
  const connection = await ready();
  await connection.beginTransaction();
  try {
    await connection.run(
      'DELETE FROM school_saved_queries WHERE list_type = ? AND mode = ?',
      [type, mode],
      false
    );
    const base = Date.now();
    for (const [index, row] of rows.entries()) {
      await connection.run(
        `INSERT INTO school_saved_queries (list_type, mode, value, created_at)
         VALUES (?, ?, ?, ?)`,
        [type, mode, row.value, base - index],
        false
      );
    }
    await connection.commitTransaction();
  } catch (error) {
    await connection.rollbackTransaction();
    throw error;
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

async function getViewingRecords() {
  if (viewingCache) return clone(viewingCache);
  if (!isNative()) {
    viewingCache = browserJson(VIEWINGS_BROWSER_KEY, []);
    return clone(viewingCache);
  }
  const connection = await ready();
  const result = await connection.query(
    'SELECT id, created_at, updated_at, data_json FROM viewing_records ORDER BY updated_at DESC'
  );
  viewingCache = (result.values || []).map(row => {
    try {
      return {
        ...JSON.parse(row.data_json),
        id: row.id,
        createdAt: Number(row.created_at),
        updatedAt: Number(row.updated_at)
      };
    } catch {
      return null;
    }
  }).filter(Boolean);
  return clone(viewingCache);
}

function viewingRecordsJson() {
  return JSON.stringify(viewingCache || []);
}

async function saveViewingRecords(records) {
  const cleanRecords = Array.isArray(records)
    ? records.filter(record => record && record.id && String(record.community || '').trim())
    : [];
  viewingCache = clone(cleanRecords);
  if (!isNative()) {
    localStorage.setItem(VIEWINGS_BROWSER_KEY, JSON.stringify(viewingCache));
    return;
  }
  const connection = await ready();
  const now = Date.now();
  const filesToRemove = [];
  await connection.beginTransaction();
  try {
    const existing = await connection.query('SELECT id FROM viewing_records');
    const incomingIds = new Set(cleanRecords.map(record => String(record.id)));
    for (const row of existing.values || []) {
      if (!incomingIds.has(String(row.id))) {
        const photos = await connection.query(
          'SELECT file_path, thumbnail_path FROM viewing_photos WHERE record_id = ?', [row.id]
        );
        for (const photo of photos.values || []) {
          filesToRemove.push(photo.file_path, photo.thumbnail_path);
        }
        await connection.run('DELETE FROM viewing_records WHERE id = ?', [row.id], false);
      }
    }
    for (const record of cleanRecords) {
      const createdAt = Number(record.createdAt || record.updatedAt || now);
      const updatedAt = Number(record.updatedAt || now);
      await connection.run(
        `INSERT INTO viewing_records (id, community, priority, viewed_at, created_at, updated_at, data_json)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET community = excluded.community, priority = excluded.priority,
           viewed_at = excluded.viewed_at, updated_at = excluded.updated_at, data_json = excluded.data_json`,
        [
          String(record.id), String(record.community).trim(), record.priority || 'normal',
          record.viewedAt || null, createdAt, updatedAt, JSON.stringify(record)
        ],
        false
      );
      const imageRefs = (() => {
        try {
          const parsed = JSON.parse(record.imageRefs || '[]');
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      })();
      const currentPhotos = await connection.query(
        'SELECT id, file_path, thumbnail_path FROM viewing_photos WHERE record_id = ?', [String(record.id)]
      );
      const imageIds = new Set(imageRefs.map(ref => String(ref.id)));
      for (const photo of currentPhotos.values || []) {
        if (!imageIds.has(String(photo.id))) {
          filesToRemove.push(photo.file_path, photo.thumbnail_path);
          await connection.run('DELETE FROM viewing_photos WHERE id = ?', [photo.id], false);
        }
      }
      for (const [index, ref] of imageRefs.entries()) {
        if (!ref?.id || !ref.filePath || !ref.thumbnailPath) continue;
        await connection.run(
          `INSERT INTO viewing_photos
             (id, record_id, file_path, thumbnail_path, original_name, mime_type, width, height, sort_order, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET record_id = excluded.record_id, file_path = excluded.file_path,
             thumbnail_path = excluded.thumbnail_path, original_name = excluded.original_name,
             mime_type = excluded.mime_type, width = excluded.width, height = excluded.height,
             sort_order = excluded.sort_order, updated_at = excluded.updated_at`,
          [
            String(ref.id), String(record.id), ref.filePath, ref.thumbnailPath, ref.name || null,
            ref.type || 'image/jpeg', Number(ref.width || 0) || null, Number(ref.height || 0) || null,
            index, Number(ref.createdAt || now), now
          ],
          false
        );
      }
    }
    await connection.commitTransaction();
  } catch (error) {
    await connection.rollbackTransaction();
    throw error;
  }
  await Promise.all(filesToRemove.map(removePrivateFile));
}

async function deleteViewingRecord(recordId) {
  const records = await getViewingRecords();
  const record = records.find(item => String(item.id) === String(recordId));
  if (!record) return false;
  const remaining = records.filter(item => String(item.id) !== String(recordId));
  if (!isNative()) {
    const ids = imageRefsForRecord(record).map(ref => ref?.id).filter(Boolean);
    if (ids.length) await browserImageStore('readwrite', store => ids.forEach(id => store.delete(id)));
  }
  await saveViewingRecords(remaining);
  return true;
}

function setViewingRecordsJson(serialized) {
  try {
    const records = JSON.parse(serialized);
    void saveViewingRecords(records);
  } catch {
    // Ignore malformed page data; the existing saved records stay intact.
  }
}

async function storeViewingImage(recordId, photoId, file) {
  if (!recordId || !photoId || !file) throw new Error('缺少图片或看房记录标识');
  if (!isNative()) return { id: photoId, name: file.name, type: file.type, createdAt: Date.now() };
  const basePath = `viewings/${String(recordId)}/${String(photoId)}`;
  const originalPath = `${basePath}.original`;
  const thumbnailPath = `${basePath}.thumb.jpg`;
  const thumbnail = await makeThumbnail(file);
  await Filesystem.writeFile({
    path: originalPath,
    data: dataUrlPayload(await blobToDataUrl(file)),
    directory: Directory.Data,
    recursive: true
  });
  await Filesystem.writeFile({
    path: thumbnailPath,
    data: dataUrlPayload(await blobToDataUrl(thumbnail.blob)),
    directory: Directory.Data,
    recursive: true
  });
  return {
    id: photoId,
    name: file.name || '房源图片',
    type: file.type || 'image/jpeg',
    filePath: originalPath,
    thumbnailPath,
    width: thumbnail.width,
    height: thumbnail.height,
    size: Number(file.size || 0),
    createdAt: Date.now()
  };
}

async function getViewingImage(ref, thumbnail = true) {
  if (!isNative()) return null;
  const path = thumbnail ? ref?.thumbnailPath : ref?.filePath;
  const mimeType = thumbnail ? 'image/jpeg' : (ref?.type || 'image/jpeg');
  if (!path) return null;
  const result = await Filesystem.readFile({ path, directory: Directory.Data });
  const response = await fetch(`data:${mimeType};base64,${result.data}`);
  return response.blob();
}

async function getViewingImageSize(ref) {
  if (!isNative()) return Number(ref?.size || 0);
  if (Number(ref?.size || 0) > 0) return Number(ref.size);
  if (!ref?.filePath) return 0;
  try {
    const result = await Filesystem.stat({ path: ref.filePath, directory: Directory.Data });
    return Number(result.size || 0);
  } catch {
    return 0;
  }
}

async function deleteViewingImage(ref) {
  if (!isNative()) return;
  await Promise.all([removePrivateFile(ref?.filePath), removePrivateFile(ref?.thumbnailPath)]);
}

async function saveViewingImagesToDevice(images) {
  if (!isNative()) return false;
  const payload = await Promise.all(images.map(async image => ({
    filename: image.name || `房源图片-${Date.now()}.jpg`,
    mimeType: image.type || image.blob?.type || 'image/jpeg',
    data: dataUrlPayload(await blobToDataUrl(image.blob))
  })));
  if (Capacitor.getPlatform() === 'android') await BackupFile.saveImages({ images: payload });
  else if (Capacitor.getPlatform() === 'ios') await PhotoLibrary.saveImages({ images: payload });
  else return false;
  return true;
}

async function readPrivateFile(path) {
  if (!isNative() || !path) throw new Error('无法读取备份文件');
  return Filesystem.readFile({ path, directory: Directory.Data });
}

async function writePrivateFile(path, data) {
  if (!isNative() || !path || path.startsWith('/') || path.includes('..')) {
    throw new Error('备份文件路径不合法');
  }
  await Filesystem.writeFile({ path, data, directory: Directory.Data, recursive: true });
}

async function getBackupData() {
  if (!isNative()) {
    return {
      records: await getViewingRecords(),
      photos: [],
      checklist: await getChecklistState(),
      mortgage: await getMortgageCurrent(),
      school: {
        recentCommunity: await getSchoolSaved('recent', 'community'),
        recentSchool: await getSchoolSaved('recent', 'school'),
        favoriteCommunity: await getSchoolSaved('favorite', 'community'),
        favoriteSchool: await getSchoolSaved('favorite', 'school')
      }
    };
  }
  const connection = await ready();
  const [records, photos, checklist, mortgage, school] = await Promise.all([
    getViewingRecords(),
    connection.query('SELECT * FROM viewing_photos ORDER BY record_id, sort_order'),
    connection.query('SELECT item_id, done, note, is_open FROM checklist_items'),
    connection.query('SELECT id, name, data_json, created_at, updated_at FROM mortgage_schemes'),
    connection.query('SELECT list_type, mode, value, created_at FROM school_saved_queries ORDER BY created_at DESC')
  ]);
  return {
    records,
    photos: (photos.values || []).map(row => ({
      id: row.id, recordId: row.record_id, filePath: row.file_path, thumbnailPath: row.thumbnail_path,
      name: row.original_name, type: row.mime_type, width: row.width, height: row.height,
      sortOrder: row.sort_order, createdAt: row.created_at, updatedAt: row.updated_at
    })),
    checklist: (checklist.values || []).reduce((state, row) => {
      state[row.item_id] = { done: Boolean(row.done), note: row.note || '', open: Boolean(row.is_open) };
      return state;
    }, {}),
    mortgage: (mortgage.values || []).map(row => ({
      id: row.id, name: row.name, data: JSON.parse(row.data_json), createdAt: row.created_at, updatedAt: row.updated_at
    })),
    school: school.values || []
  };
}

async function restoreBackupData(data) {
  if (!isNative()) throw new Error('完整恢复仅在原生 App 中可用');
  const records = Array.isArray(data?.records) ? data.records : [];
  const photos = Array.isArray(data?.photos) ? data.photos : [];
  const connection = await ready();
  const existingPhotos = await connection.query('SELECT file_path, thumbnail_path FROM viewing_photos');
  await connection.beginTransaction();
  try {
    await connection.run('DELETE FROM viewing_photos', [], false);
    await connection.run('DELETE FROM viewing_records', [], false);
    await connection.run('DELETE FROM checklist_items', [], false);
    await connection.run('DELETE FROM mortgage_schemes', [], false);
    await connection.run('DELETE FROM school_saved_queries', [], false);

    const now = Date.now();
    const photosByRecord = new Map();
    for (const photo of photos) {
      if (!photo?.id || !photo?.recordId || !photo.filePath || !photo.thumbnailPath) continue;
      const ref = {
        id: String(photo.id), name: photo.name || '房源图片', type: photo.type || 'image/jpeg',
        filePath: photo.filePath, thumbnailPath: photo.thumbnailPath, width: photo.width || null,
        height: photo.height || null, sortOrder: Number(photo.sortOrder || 0), createdAt: Number(photo.createdAt || now)
      };
      const list = photosByRecord.get(String(photo.recordId)) || [];
      list.push(ref);
      photosByRecord.set(String(photo.recordId), list);
    }
    for (const record of records) {
      if (!record?.id || !String(record.community || '').trim()) continue;
      const imageRefs = (photosByRecord.get(String(record.id)) || []).sort(
        (a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0)
      );
      const restored = { ...record, imageRefs: JSON.stringify(imageRefs) };
      await connection.run(
        `INSERT INTO viewing_records (id, community, priority, viewed_at, created_at, updated_at, data_json)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [restored.id, restored.community, restored.priority || 'normal', restored.viewedAt || null,
          Number(restored.createdAt || now), Number(restored.updatedAt || now), JSON.stringify(restored)],
        false
      );
    }
    for (const photo of photos) {
      if (!photo?.id || !photo?.recordId || !photo.filePath || !photo.thumbnailPath) continue;
      await connection.run(
        `INSERT INTO viewing_photos
           (id, record_id, file_path, thumbnail_path, original_name, mime_type, width, height, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [photo.id, photo.recordId, photo.filePath, photo.thumbnailPath, photo.name || null,
          photo.type || 'image/jpeg', photo.width || null, photo.height || null, photo.sortOrder || 0,
          Number(photo.createdAt || now), Number(photo.updatedAt || now)],
        false
      );
    }
    for (const [itemId, item] of Object.entries(data?.checklist || {})) {
      await connection.run(
        'INSERT INTO checklist_items (item_id, done, note, is_open, updated_at) VALUES (?, ?, ?, ?, ?)',
        [itemId, item.done ? 1 : 0, item.note || '', item.open ? 1 : 0, now], false
      );
    }
    for (const scheme of Array.isArray(data?.mortgage) ? data.mortgage : []) {
      if (!scheme?.id || !scheme.data) continue;
      await connection.run(
        'INSERT INTO mortgage_schemes (id, name, data_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        [scheme.id, scheme.name || '当前方案', JSON.stringify(scheme.data), Number(scheme.createdAt || now), Number(scheme.updatedAt || now)], false
      );
    }
    for (const row of Array.isArray(data?.school) ? data.school : []) {
      if (!row?.list_type || !row?.mode || !row?.value) continue;
      await connection.run(
        'INSERT INTO school_saved_queries (list_type, mode, value, created_at) VALUES (?, ?, ?, ?)',
        [row.list_type, row.mode, row.value, Number(row.created_at || now)], false
      );
    }
    await connection.commitTransaction();
    viewingCache = null;
  } catch (error) {
    await connection.rollbackTransaction();
    throw error;
  }
  await Promise.all((existingPhotos.values || []).flatMap(photo => [
    removePrivateFile(photo.file_path), removePrivateFile(photo.thumbnail_path)
  ]));
}

async function mergeBackupData(data) {
  if (!isNative()) throw new Error('增量导入仅在原生 App 中可用');
  const records = (Array.isArray(data?.records) ? data.records : []).filter(
    record => record?.id && String(record.community || '').trim()
  );
  const recordIds = new Set(records.map(record => String(record.id)));
  const photos = (Array.isArray(data?.photos) ? data.photos : []).filter(
    photo => photo?.id && recordIds.has(String(photo.recordId)) && photo.filePath && photo.thumbnailPath
  );
  const connection = await ready();
  const previousPhotos = recordIds.size
    ? await connection.query(`SELECT file_path, thumbnail_path FROM viewing_photos WHERE record_id IN (${[...recordIds].map(() => '?').join(',')})`, [...recordIds])
    : { values: [] };
  const now = Date.now();
  const photosByRecord = new Map();
  for (const photo of photos) {
    const ref = {
      id: String(photo.id), name: photo.name || '房源图片', type: photo.type || 'image/jpeg',
      filePath: photo.filePath, thumbnailPath: photo.thumbnailPath, width: photo.width || null,
      height: photo.height || null, sortOrder: Number(photo.sortOrder || 0), createdAt: Number(photo.createdAt || now)
    };
    const list = photosByRecord.get(String(photo.recordId)) || [];
    list.push(ref);
    photosByRecord.set(String(photo.recordId), list);
  }
  await connection.beginTransaction();
  try {
    for (const id of recordIds) {
      await connection.run('DELETE FROM viewing_photos WHERE record_id = ?', [id], false);
      await connection.run('DELETE FROM viewing_records WHERE id = ?', [id], false);
    }
    for (const record of records) {
      const imageRefs = (photosByRecord.get(String(record.id)) || []).sort(
        (a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0)
      );
      const restored = { ...record, imageRefs: JSON.stringify(imageRefs) };
      await connection.run(
        `INSERT INTO viewing_records (id, community, priority, viewed_at, created_at, updated_at, data_json)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [restored.id, restored.community, restored.priority || 'normal', restored.viewedAt || null,
          Number(restored.createdAt || now), Number(restored.updatedAt || now), JSON.stringify(restored)],
        false
      );
    }
    for (const photo of photos) {
      await connection.run(
        `INSERT INTO viewing_photos
           (id, record_id, file_path, thumbnail_path, original_name, mime_type, width, height, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [photo.id, photo.recordId, photo.filePath, photo.thumbnailPath, photo.name || null,
          photo.type || 'image/jpeg', photo.width || null, photo.height || null, photo.sortOrder || 0,
          Number(photo.createdAt || now), Number(photo.updatedAt || now)],
        false
      );
    }
    const checklistRows = await connection.query('SELECT item_id FROM checklist_items');
    const checklistIds = new Set((checklistRows.values || []).map(row => String(row.item_id)));
    for (const [itemId, item] of Object.entries(data?.checklist || {})) {
      if (checklistIds.has(String(itemId))) continue;
      await connection.run(
        'INSERT INTO checklist_items (item_id, done, note, is_open, updated_at) VALUES (?, ?, ?, ?, ?)',
        [itemId, item.done ? 1 : 0, item.note || '', item.open ? 1 : 0, now], false
      );
    }
    const schemeRows = await connection.query('SELECT id, updated_at FROM mortgage_schemes');
    const schemes = new Map((schemeRows.values || []).map(row => [String(row.id), Number(row.updated_at || 0)]));
    for (const scheme of Array.isArray(data?.mortgage) ? data.mortgage : []) {
      if (!scheme?.id || !scheme.data) continue;
      const incoming = Number(scheme.updatedAt || scheme.createdAt || 0);
      if (schemes.has(String(scheme.id)) && incoming <= schemes.get(String(scheme.id))) continue;
      await connection.run('DELETE FROM mortgage_schemes WHERE id = ?', [scheme.id], false);
      await connection.run(
        'INSERT INTO mortgage_schemes (id, name, data_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        [scheme.id, scheme.name || '当前方案', JSON.stringify(scheme.data), Number(scheme.createdAt || now), Number(scheme.updatedAt || now)], false
      );
    }
    const schoolRows = await connection.query('SELECT list_type, mode, value FROM school_saved_queries');
    const schoolKeys = new Set((schoolRows.values || []).map(row => `${row.list_type}::${row.mode}::${row.value}`));
    for (const row of Array.isArray(data?.school) ? data.school : []) {
      if (!row?.list_type || !row?.mode || !row?.value) continue;
      const key = `${row.list_type}::${row.mode}::${row.value}`;
      if (schoolKeys.has(key)) continue;
      await connection.run(
        'INSERT INTO school_saved_queries (list_type, mode, value, created_at) VALUES (?, ?, ?, ?)',
        [row.list_type, row.mode, row.value, Number(row.created_at || now)], false
      );
    }
    await connection.commitTransaction();
    viewingCache = null;
  } catch (error) {
    await connection.rollbackTransaction();
    throw error;
  }
  await Promise.all((previousPhotos.values || []).flatMap(photo => [
    removePrivateFile(photo.file_path), removePrivateFile(photo.thumbnail_path)
  ]));
  return { records: records.length };
}

window.NativeStore = {
  isNative,
  ready,
  getChecklistState,
  saveChecklistState,
  getMortgageCurrent,
  saveMortgageCurrent,
  getSchoolSaved,
  saveSchoolSaved,
  getViewingRecords,
  saveViewingRecords,
  deleteViewingRecord,
  viewingRecordsJson,
  setViewingRecordsJson,
  storeViewingImage,
  getViewingImage,
  getViewingImageSize,
  deleteViewingImage,
  saveViewingImagesToDevice,
  readPrivateFile,
  writePrivateFile,
  getBackupData,
  restoreBackupData,
  mergeBackupData
};

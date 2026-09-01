# 本地 App 迁移设计（Capacitor）

## 当前网页数据盘点

| 页面 | localStorage key | 当前值形状 |
| --- | --- | --- |
| checklist | `shenzhen-purchase-checklist-v1` | 以任务 id 为 key 的对象，例如 `{ done, note, open }` |
| viewings | `shenzhen-viewing-records-v1` | 看房记录数组；每条记录含表单字段、`id`、`createdAt`、`updatedAt`，后续字段保留在 JSON 中 |
| calculator | `sz-mortgage-calculator-state` | 当前计算方案对象，含贷款类型、金额、利率、年限和还款方式 |
| school | `sz-school-district-{recent\|favorite}-{community\|school}-v1` | 查询对象数组，元素为 `{ mode, value }` |

网页仍需支持浏览器验证，因此浏览器环境保留一个 localStorage adapter；原生 App 环境由同一套页面调用 SQLite adapter。迁移完成后，原生环境不再把业务读写落到 localStorage。

## SQLite 表设计（schema v1）

```sql
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
```

`viewing_records.data_json` 和 `mortgage_schemes.data_json` 用于保留网页未来新增字段，避免每次加一个表单字段都必须立即升级列；可检索、排序的字段仍保留为明确列。

## 首次启动：不迁移旧 localStorage

本期按确认后的范围执行：原生 App 首次启动只打开 SQLite、建表并开启外键，**不读取、不导入、也不删除**网页旧 localStorage。也就是说，新安装的 App 从空的本地数据开始；网页数据如需保留，应在后续完整备份 / 恢复功能完成后通过备份文件导入。

## 图片与备份

- 原图和缩略图写入 Capacitor Filesystem 的 `Directory.Data`，路径形如 `viewings/{recordId}/{photoId}.original` 与 `viewings/{recordId}/{photoId}.thumb.jpg`。
- SQLite 只保存路径、媒体类型、尺寸、排序和时间；列表只读取缩略图。
- 当前实现的 ZIP 根目录包含 `manifest.json`、`data/data.json` 和 `images/` 下的原图与缩略图；`data.json` 覆盖看房记录、清单、房贷方案及学区收藏。
- 导出先生成到 App 私有缓存目录，再通过 Capacitor Share 调用 iOS 系统分享或 Android 分享；导入通过原生系统文件选择器选择 ZIP，校验 manifest/schema 后恢复数据和图片。
- 导入采用受限的归档路径和新的私有图片目录，避免 ZIP 路径穿越。恢复是“完整替换”：成功后以备份内容替换当前 App 数据；图片写入或 SQLite 事务失败时不会提交数据库替换。

## 后续网页迭代流程

```text
修改上一级目录中的现有 HTML/CSS/JS
  -> cd app && npm run build（复制到 app/www，www 不作为源代码）
  -> npx cap sync
  -> Xcode / Android Studio 构建、安装或发布
```

SQLite 文件位于原生 App 私有目录，不在 `www` 中，因此网页资源更新和 Capacitor 同步不会清空数据。

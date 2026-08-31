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

## 首次迁移

1. 原生 App 启动时打开 SQLite、建表并开启外键。
2. 读取上述 7 个 legacy key；解析失败的单个 key 记录迁移错误，不覆盖有效数据。
3. 在一个 SQLite transaction 中写入看房记录、清单、房贷方案和学区查询。
4. 写入 `app_meta`：`legacy_localstorage_migrated_v1 = <timestamp>`，只有整个事务成功后才写入。
5. 成功后删除已迁移的 legacy localStorage key；失败则保留原值，下一次启动重试。
6. 后续启动只检查 `app_meta` 标记，绝不重复导入。

迁移是幂等的：看房记录和房贷方案按 id/upsert 写入；清单按任务 id upsert；学区查询按 `(list_type, mode, value)` 去重。

## 图片与备份

- 原图和缩略图写入 Capacitor Filesystem 的 `Directory.Data`，路径形如 `viewings/{recordId}/{photoId}.jpg` 与 `viewings/{recordId}/{photoId}.thumb.jpg`。
- SQLite 只保存路径、媒体类型、尺寸、排序和时间；列表只读取缩略图。
- ZIP 根目录包含 `manifest.json`、`data/viewing-records.json`、`data/viewing-photos.json`、`data/checklist.json`、`data/mortgage-schemes.json`、`data/school-saved-queries.json`，以及 `images/` 下的原图和缩略图。
- 导出先生成到 App 私有临时目录，再通过 Capacitor Share 调用 iOS 系统分享或 Android 分享；导入通过原生文件选择器选择 ZIP，校验 manifest/schema 后在事务中恢复数据，再写图片文件。
- 导入采用临时文件名和路径校验，避免 ZIP 路径穿越；图片写入失败时整次恢复失败并保留现有数据。

## 后续网页迭代流程

```text
修改上一级目录中的现有 HTML/CSS/JS
  -> cd app && npm run build（复制到 app/www，www 不作为源代码）
  -> npx cap sync
  -> Xcode / Android Studio 构建、安装或发布
```

SQLite 文件位于原生 App 私有目录，不在 `www` 中，因此网页资源更新和 Capacitor 同步不会清空数据。

# 南山、福田学区信息

“安家笔记”中的学区查询页面。数据只使用南山、福田教育局公布的四张官方学区图，支持：

- 小区查学校：输入小区名称，查询对应小学和初中；
- 学校查小区：输入学校名称，查询官方登记的小区；
- 按南山 / 福田、仅小学 / 仅初中筛选；
- 分开保存两种查询模式的最近查询与收藏；
- 在网页或 App 中检查并下载已发布的最新官方数据。

查询结果仅供参考。最终入学资格、共享学区、多校选择和学位锁定，以当年教育局招生政策及官方学区图为准。

## 官方数据来源

1. [南山小学学区图](https://nszs.szns.gov.cn/visitnsgbxyxqdt)
2. [南山初中学区图](https://nszs.szns.gov.cn/visitnsgbcyxqdt)
3. [福田小学学区图](https://zs.szft.gov.cn/visitftgbxyxqdt)
4. [福田初中学区图](https://zs.szft.gov.cn/visitftgbcyxqdt)

同步脚本会校验来源仅限以上四个网址；不混入其他第三方数据。

## 用户侧数据更新

页面启动后会在后台检查已发布的新数据；学区页面的“检查数据更新”按钮可手动触发一次检查。

数据优先级如下：

1. 已保存到当前设备的较新官方快照；
2. 已发布到 GitHub Pages 的 `data-version.json` 和官方 JSON；
3. 页面内置的 `official-district-data.js` 快照。

GitHub Pages 暂时不可访问时，会尝试读取同一仓库的公开原始数据作为兜底。浏览器与 App 都会把成功下载的较新快照保存到当前设备；这不是 Service Worker 离线缓存。旧版 Service Worker 会在打开页面时自动注销，避免发布后继续使用旧页面。

## 维护者：更新并发布官方数据

更新入口只有一套，分别提供双击脚本：

- macOS：双击 `sync-official-data.command`
- Windows：双击 `sync-official-data.bat`

首次运行需要联网。脚本会自动：

1. 检测并安装 Node 依赖 `playwright`；
2. 检测并下载 Playwright Chromium（缺少时才下载）；
3. 依次读取四张官方学区图的数据；
4. 校验四个来源都成功获取；
5. 原子更新本目录内的三个数据文件。

之后提交并推送这三个文件，GitHub Pages 即可发布新数据；网页和 App 会在后续检查时下载它。

> `node_modules`、`package.json`、`package-lock.json`、Playwright 浏览器和临时文件由根目录 `.gitignore` 忽略，不需要提交。

## 主要文件

| 文件 | 作用 | 是否提交 Git |
| --- | --- | --- |
| `index.html` / `app.js` / `style.css` | 页面界面与交互 | 是 |
| `official-district-data.js` | 内置的精简快照，页面离线启动时使用 | 是 |
| `school-districts-official.json` | 完整的学校—小区官方关联快照 | 是 |
| `data-version.json` | 在线更新的版本与数据地址说明 | 是 |
| `data-loader.js` | 加载本地快照并检查线上更新 | 是 |
| `sync-official-data.js` | 使用四张官方图生成数据文件 | 是 |
| `sync-official-data.command` / `sync-official-data.bat` | macOS / Windows 的双击更新入口 | 是 |
| `node_modules/`、`.playwright/` 等 | 自动安装的本地依赖与浏览器组件 | 否 |

## 本地打开与安装

直接打开 `index.html` 可使用内置数据完成查询。部署到 HTTPS 网站后，支持浏览器的“添加到主屏幕”能力；是否显示安装入口由浏览器决定。

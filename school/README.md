# 深圳南山、福田学区信息

一个可部署为静态网页的深圳南山、福田学区查询工具。支持：

- 小区查学校：输入小区名称，显示对应小学和初中；
- 学校查小区：输入学校名称，显示官方登记的小区名单；
- 南山 / 福田、仅小学 / 仅初中筛选；
- 本地最近查询与收藏、查询链接复制、离线缓存及“添加到主屏幕”支持。

## 数据来源

数据严格来自以下四张教育局官方学区图：

1. [南山小学学区图](https://nszs.szns.gov.cn/visitnsgbxyxqdt)
2. [南山初中学区图](https://nszs.szns.gov.cn/visitnsgbcyxqdt)
3. [福田小学学区图](https://zs.szft.gov.cn/visitftgbxyxqdt)
4. [福田初中学区图](https://zs.szft.gov.cn/visitftgbcyxqdt)

网页仅作查询与比对参考；最终入学资格、共享学区、多校选择和学位锁定，以当年教育局招生政策及官方学区图为准。

## 本地打开

直接打开 `index.html` 可使用查询功能。PWA 安装和离线 Service Worker 需要部署到 HTTPS 网站（例如 GitHub Pages）后才会生效。

## 一键更新官方数据

更新入口只有一个：

- macOS：双击 `sync-official-data.command`
- Windows：双击 `sync-official-data.bat`

首次运行需要联网。脚本会自动：

1. 检测并安装 Node 依赖 `playwright`；
2. 检测并下载 Playwright Chromium（缺少时才下载）；
3. 依次打开四张官方学区图，读取页面官方数据；
4. 校验四个来源均已成功获取；
5. 自动更新 `school-districts-official.json` 和 `official-district-data.js`。

之后将这两个更新后的数据文件提交并推送到 GitHub，GitHub Pages 会自动发布最新版本。

> `node_modules`、`package.json`、`package-lock.json` 和临时文件由根目录 `.gitignore` 忽略，不需要上传。

## 主要文件

| 文件 | 作用 | 是否提交 Git |
| --- | --- | --- |
| `index.html` / `app.js` / `style.css` | 网页界面与交互 | 是 |
| `school-districts-official.json` | 四图导出的完整原始官方数据，含多边形 | 是 |
| `official-district-data.js` | 网页离线查询所需的精简数据 | 是 |
| `sync-official-data.js` | 一键同步逻辑 | 是 |
| `sync-official-data.command` / `sync-official-data.bat` | macOS / Windows 双击入口 | 是 |
| `node_modules/` 等 | 自动安装的本地依赖 | 否 |

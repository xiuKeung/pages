# 安家笔记

安家笔记是一套以静态网页为业务源码、同时可构建为 iOS / Android App 的本地购房工具。所有数据默认保存在当前设备，不依赖账号或服务端。

## 工具

| 页面 | 用途 |
| --- | --- |
| `entrance/` | 工具首页与浅色 / 深色 / 系统主题设置 |
| `viewings/` | 看房记录、学校匹配、月供估算、房源图片与 ZIP 备份 |
| `school/` | 南山、福田官方学区信息查询与数据更新 |
| `calculator/` | 商贷、公积金、组合贷的等额本息 / 等额本金对比 |
| `checklist/` | 购房流程清单与本地进度、备注 |

## 目录结构

```text
Pages/
├── entrance/      工具首页
├── viewings/      看房记录
├── school/        学区查询及官方数据同步脚本
├── calculator/    房贷计算器
├── checklist/     购房清单
├── shared/        由 App 构建生成的网页共享运行时
└── app/           Capacitor 原生壳、iOS / Android 工程和构建脚本
```

网页目录是唯一业务源码。不要直接修改 `app/www/`、`app/android/app/src/main/assets/public/` 或 `app/ios/App/App/public/`；它们由构建脚本生成。

## 日常开发流程

1. 修改对应网页目录，在浏览器中验证；
2. 需要发布网页时，提交并推送网页源码；
3. 需要更新 App 资源时，在 `app/` 执行 `./build-app.sh sync`；
4. 需要 Android 调试安装包时，在 `app/` 执行 `./generate-apk.sh`。

学区官方数据的维护流程见 [school/README.md](school/README.md)。App 构建、原生存储和备份流程见 [app/README.md](app/README.md)。看房记录的数据字段与图片机制见 [viewings/README.md](viewings/README.md)。

## 本地数据与备份

- 浏览器网页将业务数据保存在浏览器本地；
- 原生 App 将业务记录存入 SQLite，房源图片存入 App 私有目录；
- 看房记录可导出包含图片的 ZIP 备份，也可导入恢复；
- 卸载 App 或清除浏览器站点数据会删除该设备本地数据，请定期导出备份。


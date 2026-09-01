# 安家笔记 App 工程

本目录是“安家笔记”的 Capacitor 原生 App 工程。网页源码仍是唯一业务源码，位于本目录的上一级：

```text
Pages/
├── entrance/      工具入口
├── school/        深圳南山、福田学区查询
├── calculator/    房贷计算器
├── viewings/      看房记录
├── checklist/     购房清单
├── shared/        网页与 App 共用的运行时脚本
└── app/           本目录：iOS / Android 原生壳和构建工具
```

不要维护两套网页。日常先修改上一级网页目录并在浏览器验证；打包脚本会将最新网页复制到原生工程。

## 最常用命令

在 `app` 目录执行：

```bash
# 生成 Android 调试 APK（推荐的日常打包命令）
./generate-apk.sh

# 将当前 APK 通过同一 Wi-Fi 的二维码/链接分享给手机
./share-apk.sh
```

`generate-apk.sh` 的完整流程是：

```text
上级网页源码 → app/www → Capacitor 同步 Android / iOS → Gradle 生成 APK
```

APK 输出位置：

```text
app/android/app/build/outputs/apk/debug/app-debug.apk
```

APK 是构建产物，不提交 Git。`share-apk.sh` 保持运行期间，同一个二维码会一直指向这个路径；每次重新打包后再次扫码下载即可获得最新 APK。若 Mac 更换 Wi-Fi、IP 变化或脚本重启，需要重新扫码。

## 脚本说明

| 文件 | 用途 |
| --- | --- |
| `generate-apk.sh` | 一键调用 `build-app.sh android-debug`，同步网页并生成调试 APK。 |
| `build-app.sh` | App 的统一入口：`sync`、`open-ios`、`open-android`、`android-debug`。执行 `./build-app.sh help` 查看说明。 |
| `share-apk.sh` | 在 Mac 当前局域网地址启动临时 HTTP 下载服务，显示 APK 下载链接和二维码；按 `Ctrl+C` 停止。手机与 Mac 必须连接同一 Wi-Fi。 |
| `scripts/build-web.mjs` | 将网页页面复制到 `www/`，并打包 App 所需的共享脚本。通常由打包脚本自动调用，不需单独运行。 |

## 目录说明

| 路径 | 说明 |
| --- | --- |
| `capacitor.config.ts` | App ID、名称和 Capacitor Web 目录配置。当前显示名称为“安家笔记”。 |
| `package.json` / `package-lock.json` | Node 依赖和锁定版本。换电脑后执行 `npm ci` 安装。 |
| `src/native-store.js` | 原生环境的数据访问层：SQLite、看房图片私有文件存储、缩略图、备份数据读写。浏览器环境保留 localStorage 开发回退。 |
| `src/checklist-page.js` | 购房清单页面与原生数据存储的连接。 |
| `src/backup-page.js` | 看房记录 ZIP 备份与恢复；Android 调用系统“保存文件”界面。 |
| `assets/` | 图标和启动图的源图片。修改图标时应保留源图，再生成原生尺寸资源。 |
| `android/` | Android Studio / Gradle 工程。 |
| `ios/` | Xcode 工程。 |
| `docs/native-app-migration.md` | 原生迁移的设计和实现记录。 |
| `www/`、`dist/` | 构建生成的网页文件，忽略 Git，不应手改。 |

## Android 原生定制

关键文件：

| 文件 | 用途 |
| --- | --- |
| `android/app/src/main/java/com/shenzhenhome/toolbox/MainActivity.java` | Android 返回键逻辑、Android 12+ 启动屏初始化、原生插件注册。 |
| `android/app/src/main/java/com/shenzhenhome/toolbox/BackupFilePlugin.java` | 将 ZIP 备份交给 Android 系统文件选择器保存。 |
| `android/app/src/main/AndroidManifest.xml` | App 名称、图标、返回手势等 Android 配置。 |
| `android/app/src/main/res/mipmap-*` | 桌面图标的各分辨率资源。Android 8+ 使用自适应图标。 |
| `android/app/src/main/res/drawable*/splash.png` | 横竖屏启动页背景图。 |
| `android/app/src/main/res/drawable-*/splash_icon.png` | Android 12+ 居中启动图标的高分辨率资源。 |
| `android/app/src/main/res/values/styles.xml` | 启动页背景、启动图标和启动后主题配置。 |

桌面图标和启动图是两套资源：桌面图标要考虑 Android 系统遮罩的安全边距；启动图使用独立资源，避免被桌面图标规则裁切或放大。

## 本地数据与备份

- 原生 App 的业务数据保存于 SQLite；看房照片保存于 App 私有目录，SQLite 只保存照片元数据和文件路径。
- 卸载 App 会删除这些私有数据。
- 看房记录的导出会生成 ZIP（JSON 数据和图片）；导入 ZIP 可恢复。
- Android 导出通过系统文件选择器让用户选择保存位置；iOS 使用系统分享/文件流程。
- 不包含账号、服务器或跨设备同步。

详细数据设计见 [native-app-migration.md](docs/native-app-migration.md)。

## 新电脑继续开发

先准备：Node.js、JDK 21、Android Studio 和 Android SDK；如果需要 iOS，再安装 Xcode。不要提交本机 SDK 路径、构建目录或 APK。

当前 `build-app.sh` 使用 Homebrew 的 JDK 21 路径：

```text
/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home
```

因此 Apple 芯片 Mac 可通过 Homebrew 安装 `openjdk@21`。若新电脑的 JDK 21 安装在其他位置，先修改 `build-app.sh` 中的 `jdk21_home`，再打包。

```bash
git clone <仓库地址>
cd Pages/app
npm ci

# 生成 APK
./generate-apk.sh
```

如需打开原生工程：

```bash
./build-app.sh open-android
./build-app.sh open-ios
```

新电脑的 Android SDK 路径会自动写入本机 `android/local.properties`；该文件被 Git 忽略。

## Git 提交边界

应提交：网页源码、`app/src/`、`app/assets/`、脚本、`package.json`、`package-lock.json`、Android/iOS 原生工程配置和原生资源。

不提交：`node_modules/`、`www/`、`dist/`、Android/iOS 构建目录、`local.properties`、`Pods/`、`.DS_Store`、APK/AAB。

打包完成后，建议检查：

```bash
git status
```

确保新增的源码、图片和原生资源已被加入提交；忽略项可以在新电脑通过安装依赖和执行构建脚本重新生成。

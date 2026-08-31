#!/bin/zsh
set -euo pipefail

app_dir="$(cd "$(dirname "$0")" && pwd)"
cd "$app_dir"

usage() {
  cat <<'EOF'
用法：./build-app.sh [命令]

命令：
  sync            复制最新网页并同步到 iOS / Android（默认）
  open-ios        同步后打开 Xcode 工程
  open-android    同步后打开 Android Studio 工程
  android-debug   同步后生成 Android 调试 APK
  help            显示本帮助

网页源码位于 app 的上一级目录；修改网页后先执行 ./build-app.sh sync。
正式 iOS Archive 和 Android AAB 仍需在配置好签名后的 Xcode / Android Studio 中生成。
EOF
}

sync_web() {
  npm run cap:sync
}

case "${1:-sync}" in
  sync)
    sync_web
    ;;
  open-ios)
    sync_web
    npm run cap:open:ios
    ;;
  open-android)
    sync_web
    npm run cap:open:android
    ;;
  android-debug)
    sync_web
    (cd android && ./gradlew assembleDebug)
    print "调试 APK：$app_dir/android/app/build/outputs/apk/debug/app-debug.apk"
    ;;
  help|-h|--help)
    usage
    ;;
  *)
    print -u2 "未知命令：$1"
    usage
    exit 2
    ;;
esac

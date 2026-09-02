#!/bin/zsh
set -euo pipefail

app_dir="$(cd "$(dirname "$0")" && pwd)"
apk_source="$app_dir/android/app/build/outputs/apk/debug/app-debug.apk"
apk_copy="$app_dir/../安家笔记-debug.apk"

"$app_dir/build-app.sh" android-debug

if [[ ! -f "$apk_source" ]]; then
  print -u2 "构建完成后未找到 APK：$apk_source"
  exit 1
fi

cp "$apk_source" "$apk_copy"
print "已复制 APK：$apk_copy"

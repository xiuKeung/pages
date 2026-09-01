#!/bin/zsh
set -euo pipefail

app_dir="$(cd "$(dirname "$0")" && pwd)"
apk_path="$app_dir/android/app/build/outputs/apk/debug/app-debug.apk"
port="${APK_SHARE_PORT:-8787}"

if [[ ! -f "$apk_path" ]]; then
  print "未找到 APK：$apk_path"
  print "请先运行：$app_dir/generate-apk.sh"
  exit 1
fi

local_ip=""
for interface in en0 en1; do
  candidate="$(ipconfig getifaddr "$interface" 2>/dev/null || true)"
  if [[ -n "$candidate" ]]; then
    local_ip="$candidate"
    break
  fi
done

if [[ -z "$local_ip" ]]; then
  print "未能识别局域网 IP。请确认 Mac 已连接 Wi-Fi，然后重试。"
  exit 1
fi

download_url="http://${local_ip}:${port}/app-debug.apk"
print ""
print "安家笔记 APK 局域网下载已启动"
print "手机和 Mac 连接同一 Wi-Fi 后，扫码或打开："
print "$download_url"
print ""

qr_python=""
for candidate in /usr/local/bin/python3 /opt/homebrew/bin/python3 "$(command -v python3 2>/dev/null || true)"; do
  if [[ -n "$candidate" && -x "$candidate" ]] && "$candidate" -c 'import qrcode' 2>/dev/null; then
    qr_python="$candidate"
    break
  fi
done

if [[ -n "$qr_python" ]]; then
  APK_SHARE_URL="$download_url" "$qr_python" - <<'PY'
import os
import qrcode

code = qrcode.QRCode(border=1)
code.add_data(os.environ['APK_SHARE_URL'])
code.make(fit=True)
code.print_ascii(invert=True)
PY
else
  print "未安装二维码模块；请在手机浏览器中手动输入上述地址。"
fi

print "按 Ctrl+C 停止分享。"
cd "${apk_path:h}"
python3 -m http.server "$port" --bind "$local_ip"

#!/bin/zsh

set -e
cd "$(dirname "$0")"
node "./generate-official-data.js"
echo ""
echo "下一步：将 school-districts-official.json 和 official-district-data.js 一起上传到 GitHub。"
echo "按任意键关闭此窗口…"
read -n 1 -s

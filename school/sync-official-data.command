#!/bin/zsh

set -e
cd "$(dirname "$0")"
node "./sync-official-data.js"
echo ""
echo "按任意键关闭此窗口…"
read -n 1 -s

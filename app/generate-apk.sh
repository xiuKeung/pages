#!/bin/zsh
set -euo pipefail

app_dir="$(cd "$(dirname "$0")" && pwd)"
exec "$app_dir/build-app.sh" android-debug

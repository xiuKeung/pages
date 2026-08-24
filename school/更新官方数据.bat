@echo off
chcp 65001 >nul
cd /d "%~dp0"
node "generate-official-data.js"
if errorlevel 1 (
  echo.
  echo 更新失败，请确认已安装 Node.js，且 school-districts-official.json 位于当前目录。
  pause
  exit /b 1
)
echo.
echo 下一步：将 school-districts-official.json 和 official-district-data.js 一起上传到 GitHub。
pause

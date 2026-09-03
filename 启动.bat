@echo off
REM COS魔法工坊 - 开发服务启动脚本（兼容中文路径）
chcp 65001 >nul
setlocal EnableExtensions EnableDelayedExpansion

REM 切到本 bat 所在目录（避免中文路径/盘符问题）
cd /d "%~dp0"
if errorlevel 1 (
  echo [错误] 无法进入项目目录：
  echo %~dp0
  pause
  exit /b 1
)

REM 避免本机失效代理导致依赖/请求卡住
set "HTTP_PROXY="
set "HTTPS_PROXY="
set "http_proxy="
set "https_proxy="
set "ALL_PROXY="
set "all_proxy="
set "NO_PROXY=*"
set "no_proxy=*"

set "PORT=5000"
set "HOSTNAME=localhost"

echo ========================================
echo   COS魔法工坊 开发服务
echo   目录: %CD%
echo   地址: http://localhost:%PORT%
echo ========================================
echo.

where pnpm >nul 2>nul
if errorlevel 1 (
  echo [错误] 未找到 pnpm，请先安装 Node.js 并执行: npm i -g pnpm
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo [提示] 未检测到 node_modules，正在安装依赖...
  call pnpm install
  if errorlevel 1 (
    echo [错误] 依赖安装失败
    pause
    exit /b 1
  )
)

echo [检查] 是否已有开发服务在运行...
call :cleanup_existing
echo.

echo [启动中] 稳定模式（改代码后需重新运行本脚本）
echo          按 Ctrl+C 可停止服务
echo.
REM 不用 tsx watch：改文件时不会把整个后端杀掉重启
call pnpm exec tsx src/server.ts
set "EXITCODE=!ERRORLEVEL!"

echo.
if not "!EXITCODE!"=="0" (
  echo [错误] 服务异常退出，代码: !EXITCODE!
) else (
  echo [已停止] 服务已结束
)
pause
endlocal & exit /b %EXITCODE%

REM ---------- 启动前清理：端口占用 + 本项目残留进程 + next 锁 ----------
:cleanup_existing
set "KILLED=0"

REM 1) 结束占用 PORT 的监听进程
for /f "tokens=5" %%P in ('netstat -ano 2^>nul ^| findstr /R /C:":%PORT% .*LISTENING"') do (
  if not "%%P"=="0" if not "%%P"=="" (
    echo [清理] 结束占用端口 %PORT% 的进程 PID=%%P
    taskkill /F /PID %%P >nul 2>nul
    set "KILLED=1"
  )
)

REM 2) 结束本项目残留的 node/tsx（server.ts / next）
powershell -NoProfile -ExecutionPolicy Bypass -Command "$root=(Resolve-Path -LiteralPath '%CD%').Path; $n=0; Get-CimInstance Win32_Process -EA SilentlyContinue | Where-Object { $_.Name -match '^(node|tsx)\.exe$' -and $_.CommandLine -and ($_.CommandLine -like ('*'+$root+'*server.ts*') -or ($_.CommandLine -like ('*'+$root+'*') -and $_.CommandLine -like '*next*')) } | ForEach-Object { Write-Host ('[清理] 结束残留进程 PID='+$_.ProcessId); Stop-Process -Id $_.ProcessId -Force -EA SilentlyContinue; $n++ }; if ($n -gt 0) { exit 42 } else { exit 0 }"
if errorlevel 42 set "KILLED=1"

REM 3) 清理 Next 开发锁（上次异常退出会残留）
if exist ".next\dev\lock" (
  echo [清理] 删除 .next\dev\lock
  del /f /q ".next\dev\lock" >nul 2>nul
  set "KILLED=1"
)

if "!KILLED!"=="1" (
  echo [清理] 等待端口释放...
  timeout /t 1 /nobreak >nul
  echo [清理] 完成，准备启动
) else (
  echo [检查] 未发现占用，直接启动
)
exit /b 0

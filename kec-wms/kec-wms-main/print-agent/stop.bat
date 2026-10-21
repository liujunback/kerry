@echo off
chcp 65001 >nul

echo ========================================
echo KEC WMS 打印中间件停止脚本
echo ========================================
echo.

REM 查找运行中的 Node.js 进程（包含 print-agent）
echo [信息] 正在查找打印中间件进程...

REM 使用 tasklist 查找进程
tasklist /FI "IMAGENAME eq node.exe" /FO CSV /NH | findstr /C:"node.exe" >nul
if %ERRORLEVEL% EQU 0 (
    echo [信息] 发现运行中的 Node.js 进程
    echo.
    echo 正在停止打印中间件...

    REM 尝试优雅停止（通过端口查找）
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":12212"') do (
        echo [信息] 停止进程 PID: %%a
        taskkill /PID %%a /F >nul 2>nul
    )

    echo.
    echo [成功] 打印中间件已停止
) else (
    echo [信息] 未发现运行中的打印中间件
)

echo.
pause

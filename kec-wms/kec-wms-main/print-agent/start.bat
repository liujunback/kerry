@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ========================================
echo KEC WMS 打印中间件启动脚本
echo ========================================
echo.

REM 检查 Node.js 是否安装
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [错误] 未检测到 Node.js
    echo.
    echo 请先安装 Node.js: https://nodejs.org/
    echo 推荐版本: Node.js 20.x LTS
    echo.
    pause
    exit /b 1
)

REM 显示 Node.js 版本
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo [信息] Node.js 版本: %NODE_VERSION%

REM 检查 npm 是否可用
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [错误] 未检测到 npm
    echo.
    pause
    exit /b 1
)

REM 检查依赖是否已安装
if not exist "node_modules" (
    echo.
    echo [信息] 检测到依赖未安装，正在安装依赖...
    echo.
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo [错误] 依赖安装失败
        echo.
        pause
        exit /b 1
    )
    echo.
    echo [成功] 依赖安装完成
)

echo.
echo ========================================
echo 正在启动打印中间件...
echo ========================================
echo.
echo WebSocket 服务地址: ws://127.0.0.1:12212
echo.
echo 提示:
echo   - 请保持此窗口打开
echo   - 按 Ctrl+C 可停止服务
echo   - 前端页面将自动连接到此服务
echo.
echo ========================================
echo.

REM 启动开发服务器
call npm run dev

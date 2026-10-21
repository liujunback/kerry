# KEC WMS 打印中间件启动脚本 (PowerShell)
# 编码: UTF-8

# 设置错误处理
$ErrorActionPreference = "Stop"

# 显示标题
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "KEC WMS 打印中间件启动脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查 Node.js 是否安装
try {
    $nodeVersion = node --version
    Write-Host "[信息] Node.js 版本: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "[错误] 未检测到 Node.js" -ForegroundColor Red
    Write-Host ""
    Write-Host "请先安装 Node.js: https://nodejs.org/" -ForegroundColor Yellow
    Write-Host "推荐版本: Node.js 20.x LTS" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "按 Enter 键退出"
    exit 1
}

# 检查 npm 是否可用
try {
    $npmVersion = npm --version
    Write-Host "[信息] npm 版本: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "[错误] 未检测到 npm" -ForegroundColor Red
    Write-Host ""
    Read-Host "按 Enter 键退出"
    exit 1
}

# 检查依赖是否已安装
if (-not (Test-Path "node_modules")) {
    Write-Host ""
    Write-Host "[信息] 检测到依赖未安装，正在安装依赖..." -ForegroundColor Yellow
    Write-Host ""

    try {
        npm install
        Write-Host ""
        Write-Host "[成功] 依赖安装完成" -ForegroundColor Green
    } catch {
        Write-Host ""
        Write-Host "[错误] 依赖安装失败: $_" -ForegroundColor Red
        Write-Host ""
        Read-Host "按 Enter 键退出"
        exit 1
    }
}

# 显示启动信息
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "正在启动打印中间件..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "WebSocket 服务地址: " -NoNewline
Write-Host "ws://127.0.0.1:12212" -ForegroundColor Yellow
Write-Host ""
Write-Host "提示:" -ForegroundColor Cyan
Write-Host "  - 请保持此窗口打开" -ForegroundColor Gray
Write-Host "  - 按 Ctrl+C 可停止服务" -ForegroundColor Gray
Write-Host "  - 前端页面将自动连接到此服务" -ForegroundColor Gray
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 启动开发服务器
try {
    npm run dev
} catch {
    Write-Host ""
    Write-Host "[错误] 服务启动失败: $_" -ForegroundColor Red
    Write-Host ""
    Read-Host "按 Enter 键退出"
    exit 1
}

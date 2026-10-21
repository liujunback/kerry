# KEC WMS 打印中间件停止脚本 (PowerShell)
# 编码: UTF-8

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "KEC WMS 打印中间件停止脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[信息] 正在查找打印中间件进程..." -ForegroundColor Yellow

# 查找监听 12212 端口的进程
$connections = Get-NetTCPConnection -LocalPort 12212 -ErrorAction SilentlyContinue

if ($connections) {
    foreach ($conn in $connections) {
        $processId = $conn.OwningProcess
        $process = Get-Process -Id $processId -ErrorAction SilentlyContinue

        if ($process) {
            Write-Host "[信息] 发现进程: $($process.ProcessName) (PID: $processId)" -ForegroundColor Green
            Write-Host "[信息] 正在停止进程..." -ForegroundColor Yellow

            try {
                Stop-Process -Id $processId -Force
                Write-Host "[成功] 进程已停止" -ForegroundColor Green
            } catch {
                Write-Host "[错误] 停止进程失败: $_" -ForegroundColor Red
            }
        }
    }
} else {
    # 备用方案：查找所有 node.exe 进程
    $nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue

    if ($nodeProcesses) {
        Write-Host "[信息] 发现 $($nodeProcesses.Count) 个 Node.js 进程" -ForegroundColor Yellow
        Write-Host "[警告] 无法确定哪个是打印中间件进程" -ForegroundColor Yellow
        Write-Host ""

        $confirm = Read-Host "是否停止所有 Node.js 进程? (y/N)"

        if ($confirm -eq "y" -or $confirm -eq "Y") {
            foreach ($proc in $nodeProcesses) {
                Write-Host "[信息] 停止进程 PID: $($proc.Id)" -ForegroundColor Yellow
                Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
            }
            Write-Host "[成功] 所有 Node.js 进程已停止" -ForegroundColor Green
        } else {
            Write-Host "[信息] 已取消操作" -ForegroundColor Gray
        }
    } else {
        Write-Host "[信息] 未发现运行中的打印中间件" -ForegroundColor Gray
    }
}

Write-Host ""
Read-Host "按 Enter 键退出"

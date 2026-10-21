$ErrorActionPreference = "Stop"

$taskName = "Codex-Schedule-CapabilityAccessManager-Cleanup"
$workerPath = "C:\Users\bliuj\Desktop\kerry\schedule-cam-wal-cleanup.ps1"
$resultPath = "D:\SystemBackups\CapabilityAccessManager\pending-delete-result.txt"
$powershellPath = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"

$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = [Security.Principal.WindowsPrincipal]$identity
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw "The launcher must run as administrator."
}

if (-not (Test-Path -LiteralPath $workerPath)) {
    throw "Worker script not found: $workerPath"
}

Remove-Item -LiteralPath $resultPath -Force -ErrorAction SilentlyContinue
$arguments = '-NoProfile -ExecutionPolicy Bypass -File "{0}"' -f $workerPath
$action = New-ScheduledTaskAction -Execute $powershellPath -Argument $arguments
$taskPrincipal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 5)

try {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
    Register-ScheduledTask -TaskName $taskName -Action $action -Principal $taskPrincipal -Settings $settings | Out-Null
    Start-ScheduledTask -TaskName $taskName

    $deadline = (Get-Date).AddMinutes(3)
    do {
        Start-Sleep -Milliseconds 500
        $task = Get-ScheduledTask -TaskName $taskName
        $taskInfo = Get-ScheduledTaskInfo -TaskName $taskName
        if ($task.State -ne "Running" -and $taskInfo.LastRunTime -gt [datetime]::MinValue) {
            break
        }
    } while ((Get-Date) -lt $deadline)

    if ((Get-Date) -ge $deadline) {
        throw "SYSTEM scheduling task timed out."
    }

    if (-not (Test-Path -LiteralPath $resultPath)) {
        throw "SYSTEM scheduling task did not write a result file. LastTaskResult=$($taskInfo.LastTaskResult)"
    }

    Get-Content -LiteralPath $resultPath -Raw
    if ($taskInfo.LastTaskResult -ne 0) {
        exit 1
    }
} finally {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
}

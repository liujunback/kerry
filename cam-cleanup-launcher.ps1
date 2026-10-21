$ErrorActionPreference = "Stop"

$workerPath = "C:\Users\bliuj\Desktop\kerry\cam-cleanup-system.ps1"
$taskName = "Codex-Cleanup-CapabilityAccessManager-WAL"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupPath = "D:\SystemBackups\CapabilityAccessManager\$timestamp"
$resultPath = "D:\SystemBackups\CapabilityAccessManager\latest-result.json"
$powershellPath = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"

$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = [Security.Principal.WindowsPrincipal]$identity
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw "The launcher must run as administrator."
}

if (-not (Test-Path -LiteralPath $workerPath)) {
    throw "Worker script not found: $workerPath"
}

$actionArguments = '-NoProfile -ExecutionPolicy Bypass -File "{0}" -BackupPath "{1}" -ResultPath "{2}"' -f $workerPath, $backupPath, $resultPath
$action = New-ScheduledTaskAction -Execute $powershellPath -Argument $actionArguments
$taskPrincipal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 45)

try {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
    Register-ScheduledTask -TaskName $taskName -Action $action -Principal $taskPrincipal -Settings $settings | Out-Null
    Start-ScheduledTask -TaskName $taskName

    $deadline = (Get-Date).AddMinutes(40)
    do {
        Start-Sleep -Seconds 1
        $task = Get-ScheduledTask -TaskName $taskName
        $taskInfo = Get-ScheduledTaskInfo -TaskName $taskName
        if ($task.State -ne "Running" -and $taskInfo.LastRunTime -gt [datetime]::MinValue) {
            break
        }
    } while ((Get-Date) -lt $deadline)

    if ((Get-Date) -ge $deadline) {
        throw "Cleanup task timed out after 40 minutes."
    }

    if (Test-Path -LiteralPath $resultPath) {
        Get-Content -LiteralPath $resultPath -Raw
    } else {
        throw "Cleanup task finished without writing a result file. LastTaskResult=$($taskInfo.LastTaskResult)"
    }

    if ($taskInfo.LastTaskResult -ne 0) {
        exit 1
    }
} finally {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
}

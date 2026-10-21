param(
    [Parameter(Mandatory = $true)]
    [string]$BackupPath,

    [Parameter(Mandatory = $true)]
    [string]$ResultPath
)

$ErrorActionPreference = "Stop"

$sourceDirectory = "C:\ProgramData\Microsoft\Windows\CapabilityAccessManager"
$databasePath = Join-Path $sourceDirectory "CapabilityAccessManager.db"
$walPath = Join-Path $sourceDirectory "CapabilityAccessManager.db-wal"
$shmPath = Join-Path $sourceDirectory "CapabilityAccessManager.db-shm"
$logPath = Join-Path $BackupPath "cleanup.log"
$serviceWasStopped = $false
$deletedFiles = @()
$backedUpFiles = @()
$beforeWalBytes = $null

function Write-CleanupLog {
    param([string]$Message)

    $line = "{0} {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message
    Add-Content -LiteralPath $logPath -Value $line -Encoding UTF8
}

function Write-Result {
    param(
        [string]$Status,
        [string]$Message
    )

    $cDrive = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'"
    $walBytes = $null
    if (Test-Path -LiteralPath $walPath) {
        $walBytes = (Get-Item -LiteralPath $walPath -Force).Length
    }

    $result = [ordered]@{
        status = $Status
        message = $Message
        backupPath = $BackupPath
        beforeWalBytes = $beforeWalBytes
        afterWalBytes = $walBytes
        cDriveFreeBytes = [long]$cDrive.FreeSpace
        backedUpFiles = $backedUpFiles
        deletedFiles = $deletedFiles
        serviceStatus = (Get-Service -Name "camsvc").Status.ToString()
        completedAt = (Get-Date).ToString("o")
    }

    $resultDirectory = Split-Path -Parent $ResultPath
    New-Item -ItemType Directory -Path $resultDirectory -Force | Out-Null
    $result | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $ResultPath -Encoding UTF8
}

try {
    if (-not (Test-Path -LiteralPath "D:\")) {
        throw "D: drive is unavailable."
    }

    if ([IO.Path]::GetFullPath($sourceDirectory) -ne "C:\ProgramData\Microsoft\Windows\CapabilityAccessManager") {
        throw "Unexpected source directory: $sourceDirectory"
    }

    New-Item -ItemType Directory -Path $BackupPath -Force | Out-Null
    New-Item -ItemType File -Path $logPath -Force | Out-Null
    Write-CleanupLog "Starting Capability Access Manager WAL cleanup as $([Security.Principal.WindowsIdentity]::GetCurrent().Name)."

    $service = Get-Service -Name "camsvc"
    if ($service.Status -ne "Stopped") {
        Write-CleanupLog "Stopping camsvc."
        Stop-Service -Name "camsvc" -Force
        $service.WaitForStatus("Stopped", [TimeSpan]::FromSeconds(45))
        $serviceWasStopped = $true
    }

    if (Test-Path -LiteralPath $walPath) {
        $beforeWalBytes = (Get-Item -LiteralPath $walPath -Force).Length
        Write-CleanupLog "WAL size before cleanup: $beforeWalBytes bytes."
    } else {
        Write-CleanupLog "WAL file was not present after stopping camsvc."
    }

    foreach ($sourcePath in @($databasePath, $walPath, $shmPath)) {
        if (-not (Test-Path -LiteralPath $sourcePath)) {
            continue
        }

        $sourceItem = Get-Item -LiteralPath $sourcePath -Force
        $destinationPath = Join-Path $BackupPath $sourceItem.Name
        Write-CleanupLog "Backing up $($sourceItem.Name) ($($sourceItem.Length) bytes)."
        Copy-Item -LiteralPath $sourcePath -Destination $destinationPath -Force

        $destinationItem = Get-Item -LiteralPath $destinationPath -Force
        if ($destinationItem.Length -ne $sourceItem.Length) {
            throw "Backup verification failed for $($sourceItem.Name)."
        }
        $backedUpFiles += $sourceItem.Name
    }

    foreach ($targetPath in @($walPath, $shmPath)) {
        if (-not (Test-Path -LiteralPath $targetPath)) {
            continue
        }

        $targetName = Split-Path -Leaf $targetPath
        Write-CleanupLog "Deleting $targetName."
        Remove-Item -LiteralPath $targetPath -Force
        if (Test-Path -LiteralPath $targetPath) {
            throw "Failed to remove $targetName."
        }
        $deletedFiles += $targetName
    }

    Write-CleanupLog "Starting camsvc."
    Start-Service -Name "camsvc"
    (Get-Service -Name "camsvc").WaitForStatus("Running", [TimeSpan]::FromSeconds(45))
    $serviceWasStopped = $false

    Write-CleanupLog "Cleanup completed successfully."
    Write-Result -Status "SUCCESS" -Message "Capability Access Manager WAL cleanup completed."
    exit 0
} catch {
    $errorMessage = $_.Exception.Message
    try {
        Write-CleanupLog "ERROR: $errorMessage"
    } catch {
    }

    try {
        if ((Get-Service -Name "camsvc").Status -ne "Running") {
            Start-Service -Name "camsvc"
            (Get-Service -Name "camsvc").WaitForStatus("Running", [TimeSpan]::FromSeconds(45))
        }
        $serviceWasStopped = $false
    } catch {
        $errorMessage = "$errorMessage; camsvc restart failed: $($_.Exception.Message)"
    }

    try {
        Write-Result -Status "FAILED" -Message $errorMessage
    } catch {
    }
    exit 1
} finally {
    if ($serviceWasStopped) {
        try {
            Start-Service -Name "camsvc"
        } catch {
        }
    }
}

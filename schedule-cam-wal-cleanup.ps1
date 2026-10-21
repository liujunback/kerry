$ErrorActionPreference = "Stop"

$resultPath = "D:\SystemBackups\CapabilityAccessManager\pending-delete-result.txt"
$targets = @(
    "C:\ProgramData\Microsoft\Windows\CapabilityAccessManager\CapabilityAccessManager.db-wal",
    "C:\ProgramData\Microsoft\Windows\CapabilityAccessManager\CapabilityAccessManager.db-shm"
)

$lines = @()
try {
    $registryPath = "SYSTEM\CurrentControlSet\Control\Session Manager"
    $valueName = "PendingFileRenameOperations"
    $key = [Microsoft.Win32.Registry]::LocalMachine.OpenSubKey($registryPath, $true)
    if ($null -eq $key) {
        throw "Unable to open Session Manager registry key for writing."
    }

    $currentValue = $key.GetValue(
        $valueName,
        $null,
        [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames
    )
    $pendingOperations = [Collections.Generic.List[string]]::new()
    if ($null -ne $currentValue) {
        foreach ($entry in [string[]]$currentValue) {
            $pendingOperations.Add($entry)
        }
    }

    $registryBackupPath = "D:\SystemBackups\CapabilityAccessManager\pending-file-rename-before-$((Get-Date).ToString('yyyyMMdd-HHmmss')).json"
    @($pendingOperations) | ConvertTo-Json | Set-Content -LiteralPath $registryBackupPath -Encoding UTF8

    foreach ($target in $targets) {
        $nativePath = "\??\$target"
        if (-not $pendingOperations.Contains($nativePath)) {
            $pendingOperations.Add($nativePath)
            $pendingOperations.Add("")
        }
        $lines += "SCHEDULED: $target"
    }

    $key.SetValue(
        $valueName,
        [string[]]$pendingOperations,
        [Microsoft.Win32.RegistryValueKind]::MultiString
    )
    $key.Flush()

    $verifiedValue = [string[]]$key.GetValue(
        $valueName,
        $null,
        [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames
    )
    foreach ($target in $targets) {
        if ($verifiedValue -notcontains "\??\$target") {
            throw "Registry verification failed for $target"
        }
    }
    $key.Close()

    $lines += "STATUS: SUCCESS"
    $lines += "REGISTRY_BACKUP: $registryBackupPath"
    $lines += "CREATED: $((Get-Date).ToString('o'))"
    $lines | Set-Content -LiteralPath $resultPath -Encoding UTF8
    $lines
    exit 0
} catch {
    $lines += "STATUS: FAILED"
    $lines += "ERROR: $($_.Exception.Message)"
    $lines += "CREATED: $((Get-Date).ToString('o'))"
    $lines | Set-Content -LiteralPath $resultPath -Encoding UTF8
    $lines
    exit 1
}

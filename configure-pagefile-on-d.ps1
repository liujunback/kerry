$ErrorActionPreference = "Stop"

$principal = [Security.Principal.WindowsPrincipal]::new(
    [Security.Principal.WindowsIdentity]::GetCurrent()
)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw "Administrator privileges are required."
}

$backupRoot = "D:\SystemBackups\Pagefile"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupPath = Join-Path $backupRoot "pagefile-config-before-$timestamp.json"
$resultPath = Join-Path $backupRoot "pagefile-config-result.txt"
$pagingFiles = [string[]]@("D:\pagefile.sys 24576 32768")
$dedicatedDumpFile = "D:\DedicatedDumpFile.sys"
$dumpFile = "D:\MEMORY.DMP"
$dumpFileSizeMb = 16384

New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null
New-Item -ItemType Directory -Path "D:\Minidump" -Force | Out-Null

$sessionKeyPath = "SYSTEM\CurrentControlSet\Control\Session Manager"
$memoryKeyPath = "$sessionKeyPath\Memory Management"
$crashKeyPath = "SYSTEM\CurrentControlSet\Control\CrashControl"
$sessionKey = [Microsoft.Win32.Registry]::LocalMachine.OpenSubKey($sessionKeyPath, $true)
$memoryKey = [Microsoft.Win32.Registry]::LocalMachine.OpenSubKey($memoryKeyPath, $true)
$crashKey = [Microsoft.Win32.Registry]::LocalMachine.OpenSubKey($crashKeyPath, $true)
if ($null -eq $sessionKey -or $null -eq $memoryKey -or $null -eq $crashKey) {
    throw "Unable to open pagefile registry keys for writing."
}

$currentPaging = $memoryKey.GetValue(
    "PagingFiles",
    $null,
    [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames
)
$currentPending = [string[]]$sessionKey.GetValue(
    "PendingFileRenameOperations",
    $null,
    [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames
)

[ordered]@{
    pagingFiles = @($currentPaging)
    pendingFileRenameOperations = @($currentPending)
    crashDumpEnabled = $crashKey.GetValue("CrashDumpEnabled", $null)
    dedicatedDumpFile = $crashKey.GetValue("DedicatedDumpFile", $null)
    dumpFileSize = $crashKey.GetValue("DumpFileSize", $null)
    dumpFile = $crashKey.GetValue("DumpFile", $null)
    minidumpDir = $crashKey.GetValue("MinidumpDir", $null)
    capturedAt = (Get-Date).ToString("o")
} | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $backupPath -Encoding UTF8

$memoryKey.SetValue(
    "PagingFiles",
    $pagingFiles,
    [Microsoft.Win32.RegistryValueKind]::MultiString
)

# Preserve existing delayed operations, but remove the old instruction that
# deleted the destination page file. Add only the C: page file deletion.
$pendingOperations = [Collections.Generic.List[string]]::new()
for ($i = 0; $i -lt $currentPending.Count; $i += 2) {
    $source = $currentPending[$i]
    $destination = if ($i + 1 -lt $currentPending.Count) { $currentPending[$i + 1] } else { "" }
    if ($source -notmatch '(?i)^\*?1?\\\?\?\\D:\\pagefile\.sys$') {
        $pendingOperations.Add($source)
        $pendingOperations.Add($destination)
    }
}

$cPageFileNativePath = "\??\C:\pagefile.sys"
if ($pendingOperations -notcontains $cPageFileNativePath) {
    $pendingOperations.Add($cPageFileNativePath)
    $pendingOperations.Add("")
}
$sessionKey.SetValue(
    "PendingFileRenameOperations",
    [string[]]$pendingOperations,
    [Microsoft.Win32.RegistryValueKind]::MultiString
)

# Keep crash diagnostics without forcing a temporary page file on C:.
$crashKey.SetValue("DedicatedDumpFile", $dedicatedDumpFile, [Microsoft.Win32.RegistryValueKind]::String)
$crashKey.SetValue("DumpFileSize", $dumpFileSizeMb, [Microsoft.Win32.RegistryValueKind]::DWord)
$crashKey.SetValue("DumpFile", $dumpFile, [Microsoft.Win32.RegistryValueKind]::ExpandString)
$crashKey.SetValue("MinidumpDir", "D:\Minidump", [Microsoft.Win32.RegistryValueKind]::ExpandString)

$memoryKey.Flush()
$sessionKey.Flush()
$crashKey.Flush()

$computerSystem = Get-CimInstance Win32_ComputerSystem
if ($computerSystem.AutomaticManagedPagefile) {
    Set-CimInstance -InputObject $computerSystem -Property @{ AutomaticManagedPagefile = $false } | Out-Null
}

$verifiedPaging = [string[]]$memoryKey.GetValue(
    "PagingFiles",
    $null,
    [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames
)
$verifiedPending = [string[]]$sessionKey.GetValue(
    "PendingFileRenameOperations",
    $null,
    [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames
)
if ($verifiedPaging -notcontains "D:\pagefile.sys 24576 32768") {
    throw "Pagefile registry verification failed."
}
if ($verifiedPending -notcontains $cPageFileNativePath) {
    throw "Pending C: pagefile deletion verification failed."
}
if ($verifiedPending -match '(?i)^\*?1?\\\?\?\\D:\\pagefile\.sys$') {
    throw "A stale D: pagefile deletion is still pending."
}
if ($crashKey.GetValue("DedicatedDumpFile", $null) -ne $dedicatedDumpFile) {
    throw "Dedicated dump file verification failed."
}

$sessionKey.Close()
$memoryKey.Close()
$crashKey.Close()

$result = @(
    "STATUS: SUCCESS"
    "PAGING_FILES: D:\pagefile.sys 24576 32768"
    "DELETE_AT_BOOT: C:\pagefile.sys"
    "DEDICATED_DUMP_FILE: $dedicatedDumpFile"
    "DUMP_FILE: $dumpFile"
    "BACKUP: $backupPath"
    "REBOOT_REQUIRED: YES"
    "CREATED: $((Get-Date).ToString('o'))"
)
$result | Set-Content -LiteralPath $resultPath -Encoding UTF8
$result

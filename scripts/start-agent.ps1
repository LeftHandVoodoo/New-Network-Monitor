param(
  [int]$Port = 8787,
  [string]$IpcToken = "",
  [string]$PingTarget = "8.8.8.8",
  [int]$RetryCount = 3,
  [int]$RetryIntervalMs = 5000,
  [string]$AutoResetEnabled = ""
)

if ($env:PORT) { $Port = [int]$env:PORT }
if ($env:IPC_TOKEN) { $IpcToken = $env:IPC_TOKEN }
if ($env:PING_TARGET) { $PingTarget = $env:PING_TARGET }
if ($env:RETRY_COUNT) { $RetryCount = [int]$env:RETRY_COUNT }
if ($env:RETRY_INTERVAL_MS) { $RetryIntervalMs = [int]$env:RETRY_INTERVAL_MS }
if ($env:AUTO_RESET_ENABLED) { $AutoResetEnabled = $env:AUTO_RESET_ENABLED }

if (-not $IpcToken) {
  Write-Error "IPC_TOKEN is required. Set it in .env or pass -IpcToken."
  exit 1
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$escapedToken = $IpcToken -replace "'", "''"
$escapedTarget = $PingTarget -replace "'", "''"

$command = @"
cd '$repoRoot';
`$env:PORT='$Port';
`$env:IPC_TOKEN='$escapedToken';
`$env:PING_TARGET='$escapedTarget';
`$env:RETRY_COUNT='$RetryCount';
`$env:RETRY_INTERVAL_MS='$RetryIntervalMs';
`$env:AUTO_RESET_ENABLED='$AutoResetEnabled';
npm run agent:dev
"@

Write-Host "Starting local agent with elevation..."
Start-Process -Verb RunAs -FilePath "powershell.exe" -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", $command

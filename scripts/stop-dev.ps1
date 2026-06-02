param(
  [int]$Port = 5173
)

$connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
$processIds = $connections |
  Where-Object { $_.OwningProcess -gt 0 } |
  Select-Object -ExpandProperty OwningProcess -Unique

if (-not $processIds) {
  Write-Host "No process is listening on port $Port."
  exit 0
}

foreach ($processId in $processIds) {
  $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
  if ($process) {
    Write-Host "Stopping $($process.ProcessName) process $processId on port $Port..."
    Stop-Process -Id $processId -Force
  }
}

Write-Host "Port $Port has been released."

<#!
  PrintKori Windows Print Agent
  This transparent companion agent is intended to run on the computer physically connected to a shop printer.
  It prints only jobs that the shop dashboard has explicitly Approved.
#>
[CmdletBinding()]
param(
  [string]$ApiBase,
  [string]$PairingCode,
  [string]$PrinterName,
  [switch]$ListPrinters,
  [switch]$PairOnly,
  [switch]$Reconfigure,
  [switch]$InstallStartup,
  [switch]$RunOnce
)

$ErrorActionPreference = "Stop"
$AppDirectory = Join-Path $env:APPDATA "PrintKoriAgent"
$ConfigPath = Join-Path $AppDirectory "agent.json"
$TempDirectory = Join-Path $AppDirectory "jobs"

function Ensure-AgentDirectories {
  New-Item -ItemType Directory -Path $AppDirectory -Force | Out-Null
  New-Item -ItemType Directory -Path $TempDirectory -Force | Out-Null
}

function Save-AgentConfig($config) {
  $config | ConvertTo-Json | Set-Content -Path $ConfigPath -Encoding UTF8
}

function Get-AgentConfig {
  if (-not (Test-Path $ConfigPath)) { return $null }
  return Get-Content -Raw -Path $ConfigPath | ConvertFrom-Json
}

function Get-AvailablePrinters {
  return Get-CimInstance Win32_Printer | Where-Object { $_.WorkOffline -eq $false } | Select-Object -ExpandProperty Name
}

function Select-DetectedPrinter {
  $printers = @(Get-AvailablePrinters)
  if ($printers.Count -eq 0) { throw "No available Windows printer was found. Check that the printer is installed and online." }
  Write-Host "Detected Windows printers:" -ForegroundColor Cyan
  for ($index = 0; $index -lt $printers.Count; $index++) {
    Write-Host " [$($index + 1)] $($printers[$index])"
  }
  do {
    $choice = Read-Host "Choose a printer number"
    $selectedIndex = 0
  } while (-not [int]::TryParse($choice, [ref]$selectedIndex) -or $selectedIndex -lt 1 -or $selectedIndex -gt $printers.Count)
  return $printers[$selectedIndex - 1]
}

function Invoke-AgentRequest([string]$path, [string]$method = "POST", $body = $null) {
  $headers = @{
    "x-printkori-agent-id" = [string]$script:AgentConfig.agentId
    "x-printkori-agent-secret" = [string]$script:AgentConfig.agentSecret
  }
  $params = @{ Uri = "$($script:AgentConfig.apiBase.TrimEnd('/'))$path"; Method = $method; Headers = $headers }
  if ($null -ne $body) { $params.Body = ($body | ConvertTo-Json -Compress); $params.ContentType = "application/json" }
  return Invoke-RestMethod @params
}

function Pair-Agent {
  if (-not $ApiBase) { $ApiBase = Read-Host "PrintKori API address (for example https://your-site.manus.space)" }
  if (-not $PairingCode) { $PairingCode = Read-Host "One-time pairing code from the PrintKori dashboard" }
  if (-not $PrinterName) {
    $PrinterName = Select-DetectedPrinter
  }
  $body = @{ code = $PairingCode; deviceName = $env:COMPUTERNAME; selectedPrinter = $PrinterName } | ConvertTo-Json
  $response = Invoke-RestMethod -Uri "$($ApiBase.TrimEnd('/'))/api/agent/pair" -Method POST -ContentType "application/json" -Body $body
  $config = @{ apiBase = $ApiBase.TrimEnd('/'); agentId = $response.agentId; agentSecret = $response.agentSecret; printerName = $PrinterName; pairedAt = (Get-Date).ToString("o") }
  Save-AgentConfig $config
  Write-Host "PrintKori agent paired successfully with printer: $PrinterName" -ForegroundColor Green
  return $config
}

function Download-JobFile($job) {
  $extension = [System.IO.Path]::GetExtension($job.fileName)
  $safeName = "$($job.id)-$([Guid]::NewGuid().ToString('N'))$extension"
  $destination = Join-Path $TempDirectory $safeName
  Invoke-WebRequest -Uri "$($script:AgentConfig.apiBase.TrimEnd('/'))$($job.fileUrl)" -OutFile $destination
  return $destination
}

function Print-JobFile([string]$filePath) {
  $extension = [System.IO.Path]::GetExtension($filePath).ToLowerInvariant()
  if ($extension -in ".doc", ".docx") {
    $word = New-Object -ComObject Word.Application
    try {
      $word.Visible = $false
      $document = $word.Documents.Open($filePath, $false, $true)
      $document.PrintOut()
      $document.Close($false)
    } finally {
      $word.Quit()
      [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($word)
    }
    return
  }
  $process = Start-Process -FilePath $filePath -Verb PrintTo -ArgumentList ('"{0}"' -f $script:AgentConfig.printerName) -PassThru
  $completed = $process.WaitForExit(60000)
  if (-not $completed) { throw "The Windows print command did not return within 60 seconds." }
}

function Process-NextJob {
  $claim = Invoke-AgentRequest "/api/agent/claim"
  if ($null -eq $claim.job) { return $false }
  $job = $claim.job
  try {
    Invoke-AgentRequest "/api/agent/jobs/$($job.id)/heartbeat" | Out-Null
    $filePath = Download-JobFile $job
    Print-JobFile $filePath
    Invoke-AgentRequest "/api/agent/jobs/$($job.id)/complete" | Out-Null
    Remove-Item $filePath -Force -ErrorAction SilentlyContinue
    Write-Host "Completed job $($job.id): $($job.fileName)" -ForegroundColor Green
  } catch {
    $reason = $_.Exception.Message
    try { Invoke-AgentRequest "/api/agent/jobs/$($job.id)/fail" "POST" @{ failureReason = $reason } | Out-Null } catch { Write-Host "Could not report failure: $($_.Exception.Message)" -ForegroundColor Red }
    Write-Host "Failed job $($job.id): $reason" -ForegroundColor Red
  }
  return $true
}

function Install-AgentStartup {
  $taskName = "PrintKori Agent"
  $scriptPath = $PSCommandPath
  $arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$scriptPath`""
  $action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument $arguments
  $trigger = New-ScheduledTaskTrigger -AtLogOn
  Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Description "Runs the approved-job PrintKori agent for the selected printer." -Force | Out-Null
  Write-Host "Startup task installed: $taskName" -ForegroundColor Green
}

Ensure-AgentDirectories
$availablePrinters = @(Get-AvailablePrinters)
if ($ListPrinters) {
  if ($availablePrinters.Count -eq 0) { Write-Host "No available Windows printers were detected." -ForegroundColor Yellow; exit 1 }
  Write-Host "Detected Windows printers:" -ForegroundColor Cyan
  $availablePrinters | ForEach-Object { Write-Host " - $_" }
  exit 0
}
$script:AgentConfig = Get-AgentConfig
if ($Reconfigure -and $null -ne $script:AgentConfig) {
  Remove-Item $ConfigPath -Force
  $script:AgentConfig = $null
}
if ($null -eq $script:AgentConfig) { $script:AgentConfig = Pair-Agent }
if ($InstallStartup) { Install-AgentStartup }
if ($PairOnly) { Write-Host "Pairing complete. Selected printer: $($script:AgentConfig.printerName)" -ForegroundColor Green; exit 0 }

Write-Host "PrintKori agent is running for $($script:AgentConfig.printerName). Press Ctrl+C to stop this foreground session." -ForegroundColor Cyan
do {
  try {
    $processed = Process-NextJob
    if (-not $processed) { Start-Sleep -Seconds 5 }
  } catch {
    Write-Host "Agent connection problem: $($_.Exception.Message)" -ForegroundColor Yellow
    Start-Sleep -Seconds 10
  }
} while (-not $RunOnce)

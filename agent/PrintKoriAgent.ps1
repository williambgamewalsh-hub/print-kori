<#
  PrintKori Windows Print Agent
  Run this script without arguments to open the interactive setup and operations menu.
  Normal pairing, printer discovery, test printing, and printing approved jobs run as the current Windows user.
  Administrator permission is requested only if the owner explicitly chooses the optional system-wide startup task.
#>
[CmdletBinding()]
param(
  [switch]$RunWorker,
  [switch]$InstallSystemStartup,
  [switch]$RunOnce
)

$ErrorActionPreference = "Stop"
$AppDirectory = Join-Path $env:APPDATA "PrintKoriAgent"
$ConfigPath = Join-Path $AppDirectory "agent.json"
$TempDirectory = Join-Path $AppDirectory "jobs"
$script:AgentConfig = $null

function Ensure-AgentDirectories {
  New-Item -ItemType Directory -Path $AppDirectory -Force | Out-Null
  New-Item -ItemType Directory -Path $TempDirectory -Force | Out-Null
}

function Save-AgentConfig($config) {
  $config | ConvertTo-Json | Set-Content -Path $ConfigPath -Encoding UTF8
  $script:AgentConfig = $config
}

function Get-AgentConfig {
  if (-not (Test-Path $ConfigPath)) { return $null }
  try { return Get-Content -Raw -Path $ConfigPath | ConvertFrom-Json } catch { return $null }
}

function Pause-Agent([string]$message = "Press Enter to return to the menu") {
  Write-Host ""
  Read-Host $message | Out-Null
}

function Write-AgentHeader {
  Clear-Host
  Write-Host "==============================================================" -ForegroundColor DarkGray
  Write-Host "                  PRINTKORI WINDOWS AGENT" -ForegroundColor Cyan
  Write-Host "==============================================================" -ForegroundColor DarkGray
  if ($null -eq $script:AgentConfig) {
    Write-Host "Status: NOT PAIRED" -ForegroundColor Yellow
  } else {
    Write-Host "Status: PAIRED  |  Computer: $env:COMPUTERNAME  |  Printer: $($script:AgentConfig.printerName)" -ForegroundColor Green
  }
  Write-Host ""
}

function Get-DetectedPrinters {
  return @(Get-CimInstance -Class Win32_Printer | Select-Object Name, Default, WorkOffline, PrinterStatus, Status, DriverName)
}

function Show-DetectedPrinters {
  $printers = @(Get-DetectedPrinters)
  if ($printers.Count -eq 0) {
    Write-Host "No Windows printers were detected. Install or reconnect the printer, then try again." -ForegroundColor Yellow
    return @()
  }
  Write-Host "Detected Windows printers:" -ForegroundColor Cyan
  for ($index = 0; $index -lt $printers.Count; $index += 1) {
    $printer = $printers[$index]
    $state = if ($printer.WorkOffline) { "OFFLINE" } elseif ($printer.Default) { "DEFAULT" } else { "READY" }
    $color = if ($printer.WorkOffline) { "Yellow" } else { "Green" }
    Write-Host (" [{0}] {1}" -f ($index + 1), $printer.Name) -NoNewline
    Write-Host ("  ({0})" -f $state) -ForegroundColor $color
  }
  return $printers
}

function Select-DetectedPrinter {
  $printers = @(Show-DetectedPrinters)
  if ($printers.Count -eq 0) { throw "No available Windows printer was found." }
  do {
    $choice = Read-Host "Choose a printer number, or B to go back"
    if ($choice -match "^[bB]$") { return $null }
    $selectedIndex = 0
  } while (-not [int]::TryParse($choice, [ref]$selectedIndex) -or $selectedIndex -lt 1 -or $selectedIndex -gt $printers.Count)
  return $printers[$selectedIndex - 1]
}

function Invoke-AgentRequest([string]$path, [string]$method = "POST", $body = $null) {
  if ($null -eq $script:AgentConfig) { throw "This computer is not paired. Choose Pair this computer first." }
  $headers = @{
    "x-printkori-agent-id" = [string]$script:AgentConfig.agentId
    "x-printkori-agent-secret" = [string]$script:AgentConfig.agentSecret
  }
  $params = @{ Uri = "$($script:AgentConfig.apiBase.TrimEnd('/'))$path"; Method = $method; Headers = $headers }
  if ($null -ne $body) { $params.Body = ($body | ConvertTo-Json -Compress); $params.ContentType = "application/json" }
  return Invoke-RestMethod @params
}

function Start-Pairing([bool]$ReplaceExisting = $false) {
  if ($ReplaceExisting -and (Test-Path $ConfigPath)) {
    Remove-Item $ConfigPath -Force
    $script:AgentConfig = $null
    Write-Host "Previous pairing removed. Starting a new pairing." -ForegroundColor Yellow
  }
  Write-Host ""
  Write-Host "PAIR THIS PRINTER COMPUTER" -ForegroundColor Cyan
  Write-Host "Use the temporary or published PrintKori address and a one-time code from the dashboard." -ForegroundColor DarkGray
  $defaultAddress = if ($null -ne $script:AgentConfig) { $script:AgentConfig.apiBase } else { "" }
  $apiBase = Read-Host "PrintKori address $defaultAddress"
  if (-not $apiBase) { $apiBase = $defaultAddress }
  if (-not $apiBase) { throw "A PrintKori address is required." }
  $code = Read-Host "One-time pairing code"
  if (-not $code) { throw "A one-time pairing code is required." }
  $printer = Select-DetectedPrinter
  if ($null -eq $printer) { return }
  $body = @{ code = $code; deviceName = $env:COMPUTERNAME; selectedPrinter = $printer.Name } | ConvertTo-Json
  $response = Invoke-RestMethod -Uri "$($apiBase.TrimEnd('/'))/api/agent/pair" -Method POST -ContentType "application/json" -Body $body
  Save-AgentConfig @{ apiBase = $apiBase.TrimEnd('/'); agentId = $response.agentId; agentSecret = $response.agentSecret; printerName = $printer.Name; pairedAt = (Get-Date).ToString("o") }
  Write-Host ""
  Write-Host "Pairing successful." -ForegroundColor Green
  Write-Host "Selected printer: $($printer.Name)" -ForegroundColor Green
  Write-Host "Next: choose Test selected printer, then Start print worker." -ForegroundColor Cyan
}

function Show-AgentStatus {
  if ($null -eq $script:AgentConfig) {
    Write-Host "This computer is not paired yet." -ForegroundColor Yellow
    return
  }
  $escapedName = $script:AgentConfig.printerName.Replace("'", "''")
  $printer = Get-CimInstance -Class Win32_Printer -Filter "Name='$escapedName'" | Select-Object -First 1
  Write-Host "Computer: $env:COMPUTERNAME"
  Write-Host "PrintKori address: $($script:AgentConfig.apiBase)"
  Write-Host "Selected printer: $($script:AgentConfig.printerName)"
  Write-Host "Paired at: $($script:AgentConfig.pairedAt)"
  if ($null -eq $printer) { Write-Host "Printer status: NOT FOUND" -ForegroundColor Red; return }
  if ($printer.WorkOffline) { Write-Host "Printer status: OFFLINE" -ForegroundColor Yellow } else { Write-Host "Printer status: READY" -ForegroundColor Green }
}

function Test-SelectedPrinter {
  if ($null -eq $script:AgentConfig) { throw "Pair this computer before printing a test page." }
  $escapedName = $script:AgentConfig.printerName.Replace("'", "''")
  $printer = Get-CimInstance -Class Win32_Printer -Filter "Name='$escapedName'" | Select-Object -First 1
  if ($null -eq $printer) { throw "The selected printer is no longer available. Choose Re-pair / change printer." }
  if ($printer.WorkOffline) { throw "The selected printer is offline. Check the printer, then try again." }
  $result = Invoke-CimMethod -InputObject $printer -MethodName PrintTestPage
  if ($result.ReturnValue -ne 0) { throw "Windows could not submit the test page. Error code: $($result.ReturnValue)" }
  Write-Host "Windows accepted a test page for $($script:AgentConfig.printerName)." -ForegroundColor Green
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
  if (-not $process.WaitForExit(60000)) { throw "The Windows print command did not return within 60 seconds." }
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

function Start-PrintWorker([bool]$OnlyOnce = $false) {
  if ($null -eq $script:AgentConfig) { throw "Pair this computer before starting the worker." }
  Write-Host ""
  Write-Host "Print worker is running for $($script:AgentConfig.printerName)." -ForegroundColor Cyan
  Write-Host "It prints only jobs approved in the PrintKori dashboard. Press Ctrl+C to return to Windows." -ForegroundColor DarkGray
  do {
    try {
      Invoke-AgentRequest "/api/agent/ping" | Out-Null
      $processed = Process-NextJob
      if (-not $processed) { Start-Sleep -Seconds 5 }
    } catch {
      Write-Host "Agent connection problem: $($_.Exception.Message)" -ForegroundColor Yellow
      Start-Sleep -Seconds 10
    }
  } while (-not $OnlyOnce)
}

function Install-UserStartup {
  if ($null -eq $script:AgentConfig) { throw "Pair this computer before configuring startup." }
  $taskName = "PrintKori Agent"
  $arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$PSCommandPath`" -RunWorker"
  $action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument $arguments
  $trigger = New-ScheduledTaskTrigger -AtLogOn
  Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Description "Runs the paired PrintKori print worker after this shop user signs in." -Force | Out-Null
  Write-Host "A transparent per-user startup task was created: $taskName" -ForegroundColor Green
  Write-Host "No administrator permission was requested." -ForegroundColor Green
}

function Test-IsAdministrator {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($identity)
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Install-SystemStartup {
  if (-not (Test-IsAdministrator)) { throw "Administrator permission is required only for this optional system-wide startup task." }
  if ($null -eq $script:AgentConfig) { throw "Pair this computer before configuring startup." }
  $taskName = "PrintKori Agent (System)"
  $arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$PSCommandPath`" -RunWorker"
  $action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument $arguments
  $trigger = New-ScheduledTaskTrigger -AtStartup
  $principal = New-ScheduledTaskPrincipal -GroupId "BUILTIN\Administrators" -RunLevel Highest
  Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Description "Optional elevated system-wide PrintKori startup task." -Force | Out-Null
  Write-Host "System-wide startup task created: $taskName" -ForegroundColor Green
}

function Request-SystemStartup {
  $confirmation = Read-Host "This requests Windows administrator approval for an optional system-wide startup task. Type YES to continue"
  if ($confirmation -ne "YES") { return }
  if (Test-IsAdministrator) { Install-SystemStartup; return }
  $arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`" -InstallSystemStartup"
  Start-Process -FilePath "powershell.exe" -ArgumentList $arguments -Verb RunAs
  Write-Host "Windows will now ask for administrator approval." -ForegroundColor Yellow
}

function Show-MainMenu {
  do {
    Write-AgentHeader
    Write-Host " [1] Detect printers on this computer"
    Write-Host " [2] Pair this computer with PrintKori"
    Write-Host " [3] Re-pair / change selected printer"
    Write-Host " [4] Show agent and printer status"
    Write-Host " [5] Print a Windows test page"
    Write-Host " [6] Start the PrintKori print worker"
    Write-Host " [7] Add automatic startup for this Windows user (no admin)"
    Write-Host " [8] Optional system-wide startup (asks for admin)"
    Write-Host " [0] Exit"
    Write-Host ""
    $choice = Read-Host "Choose an option"
    try {
      switch ($choice) {
        "1" { Write-AgentHeader; Show-DetectedPrinters | Out-Null; Pause-Agent }
        "2" { Write-AgentHeader; Start-Pairing; Pause-Agent }
        "3" { Write-AgentHeader; Start-Pairing $true; Pause-Agent }
        "4" { Write-AgentHeader; Show-AgentStatus; Pause-Agent }
        "5" { Write-AgentHeader; Test-SelectedPrinter; Pause-Agent }
        "6" { Write-AgentHeader; Start-PrintWorker; Pause-Agent }
        "7" { Write-AgentHeader; Install-UserStartup; Pause-Agent }
        "8" { Write-AgentHeader; Request-SystemStartup; Pause-Agent }
        "0" { return }
        default { Write-Host "Choose a number from the menu." -ForegroundColor Yellow; Start-Sleep -Seconds 1 }
      }
    } catch {
      Write-Host ""; Write-Host "Action could not complete: $($_.Exception.Message)" -ForegroundColor Red; Pause-Agent
    }
  } while ($true)
}

Ensure-AgentDirectories
$script:AgentConfig = Get-AgentConfig
if ($InstallSystemStartup) { Install-SystemStartup; exit 0 }
if ($RunWorker) { Start-PrintWorker $RunOnce; exit 0 }
Show-MainMenu

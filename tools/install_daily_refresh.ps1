# Registers the "Website Data Refresh" scheduled task: daily at noon Eastern,
# one hour after "Garmin Daily Sync". Catches up if the computer was off.
# Re-running this script updates the task in place.
$ErrorActionPreference = 'Stop'
$taskName = 'Website Data Refresh'
$siteFolder = Split-Path -Parent $PSScriptRoot
$script = Join-Path $PSScriptRoot 'refresh_site_data.py'
$pythonw = Join-Path $env:USERPROFILE 'GarminSync\.venv\Scripts\pythonw.exe'
foreach ($required in @($script, $pythonw)) {
    if (-not (Test-Path -LiteralPath $required)) { throw "Required path missing: $required" }
}
$user = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$action = New-ScheduledTaskAction -Execute $pythonw -Argument ('"' + $script + '"') -WorkingDirectory $siteFolder
$trigger = New-ScheduledTaskTrigger -Daily -At '12:00PM'
$principal = New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RunOnlyIfNetworkAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 15) -Hidden
$definition = New-ScheduledTask -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description 'Rebuilds the website training and sleep data from the local Garmin cache and publishes to GitHub if it changed. No AI. Log: tools\logs in the website folder.'
Register-ScheduledTask -TaskName $taskName -InputObject $definition -Force | Out-Null
$info = Get-ScheduledTaskInfo -TaskName $taskName
Write-Host "Installed '$taskName'. Next run: $($info.NextRunTime)"

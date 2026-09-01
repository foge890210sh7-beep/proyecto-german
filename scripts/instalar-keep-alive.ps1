# -----------------------------------------------------------------------------
#  Instala una tarea programada de Windows que corre keep-alive-windows.ps1
#  cada 2 dias a las 9:00 AM. Registra la tarea con el nombre
#  "Saladino-KeepAlive" para poder verla en Task Scheduler.
#
#  Como usarlo:
#    Click derecho al archivo -> "Ejecutar con PowerShell"
#    O desde una PowerShell abierta como Admin:
#      powershell -ExecutionPolicy Bypass -File .\instalar-keep-alive.ps1
#
#  Para desinstalar:
#      Unregister-ScheduledTask -TaskName "Saladino-KeepAlive" -Confirm:$false
# -----------------------------------------------------------------------------

$ErrorActionPreference = "Stop"

$aqui   = Split-Path -Parent $MyInvocation.MyCommand.Path
$script = Join-Path $aqui "keep-alive-windows.ps1"

if (-not (Test-Path $script)) {
    Write-Error "No encuentro $script"
    exit 1
}

Write-Host "Registrando tarea 'Saladino-KeepAlive'..." -ForegroundColor Cyan
Write-Host "  Script: $script" -ForegroundColor Gray
Write-Host "  Frecuencia: cada 2 dias a las 9:00 AM" -ForegroundColor Gray
Write-Host ""

# Si ya existe, la borramos primero
$existente = Get-ScheduledTask -TaskName "Saladino-KeepAlive" -ErrorAction SilentlyContinue
if ($existente) {
    Write-Host "  Ya existia, la reemplazo..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName "Saladino-KeepAlive" -Confirm:$false
}

$action    = New-ScheduledTaskAction -Execute "powershell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$script`""

# Cada 2 dias a las 9:00 AM
$trigger   = New-ScheduledTaskTrigger -Daily -DaysInterval 2 -At 9:00AM

# Corre aunque el laptop este con bateria, no necesita estar despierto
$settings  = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable

Register-ScheduledTask -TaskName "Saladino-KeepAlive" `
    -Description "Ping cada 2 dias a proyecto-german.vercel.app/api/health para evitar que Supabase pause el proyecto por inactividad." `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings | Out-Null

Write-Host "OK: Tarea 'Saladino-KeepAlive' instalada." -ForegroundColor Green
Write-Host ""
Write-Host "Para verificar:  Get-ScheduledTask -TaskName Saladino-KeepAlive" -ForegroundColor Gray
Write-Host "Para correr ya:  Start-ScheduledTask -TaskName Saladino-KeepAlive" -ForegroundColor Gray
Write-Host "Para desinstalar: Unregister-ScheduledTask -TaskName Saladino-KeepAlive -Confirm:`$false" -ForegroundColor Gray
Write-Host ""
Write-Host "Corriendo la primera vez para probar..." -ForegroundColor Cyan
Start-ScheduledTask -TaskName "Saladino-KeepAlive"
Start-Sleep -Seconds 3
Get-Content (Join-Path $env:USERPROFILE "keep-alive-saladino.log") -Tail 1

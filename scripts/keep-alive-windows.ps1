# -----------------------------------------------------------------------------
#  Keep-alive Supabase — corre desde Task Scheduler de Windows
# -----------------------------------------------------------------------------
#  Pinguea /api/health de la app cada vez que se ejecuta. Eso hace que el
#  middleware de Next.js llame a Supabase, lo que cuenta como actividad
#  y evita que se pause el proyecto.
#
#  Escribe un log en C:\Users\<user>\keep-alive-saladino.log
# -----------------------------------------------------------------------------

$url = "https://proyecto-german.vercel.app/api/health"
$log = Join-Path $env:USERPROFILE "keep-alive-saladino.log"
$ts  = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

try {
    $r = Invoke-RestMethod -Uri $url -Method Get -TimeoutSec 15
    $line = "$ts  OK  motivo=$($r.motivo)  supabase_ms=$($r.supabase.ms)"
} catch {
    $line = "$ts  FAIL  $($_.Exception.Message)"
}

Add-Content -Path $log -Value $line
Write-Output $line

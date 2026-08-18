# 🔧 REACTIVAR — Guía express (5 min)

> El proyecto Supabase se eliminó (Supabase borra proyectos free tras 90 días
> pausados). Esta guía lo reactiva **todo automáticamente**. Sólo necesitas
> generar 2 tokens y correr 1 comando.

---

## 🩹 Blindaje ya aplicado al código

Aunque el proyecto Supabase se caiga otra vez, ahora la app **NO** dará
504 crudo. En su lugar:

- El middleware tiene timeout de 3s en cada llamada a Supabase.
- Si Supabase no responde → redirige a `/mantenimiento` (página amistosa).
- Endpoint `/api/health` devuelve JSON con el estado real de Supabase.

Estos cambios ya están en `src/middleware.ts`, `src/app/mantenimiento/page.tsx`
y `src/app/api/health/route.ts`. Se aplicarán en el próximo deploy.

---

## 🚀 Reactivar Supabase (automático)

### Paso 1 — Genera los 2 tokens (2 min)

**a) Supabase Personal Access Token**
1. Abre https://supabase.com/dashboard/account/tokens
2. Click **Generate new token** → nómbralo `reactivar-saladino`
3. Copia el token (empieza con `sbp_…`)

**b) Vercel Token**
1. Abre https://vercel.com/account/tokens
2. Click **Create Token** → nómbralo `reactivar-saladino`, scope **Full Account**, expira en `1 day`
3. Copia el token

### Paso 2 — Rellena `.env.reactivar` (1 min)

```bash
cd proyecto-german
cp .env.reactivar.example .env.reactivar
```

Abre `.env.reactivar` con tu editor y pega los tokens en las 2 líneas
correspondientes. Inventa un `SUPABASE_DB_PASSWORD` largo (guárdalo por si
acaso). Los demás valores ya vienen con default sano.

### Paso 3 — Corre el script (2 min)

```bash
node scripts/reactivar.mjs
```

El script hace **todo** por ti:

1. Crea proyecto `administracion-saladino` en Supabase.
2. Espera a que esté sano (~1 min).
3. Corre las 2 migraciones (esquema + seed con 16 conceptos y 3 clientes).
4. Crea el usuario `foge890210sh7@gmail.com` con Auto-Confirm.
5. Escribe `.env.local` con las nuevas keys.
6. Reemplaza las 2 env vars en Vercel con las nuevas keys.
7. Dispara redeploy en Vercel.

Cuando termine te da la nueva URL de Supabase y un mensaje `━━━ LISTO ━━━`.

### Paso 4 — Valida (1 min)

1. Espera 1-2 min a que Vercel termine el deploy.
2. Abre https://proyecto-german.vercel.app/api/health
   → debe decir `"ok": true, "motivo": "operativo"`.
3. Abre https://proyecto-german.vercel.app y prueba el login con
   `foge890210sh7@gmail.com` / la contraseña que pusiste.

---

## 🩺 Diagnóstico si algo falla

Cualquier momento puedes pegar:

```
https://proyecto-german.vercel.app/api/health
```

Y ver un JSON como este:

```json
{
  "ok": false,
  "motivo": "supabase_down",
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": true,
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": true
  },
  "supabase": {
    "url": "https://xxx.supabase.co",
    "ok": false,
    "status": 0,
    "ms": 4001,
    "error": "The operation was aborted."
  }
}
```

**Motivos posibles:**

| motivo | Qué significa | Qué hacer |
|---|---|---|
| `operativo` | Todo bien | Nada |
| `env_missing` | Falta env var en Vercel | Correr `reactivar.mjs` de nuevo |
| `supabase_down` | Supabase no responde | Ver si el proyecto está pausado en https://supabase.com/dashboard |

---

## 🔒 Después de correr el script

**Bórralos:**
- El Vercel token → revócalo en https://vercel.com/account/tokens
- El Supabase token → revócalo en https://supabase.com/dashboard/account/tokens
- El archivo `.env.reactivar` (opcional, ya está en `.gitignore`)

Los tokens fueron **desechables**. Cuando vuelvas a necesitarlos, generas otros.

---

## 🧠 Cómo se evita que vuelva a pasar

El plan free de Supabase pausa proyectos con **0 actividad por 7 días** y los
**elimina** a los 90 días. Para evitarlo:

**Opción A — Cronjob de Vercel (gratis, recomendado)**
Ya está listo para agregarse. Avísame si quieres que lo configure: haría que
Vercel pinguée `/api/health` cada 3 días para que Supabase nunca se pause.

**Opción B — Pagar el plan Pro de Supabase**
$25/mes, ya no se pausa nunca. Solo si Germán empieza a usarla en serio.

---

## 📞 Cualquier cosa

Corre `node scripts/reactivar.mjs` de nuevo cuantas veces quieras — es
idempotente (si algo ya existe, lo detecta y no rompe).

# 🚀 Deploy a producción — guía ultra-corta

> Tiempo estimado: **10 minutos** · Costo: **$0**

---

## ① Crear proyecto en Supabase (5 min)

1. Entra a https://supabase.com/dashboard → **New project**
2. Nombre: `administracion-saladino` · Región: **East US (North Virginia)** · Password: invéntate uno largo y guárdalo
3. Espera ~2 min a que termine de crearse.

### Cargar la base de datos

4. En el menú izquierdo: **SQL Editor** → **New query**
5. Pega TODO el contenido de [`supabase/migrations/0001_init.sql`](./supabase/migrations/0001_init.sql) → click **Run** (verde)
6. Otra **New query** → pega TODO el contenido de [`supabase/migrations/0002_seed_y_presupuestos.sql`](./supabase/migrations/0002_seed_y_presupuestos.sql) → **Run**

### Crear el usuario de Germán

7. Menú izquierdo: **Authentication** → **Users** → botón **Add user → Create new user**
8. Email: el que va a usar Germán · Password: el que le vas a dar · ✅ **marca "Auto Confirm User"** · Create

### Bloquear registros nuevos (opcional)

9. **Authentication → Providers → Email** → desactiva **"Enable Email Signups"** → Save

### Copiar credenciales

10. Menú izquierdo: **Project Settings → API** (icono de engrane abajo)
11. Copia y guarda en un block de notas:
    - **Project URL** → empieza con `https://xxxxx.supabase.co`
    - **anon public** → la llave LARGA (no la que dice `service_role`)

---

## ② Deploy a Vercel (3 min)

12. Click en este botón: **[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Ffoge890210sh7-beep%2Fproyecto-german&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY&envDescription=Pega%20la%20URL%20y%20la%20anon%20key%20de%20tu%20proyecto%20de%20Supabase&envLink=https%3A%2F%2Fsupabase.com%2Fdashboard%2Fproject%2F_%2Fsettings%2Fapi&project-name=administracion-saladino&repository-name=administracion-saladino)**

13. Login con GitHub si te pide.
14. Te aparecerán 2 campos para llenar:
    - `NEXT_PUBLIC_SUPABASE_URL` → pega tu Project URL
    - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → pega la anon key
15. **Deploy** → espera ~2 min.

---

## ③ Probar (2 min)

16. Vercel te da una URL tipo `administracion-saladino.vercel.app` o similar.
17. Abre en celular o compu, inicia sesión con el correo/contraseña que creaste para Germán.
18. Ya debe mostrar los 16 conceptos en `/conceptos` y 3 clientes en `/clientes`.

---

## 🆘 Si algo falla

| Síntoma | Solución |
|---|---|
| Vercel da error de build | Verifica que pegaste bien las 2 env vars (sin espacios extra ni comillas) |
| Login dice "Usuario o contraseña incorrectos" | Asegúrate de marcar "Auto Confirm User" al crear el usuario en Supabase |
| Páginas en blanco | Abre DevTools (F12) → pestaña Console → manda captura del error |
| `/conceptos` está vacío | No corriste `0002_seed_y_presupuestos.sql`. Vuelve a Supabase y córrelo. |
| Las fotos no suben | Confirma que el script `0001_init.sql` corrió completo (debe haber creado el bucket `fotos`) |

Cualquier error, mándame la captura y lo arreglamos en minutos.

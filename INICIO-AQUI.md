# 🚀 INICIO AQUÍ — Administración Saladino

> Plataforma para Germán Saladino · Reparación de autopistas
> Última actualización: 29 abril 2026

---

## 📌 Estado actual del proyecto

| Cosa | Estado |
|---|---|
| Código completo | ✅ Listo |
| Base de datos (esquema + datos) | ✅ Listos los SQL, falta correrlos en Supabase |
| Branding (Administración Saladino) | ✅ Aprobado por Germán |
| Colores amarillo/rojo/azul + efectos cinemáticos | ✅ Aplicados |
| Build local | ✅ Compila sin errores |
| Cuenta Supabase | ⏳ Tú la creas |
| Cuenta Vercel | ⏳ Tú la conectas |
| Deploy en producción | ⏳ Pendiente |
| URL pública para Germán | ⏳ Pendiente |

**Repo GitHub**: https://github.com/foge890210sh7-beep/proyecto-german
**Rama con últimos cambios**: `claude/prepare-testing-deployment-tUMMj`
**PR draft**: https://github.com/foge890210sh7-beep/proyecto-german/pull/7

---

## 🛠️ Stack

- **Frontend**: Next.js 15 + TypeScript + Tailwind
- **Backend**: Supabase (Postgres + Auth + Storage)
- **Hosting**: Vercel (gratis)
- **Exportes**: PDF (`pdfkit`) y Excel (`exceljs`)

---

## 📂 Paso 1 — Bajar el proyecto a esta carpeta

Abre terminal aquí mismo y corre:

```bash
git clone https://github.com/foge890210sh7-beep/proyecto-german.git
cd proyecto-german
git checkout claude/prepare-testing-deployment-tUMMj
npm install
cp .env.example .env.local
```

Después de esto vas a tener una subcarpeta `proyecto-german/` con todo dentro.

---

## 🗄️ Paso 2 — Crear la base de datos en Supabase

1. Entra a https://supabase.com/dashboard → **New project**
2. Datos del proyecto:
   - Nombre: `administracion-saladino`
   - Región: **East US (North Virginia)** (la más cercana a México)
   - Password: invéntate una larga y **GUÁRDALA EN TU PASSWORD MANAGER**
3. Espera ~2 min a que termine de crearse.
4. Menú izquierdo: **SQL Editor → New query**
5. Abre el archivo `proyecto-german/supabase/migrations/0001_init.sql` con tu editor, copia TODO el contenido, pégalo en el SQL Editor de Supabase y dale **Run**.
6. Otra **New query** → repite con `proyecto-german/supabase/migrations/0002_seed_y_presupuestos.sql`.

Esto crea:
- Todas las tablas (`clientes`, `tramos`, `conceptos`, `reportes`, `gastos`, `fotos`, etc.)
- El bucket de fotos en Storage
- Las políticas de seguridad (RLS)
- **16 conceptos precargados** (poste, defensa, chebrón, etc.)
- **3 clientes precargados** (Querétaro–San Luis, Querétaro–Palmillas, Arco Norte)

---

## 👤 Paso 3 — Crear el usuario de Germán

1. Menú izquierdo Supabase: **Authentication → Users → Add user → Create new user**
2. Email: el que vaya a usar Germán
3. Password: el que le vas a dar (apúntalo)
4. **MARCA LA CASILLA "Auto Confirm User"** (importante)
5. Click **Create user**

(Opcional pero recomendado) Bloquear registro público:
- **Authentication → Providers → Email** → desactiva **Enable Email Signups** → Save

---

## 🔑 Paso 4 — Copiar credenciales a `.env.local`

1. Menú izquierdo Supabase: **Project Settings** (engrane) → **API**
2. Copia estos 2 valores:
   - **Project URL** (empieza con `https://xxxxx.supabase.co`)
   - **anon public** (la llave LARGA — NO la `service_role`)

3. Abre el archivo `proyecto-german/.env.local` con tu editor y pégalas:

```
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxxx....TU-LLAVE-ENORME
```

> ⚠️ **NUNCA** subas este archivo a GitHub. Ya está en `.gitignore`, no le hagas `git add`.

---

## 🧪 Paso 5 — Probar local antes de deployar

```bash
npm run dev
```

Abre http://localhost:3000 → login con el correo y password que creaste para Germán.

**Checklist rápido**:
- [ ] El login funciona
- [ ] El dashboard se ve con fondo oscuro animado y headlines en gradiente
- [ ] `/conceptos` muestra los 16 conceptos
- [ ] `/clientes` muestra 3: Querétaro–San Luis, Querétaro–Palmillas, Arco Norte
- [ ] La calculadora flotante (🧮 abajo a la derecha) abre y suma

Si algo falla, captura la pantalla y mándamela.

---

## 🚀 Paso 6 — Deploy a Vercel

1. Click en este link:
   https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Ffoge890210sh7-beep%2Fproyecto-german

2. Login con GitHub si te pide.

3. Te aparecerán 2 campos para llenar:
   - `NEXT_PUBLIC_SUPABASE_URL` → la misma del `.env.local`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → la misma del `.env.local`

4. **IMPORTANTE**: en la sección "Production Branch" cambia `main` a `claude/prepare-testing-deployment-tUMMj` para que tome los cambios nuevos (rebrand a Saladino + colores vivos).

   *Alternativa más limpia*: primero mergea el PR #7 a `main` y deja la rama `main` como production.

5. Click **Deploy** → espera ~2 min.

6. Vercel te da una URL tipo `administracion-saladino.vercel.app`.

7. Abre la URL en celular o compu, inicia sesión y prueba todo.

---

## ✅ Checklist final antes de mandárselo a Germán

- [ ] Login funciona en celular
- [ ] `/conceptos` y `/clientes` con datos
- [ ] Crear un reporte completo y descargarlo en PDF y Excel
- [ ] Tomar fotos desde el celular (botón "📷 Antes/Durante/Después")
- [ ] Crear un gasto y verlo en el resumen
- [ ] Crear un presupuesto semanal y ver la barra de progreso

---

## 🤖 Cómo seguir trabajando con Claude desde esta carpeta

Cuando abras Claude Code en esta carpeta, mándale este prompt para que arranque rápido:

```
Estoy trabajando en el proyecto Administración Saladino (rama
claude/prepare-testing-deployment-tUMMj). Lee CONTEXT.md y INICIO-AQUI.md
antes de hacer nada. Después dime en qué paso estoy y guíame.
```

Claude puede:
- Modificar código (colores, textos, lógica, nuevas páginas)
- Corregir bugs leyendo logs
- Hacer commits y push automáticos
- Ayudarte a entender errores

Claude NO puede:
- Hacer click en botones de Vercel/Supabase (eso es navegador, te toca a ti)
- Conocer tus credenciales (las pones tú en `.env.local`)

---

## 🚨 Pendientes con Germán

Cuando ya esté usando la app, pregúntale:

1. **3 dudas de precios** que quedaron del cuaderno (anota cuáles cuando confirme).
2. ¿Tiene más concesiones aparte de las 3 cargadas?
3. ¿Quiere subdividir alguna categoría de gasto?

---

## 📞 Si algo falla

| Síntoma | Solución |
|---|---|
| Vercel da error de build | Verifica que las env vars estén bien pegadas (sin espacios ni comillas) |
| Login dice "Usuario o contraseña incorrectos" | Asegúrate de marcar "Auto Confirm User" en Supabase |
| Páginas en blanco | F12 en navegador → pestaña Console → manda screenshot del error |
| `/conceptos` está vacío | No corriste el `0002_seed_y_presupuestos.sql` |
| Las fotos no suben | El `0001_init.sql` no terminó completo (debe crear el bucket `fotos`) |

Cualquier cosa rara, captura y mándala.

---

## 📜 Cambios aprobados por Germán (29 abril 2026)

> **WhatsApp 5:32 PM**: "Se que se llame administración Saladino"
> **WhatsApp 5:33 PM**: "Colores vivos sea dinámico amarills rojo, Azul"
> **WhatsApp 5:33 PM**: "a la plataforma metele efectos cinematicos"

✅ Todo aplicado en la rama `claude/prepare-testing-deployment-tUMMj`.

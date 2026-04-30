# 📋 CONTEXTO DEL PROYECTO — Administración Saladino

> Este archivo es el **handoff** para la siguiente sesión de Claude en tu carpeta local.
> Léelo completo antes de tocar nada.

---

## 🎯 Qué es esto

**Administración Saladino** es la plataforma administrativa de **Germán Saladino**, dedicada a la **reparación de autopistas** (señalamiento, postes, defensas, chebrones, etc.).

Sirve para:
- Capturar **reportes diarios de trabajo** por tramo carretero, con cálculo automático de cobro.
- Llevar el control de **gastos** (combustible, comida, casetas, materiales).
- Subir y organizar **fotos antes/durante/después** desde el celular.
- Llevar **presupuestos semanales** y comparar contra gasto real.
- Exportar reportes a **PDF y Excel** para mandarle al cliente.

**Único usuario**: Germán. La app NO permite registro público; el admin (tú) crea su cuenta a mano en Supabase.

---

## 🧱 Stack

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 15 (App Router) + TypeScript + React 18 |
| Estilo | Tailwind CSS (modo oscuro cinematográfico, paleta amarillo/rojo/azul) |
| Backend / DB | Supabase (PostgreSQL + Auth + Storage para fotos) |
| Hosting | Vercel (gratis) |
| Export | `pdfkit` (PDF) + `exceljs` (Excel) |

Repo: **https://github.com/foge890210sh7-beep/proyecto-german**
Rama activa: **`claude/prepare-testing-deployment-tUMMj`** (con rebrand a Saladino + efectos cinemáticos)
PR draft: **https://github.com/foge890210sh7-beep/proyecto-german/pull/7**

---

## ✅ Qué ya está hecho

1. **Esquema de base de datos completo** — `supabase/migrations/0001_init.sql`
   - Tablas: `clientes`, `tramos`, `conceptos`, `precios_cliente`, `reportes`, `reporte_items`, `gastos`, `fotos`, `presupuestos_semanales`.
   - Bucket `fotos` con políticas RLS.
   - Toda la seguridad por usuario está aplicada (RLS).

2. **Datos iniciales (seed)** — `supabase/migrations/0002_seed_y_presupuestos.sql`
   - **16 conceptos** cargados: poste, señal preventiva, señal restrictiva, señal informativa, defensa metálica, chebrón, balizamiento, vialeta, etc., con precio base.
   - **3 clientes** cargados con sus tramos:
     - **Querétaro – San Luis** (autopista 57)
     - **Querétaro – Palmillas**
     - **Arco Norte**
   - Tabla de presupuestos semanales lista.

3. **Páginas de la app** (todas funcionando en build local):
   - `/login` — entrada con email + password
   - `/` — dashboard con totales del día/mes y últimos reportes
   - `/reportes`, `/reportes/nuevo`, `/reportes/[id]` — captura, listado y detalle (con PDF/Excel)
   - `/gastos` — captura por categoría
   - `/presupuestos` — semanal con barra de avance
   - `/fotos` — captura desde celular (cámara nativa) y galería
   - `/conceptos` — catálogo
   - `/clientes`, `/clientes/[id]` — clientes y sus tramos
   - Calculadora flotante en todas las páginas

4. **Branding final (último cambio aprobado por Germán, 4/29/2026):**
   - Nombre: **Administración Saladino** (antes era "Admin German")
   - Colores: **amarillo + rojo + azul** vivos sobre fondo oscuro
   - Efectos: gradientes panorámicos animados, shine en el logo, glassmorphism en tarjetas, fade-up escalonado, pulse-ring en CTAs, glows neón en botones, calculadora con teclado degradado.

5. **Build local verificado**: `npm run build` compila ✓ sin errores.

---

## ⏳ Qué falta (esto te toca a ti, en navegador)

### Paso 1 — Crear proyecto en Supabase

1. https://supabase.com/dashboard → **New project**
2. Nombre: `administracion-saladino` · Región: **East US (North Virginia)**
3. Espera ~2 min.
4. **SQL Editor → New query** → pega y corre `supabase/migrations/0001_init.sql`
5. Otra **New query** → pega y corre `supabase/migrations/0002_seed_y_presupuestos.sql`
6. **Authentication → Users → Add user** → crea el usuario de Germán **con "Auto Confirm User"** marcado.
7. **Authentication → Providers → Email** → desactiva **Enable Email Signups**.
8. **Project Settings → API** → copia **Project URL** y **anon public key**.

### Paso 2 — Pegar credenciales en `.env.local`

```bash
cp .env.example .env.local
# edita .env.local con las 2 keys de Supabase
```

```
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=TU-ANON-KEY-LARGA
```

> ⚠️ **NUNCA** commitees `.env.local` (ya está en `.gitignore`).

### Paso 3 — Probar local

```bash
npm install
npm run dev
# abre http://localhost:3000
```

### Paso 4 — Deploy a Vercel

Sigue `DEPLOY.md` paso a paso (10 min). Tienes que:
- Click en el botón **Deploy with Vercel** del README/DEPLOY
- Loguearte con GitHub
- Pegar las 2 env vars
- Click **Deploy**

Vercel te da una URL tipo `administracion-saladino.vercel.app`.

---

## 🚨 Pendientes funcionales (preguntar a Germán)

Cuando Germán ya esté usando la app, faltan validar estas dudas que quedaron del cuaderno de captura:

1. **Precios** — confirmar 3 precios que quedaron como "base":
   - (anota aquí el concepto y precio cuando Germán confirme)
2. **Otros clientes/tramos** — solo cargamos 3 clientes; si tiene más concesiones, agregarlos en `/clientes`.
3. **Categorías de gasto** — están las clásicas; si quiere subdivisiones (ej. "casetas ida vs vuelta"), pedírselas.

---

## 🗂️ Estructura de carpetas

```
proyecto-german/
├── DEPLOY.md                    ← Guía deploy paso a paso
├── README.md                    ← Descripción + botón Deploy with Vercel
├── CONTEXT.md                   ← ESTE archivo (handoff entre sesiones)
├── .env.example                 ← Plantilla, COPIAR a .env.local
├── package.json
├── tailwind.config.ts           ← Paleta amarillo/rojo/azul + animaciones
├── src/
│   ├── app/
│   │   ├── (app)/               ← Todas las páginas autenticadas
│   │   │   ├── page.tsx         ← Dashboard
│   │   │   ├── reportes/
│   │   │   ├── gastos/
│   │   │   ├── presupuestos/
│   │   │   ├── fotos/
│   │   │   ├── conceptos/
│   │   │   └── clientes/
│   │   ├── api/reportes/[id]/   ← Endpoints PDF y Excel
│   │   ├── login/
│   │   ├── layout.tsx
│   │   └── globals.css          ← Fondo animado + componentes con glow
│   ├── components/
│   │   ├── Nav.tsx              ← Header con logo shine
│   │   ├── Calculator.tsx       ← Calculadora flotante
│   │   └── Modal.tsx
│   ├── lib/
│   │   ├── supabase/            ← Clientes browser + server
│   │   ├── format.ts            ← MXN, fechas
│   │   └── types.ts
│   └── middleware.ts            ← Redirige a /login si no hay sesión
└── supabase/
    └── migrations/
        ├── 0001_init.sql        ← Esquema completo + RLS + bucket fotos
        └── 0002_seed_y_presupuestos.sql  ← Conceptos, clientes, tramos
```

---

## 🤖 Cómo continuar en tu próxima sesión local

Cuando abras Claude Code en tu carpeta local, mándale este prompt para que arranque con todo el contexto:

```
Estoy trabajando en el proyecto Administración Saladino (rama claude/prepare-testing-deployment-tUMMj).
Lee CONTEXT.md completo antes de actuar — ahí está el estado del proyecto, lo que falta hacer
y las credenciales que necesito poner. No commitees .env.local. Después dime qué sigue.
```

---

## 📜 Historial de decisiones

| Fecha | Decisión |
|---|---|
| 2026-04-29 | Germán aprueba nombre **Administración Saladino**, colores **amarillo/rojo/azul** y efectos cinemáticos |
| Previo | Bloquear registro público (solo admin crea usuarios) |
| Previo | Flujo de fotos antes/durante/después con cámara nativa del celular |
| Previo | Multi-cliente con precios diferenciados (precio base si no hay precio cliente) |
| Previo | Presupuestos semanales con calculadora flotante en todas las páginas |

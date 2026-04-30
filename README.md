# Administración Saladino — Reparación de autopistas

Plataforma administrativa para Germán Saladino: control de reportes diarios de trabajo, gastos y fotos del campo, con cálculo automático de cobros por cliente/tramo y exportación a PDF y Excel.

## 🚀 Deploy en 1 click (después de tener Supabase listo)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Ffoge890210sh7-beep%2Fproyecto-german&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY&envDescription=Pega%20la%20URL%20y%20la%20anon%20key%20de%20tu%20proyecto%20de%20Supabase&envLink=https%3A%2F%2Fsupabase.com%2Fdashboard%2Fproject%2F_%2Fsettings%2Fapi&project-name=administracion-saladino&repository-name=administracion-saladino)

## Funcionalidades

- 📋 **Reporte diario de trabajo**: selecciona los conceptos del día (postes, señalamientos, etc.), captura cantidades y obtén el total a cobrar automáticamente.
- 💸 **Gastos diarios**: registro de combustible, materiales, comida, casetas, etc., con resumen por categoría.
- 📸 **Galería de fotos**: subida desde el celular o computadora, organizadas por etapa (antes / durante / después), fecha y tramo.
- 🛣️ **Multi-tramo**: cada reporte se asocia a un cliente y a un tramo carretero específico.
- 💲 **Precios por cliente**: cada cliente puede tener su propia lista de precios. Si no hay precio específico, se usa el precio base del catálogo.
- 📄 **Exportación a PDF y Excel**: genera el reporte diario para mandar al cliente o imprimir.
- 🔐 **Autenticación**: solo Germán puede entrar (cuenta única con correo y contraseña).

## Stack

- [Next.js 15](https://nextjs.org/) (App Router) + TypeScript
- [Supabase](https://supabase.com/) (PostgreSQL + Auth + Storage)
- [Tailwind CSS](https://tailwindcss.com/)
- `pdfkit` para PDF, `exceljs` para Excel

## Setup

### 1. Crear proyecto en Supabase

1. Entra a [supabase.com](https://supabase.com/) y crea un proyecto nuevo.
2. En el **SQL Editor**, copia y pega el contenido de `supabase/migrations/0001_init.sql` y ejecútalo. Esto crea todas las tablas, el bucket de fotos y las políticas de seguridad.
3. En **Project Settings → API**, copia:
   - `Project URL`
   - `anon public` key

### 2. Variables de entorno

Copia `.env.example` a `.env.local` y pega los valores de Supabase:

```bash
cp .env.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=TU-ANON-KEY
```

### 3. Crear el usuario de Germán (única persona con acceso)

La app **no permite registrarse desde la web**: solo puede entrar quien tenga una cuenta creada por el administrador. Pasos:

1. En el dashboard de Supabase ve a **Authentication → Users → Add user → Create new user**.
2. Captura el correo y contraseña que va a usar Germán y **marca la casilla "Auto Confirm User"**.
3. (Opcional pero recomendado) Ve a **Authentication → Providers → Email** y desactiva **"Enable Email Signups"** para que nadie pueda crearse cuenta por su lado.

### 4. Instalar y correr en local

```bash
npm install
npm run dev
```

Abre http://localhost:3000 e inicia sesión con el correo y contraseña que creaste en el paso anterior.

### 5. Datos iniciales

Una vez dentro, captura en este orden:

1. **Conceptos** (`/conceptos`): los trabajos que repara con su precio base (poste, señal preventiva, defensa, etc.).
2. **Clientes** (`/clientes`): las concesionarias o dependencias.
3. **Tramos** (dentro de cada cliente): los tramos carreteros.
4. **Lista de precios por cliente**: si un cliente paga distinto, ajusta el precio en su ficha.

Listo, ya puedes empezar a capturar reportes diarios.

## Despliegue

Sugerido: [Vercel](https://vercel.com/). Conecta el repo, agrega las dos variables de entorno y deploy.

## Estructura

```
src/
├── app/
│   ├── (app)/              # Páginas autenticadas
│   │   ├── page.tsx        # Dashboard
│   │   ├── reportes/       # Lista, nuevo, detalle
│   │   ├── gastos/
│   │   ├── fotos/
│   │   ├── conceptos/
│   │   └── clientes/
│   ├── api/reportes/[id]/  # Export PDF y Excel
│   ├── login/
│   └── layout.tsx
├── components/
├── lib/
│   ├── supabase/           # Clientes browser + server
│   ├── format.ts           # MXN, fechas
│   └── types.ts
└── middleware.ts           # Redirección a login
supabase/
└── migrations/0001_init.sql
```

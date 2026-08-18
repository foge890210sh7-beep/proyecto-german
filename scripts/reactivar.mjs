#!/usr/bin/env node
// -----------------------------------------------------------------------------
//  REACTIVAR — script todo-en-uno para revivir Administración Saladino
// -----------------------------------------------------------------------------
//  Qué hace, en orden:
//    1. Crea proyecto nuevo en Supabase (vía Management API).
//    2. Espera a que el proyecto esté ACTIVE_HEALTHY.
//    3. Corre las 2 migraciones SQL (esquema + seed).
//    4. Crea el usuario de Germán en Auth (email/password).
//    5. Escribe .env.local con las nuevas credenciales.
//    6. Actualiza las env vars del proyecto en Vercel.
//    7. Dispara un redeploy en Vercel.
//
//  Requisitos (te los pide interactivamente si no están en .env.reactivar):
//    - SUPABASE_ACCESS_TOKEN   (https://supabase.com/dashboard/account/tokens)
//    - SUPABASE_ORG_ID         (script te ayuda a elegirlo)
//    - SUPABASE_DB_PASSWORD    (invéntala, se guarda en Supabase)
//    - VERCEL_TOKEN            (https://vercel.com/account/tokens)
//    - VERCEL_PROJECT_NAME     (por defecto "proyecto-german")
//    - VERCEL_TEAM_ID          (opcional, si el proyecto está en un team)
//    - USER_EMAIL              (correo para el login de Germán)
//    - USER_PASSWORD           (contraseña para el login de Germán)
//
//  Uso:
//    node scripts/reactivar.mjs
//
//  Puedes correrlo de nuevo con seguridad — detecta si el proyecto ya
//  existe o el env var ya está y salta ese paso.
// -----------------------------------------------------------------------------

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(__dirname, "..");

// --- utilidades ---------------------------------------------------------------

const c = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

function log(msg) {
  console.log(msg);
}
function info(msg) {
  log(`${c.cyan}ℹ${c.reset}  ${msg}`);
}
function ok(msg) {
  log(`${c.green}✔${c.reset}  ${msg}`);
}
function warn(msg) {
  log(`${c.yellow}⚠${c.reset}  ${msg}`);
}
function fail(msg) {
  log(`${c.red}✖${c.reset}  ${msg}`);
}
function step(n, total, msg) {
  log(
    `\n${c.bold}${c.blue}[Paso ${n}/${total}]${c.reset} ${c.bold}${msg}${c.reset}`,
  );
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// Carga variables desde .env.reactivar si existe, y sobreescribe process.env
function cargarEnv() {
  const p = resolve(RAIZ, ".env.reactivar");
  if (!existsSync(p)) return;
  const txt = readFileSync(p, "utf8");
  for (const linea of txt.split("\n")) {
    const m = linea.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let val = m[2].trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[m[1]]) process.env[m[1]] = val;
  }
  info(`Cargado .env.reactivar`);
}

async function pedir(rl, pregunta, { defecto, secreto = false } = {}) {
  const suf = defecto ? ` ${c.dim}[${secreto ? "***" : defecto}]${c.reset}` : "";
  const resp = await rl.question(`${c.magenta}?${c.reset} ${pregunta}${suf}: `);
  return resp.trim() || defecto || "";
}

async function requerirEnv(clave, opts = {}) {
  if (process.env[clave]) return process.env[clave];
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    const v = await pedir(rl, `${clave}`, opts);
    if (!v) throw new Error(`Falta ${clave}`);
    process.env[clave] = v;
    return v;
  } finally {
    rl.close();
  }
}

async function fetchJSON(url, opts = {}) {
  const res = await fetch(url, opts);
  const txt = await res.text();
  let json;
  try {
    json = txt ? JSON.parse(txt) : null;
  } catch {
    json = { raw: txt };
  }
  if (!res.ok) {
    const err = new Error(
      `HTTP ${res.status} en ${url}: ${JSON.stringify(json).slice(0, 300)}`,
    );
    err.status = res.status;
    err.body = json;
    throw err;
  }
  return json;
}

// --- Supabase Management API --------------------------------------------------

const SB_API = "https://api.supabase.com/v1";

function sbHeaders() {
  return {
    Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,
    "Content-Type": "application/json",
  };
}

async function listarOrgs() {
  return fetchJSON(`${SB_API}/organizations`, { headers: sbHeaders() });
}

async function listarProyectos() {
  return fetchJSON(`${SB_API}/projects`, { headers: sbHeaders() });
}

async function crearProyecto({ nombre, orgId, region, dbPass }) {
  return fetchJSON(`${SB_API}/projects`, {
    method: "POST",
    headers: sbHeaders(),
    body: JSON.stringify({
      name: nombre,
      organization_id: orgId,
      region,
      db_pass: dbPass,
      plan: "free",
    }),
  });
}

async function estadoProyecto(ref) {
  return fetchJSON(`${SB_API}/projects/${ref}`, { headers: sbHeaders() });
}

async function esperarActive(ref, maxSeg = 300) {
  const inicio = Date.now();
  let ultimoStatus = "";
  while ((Date.now() - inicio) / 1000 < maxSeg) {
    try {
      const info = await estadoProyecto(ref);
      if (info.status !== ultimoStatus) {
        log(`   ${c.dim}status: ${info.status}${c.reset}`);
        ultimoStatus = info.status;
      }
      if (info.status === "ACTIVE_HEALTHY") return info;
    } catch (e) {
      log(`   ${c.dim}(sondeo: ${e.message.slice(0, 80)})${c.reset}`);
    }
    await sleep(5000);
  }
  throw new Error(`El proyecto ${ref} no llegó a ACTIVE_HEALTHY en ${maxSeg}s`);
}

async function apiKeys(ref) {
  // Endpoint moderno: devuelve [{ name: 'anon', api_key: '...' }, ...]
  return fetchJSON(`${SB_API}/projects/${ref}/api-keys?reveal=true`, {
    headers: sbHeaders(),
  });
}

async function ejecutarSQL(ref, sql) {
  return fetchJSON(`${SB_API}/projects/${ref}/database/query`, {
    method: "POST",
    headers: sbHeaders(),
    body: JSON.stringify({ query: sql }),
  });
}

// --- Supabase Auth Admin ------------------------------------------------------

async function crearUsuario({ url, serviceKey, email, password }) {
  const res = await fetch(`${url}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
    }),
  });
  if (res.status === 422) {
    // Ya existe: no es error.
    warn(`El usuario ${email} ya existía, no lo recreo.`);
    return { ya_existia: true };
  }
  if (!res.ok) {
    throw new Error(
      `No pude crear usuario: HTTP ${res.status} ${await res.text()}`,
    );
  }
  return res.json();
}

// --- Vercel API ---------------------------------------------------------------

const VERCEL_API = "https://api.vercel.com";

function vHeaders() {
  return {
    Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
    "Content-Type": "application/json",
  };
}

function vQuery() {
  return process.env.VERCEL_TEAM_ID
    ? `?teamId=${process.env.VERCEL_TEAM_ID}`
    : "";
}

async function proyectoVercel(nombre) {
  return fetchJSON(
    `${VERCEL_API}/v9/projects/${encodeURIComponent(nombre)}${vQuery()}`,
    { headers: vHeaders() },
  );
}

async function envsVercel(projectId) {
  const res = await fetchJSON(
    `${VERCEL_API}/v9/projects/${projectId}/env${vQuery()}`,
    { headers: vHeaders() },
  );
  return res.envs || [];
}

async function borrarEnvVercel(projectId, envId) {
  return fetchJSON(
    `${VERCEL_API}/v9/projects/${projectId}/env/${envId}${vQuery()}`,
    { method: "DELETE", headers: vHeaders() },
  );
}

async function crearEnvVercel(projectId, key, value) {
  return fetchJSON(
    `${VERCEL_API}/v10/projects/${projectId}/env${vQuery()}`,
    {
      method: "POST",
      headers: vHeaders(),
      body: JSON.stringify({
        key,
        value,
        target: ["production", "preview", "development"],
        type: "encrypted",
      }),
    },
  );
}

async function redeployVercel(projectName) {
  // Estrategia: dispara deploy vacío del branch main (Vercel toma último commit).
  return fetchJSON(`${VERCEL_API}/v13/deployments${vQuery()}`, {
    method: "POST",
    headers: vHeaders(),
    body: JSON.stringify({
      name: projectName,
      target: "production",
      gitSource: {
        type: "github",
        ref: "main",
        repoId: undefined, // Vercel lo resuelve por el link ya conectado
      },
    }),
  });
}

// --- Flujo principal ----------------------------------------------------------

async function main() {
  log(`${c.bold}${c.magenta}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Administración Saladino — Reactivador todo-en-uno
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.reset}
`);

  cargarEnv();

  // Config con defaults
  const nombreProyecto =
    process.env.SUPABASE_PROJECT_NAME || "administracion-saladino";
  const region = process.env.SUPABASE_REGION || "us-east-1";
  const proyectoVercelNombre =
    process.env.VERCEL_PROJECT_NAME || "proyecto-german";

  // Pedir lo que falte
  await requerirEnv("SUPABASE_ACCESS_TOKEN", {
    defecto: undefined,
  });
  await requerirEnv("VERCEL_TOKEN");
  await requerirEnv("USER_EMAIL", { defecto: "foge890210sh7@gmail.com" });
  await requerirEnv("USER_PASSWORD", { secreto: true });

  // -------- Paso 1: elegir organización de Supabase --------
  step(1, 7, "Verificando cuenta Supabase…");
  const orgs = await listarOrgs();
  if (!orgs.length) throw new Error("Tu cuenta Supabase no tiene organizaciones.");
  let orgId = process.env.SUPABASE_ORG_ID;
  if (!orgId) {
    if (orgs.length === 1) {
      orgId = orgs[0].id;
      info(`Usando la única org: ${orgs[0].name} (${orgId})`);
    } else {
      log("Tus organizaciones:");
      orgs.forEach((o, i) => log(`  ${i + 1}. ${o.name} (${o.id})`));
      const rl = createInterface({ input: stdin, output: stdout });
      const idx = await pedir(rl, "¿Cuál usar? (número)", { defecto: "1" });
      rl.close();
      orgId = orgs[Number(idx) - 1]?.id;
      if (!orgId) throw new Error("Índice inválido.");
    }
  }

  // -------- Paso 2: crear (o reutilizar) proyecto --------
  step(2, 7, "Creando proyecto Supabase…");
  const existentes = await listarProyectos();
  let proyecto = existentes.find((p) => p.name === nombreProyecto);
  if (proyecto) {
    warn(`Ya existía "${nombreProyecto}" (ref ${proyecto.id}). Lo reutilizo.`);
  } else {
    await requerirEnv("SUPABASE_DB_PASSWORD", { secreto: true });
    proyecto = await crearProyecto({
      nombre: nombreProyecto,
      orgId,
      region,
      dbPass: process.env.SUPABASE_DB_PASSWORD,
    });
    ok(`Proyecto creado (ref ${proyecto.id})`);
  }

  const ref = proyecto.id;

  // -------- Paso 3: esperar ACTIVE_HEALTHY --------
  step(3, 7, "Esperando a que Supabase termine de aprovisionar…");
  const activo = await esperarActive(ref);
  ok(`Proyecto ACTIVE_HEALTHY`);
  const supabaseUrl = `https://${ref}.supabase.co`;
  info(`URL: ${supabaseUrl}`);
  info(`Región: ${activo.region}`);

  // -------- Paso 4: obtener API keys --------
  step(4, 7, "Obteniendo API keys…");
  const keys = await apiKeys(ref);
  const anonKey = keys.find((k) => k.name === "anon")?.api_key;
  const serviceKey = keys.find((k) => k.name === "service_role")?.api_key;
  if (!anonKey || !serviceKey) {
    throw new Error(
      `No pude leer las llaves: ${JSON.stringify(keys).slice(0, 200)}`,
    );
  }
  ok("anon key y service_role obtenidas");

  // -------- Paso 5: correr migraciones --------
  step(5, 7, "Aplicando migraciones SQL…");
  const migraciones = [
    "supabase/migrations/0001_init.sql",
    "supabase/migrations/0002_seed_y_presupuestos.sql",
  ];
  for (const rel of migraciones) {
    const sql = readFileSync(resolve(RAIZ, rel), "utf8");
    info(`Corriendo ${rel}…`);
    try {
      await ejecutarSQL(ref, sql);
      ok(`${rel} OK`);
    } catch (e) {
      // Si el error es "already exists" en el segundo pase, lo toleramos.
      if (String(e.message).includes("already exists")) {
        warn(`${rel}: objetos ya existen, sigo.`);
      } else {
        throw e;
      }
    }
  }

  // -------- Paso 6: crear usuario Germán --------
  step(6, 7, "Creando usuario de Germán en Auth…");
  await crearUsuario({
    url: supabaseUrl,
    serviceKey,
    email: process.env.USER_EMAIL,
    password: process.env.USER_PASSWORD,
  });
  ok(`Usuario ${process.env.USER_EMAIL} listo`);

  // -------- Paso 7: escribir .env.local + sincronizar Vercel --------
  step(7, 7, "Guardando .env.local y sincronizando Vercel…");

  const envLocal = [
    "# Generado por scripts/reactivar.mjs — NO commitear",
    `NEXT_PUBLIC_SUPABASE_URL=${supabaseUrl}`,
    `NEXT_PUBLIC_SUPABASE_ANON_KEY=${anonKey}`,
    "",
  ].join("\n");
  writeFileSync(resolve(RAIZ, ".env.local"), envLocal);
  ok(`.env.local escrito`);

  // Vercel: buscar proyecto, borrar env vars viejas, crear nuevas, redeploy.
  let vProj;
  try {
    vProj = await proyectoVercel(proyectoVercelNombre);
  } catch (e) {
    if (e.status === 404) {
      warn(
        `No encontré "${proyectoVercelNombre}" en Vercel. Salto sincronización de Vercel.`,
      );
      warn(`Cuando hagas deploy, pega las 2 env vars a mano.`);
      return resumenFinal({ supabaseUrl, anonKey });
    }
    throw e;
  }
  info(`Proyecto Vercel: ${vProj.name} (${vProj.id})`);

  const envs = await envsVercel(vProj.id);
  for (const key of ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]) {
    const existentes = envs.filter((e) => e.key === key);
    for (const e of existentes) {
      await borrarEnvVercel(vProj.id, e.id);
      info(`Borrado env viejo ${key} (${e.id})`);
    }
    const val = key === "NEXT_PUBLIC_SUPABASE_URL" ? supabaseUrl : anonKey;
    await crearEnvVercel(vProj.id, key, val);
    ok(`Env ${key} escrito en Vercel`);
  }

  info(`Disparando redeploy…`);
  try {
    const dep = await redeployVercel(proyectoVercelNombre);
    ok(`Deploy iniciado: ${dep.url ? "https://" + dep.url : dep.id}`);
  } catch (e) {
    warn(`No pude disparar redeploy por API (${e.message.slice(0, 120)}).`);
    warn(`Ve a Vercel → Deployments → "..." → Redeploy para forzarlo.`);
  }

  resumenFinal({ supabaseUrl, anonKey });
}

function resumenFinal({ supabaseUrl, anonKey }) {
  log(`\n${c.bold}${c.green}━━━ LISTO ━━━${c.reset}`);
  log(`   Supabase URL: ${supabaseUrl}`);
  log(`   Anon key:     ${anonKey.slice(0, 30)}…`);
  log(`
${c.bold}Siguientes pasos manuales${c.reset} (2 min):
  1. Espera 1-2 min a que Vercel termine el deploy.
  2. Abre https://proyecto-german.vercel.app y valida el login.
  3. Si algo falla, pega GET https://proyecto-german.vercel.app/api/health
     para ver el diagnóstico en vivo.
`);
}

main().catch((e) => {
  fail(e.message);
  if (e.body) {
    log(`${c.dim}${JSON.stringify(e.body, null, 2).slice(0, 800)}${c.reset}`);
  }
  process.exit(1);
});

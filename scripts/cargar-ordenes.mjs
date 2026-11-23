#!/usr/bin/env node
// =====================================================================
// cargar-ordenes.mjs
// Toma los JSONs generados por procesar-pdfs.mjs y los carga a Supabase
// como reportes + reporte_items + conceptos (crea los que no existan).
//
// Uso:
//   node scripts/cargar-ordenes.mjs <carpeta-extraidos> [--dry-run] [--cliente "CAPUFE"]
//
// Requiere en env:
//   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
//   SUPABASE_EMAIL, SUPABASE_PASSWORD  (login del usuario)
// =====================================================================

import { readdir, readFile } from "node:fs/promises";
import { join, resolve, basename, extname } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// --------- cargar variables de entorno ----------
function loadEnvFile(path) {
  if (!existsSync(path)) return;
  const txt = readFileSync(path, "utf8");
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2];
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnvFile(".env.local");
loadEnvFile(".env.production");

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const EMAIL = process.env.SUPABASE_EMAIL ?? "foge890210sh7@gmail.com";
const PASSWORD = process.env.SUPABASE_PASSWORD ?? "Saladino2026!";

if (!SUPA_URL || !SUPA_KEY) {
  console.error("ERROR: faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}

// --------- argumentos CLI ----------
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Uso: node scripts/cargar-ordenes.mjs <carpeta-extraidos> [--dry-run] [--cliente \"CAPUFE Querétaro\"]");
  process.exit(1);
}
const carpetaIn = resolve(args[0]);
const DRY = args.includes("--dry-run");
const clienteIdx = args.indexOf("--cliente");
const CLIENTE_NOMBRE = clienteIdx !== -1 && args[clienteIdx + 1]
  ? args[clienteIdx + 1]
  : "CAPUFE - Unidad Regional Querétaro";

// --------- login ----------
const supabase = createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: false } });
console.log(`Login como ${EMAIL}...`);
const { data: sesion, error: errLogin } = await supabase.auth.signInWithPassword({
  email: EMAIL,
  password: PASSWORD,
});
if (errLogin) {
  console.error("ERROR de login:", errLogin.message);
  process.exit(1);
}
console.log("Login OK.\n");

// --------- helpers: find-or-create ----------
async function upsertCliente(nombre) {
  const q = await supabase.from("clientes").select("id").eq("nombre", nombre).maybeSingle();
  if (q.data?.id) return q.data.id;
  if (DRY) return `DRY-cliente-${nombre}`;
  const ins = await supabase.from("clientes").insert({ nombre }).select("id").single();
  if (ins.error) throw new Error(`insertando cliente: ${ins.error.message}`);
  return ins.data.id;
}

async function upsertTramo(cliente_id, nombre) {
  const q = await supabase.from("tramos").select("id").eq("nombre", nombre).eq("cliente_id", cliente_id).maybeSingle();
  if (q.data?.id) return q.data.id;
  if (DRY) return `DRY-tramo-${nombre}`;
  const ins = await supabase.from("tramos").insert({ cliente_id, nombre }).select("id").single();
  if (ins.error) throw new Error(`insertando tramo: ${ins.error.message}`);
  return ins.data.id;
}

async function upsertConcepto({ descripcion, unidad, precio_base }) {
  const q = await supabase.from("conceptos").select("id, precio_base").eq("descripcion", descripcion).maybeSingle();
  if (q.data?.id) return q.data.id;
  if (DRY) return `DRY-concepto-${descripcion.slice(0, 20)}`;
  const ins = await supabase.from("conceptos").insert({
    descripcion,
    unidad: unidad || "pza",
    precio_base: precio_base || 0,
    activo: true,
  }).select("id").single();
  if (ins.error) throw new Error(`insertando concepto: ${ins.error.message}`);
  return ins.data.id;
}

// --------- construir nota consolidada ----------
function construirNota(orden) {
  const partes = [];
  if (orden.dictamen) partes.push(`Dictamen: ${orden.dictamen}`);
  if (orden.folio_siniestro) partes.push(`Folio: ${orden.folio_siniestro}`);
  if (orden.kilometro) partes.push(`KM: ${orden.kilometro}${orden.cuerpo ? " (cuerpo " + orden.cuerpo + ")" : ""}`);
  if (orden.autopista) partes.push(`Autopista: ${orden.autopista}`);
  if (orden.plaza_cobro) partes.push(`Plaza de cobro: ${orden.plaza_cobro}`);
  if (orden.vehiculo) {
    const v = orden.vehiculo;
    const vehLinea = [v.tipo, v.marca, v.modelo, v.color, v.placas].filter(Boolean).join(" / ");
    if (vehLinea) partes.push(`Vehículo: ${vehLinea}`);
    if (v.conductor && v.conductor !== "S/D") partes.push(`Conductor: ${v.conductor}`);
    if (v.propietario && v.propietario !== "S/D") partes.push(`Propietario: ${v.propietario}`);
  }
  if (orden.aseguradora) {
    const a = orden.aseguradora;
    const asegLinea = [a.nombre, a.poliza && `Póliza ${a.poliza}`].filter(Boolean).join(" / ");
    if (asegLinea) partes.push(`Aseguradora: ${asegLinea}`);
    if (a.ajustador && a.ajustador !== "—") partes.push(`Ajustador: ${a.ajustador}`);
  }
  if (orden.danos?.length) {
    partes.push(`\nDaños reportados (${orden.danos.length}):`);
    for (const d of orden.danos) {
      partes.push(`  • ${d.cantidad} ${d.unidad.toUpperCase()}  ${d.descripcion}`);
    }
  }
  if (orden._archivo_origen) partes.push(`\nArchivo origen: ${orden._archivo_origen}`);
  return partes.join("\n");
}

// --------- cargar una orden ----------
// Estrategia: 1 reporte por dictamen; 1 item consolidado con el total real
// del dictamen técnico (es lo que se va a cobrar). Desglose de daños va en
// `reporte.notas` para que Germán/Edgar los vean en la app; los pueden
// desglosar manualmente luego si quieren.
async function cargarOrden(orden, cliente_id) {
  const nombreTramo = orden.tramo || orden.autopista || "Tramo sin especificar";
  const tramo_id = await upsertTramo(cliente_id, nombreTramo);

  const fecha = orden.fecha_elaboracion || orden.fecha_siniestro || new Date().toISOString().slice(0, 10);
  const total = Number(orden.total || 0);
  const notas = construirNota(orden);

  const descConcepto = `Dictamen ${orden.dictamen || "sin folio"} - ${orden.danos?.length || 0} daños`;
  console.log(`  → Reporte: ${fecha} | tramo="${nombreTramo}" | total=$${total.toLocaleString("es-MX")}`);
  if (DRY) {
    for (const d of orden.danos || []) {
      console.log(`     - ${d.cantidad} ${d.unidad} ${d.descripcion?.slice(0, 70)}`);
    }
    return;
  }

  const insRep = await supabase.from("reportes").insert({
    fecha,
    cliente_id,
    tramo_id,
    notas,
    total, // valor inicial; el trigger lo recalculará desde los items
  }).select("id").single();
  if (insRep.error) throw new Error(`insertando reporte: ${insRep.error.message}`);
  const reporte_id = insRep.data.id;

  // Concepto consolidado "Dictamen de daños" (lo crea una sola vez)
  const concepto_id = await upsertConcepto({
    descripcion: "Dictamen de daños CAPUFE (consolidado)",
    unidad: "dictamen",
    precio_base: 0,
  });

  // 1 item con el total del dictamen como precio_unitario y cantidad=1
  const insItem = await supabase.from("reporte_items").insert({
    reporte_id,
    concepto_id,
    descripcion: descConcepto,
    unidad: "dictamen",
    cantidad: 1,
    precio_unitario: total,
  });
  if (insItem.error) throw new Error(`insertando item: ${insItem.error.message}`);
}

// --------- main ----------
const archivos = (await readdir(carpetaIn))
  .filter((f) => extname(f).toLowerCase() === ".json" && !f.startsWith("_"))
  .sort();

if (archivos.length === 0) {
  console.error(`No hay JSONs en ${carpetaIn}`);
  process.exit(1);
}

console.log(`${archivos.length} ordenes a cargar${DRY ? " (DRY-RUN)" : ""}`);
console.log(`Cliente destino: ${CLIENTE_NOMBRE}\n`);

const cliente_id = await upsertCliente(CLIENTE_NOMBRE);

let ok = 0;
const errores = [];
for (const nombre of archivos) {
  try {
    const raw = await readFile(join(carpetaIn, nombre), "utf8");
    const orden = JSON.parse(raw);
    console.log(`[${nombre}]`);
    await cargarOrden(orden, cliente_id);
    ok++;
  } catch (e) {
    console.error(`[${nombre}] ERROR: ${e.message}`);
    errores.push({ archivo: nombre, error: e.message });
  }
}

console.log(`\n===== RESUMEN =====`);
console.log(`Cargadas: ${ok}/${archivos.length}`);
console.log(`Errores: ${errores.length}`);
if (errores.length) console.log(JSON.stringify(errores, null, 2));

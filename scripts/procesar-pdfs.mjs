#!/usr/bin/env node
// =====================================================================
// procesar-pdfs.mjs
// Extrae datos estructurados de dictámenes de daños de CAPUFE (PDFs)
// usando Gemini 2.5 Flash. Guarda un JSON por PDF en ../extraidos/.
//
// Uso:
//   node scripts/procesar-pdfs.mjs <carpeta-con-pdfs> [--out <carpeta-salida>]
//
// Requiere GOOGLE_GEMINI_API_KEY en .env.production o .env.local
// =====================================================================

import { readdir, readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { join, basename, extname, resolve } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { GoogleGenAI } from "@google/genai";

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

const API_KEY = process.env.GOOGLE_GEMINI_API_KEY;
if (!API_KEY) {
  console.error("ERROR: falta GOOGLE_GEMINI_API_KEY");
  process.exit(1);
}

// --------- argumentos CLI ----------
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Uso: node scripts/procesar-pdfs.mjs <carpeta-pdfs> [--out <carpeta>]");
  process.exit(1);
}
const carpetaPdfs = resolve(args[0]);
let carpetaOut = resolve(carpetaPdfs, "..", "extraidos");
const outIdx = args.indexOf("--out");
if (outIdx !== -1 && args[outIdx + 1]) carpetaOut = resolve(args[outIdx + 1]);

await mkdir(carpetaOut, { recursive: true });

// --------- schema esperado (lo documentamos en el prompt) ----------
const PROMPT = `Eres un extractor de datos. Te daré un PDF que es un DICTAMEN DE DAÑOS de CAPUFE (Caminos y Puentes Federales de Ingresos y Servicios Conexos), Unidad Regional Querétaro.

Devuelve EXCLUSIVAMENTE un objeto JSON válido (sin markdown, sin comentarios) con la siguiente estructura. Si un campo no aparece en el PDF, usa null.

{
  "dictamen": "CSV-108-2026",                // folio del dictamen
  "folio_siniestro": "04261859072",          // número de siniestro
  "fecha_elaboracion": "2026-10-27",         // fecha ISO YYYY-MM-DD
  "fecha_siniestro": "2026-10-26",           // fecha ISO del accidente
  "hora_siniestro": null,                    // HH:MM si aparece
  "autopista": "Lagos de Moreno - San Luis Potosí",
  "tramo": "Lagos de Moreno - Villa de Arriaga",
  "sentido": "2",
  "kilometro": "19+663",
  "coordenadas": "21.490374N 101.763041W",
  "campamento": "LAGOS DE MORENO",
  "vehiculo": {
    "tipo": "Tractocamión",
    "marca": "Freightliner",
    "modelo": "2024",
    "placas": "FA4251C",
    "color": "Blanco",
    "conductor": "Lorenzo Saúl Montoya",
    "propietario": null,
    "domicilio_tel": null
  },
  "aseguradora": {
    "nombre": "Quálitas Compañía de Seguros",
    "poliza": "5367456",
    "no_siniestro": null,
    "ajustador": null,
    "hora_llegada_ajustador": null,
    "hora_llamada_cabina": null
  },
  "heridos": 0,
  "muertos": 0,
  "danos": [
    {
      "descripcion": "BARRERA DE CONCRETO TIPO TRIBLOK TRADICIONAL DIMENSIONES 80 X 90 X 200 CM",
      "unidad": "Pza",
      "cantidad": 1,
      "precio_unitario": 14794.96,
      "importe": 14794.96
    }
  ],
  "total": 14794.96,
  "superintendente": "ING. PEDRO MÉNDEZ FLORES",
  "observaciones": null
}

REGLAS:
- Números siempre numéricos (no strings). Elimina "$", comas, "pesos", etc.
- Fechas en ISO YYYY-MM-DD. Nombres de mes en español ("octubre" -> "10").
- Si hay varios conceptos de daño, lista cada uno como un objeto en el array "danos".
- NO inventes datos. Lo que no esté, null.
- Devuelve SOLO el JSON, sin backticks ni texto antes/después.`;

// --------- cliente Gemini ----------
const ai = new GoogleGenAI({ apiKey: API_KEY });
const MODEL = "gemini-2.5-flash";

async function procesarUnPdf(pathPdf) {
  const bytes = await readFile(pathPdf);
  const base64 = bytes.toString("base64");
  const nombre = basename(pathPdf);

  console.log(`[${nombre}] pidiendo a Gemini (${(bytes.length / 1024).toFixed(0)} KB)...`);

  const res = await ai.models.generateContent({
    model: MODEL,
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType: "application/pdf", data: base64 } },
          { text: PROMPT },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      temperature: 0,
    },
  });

  const txt = res.text ?? "";
  if (!txt) throw new Error("respuesta vacía");

  // quitar fences si Gemini los pone pese al mime
  const limpio = txt.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
  const data = JSON.parse(limpio);
  data._archivo_origen = nombre;
  return data;
}

// --------- loop principal ----------
const entradas = await readdir(carpetaPdfs);
const pdfs = entradas.filter((f) => extname(f).toLowerCase() === ".pdf").sort();

if (pdfs.length === 0) {
  console.error(`No se encontraron PDFs en ${carpetaPdfs}`);
  process.exit(1);
}

console.log(`Encontré ${pdfs.length} PDFs en ${carpetaPdfs}`);
console.log(`Guardando extracciones en ${carpetaOut}\n`);

const errores = [];
let ok = 0;

for (const nombre of pdfs) {
  const pathPdf = join(carpetaPdfs, nombre);
  const nombreSinExt = nombre.replace(/\.pdf$/i, "");
  const pathOut = join(carpetaOut, `${nombreSinExt}.json`);

  // skip si ya existe
  if (existsSync(pathOut)) {
    console.log(`[${nombre}] ya procesado, salto.`);
    ok++;
    continue;
  }

  try {
    const data = await procesarUnPdf(pathPdf);
    await writeFile(pathOut, JSON.stringify(data, null, 2), "utf8");
    console.log(`[${nombre}] OK -> ${basename(pathOut)}  (total: $${data.total ?? "?"})`);
    ok++;
    // throttle suave para evitar rate-limit del tier free
    await new Promise((r) => setTimeout(r, 1500));
  } catch (e) {
    console.error(`[${nombre}] ERROR: ${e.message}`);
    errores.push({ archivo: nombre, error: e.message });
  }
}

console.log(`\n===== RESUMEN =====`);
console.log(`Exitos: ${ok}/${pdfs.length}`);
console.log(`Errores: ${errores.length}`);
if (errores.length) {
  await writeFile(join(carpetaOut, "_errores.json"), JSON.stringify(errores, null, 2), "utf8");
  console.log(`Detalles en ${join(carpetaOut, "_errores.json")}`);
}

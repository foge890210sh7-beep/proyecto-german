#!/usr/bin/env node
// =====================================================================
// procesar-pdfs-ocr.mjs
// OCR 100% LOCAL Y GRATUITO para dictámenes de daños de CAPUFE.
//   - pdf-to-img : rasteriza cada página del PDF a PNG (JS puro)
//   - tesseract.js : OCR con trainedData "spa" (WASM, gratis, offline)
// Luego parsea el texto con reglas específicas del formato CAPUFE.
//
// Uso:
//   node scripts/procesar-pdfs-ocr.mjs <carpeta-pdfs> [--out <carpeta>] [--debug]
// =====================================================================

import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { join, basename, extname, resolve } from "node:path";
import { existsSync } from "node:fs";
import { pdf } from "pdf-to-img";
import { createWorker } from "tesseract.js";

// --------- args CLI ----------
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Uso: node scripts/procesar-pdfs-ocr.mjs <carpeta-pdfs> [--out <carpeta>] [--debug]");
  process.exit(1);
}
const carpetaPdfs = resolve(args[0]);
let carpetaOut = resolve(carpetaPdfs, "..", "extraidos");
const outIdx = args.indexOf("--out");
if (outIdx !== -1 && args[outIdx + 1]) carpetaOut = resolve(args[outIdx + 1]);
const DEBUG = args.includes("--debug");

await mkdir(carpetaOut, { recursive: true });

// --------- helpers de parseo ----------
const MESES = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
  julio: 7, agosto: 8, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
};
const MESES_ABR = { ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6, jul: 7, ago: 8, sep: 9, oct: 10, nov: 11, dic: 12 };

function toISO(dia, mes, anio) {
  const d = String(dia).padStart(2, "0");
  const m = String(mes).padStart(2, "0");
  let y = String(anio);
  if (y.length === 2) y = "20" + y;
  return `${y}-${m}-${d}`;
}

function parseFechaLarga(txt) {
  // "lunes, 26 de octubre de 2026"
  const m = txt.match(/(\d{1,2})\s+de\s+([a-záéíóú]+)\s+de\s+(\d{4})/i);
  if (!m) return null;
  const mes = MESES[m[2].toLowerCase()];
  if (!mes) return null;
  return toISO(m[1], mes, m[3]);
}

function parseFechaCorta(txt) {
  // "27-oct-26" o "27/10/2026"
  let m = txt.match(/(\d{1,2})[-\/](\d{1,2}|[a-z]{3})[-\/](\d{2,4})/i);
  if (!m) return null;
  let mes = m[2];
  if (/^[a-z]{3}$/i.test(mes)) {
    mes = MESES_ABR[mes.toLowerCase()];
    if (!mes) return null;
  }
  return toISO(m[1], mes, m[3]);
}

function parseNumero(s) {
  if (s == null) return null;
  const limpio = String(s).replace(/[^\d.,-]/g, "").replace(/,/g, "");
  if (!limpio) return null;
  const n = Number(limpio);
  return Number.isFinite(n) ? n : null;
}

function matchLineaDespues(texto, etiqueta) {
  // Busca `etiqueta: valor` o `etiqueta  valor` (misma línea o siguiente)
  const re = new RegExp(etiqueta + "[\\s:]+([^\\n\\r]+?)(?=\\s{2,}|$|\\n)", "i");
  const m = texto.match(re);
  return m ? m[1].trim() : null;
}

function matchHasta(texto, inicio, limite) {
  const iniRe = new RegExp(inicio, "i");
  const mi = texto.match(iniRe);
  if (!mi) return null;
  const idx = mi.index + mi[0].length;
  const resto = texto.slice(idx);
  const limRe = new RegExp(limite, "i");
  const ml = resto.match(limRe);
  const fin = ml ? ml.index : Math.min(resto.length, 300);
  return resto.slice(0, fin).trim();
}

function parseDictamen(texto) {
  const out = {
    dictamen: null,
    folio_siniestro: null,
    fecha_elaboracion: null,
    fecha_siniestro: null,
    hora_siniestro: null,
    autopista: null,
    tramo: null,
    cuerpo: null,
    kilometro: null,
    plaza_cobro: null,
    campamento: null,
    vehiculo: {
      tipo: null, marca: null, modelo: null, placas: null,
      color: null, conductor: null, propietario: null,
    },
    aseguradora: {
      nombre: null, poliza: null, ajustador: null,
      hora_llegada_ajustador: null, hora_llamada_cabina: null,
    },
    heridos: null,
    muertos: null,
    danos: [],
    total: null,
    superintendente: null,
    observaciones: null,
  };

  const t = texto.replace(/ /g, " ").replace(/[ \t]+/g, " ");
  const match = (re) => { const m = t.match(re); return m ? m[1].trim() : null; };

  // ---- Dictamen (código CSV-XXX-2026) ----
  out.dictamen = match(/DICTAMEN\s+DE\s+DA[NÑ]OS[:\s]*(C[SsVv]{1,2}\s?[-]?\s?\d{1,4}\s?[-]?\s?\d{4})/i);
  if (out.dictamen) out.dictamen = out.dictamen.replace(/\s+/g, "").replace(/^cs?v/i, "CSV").toUpperCase();

  // ---- Folio del siniestro (10-11 dígitos, empieza 0426 ó 426) ----
  out.folio_siniestro = match(/N[uú]mero\s+de\s+Siniestro:\s*(0?4\d{9,10})/i)
    || match(/Reporte\s+de\s+la\s+Aseguradora:\s*(0?4\d{9,10})/i)
    || match(/\b(0?4\d{10})\b/);

  // ---- Fecha y hora del siniestro (Reporte de Accidente: "Fecha y Hora Siniestro: 19/10/2026 18:22") ----
  let m = t.match(/Fecha\s+y\s+Hora\s+Siniestro:\s*(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s+(\d{1,2}:\d{2})?/i);
  if (m) {
    out.fecha_siniestro = toISO(m[1], m[2], m[3]);
    if (m[4]) out.hora_siniestro = m[4];
  }
  // fallback con fecha larga en español ("lunes, 19 de octubre de 2026")
  if (!out.fecha_siniestro) out.fecha_siniestro = parseFechaLarga(t);

  // ---- Fecha de elaboración del reporte (Dictamen: "FECHA DE ELABORACIÓN DE REPORTE: 19-oct-26") ----
  m = t.match(/FECHA\s+DE\s+ELABORACI[OÓ]N[^\n\d]*(\d{1,2}[-\/\.][a-zA-Z0-9]{2,}[-\/\.]\d{2,4})/i);
  if (m) out.fecha_elaboracion = parseFechaCorta(m[1]);

  // ---- Km (normaliza 56:870 → 56+870) ----
  out.kilometro = match(/Kil[oó]metro:\s*(\d+[\+:]?\d*)/i)
    || match(/KIL[OÓ]METRO[:\s]+([\d+\.]+)/i)
    || match(/KM\s+(\d+[\+:]\d+)/i);
  if (out.kilometro) out.kilometro = out.kilometro.replace(":", "+");

  // ---- Plaza de cobro (PC190 Lagos de Moreno) ----
  out.plaza_cobro = match(/Plaza\s+de\s+Cobro:\s*(PC?\s?\d+[^\n]*?)(?=\s+Kil|\s+Fecha|$)/i);

  // ---- Autopista ----
  out.autopista = match(/Autopista:\s*([^\n]+?)(?=\s+Cuerpo:|\s+HORA|\s+N[uú]mero|\n|$)/i);

  // ---- Tramo ----
  out.tramo = match(/Tramo:\s*([^\n]+?)(?=\s+Responsabilidad|\s+SENTIDO|\s+Hora|\n|$)/i);

  // ---- Cuerpo (A / B / U) ----
  out.cuerpo = match(/Cuerpo:\s*([ABU])/i);

  // ---- Campamento ----
  out.campamento = match(/CAMPAMENTO[^:]*:[\s"']*([A-ZÁÉÍÓÚÑ\s]+?)["']?(?=\s*LUGAR|\s*\n|$)/i);

  // ---- Vehículo (línea única del Reporte de Accidente: "Tipo: X . Marca: Y . Modelo: ... ") ----
  const vehLine = match(/1\.\s*Tipo:\s*([^\n]+?)(?=\n|Domicilio:|Causas|$)/i)
    || match(/VEH[IÍ]CULOS?\s+INVOLUCRADOS[^\n]*\n\s*\d+\.\s*Tipo:\s*([^\n]+)/i);
  if (vehLine) {
    // "TRACTOCAM-5-E . Marca: KENWORTH . Modelo: 2024 . Color: GRIS. Placas: S/D. Estado: SPF . Conductor: S/D. Propietario: S/D"
    out.vehiculo.tipo = (vehLine.match(/^([^.\n]+?)(?=\s*\.|\s+Marca)/i) || [])[1]?.trim() ?? null;
    out.vehiculo.marca = (vehLine.match(/Marca:\s*([^.\n]+)/i) || [])[1]?.trim() ?? null;
    out.vehiculo.modelo = (vehLine.match(/Modelo:\s*(\d{4})/i) || [])[1]?.trim() ?? null;
    out.vehiculo.color = (vehLine.match(/Color:\s*([A-ZÁÉÍÓÚÑ\/]+)/i) || [])[1]?.trim() ?? null;
    out.vehiculo.placas = (vehLine.match(/Placas:\s*([A-Z0-9\-\/]+)/i) || [])[1]?.trim() ?? null;
    out.vehiculo.conductor = (vehLine.match(/Conductor:\s*([^.\n]+?)(?=\s*\.|$)/i) || [])[1]?.trim() ?? null;
    out.vehiculo.propietario = (vehLine.match(/Propietario:\s*([^.\n]+?)(?=\s*\.|$)/i) || [])[1]?.trim() ?? null;
  }

  // ---- Aseguradora ----
  // Aseguradora: cortar antes de "Reporte", "S.A.", "Hora" u otros labels del renglón largo
  out.aseguradora.nombre = match(/Aseguradora:\s*([^\n]+?)(?=\s+Reporte\s+de\s+la\s+Aseguradora|\s+S\.A\.\s*de|\s+Hora\s+de|\s+N[uú]mero|\n|$)/i);
  if (out.aseguradora.nombre) {
    out.aseguradora.nombre = out.aseguradora.nombre.replace(/\s+/g, " ").replace(/\s*[\.,]$/,"").trim();
    // OCR a veces escribe "Qualitas" en lugar de "Quálitas"; normalizar.
    out.aseguradora.nombre = out.aseguradora.nombre.replace(/qu[aá]litas/i, "Quálitas");
  }
  out.aseguradora.poliza = match(/N[uú]mero\s+de\s+P[oó]liza:\s*(\S+)/i)
    || match(/P[OÓ]LIZA:\s*(\S+)/i);
  out.aseguradora.ajustador = match(/Ajustador:\s*([^\n]+?)(?=\s+Hora|\n|$)/i);
  out.aseguradora.hora_llegada_ajustador = match(/Hora\s+de\s+Llegada:\s*(\d{1,2}:\d{2})/i);
  out.aseguradora.hora_llamada_cabina = match(/Hora\s+de\s+la\s+Llamada:\s*(\d{1,2}:\d{2})/i);

  // ---- Heridos / Muertos ----
  const h = match(/Total\s+de\s+Heridos:\s*(\d+)/i) || match(/HERIDOS\s*N[oO°º]?\s*:?\s*(\d+)/i);
  if (h !== null) out.heridos = parseInt(h);
  const d = match(/Total\s+de\s+Decesos:\s*(\d+)/i) || match(/MUERTOS\s*N[oO°º]?\s*:?\s*(\d+)/i);
  if (d !== null) out.muertos = parseInt(d);

  // ---- TOTAL (SIEMPRE preferir la frase explícita del dictamen técnico) ----
  // "El monto total de los daños ocasionados al camino asciende a la cantidad de: 205,827.50 (doscientos..."
  m = t.match(/asciende\s+a\s+la\s+cantidad\s+de[:\s]*\$?\s*([\d,]+\.\d{2})/i);
  if (m) {
    out.total = parseNumero(m[1]);
  } else {
    // fallback: último "TOTAL $ XXX,XXX.XX"
    const totales = [...t.matchAll(/TOTAL[\s\|]*\$?\s*([\d,]+\.\d{2})/gi)];
    if (totales.length) out.total = parseNumero(totales[totales.length - 1][1]);
  }

  // ---- DAÑOS: tomar del REPORTE DE ACCIDENTE (más limpio) ----
  // Formato: entre "Descripción Cant. U.M." y "VEHÍCULOS INVOLUCRADOS"
  const mBloqueDanos = t.match(/Descripci[oó]n\s+Cant\.?\s+U\.?M\.?([\s\S]+?)(?=VEH[IÍ]CULOS?\s+INVOLUCRADOS|CAUSAS|COMENTARIOS|$)/i);
  if (mBloqueDanos) {
    const bloque = mBloqueDanos[1];
    const lineas = bloque.split(/\n/).map((l) => l.trim()).filter(Boolean);
    for (const linea of lineas) {
      // "Defensa metálica doble tres corrugaciones, tramo de 3.81 M, sin accesorios 5 PZA"
      const mL = linea.match(/^(.+?)\s+(\d+(?:\.\d+)?)\s+(PZA|M|M2|M3|ML|LT|KG|TON|JORNADA|DIA)$/i);
      if (mL) {
        out.danos.push({
          descripcion: mL[1].trim(),
          cantidad: parseNumero(mL[2]),
          unidad: mL[3].toLowerCase(),
          precio_unitario: null,
          importe: null,
        });
      }
    }
  }
  // Si no encontramos con el formato limpio, intentar con el acta narrativa
  if (out.danos.length === 0) {
    const mActa = t.match(/DA[ÑN]OS\s+AL\s+CAMINO:([\s\S]+?)(?=NOTA:|SIN\s+MAS|$)/i);
    if (mActa) {
      const items = mActa[1].split(/[\*•·]/).map((s) => s.trim()).filter(Boolean);
      for (const it of items) {
        const mL = it.match(/^(\d+)\s+(.+)$/);
        if (mL) {
          out.danos.push({
            descripcion: mL[2].replace(/\s+/g, " ").trim(),
            cantidad: parseNumero(mL[1]),
            unidad: "pza",
            precio_unitario: null,
            importe: null,
          });
        }
      }
    }
  }

  // ---- Superintendente ----
  out.superintendente = match(/(ING\.\s+PEDRO\s+M[EÉ]NDEZ\s+FLORES)/i) || match(/(ING\.\s+[A-ZÁÉÍÓÚÑ ]{5,})\s+SUPERINTENDENTE/i);

  return out;
}

// --------- OCR ----------
console.log("Inicializando Tesseract (spa)... la primera vez descarga ~15MB de trainedData");
const worker = await createWorker("spa", 1, {
  // silenciar logs ruidosos
  logger: () => {},
});
console.log("Tesseract listo.\n");

async function ocrPdf(pathPdf) {
  const document = await pdf(pathPdf, { scale: 2 });
  let textoTotal = "";
  let pageNum = 0;
  for await (const imgBuffer of document) {
    pageNum++;
    const { data } = await worker.recognize(imgBuffer);
    textoTotal += `\n===== PAGE ${pageNum} =====\n` + data.text;
  }
  return textoTotal;
}

// --------- main loop ----------
const entradas = await readdir(carpetaPdfs);
const pdfs = entradas.filter((f) => extname(f).toLowerCase() === ".pdf").sort();

if (pdfs.length === 0) {
  console.error(`No se encontraron PDFs en ${carpetaPdfs}`);
  await worker.terminate();
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
  const pathTxt = join(carpetaOut, `${nombreSinExt}.txt`);

  if (existsSync(pathOut)) {
    console.log(`[${nombre}] ya procesado, salto.`);
    ok++;
    continue;
  }

  try {
    console.log(`[${nombre}] OCR...`);
    const t0 = Date.now();
    const texto = await ocrPdf(pathPdf);
    const ms = Date.now() - t0;

    if (DEBUG) await writeFile(pathTxt, texto, "utf8");

    const parsed = parseDictamen(texto);
    parsed._archivo_origen = nombre;
    parsed._ocr_ms = ms;

    await writeFile(pathOut, JSON.stringify(parsed, null, 2), "utf8");
    console.log(`[${nombre}] OK (${(ms/1000).toFixed(1)}s) -> dictamen=${parsed.dictamen} total=$${parsed.total ?? "?"}`);
    ok++;
  } catch (e) {
    console.error(`[${nombre}] ERROR: ${e.message}`);
    errores.push({ archivo: nombre, error: e.message });
  }
}

await worker.terminate();

console.log(`\n===== RESUMEN =====`);
console.log(`Exitos: ${ok}/${pdfs.length}`);
console.log(`Errores: ${errores.length}`);
if (errores.length) {
  await writeFile(join(carpetaOut, "_errores.json"), JSON.stringify(errores, null, 2), "utf8");
}

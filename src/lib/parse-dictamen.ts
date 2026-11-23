// =====================================================================
// parse-dictamen.ts
// Parser para dictámenes de daños de CAPUFE (Unidad Regional Querétaro).
// Toma texto OCR (de un PDF) y devuelve datos estructurados.
// =====================================================================

export type DanoItem = {
  descripcion: string;
  cantidad: number | null;
  unidad: string;
  precio_unitario: number | null;
  importe: number | null;
};

export type DictamenExtraido = {
  dictamen: string | null;
  folio_siniestro: string | null;
  fecha_elaboracion: string | null;
  fecha_siniestro: string | null;
  hora_siniestro: string | null;
  autopista: string | null;
  tramo: string | null;
  cuerpo: string | null;
  kilometro: string | null;
  plaza_cobro: string | null;
  campamento: string | null;
  vehiculo: {
    tipo: string | null;
    marca: string | null;
    modelo: string | null;
    placas: string | null;
    color: string | null;
    conductor: string | null;
    propietario: string | null;
  };
  aseguradora: {
    nombre: string | null;
    poliza: string | null;
    ajustador: string | null;
    hora_llegada_ajustador: string | null;
    hora_llamada_cabina: string | null;
  };
  heridos: number | null;
  muertos: number | null;
  danos: DanoItem[];
  total: number | null;
  superintendente: string | null;
  observaciones: string | null;
};

const MESES: Record<string, number> = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
  julio: 7, agosto: 8, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
};
const MESES_ABR: Record<string, number> = {
  ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6, jul: 7, ago: 8, sep: 9, oct: 10, nov: 11, dic: 12,
};

function toISO(dia: string | number, mes: string | number, anio: string | number): string {
  const d = String(dia).padStart(2, "0");
  const m = String(mes).padStart(2, "0");
  let y = String(anio);
  if (y.length === 2) y = "20" + y;
  return `${y}-${m}-${d}`;
}

function parseFechaLarga(txt: string): string | null {
  const m = txt.match(/(\d{1,2})\s+de\s+([a-záéíóú]+)\s+de\s+(\d{4})/i);
  if (!m) return null;
  const mes = MESES[m[2].toLowerCase()];
  if (!mes) return null;
  return toISO(m[1], mes, m[3]);
}

function parseFechaCorta(txt: string): string | null {
  const m = txt.match(/(\d{1,2})[-\/](\d{1,2}|[a-z]{3})[-\/](\d{2,4})/i);
  if (!m) return null;
  let mes: string | number = m[2];
  if (/^[a-z]{3}$/i.test(String(mes))) {
    const abr = MESES_ABR[String(mes).toLowerCase()];
    if (!abr) return null;
    mes = abr;
  }
  return toISO(m[1], mes, m[3]);
}

function parseNumero(s: string | null | undefined): number | null {
  if (s == null) return null;
  const limpio = String(s).replace(/[^\d.,-]/g, "").replace(/,/g, "");
  if (!limpio) return null;
  const n = Number(limpio);
  return Number.isFinite(n) ? n : null;
}

export function parseDictamen(texto: string): DictamenExtraido {
  const out: DictamenExtraido = {
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
  const match = (re: RegExp): string | null => {
    const m = t.match(re);
    return m ? m[1].trim() : null;
  };

  out.dictamen = match(/DICTAMEN\s+DE\s+DA[NÑ]OS[:\s]*(C[SsVv]{1,2}\s?[-]?\s?\d{1,4}\s?[-]?\s?\d{4})/i);
  if (out.dictamen) out.dictamen = out.dictamen.replace(/\s+/g, "").replace(/^cs?v/i, "CSV").toUpperCase();

  out.folio_siniestro = match(/N[uú]mero\s+de\s+Siniestro:\s*(0?4\d{9,10})/i)
    || match(/Reporte\s+de\s+la\s+Aseguradora:\s*(0?4\d{9,10})/i)
    || match(/\b(0?4\d{10})\b/);

  let m = t.match(/Fecha\s+y\s+Hora\s+Siniestro:\s*(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s+(\d{1,2}:\d{2})?/i);
  if (m) {
    out.fecha_siniestro = toISO(m[1], m[2], m[3]);
    if (m[4]) out.hora_siniestro = m[4];
  }
  if (!out.fecha_siniestro) out.fecha_siniestro = parseFechaLarga(t);

  m = t.match(/FECHA\s+DE\s+ELABORACI[OÓ]N[^\n\d]*(\d{1,2}[-\/\.][a-zA-Z0-9]{2,}[-\/\.]\d{2,4})/i);
  if (m) out.fecha_elaboracion = parseFechaCorta(m[1]);

  out.kilometro = match(/Kil[oó]metro:\s*(\d+[\+:]?\d*)/i)
    || match(/KIL[OÓ]METRO[:\s]+([\d+\.]+)/i)
    || match(/KM\s+(\d+[\+:]\d+)/i);
  if (out.kilometro) out.kilometro = out.kilometro.replace(":", "+");

  out.plaza_cobro = match(/Plaza\s+de\s+Cobro:\s*(PC?\s?\d+[^\n]*?)(?=\s+Kil|\s+Fecha|$)/i);
  out.autopista = match(/Autopista:\s*([^\n]+?)(?=\s+Cuerpo:|\s+HORA|\s+N[uú]mero|\n|$)/i);
  out.tramo = match(/Tramo:\s*([^\n]+?)(?=\s+Responsabilidad|\s+SENTIDO|\s+Hora|\n|$)/i);
  out.cuerpo = match(/Cuerpo:\s*([ABU])/i);
  out.campamento = match(/CAMPAMENTO[^:]*:[\s"']*([A-ZÁÉÍÓÚÑ\s]+?)["']?(?=\s*LUGAR|\s*\n|$)/i);

  const vehLine = match(/1\.\s*Tipo:\s*([^\n]+?)(?=\n|Domicilio:|Causas|$)/i)
    || match(/VEH[IÍ]CULOS?\s+INVOLUCRADOS[^\n]*\n\s*\d+\.\s*Tipo:\s*([^\n]+)/i);
  if (vehLine) {
    const pick = (re: RegExp): string | null => (vehLine.match(re) || [])[1]?.trim() ?? null;
    out.vehiculo.tipo = pick(/^([^.\n]+?)(?=\s*\.|\s+Marca)/i);
    out.vehiculo.marca = pick(/Marca:\s*([^.\n]+)/i);
    out.vehiculo.modelo = pick(/Modelo:\s*(\d{4})/i);
    out.vehiculo.color = pick(/Color:\s*([A-ZÁÉÍÓÚÑ\/]+)/i);
    out.vehiculo.placas = pick(/Placas:\s*([A-Z0-9\-\/]+)/i);
    out.vehiculo.conductor = pick(/Conductor:\s*([^.\n]+?)(?=\s*\.|$)/i);
    out.vehiculo.propietario = pick(/Propietario:\s*([^.\n]+?)(?=\s*\.|$)/i);
  }

  out.aseguradora.nombre = match(/Aseguradora:\s*([^\n]+?)(?=\s+Reporte\s+de\s+la\s+Aseguradora|\s+S\.A\.\s*de|\s+Hora\s+de|\s+N[uú]mero|\n|$)/i);
  if (out.aseguradora.nombre) {
    out.aseguradora.nombre = out.aseguradora.nombre.replace(/\s+/g, " ").replace(/\s*[\.,]$/, "").trim();
    out.aseguradora.nombre = out.aseguradora.nombre.replace(/qu[aá]litas/i, "Quálitas");
  }
  out.aseguradora.poliza = match(/N[uú]mero\s+de\s+P[oó]liza:\s*(\S+)/i) || match(/P[OÓ]LIZA:\s*(\S+)/i);
  out.aseguradora.ajustador = match(/Ajustador:\s*([^\n]+?)(?=\s+Hora|\n|$)/i);
  out.aseguradora.hora_llegada_ajustador = match(/Hora\s+de\s+Llegada:\s*(\d{1,2}:\d{2})/i);
  out.aseguradora.hora_llamada_cabina = match(/Hora\s+de\s+la\s+Llamada:\s*(\d{1,2}:\d{2})/i);

  const h = match(/Total\s+de\s+Heridos:\s*(\d+)/i) || match(/HERIDOS\s*N[oO°º]?\s*:?\s*(\d+)/i);
  if (h !== null) out.heridos = parseInt(h);
  const d = match(/Total\s+de\s+Decesos:\s*(\d+)/i) || match(/MUERTOS\s*N[oO°º]?\s*:?\s*(\d+)/i);
  if (d !== null) out.muertos = parseInt(d);

  m = t.match(/asciende\s+a\s+la\s+cantidad\s+de[:\s]*\$?\s*([\d,]+\.\d{2})/i);
  if (m) {
    out.total = parseNumero(m[1]);
  } else {
    const totales = [...t.matchAll(/TOTAL[\s\|]*\$?\s*([\d,]+\.\d{2})/gi)];
    if (totales.length) out.total = parseNumero(totales[totales.length - 1][1]);
  }

  const mBloqueDanos = t.match(/Descripci[oó]n\s+Cant\.?\s+U\.?M\.?([\s\S]+?)(?=VEH[IÍ]CULOS?\s+INVOLUCRADOS|CAUSAS|COMENTARIOS|$)/i);
  if (mBloqueDanos) {
    const lineas = mBloqueDanos[1].split(/\n/).map((l) => l.trim()).filter(Boolean);
    // Descripciones largas a veces llegan partidas en dos renglones: el primero
    // sin cantidad y el segundo con "... 2 PZA". Se juntan.
    // El OCR confunde dígitos con letras parecidas (Z→2, O→0, I/l→1, S→5, B→8).
    const OCR_DIGITO: Record<string, string> = { Z: "2", z: "2", O: "0", o: "0", I: "1", l: "1", S: "5", B: "8" };
    const cantidadOcr = (s: string) => parseNumero(s.replace(/[ZzOoIlSB]/g, (c) => OCR_DIGITO[c]));
    let pendiente = "";
    for (const linea of lineas) {
      const mL = linea.match(/^(.*?)\s*\b([\dZzOoIlSB]{1,4}(?:\.\d+)?)\s+(PZA|M|M2|M3|ML|LT|KG|TON|JORNADA|DIA)$/i);
      if (mL && /\d/.test(mL[2].replace(/[ZzOoIlSB]/g, (c) => OCR_DIGITO[c]))) {
        const descripcion = `${pendiente} ${mL[1]}`.replace(/\s+/g, " ").trim();
        pendiente = "";
        if (!descripcion) continue;
        out.danos.push({
          descripcion,
          cantidad: cantidadOcr(mL[2]),
          unidad: mL[3].toLowerCase(),
          precio_unitario: null,
          importe: null,
        });
      } else if (/[a-záéíóúñ]{3,}/i.test(linea) && linea.length >= 10) {
        pendiente = linea;
      } else {
        pendiente = "";
      }
    }
  }
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

  out.superintendente = match(/(ING\.\s+PEDRO\s+M[EÉ]NDEZ\s+FLORES)/i)
    || match(/(ING\.\s+[A-ZÁÉÍÓÚÑ ]{5,})\s+SUPERINTENDENTE/i);

  return out;
}

"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { parseDictamen, type DictamenExtraido } from "@/lib/parse-dictamen";
import type { Cliente, Tramo } from "@/lib/types";
import { useEffect } from "react";

type Fase = "listo" | "procesando" | "revisar" | "guardando" | "guardado";

const CLIENTE_DEFAULT = "CAPUFE - Unidad Regional Querétaro";

export default function CargarPdfPage() {
  const supabase = createClient();
  const router = useRouter();

  const [fase, setFase] = useState<Fase>("listo");
  const [progreso, setProgreso] = useState<string>("");
  const [datos, setDatos] = useState<DictamenExtraido | null>(null);
  const [archivoNombre, setArchivoNombre] = useState<string>("");
  const [textoOcr, setTextoOcr] = useState<string>("");
  const [error, setError] = useState<string>("");

  // datos auxiliares para el form
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [tramos, setTramos] = useState<Tramo[]>([]);
  const [clienteId, setClienteId] = useState<string>("");
  const [tramoId, setTramoId] = useState<string>("");

  useEffect(() => {
    (async () => {
      const [cR, tR] = await Promise.all([
        supabase.from("clientes").select("*").order("nombre"),
        supabase.from("tramos").select("*").order("nombre"),
      ]);
      setClientes((cR.data as Cliente[]) ?? []);
      setTramos((tR.data as Tramo[]) ?? []);
    })();
  }, []);

  async function procesarArchivo(file: File) {
    setError("");
    setArchivoNombre(file.name);
    setFase("procesando");
    setProgreso("Cargando motor de OCR…");

    try {
      // 1. Rasterizar PDF a imágenes con pdfjs-dist
      const pdfjs: any = await import("pdfjs-dist");
      // worker servido desde public/ (funciona igual en dev y en Vercel)
      pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

      setProgreso("Leyendo el PDF…");
      const buffer = await file.arrayBuffer();
      const loadingTask = pdfjs.getDocument({ data: buffer });
      const pdf = await loadingTask.promise;
      const numPages: number = pdf.numPages;

      // 2. Preparar Tesseract
      setProgreso("Preparando reconocimiento de texto…");
      const tesseract: any = await import("tesseract.js");
      const worker = await tesseract.createWorker("spa", 1, {
        logger: () => {},
      });

      // 3. OCR por página
      let textoTotal = "";
      for (let i = 1; i <= numPages; i++) {
        setProgreso(`Leyendo página ${i} de ${numPages}…`);
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("No se pudo crear el canvas");
        await page.render({ canvasContext: ctx, viewport }).promise;
        const dataUrl = canvas.toDataURL("image/png");
        const { data } = await worker.recognize(dataUrl);
        textoTotal += `\n===== PAGE ${i} =====\n` + data.text;

        // Lo que sigue al dictamen son fotos y bitácora: no hace falta leerlo.
        const tieneTotal = /asciende\s+a\s+la\s+cantidad/i.test(textoTotal);
        const tieneDanos = /Descripci[oó]n\s+Cant|DA[ÑN]OS\s+AL\s+CAMINO:/i.test(textoTotal);
        if (tieneTotal && tieneDanos) break;
      }

      await worker.terminate();

      // 4. Parsear
      setProgreso("Extrayendo datos…");
      const parsed = parseDictamen(textoTotal);
      setTextoOcr(textoTotal);
      setDatos(parsed);

      // Auto-elegir cliente CAPUFE si existe
      const cap = clientes.find((c) => c.nombre.toLowerCase().includes("capufe"));
      if (cap) setClienteId(cap.id);

      setFase("revisar");
      setProgreso("");
    } catch (e: any) {
      console.error(e);
      const pdfDanado = e?.name === "InvalidPDFException" || /Invalid PDF|PDF structure/i.test(e?.message ?? "");
      setError(
        pdfDanado
          ? "Ese archivo no se pudo abrir. Revisa que sea el PDF de la orden y que no esté dañado."
          : "No se pudo leer el PDF. Intenta otra vez; si sigue fallando, mándale captura a Edgar.",
      );
      setFase("listo");
      setProgreso("");
    }
  }

  async function guardarReporte() {
    if (!datos) return;
    setFase("guardando");
    setError("");

    try {
      // 1. Asegurar cliente
      let finalClienteId = clienteId;
      if (!finalClienteId) {
        const q = await supabase.from("clientes").select("id").eq("nombre", CLIENTE_DEFAULT).maybeSingle();
        if (q.data?.id) {
          finalClienteId = q.data.id;
        } else {
          const ins = await supabase.from("clientes").insert({ nombre: CLIENTE_DEFAULT }).select("id").single();
          if (ins.error) throw new Error("creando cliente: " + ins.error.message);
          finalClienteId = ins.data.id;
        }
      }

      // 2. Asegurar tramo
      let finalTramoId = tramoId;
      const nombreTramo = datos.tramo || datos.autopista || "Tramo sin especificar";
      if (!finalTramoId) {
        const q = await supabase.from("tramos").select("id").eq("nombre", nombreTramo).eq("cliente_id", finalClienteId).maybeSingle();
        if (q.data?.id) {
          finalTramoId = q.data.id;
        } else {
          const ins = await supabase.from("tramos").insert({ cliente_id: finalClienteId, nombre: nombreTramo }).select("id").single();
          if (ins.error) throw new Error("creando tramo: " + ins.error.message);
          finalTramoId = ins.data.id;
        }
      }

      // 3. Construir nota consolidada
      const partes: string[] = [];
      if (datos.dictamen) partes.push(`Dictamen: ${datos.dictamen}`);
      if (datos.folio_siniestro) partes.push(`Folio: ${datos.folio_siniestro}`);
      if (datos.kilometro) partes.push(`KM: ${datos.kilometro}${datos.cuerpo ? " (cuerpo " + datos.cuerpo + ")" : ""}`);
      if (datos.autopista) partes.push(`Autopista: ${datos.autopista}`);
      if (datos.vehiculo) {
        const v = datos.vehiculo;
        const vehLinea = [v.tipo, v.marca, v.modelo, v.color, v.placas].filter(Boolean).join(" / ");
        if (vehLinea) partes.push(`Vehículo: ${vehLinea}`);
        if (v.conductor && v.conductor !== "S/D") partes.push(`Conductor: ${v.conductor}`);
      }
      if (datos.aseguradora) {
        const a = datos.aseguradora;
        const asegLinea = [a.nombre, a.poliza && `Póliza ${a.poliza}`].filter(Boolean).join(" / ");
        if (asegLinea) partes.push(`Aseguradora: ${asegLinea}`);
        if (a.ajustador && a.ajustador !== "—") partes.push(`Ajustador: ${a.ajustador}`);
      }
      if (datos.danos?.length) {
        partes.push(`\nDaños reportados (${datos.danos.length}):`);
        for (const d of datos.danos) {
          partes.push(`  • ${d.cantidad} ${d.unidad.toUpperCase()}  ${d.descripcion}`);
        }
      }
      partes.push(`\nArchivo origen: ${archivoNombre}`);
      const notas = partes.join("\n");

      const ISO = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
      const pickFecha = (...vals: (string | null)[]) => vals.find((v) => v && ISO.test(v)) as string | undefined;
      const fecha = pickFecha(datos.fecha_elaboracion, datos.fecha_siniestro) || new Date().toISOString().slice(0, 10);
      const total = Number(datos.total || 0);

      // 4. Insert reporte
      const insRep = await supabase.from("reportes").insert({
        fecha,
        cliente_id: finalClienteId,
        tramo_id: finalTramoId,
        notas,
        total,
      }).select("id").single();
      if (insRep.error) throw new Error("creando reporte: " + insRep.error.message);
      const reporteId = insRep.data.id;

      // 5. Concepto consolidado
      let conceptoId: string;
      const qC = await supabase.from("conceptos").select("id").eq("descripcion", "Dictamen de daños CAPUFE (consolidado)").maybeSingle();
      if (qC.data?.id) {
        conceptoId = qC.data.id;
      } else {
        const insC = await supabase.from("conceptos").insert({
          descripcion: "Dictamen de daños CAPUFE (consolidado)",
          unidad: "dictamen",
          precio_base: 0,
          activo: true,
        }).select("id").single();
        if (insC.error) throw new Error("creando concepto: " + insC.error.message);
        conceptoId = insC.data.id;
      }

      // 6. 1 item consolidado con el total
      const insItem = await supabase.from("reporte_items").insert({
        reporte_id: reporteId,
        concepto_id: conceptoId,
        descripcion: `Dictamen ${datos.dictamen || "sin folio"} - ${datos.danos?.length || 0} daños`,
        unidad: "dictamen",
        cantidad: 1,
        precio_unitario: total,
      });
      if (insItem.error) throw new Error("creando item: " + insItem.error.message);

      setFase("guardado");
      setTimeout(() => router.push(`/reportes/${reporteId}`), 800);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Error guardando el reporte");
      setFase("revisar");
    }
  }

  function resetear() {
    setDatos(null);
    setArchivoNombre("");
    setTextoOcr("");
    setError("");
    setFase("listo");
  }

  // ---------- UI ----------
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-black headline">📄 Cargar PDF de orden</h1>
        <p className="text-sm text-slate-300 mt-1">
          Sube el dictamen de daños. La app lo lee automáticamente y pre-llena el reporte para que solo revises y guardes.
        </p>
      </div>

      {error && (
        <div className="card">
          <div className="card-body bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-red-300 font-semibold">⚠️ {error}</p>
          </div>
        </div>
      )}

      {fase === "listo" && <DropZone onFile={procesarArchivo} />}

      {(fase === "procesando" || fase === "guardando") && (
        <div className="card">
          <div className="card-body flex items-center gap-4">
            <div className="h-10 w-10 rounded-full border-4 border-amber-300 border-t-transparent animate-spin" />
            <div>
              <p className="font-bold text-white">{fase === "procesando" ? "Procesando PDF…" : "Guardando reporte…"}</p>
              <p className="text-sm text-slate-300">{progreso || "Un momento por favor…"}</p>
              {archivoNombre && <p className="text-xs text-slate-400 mt-1">{archivoNombre}</p>}
            </div>
          </div>
        </div>
      )}

      {fase === "revisar" && datos && (
        <FormRevisar
          datos={datos}
          setDatos={setDatos}
          archivoNombre={archivoNombre}
          clientes={clientes}
          tramos={tramos}
          clienteId={clienteId}
          setClienteId={setClienteId}
          tramoId={tramoId}
          setTramoId={setTramoId}
          onGuardar={guardarReporte}
          onResetear={resetear}
        />
      )}

      {fase === "guardado" && (
        <div className="card">
          <div className="card-body text-center py-10">
            <p className="text-5xl mb-3">✅</p>
            <p className="text-xl font-bold text-white">Reporte guardado</p>
            <p className="text-sm text-slate-300 mt-1">Abriendo el reporte…</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ================================================================
// DropZone
// ================================================================
function DropZone({ onFile }: { onFile: (f: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  function handleFile(f: File | undefined) {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".pdf")) {
      alert("Debe ser un archivo PDF.");
      return;
    }
    onFile(f);
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        handleFile(e.dataTransfer.files?.[0]);
      }}
      className={`card cursor-pointer transition ${dragOver ? "ring-2 ring-amber-300" : "hover:ring-1 hover:ring-amber-300/40"}`}
      onClick={() => inputRef.current?.click()}
    >
      <div className="card-body py-12 text-center">
        <p className="text-6xl mb-4">📄⬆️</p>
        <p className="text-xl font-bold text-white">Arrastra aquí el PDF de la orden</p>
        <p className="text-sm text-slate-300 mt-2">o toca para seleccionar desde tu celular</p>
        <p className="text-xs text-slate-400 mt-4">
          Funciona con dictámenes de CAPUFE. El procesamiento se hace en tu celular (puede tardar 30–60 seg).
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}

// ================================================================
// FormRevisar
// ================================================================
function FormRevisar(props: {
  datos: DictamenExtraido;
  setDatos: (d: DictamenExtraido) => void;
  archivoNombre: string;
  clientes: Cliente[];
  tramos: Tramo[];
  clienteId: string;
  setClienteId: (s: string) => void;
  tramoId: string;
  setTramoId: (s: string) => void;
  onGuardar: () => void;
  onResetear: () => void;
}) {
  const { datos, setDatos, clientes, tramos, clienteId, setClienteId, tramoId, setTramoId } = props;

  const campo = (key: keyof DictamenExtraido, label: string, type: "text" | "number" | "date" = "text") => (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-widest text-slate-300 mb-1">{label}</label>
      <input
        type={type}
        value={(datos[key] as any) ?? ""}
        onChange={(e) => setDatos({ ...datos, [key]: type === "number" ? Number(e.target.value) : e.target.value })}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-amber-300 outline-none"
      />
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Resumen rápido */}
      <div className="card">
        <div className="card-body bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
          <p className="text-emerald-300 font-bold text-lg">
            ✅ Extraído: {datos.dictamen || "(sin dictamen)"} — {datos.danos.length} daños — Total ${Number(datos.total || 0).toLocaleString("es-MX")}
          </p>
          <p className="text-sm text-slate-300">{props.archivoNombre}</p>
        </div>
      </div>

      {/* Datos del dictamen */}
      <div className="card">
        <div className="card-body">
          <h2 className="font-bold text-white text-lg mb-3">Datos del dictamen</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {campo("dictamen", "Folio dictamen")}
            {campo("folio_siniestro", "Folio siniestro")}
            {campo("fecha_elaboracion", "Fecha elaboración", "date")}
            {campo("fecha_siniestro", "Fecha siniestro", "date")}
            {campo("autopista", "Autopista")}
            {campo("tramo", "Tramo")}
            {campo("kilometro", "Kilómetro")}
            {campo("cuerpo", "Cuerpo")}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-slate-300 mb-1">Total ($)</label>
              <input
                type="number"
                step="0.01"
                value={datos.total ?? 0}
                onChange={(e) => setDatos({ ...datos, total: Number(e.target.value) })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white font-bold text-lg focus:ring-2 focus:ring-amber-300 outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Vehículo */}
      <div className="card">
        <div className="card-body">
          <h2 className="font-bold text-white text-lg mb-3">Vehículo involucrado</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {["tipo", "marca", "modelo", "color", "placas", "conductor", "propietario"].map((k) => (
              <div key={k}>
                <label className="block text-xs font-semibold uppercase tracking-widest text-slate-300 mb-1">{k}</label>
                <input
                  type="text"
                  value={(datos.vehiculo as any)[k] ?? ""}
                  onChange={(e) => setDatos({ ...datos, vehiculo: { ...datos.vehiculo, [k]: e.target.value } })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-amber-300 outline-none"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Aseguradora */}
      <div className="card">
        <div className="card-body">
          <h2 className="font-bold text-white text-lg mb-3">Aseguradora</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {["nombre", "poliza", "ajustador"].map((k) => (
              <div key={k}>
                <label className="block text-xs font-semibold uppercase tracking-widest text-slate-300 mb-1">{k}</label>
                <input
                  type="text"
                  value={(datos.aseguradora as any)[k] ?? ""}
                  onChange={(e) => setDatos({ ...datos, aseguradora: { ...datos.aseguradora, [k]: e.target.value } })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-amber-300 outline-none"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Daños */}
      <div className="card">
        <div className="card-body">
          <h2 className="font-bold text-white text-lg mb-3">Daños ({datos.danos.length})</h2>
          <div className="space-y-2">
            {datos.danos.map((d, i) => (
              <div key={i} className="flex flex-wrap sm:flex-nowrap gap-2 items-center rounded-lg border border-white/10 p-2 sm:border-0 sm:p-0">
                <input
                  type="number"
                  aria-label={`Cantidad del daño ${i + 1}`}
                  value={d.cantidad ?? 0}
                  onChange={(e) => {
                    const nuevas = [...datos.danos];
                    nuevas[i] = { ...d, cantidad: Number(e.target.value) };
                    setDatos({ ...datos, danos: nuevas });
                  }}
                  className="w-20 bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-white outline-none"
                />
                <input
                  type="text"
                  aria-label={`Unidad del daño ${i + 1}`}
                  value={d.unidad}
                  onChange={(e) => {
                    const nuevas = [...datos.danos];
                    nuevas[i] = { ...d, unidad: e.target.value };
                    setDatos({ ...datos, danos: nuevas });
                  }}
                  className="w-20 bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-white outline-none"
                />
                <input
                  type="text"
                  aria-label={`Descripción del daño ${i + 1}`}
                  value={d.descripcion}
                  onChange={(e) => {
                    const nuevas = [...datos.danos];
                    nuevas[i] = { ...d, descripcion: e.target.value };
                    setDatos({ ...datos, danos: nuevas });
                  }}
                  className="order-first sm:order-none basis-full sm:basis-auto flex-1 min-w-0 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    const nuevas = datos.danos.filter((_, j) => j !== i);
                    setDatos({ ...datos, danos: nuevas });
                  }}
                  className="ml-auto sm:ml-0 text-red-400 hover:text-red-300 px-2 py-2"
                  aria-label={`Borrar daño ${i + 1}`}
                >
                  🗑️
                </button>
              </div>
            ))}
            <button
              onClick={() => setDatos({ ...datos, danos: [...datos.danos, { descripcion: "", cantidad: 1, unidad: "pza", precio_unitario: null, importe: null }] })}
              className="btn-secondary text-sm"
            >
              + Agregar daño
            </button>
          </div>
        </div>
      </div>

      {/* Cliente / Tramo override */}
      <div className="card">
        <div className="card-body">
          <h2 className="font-bold text-white text-lg mb-3">A quién se le cobra</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-slate-300 mb-1">Cliente</label>
              <select
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white outline-none"
              >
                <option value="">— crear "{CLIENTE_DEFAULT}" automático —</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-slate-300 mb-1">Tramo</label>
              <select
                value={tramoId}
                onChange={(e) => setTramoId(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white outline-none"
              >
                <option value="">— crear "{datos.tramo || datos.autopista || "(sin tramo)"}" automático —</option>
                {tramos.map((t) => (
                  <option key={t.id} value={t.id}>{t.nombre}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 justify-between">
        <button onClick={props.onResetear} className="btn-secondary">
          ← Cargar otro PDF
        </button>
        <button onClick={props.onGuardar} className="btn-primary text-lg px-8 py-3">
          💾 Guardar reporte
        </button>
      </div>
    </div>
  );
}

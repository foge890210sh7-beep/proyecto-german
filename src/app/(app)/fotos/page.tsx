"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fmtFecha, hoyISO } from "@/lib/format";
import type { Etapa, Foto, Tramo } from "@/lib/types";

const ETAPAS: { value: Etapa; label: string; emoji: string; color: string; btn: string }[] = [
  { value: "antes", label: "Antes", emoji: "📷", color: "bg-slate-100 text-slate-700", btn: "bg-slate-600 hover:bg-slate-700" },
  { value: "durante", label: "Durante", emoji: "📷", color: "bg-amber-100 text-amber-800", btn: "bg-amber-600 hover:bg-amber-700" },
  { value: "despues", label: "Después", emoji: "📷", color: "bg-emerald-100 text-emerald-800", btn: "bg-emerald-600 hover:bg-emerald-700" },
];

type FotoConUrl = Foto & { url: string; tramos: { nombre: string } | null };

export default function FotosPage() {
  const supabase = createClient();
  const [fotos, setFotos] = useState<FotoConUrl[]>([]);
  const [tramos, setTramos] = useState<(Tramo & { clientes: { nombre: string } | null })[]>([]);
  const [filtroEtapa, setFiltroEtapa] = useState<"todas" | Etapa>("todas");
  const [filtroDesde, setFiltroDesde] = useState(hoyISO());
  const [filtroHasta, setFiltroHasta] = useState(hoyISO());
  const [filtroPendientes, setFiltroPendientes] = useState(false);
  const [tramoActivo, setTramoActivo] = useState<string>("");
  const [fechaActiva, setFechaActiva] = useState(hoyISO());
  const [uploading, setUploading] = useState(false);
  const inputRefs = {
    antes: useRef<HTMLInputElement>(null),
    durante: useRef<HTMLInputElement>(null),
    despues: useRef<HTMLInputElement>(null),
  };

  async function load() {
    let q = supabase
      .from("fotos")
      .select("*, tramos(nombre)")
      .gte("fecha", filtroDesde)
      .lte("fecha", filtroHasta)
      .order("created_at", { ascending: false });
    if (filtroEtapa !== "todas") q = q.eq("etapa", filtroEtapa);
    if (filtroPendientes) q = q.is("reporte_id", null);
    const { data } = await q;
    const items: FotoConUrl[] = ((data as any[]) ?? []).map((f) => ({
      ...f,
      url: supabase.storage.from("fotos").getPublicUrl(f.storage_path).data.publicUrl,
    }));
    setFotos(items);
  }
  async function loadTramos() {
    const { data } = await supabase.from("tramos").select("*, clientes(nombre)").order("nombre");
    setTramos((data as any) ?? []);
  }
  useEffect(() => { load(); }, [filtroEtapa, filtroDesde, filtroHasta, filtroPendientes]);
  useEffect(() => { loadTramos(); }, []);

  async function tomar(etapa: Etapa, files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${fechaActiva}/${etapa}/${crypto.randomUUID()}.${ext}`;
        const up = await supabase.storage.from("fotos").upload(path, file, {
          cacheControl: "3600",
          contentType: file.type || "image/jpeg",
          upsert: false,
        });
        if (up.error) {
          alert("Error subiendo " + file.name + ": " + up.error.message);
          continue;
        }
        await supabase.from("fotos").insert({
          fecha: fechaActiva,
          etapa,
          tramo_id: tramoActivo || null,
          storage_path: path,
        });
      }
      load();
    } finally {
      setUploading(false);
    }
  }

  async function eliminar(f: FotoConUrl) {
    if (!confirm("¿Eliminar esta foto?")) return;
    await supabase.storage.from("fotos").remove([f.storage_path]);
    await supabase.from("fotos").delete().eq("id", f.id);
    load();
  }

  // Contadores por etapa para hoy / día activo
  const conteoHoy = fotos.reduce<Record<string, number>>((acc, f) => {
    if (f.fecha === fechaActiva) acc[f.etapa] = (acc[f.etapa] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Fotos del trabajo</h1>
        <p className="text-sm text-slate-500">
          Toma fotos en campo (antes / durante / después). Después al hacer el reporte eliges las mejores como evidencia.
        </p>
      </div>

      {/* Captura rápida */}
      <div className="card">
        <div className="card-body">
          <h2 className="font-semibold mb-3">📸 Tomar foto ahora</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <div>
              <label className="label">Día</label>
              <input type="date" className="input" value={fechaActiva} onChange={(e) => setFechaActiva(e.target.value)} />
            </div>
            <div>
              <label className="label">Tramo</label>
              <select className="input" value={tramoActivo} onChange={(e) => setTramoActivo(e.target.value)}>
                <option value="">— Sin tramo (puedes asignarlo después) —</option>
                {tramos.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.clientes?.nombre ? `${t.clientes.nombre} · ` : ""}{t.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {ETAPAS.map((e) => (
              <div key={e.value} className="flex flex-col gap-2">
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => inputRefs[e.value].current?.click()}
                  className={`text-white rounded-xl p-6 text-center transition shadow-sm ${e.btn} disabled:opacity-50`}
                >
                  <div className="text-4xl mb-1">{e.emoji}</div>
                  <div className="font-semibold text-lg">{e.label}</div>
                  <div className="text-xs opacity-90 mt-1">
                    {(conteoHoy[e.value] ?? 0)} foto(s) hoy
                  </div>
                </button>
                <input
                  ref={inputRefs[e.value]}
                  type="file"
                  accept="image/*"
                  multiple
                  capture="environment"
                  className="hidden"
                  onChange={(ev) => {
                    tomar(e.value, ev.target.files);
                    ev.target.value = "";
                  }}
                />
              </div>
            ))}
          </div>

          {uploading && <p className="text-sm text-amber-600 mt-3 text-center">⏳ Subiendo fotos…</p>}
          <p className="text-xs text-slate-500 mt-3">
            Tip: en celular, el botón abre directo la cámara. En compu, abre el explorador para subir.
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="card">
        <div className="card-body flex flex-wrap gap-3 items-end">
          <div>
            <label className="label">Etapa</label>
            <select className="input" value={filtroEtapa} onChange={(e) => setFiltroEtapa(e.target.value as any)}>
              <option value="todas">Todas</option>
              {ETAPAS.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Desde</label>
            <input type="date" className="input" value={filtroDesde} onChange={(e) => setFiltroDesde(e.target.value)} />
          </div>
          <div>
            <label className="label">Hasta</label>
            <input type="date" className="input" value={filtroHasta} onChange={(e) => setFiltroHasta(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={filtroPendientes}
              onChange={(e) => setFiltroPendientes(e.target.checked)}
            />
            Solo sin reporte
          </label>
          <p className="ml-auto text-sm text-slate-500">{fotos.length} foto(s)</p>
        </div>
      </div>

      {fotos.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-10 text-sm text-slate-500">
            Sin fotos en este filtro.
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {fotos.map((f) => {
            const et = ETAPAS.find((e) => e.value === f.etapa);
            return (
              <div key={f.id} className="card overflow-hidden group">
                <a href={f.url} target="_blank" rel="noreferrer" className="block aspect-square bg-slate-100">
                  <img src={f.url} alt={f.descripcion ?? f.etapa} className="w-full h-full object-cover" loading="lazy" />
                </a>
                <div className="p-3 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className={`text-xs px-2 py-0.5 rounded ${et?.color}`}>{et?.label}</span>
                    {f.reporte_id ? (
                      <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">En reporte</span>
                    ) : (
                      <span className="text-xs text-slate-400">Suelta</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">{fmtFecha(f.fecha)}</p>
                  {f.tramos?.nombre && <p className="text-xs text-slate-600 truncate">{f.tramos.nombre}</p>}
                  <button onClick={() => eliminar(f)} className="text-xs text-red-600 hover:underline">
                    Borrar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

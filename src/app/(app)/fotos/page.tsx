"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fmtFecha, hoyISO } from "@/lib/format";
import type { Etapa, Foto, Tramo } from "@/lib/types";

const ETAPAS: { value: Etapa; label: string; color: string }[] = [
  { value: "antes", label: "Antes", color: "bg-slate-100 text-slate-700" },
  { value: "durante", label: "Durante", color: "bg-amber-100 text-amber-800" },
  { value: "despues", label: "Después", color: "bg-emerald-100 text-emerald-800" },
];

type FotoConUrl = Foto & { url: string; tramos: { nombre: string } | null };

export default function FotosPage() {
  const supabase = createClient();
  const [fotos, setFotos] = useState<FotoConUrl[]>([]);
  const [tramos, setTramos] = useState<Tramo[]>([]);
  const [filtroEtapa, setFiltroEtapa] = useState<"todas" | Etapa>("todas");
  const [filtroDesde, setFiltroDesde] = useState(() => hoyISO().slice(0, 8) + "01");
  const [filtroHasta, setFiltroHasta] = useState(hoyISO());
  const [uploading, setUploading] = useState(false);
  const [uploadEtapa, setUploadEtapa] = useState<Etapa>("antes");
  const [uploadTramo, setUploadTramo] = useState<string>("");
  const [uploadDescripcion, setUploadDescripcion] = useState("");
  const [uploadFecha, setUploadFecha] = useState(hoyISO());

  async function load() {
    let q = supabase
      .from("fotos")
      .select("*, tramos(nombre)")
      .gte("fecha", filtroDesde)
      .lte("fecha", filtroHasta)
      .order("created_at", { ascending: false });
    if (filtroEtapa !== "todas") q = q.eq("etapa", filtroEtapa);
    const { data } = await q;
    const items: FotoConUrl[] = ((data as any[]) ?? []).map((f) => ({
      ...f,
      url: supabase.storage.from("fotos").getPublicUrl(f.storage_path).data.publicUrl,
    }));
    setFotos(items);
  }
  async function loadTramos() {
    const { data } = await supabase.from("tramos").select("*, clientes(nombre)").order("nombre");
    setTramos((data as Tramo[]) ?? []);
  }
  useEffect(() => { load(); }, [filtroEtapa, filtroDesde, filtroHasta]);
  useEffect(() => { loadTramos(); }, []);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${uploadFecha}/${uploadEtapa}/${crypto.randomUUID()}.${ext}`;
        const up = await supabase.storage.from("fotos").upload(path, file, {
          cacheControl: "3600",
          contentType: file.type,
        });
        if (up.error) {
          alert("Error subiendo " + file.name + ": " + up.error.message);
          continue;
        }
        await supabase.from("fotos").insert({
          fecha: uploadFecha,
          etapa: uploadEtapa,
          tramo_id: uploadTramo || null,
          descripcion: uploadDescripcion || null,
          storage_path: path,
        });
      }
      setUploadDescripcion("");
      load();
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function eliminar(f: FotoConUrl) {
    if (!confirm("¿Eliminar esta foto?")) return;
    await supabase.storage.from("fotos").remove([f.storage_path]);
    await supabase.from("fotos").delete().eq("id", f.id);
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Galería de fotos</h1>
        <p className="text-sm text-slate-500">Antes, durante y después del trabajo. Sube varias fotos a la vez.</p>
      </div>

      <div className="card">
        <div className="card-body">
          <h2 className="font-semibold mb-3">Subir nuevas fotos</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <div>
              <label className="label">Fecha</label>
              <input type="date" className="input" value={uploadFecha} onChange={(e) => setUploadFecha(e.target.value)} />
            </div>
            <div>
              <label className="label">Etapa</label>
              <select className="input" value={uploadEtapa} onChange={(e) => setUploadEtapa(e.target.value as Etapa)}>
                {ETAPAS.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Tramo</label>
              <select className="input" value={uploadTramo} onChange={(e) => setUploadTramo(e.target.value)}>
                <option value="">— Sin tramo —</option>
                {tramos.map((t: any) => (
                  <option key={t.id} value={t.id}>
                    {t.clientes?.nombre ? `${t.clientes.nombre} · ` : ""}{t.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Descripción (opcional)</label>
              <input className="input" value={uploadDescripcion} onChange={(e) => setUploadDescripcion(e.target.value)} />
            </div>
          </div>
          <label className="block">
            <span className="btn-primary cursor-pointer w-full md:w-auto inline-flex">
              {uploading ? "Subiendo…" : "📷 Seleccionar fotos"}
            </span>
            <input
              type="file"
              accept="image/*"
              multiple
              capture="environment"
              className="hidden"
              onChange={onUpload}
              disabled={uploading}
            />
          </label>
        </div>
      </div>

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
                  <img src={f.url} alt={f.descripcion ?? f.etapa} className="w-full h-full object-cover" />
                </a>
                <div className="p-3 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className={`text-xs px-2 py-0.5 rounded ${et?.color}`}>{et?.label}</span>
                    <button onClick={() => eliminar(f)} className="text-xs text-red-600 opacity-0 group-hover:opacity-100 transition">
                      Borrar
                    </button>
                  </div>
                  <p className="text-xs text-slate-500">{fmtFecha(f.fecha)}</p>
                  {f.tramos?.nombre && <p className="text-xs text-slate-600">{f.tramos.nombre}</p>}
                  {f.descripcion && <p className="text-xs text-slate-700 truncate">{f.descripcion}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

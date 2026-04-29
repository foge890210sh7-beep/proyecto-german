"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Etapa, Foto } from "@/lib/types";

const ETAPAS_COLOR: Record<Etapa, string> = {
  antes: "bg-slate-100 text-slate-700",
  durante: "bg-amber-100 text-amber-800",
  despues: "bg-emerald-100 text-emerald-800",
};

type FotoConUrl = Foto & { url: string };

export default function FotosManager({ reporteId, fotos }: { reporteId: string; fotos: FotoConUrl[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  function toggle(id: string) {
    const next = new Set(seleccion);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSeleccion(next);
  }
  function todas() {
    if (seleccion.size === fotos.length) setSeleccion(new Set());
    else setSeleccion(new Set(fotos.map((f) => f.id)));
  }

  async function agregarAlReporte() {
    if (seleccion.size === 0) return;
    setBusy(true);
    await supabase.from("fotos").update({ reporte_id: reporteId }).in("id", Array.from(seleccion));
    setBusy(false);
    router.refresh();
    setSeleccion(new Set());
  }

  async function borrar() {
    if (seleccion.size === 0) return;
    if (!confirm(`¿Borrar ${seleccion.size} foto(s) seleccionada(s)? Esta acción no se puede deshacer.`)) return;
    setBusy(true);
    const seleccionadas = fotos.filter((f) => seleccion.has(f.id));
    await supabase.storage.from("fotos").remove(seleccionadas.map((f) => f.storage_path));
    await supabase.from("fotos").delete().in("id", Array.from(seleccion));
    setBusy(false);
    router.refresh();
    setSeleccion(new Set());
  }

  return (
    <div className="card border-amber-200">
      <div className="card-body">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-semibold">Fotos sueltas del mismo día/tramo ({fotos.length})</h2>
            <p className="text-xs text-slate-500">
              Estas fotos están en la galería pero no se incluyeron en el reporte. Selecciónalas y agrégalas al reporte o bórralas.
            </p>
          </div>
          <button onClick={todas} className="text-sm text-brand-dark hover:underline whitespace-nowrap">
            {seleccion.size === fotos.length ? "Desmarcar todas" : "Marcar todas"}
          </button>
        </div>

        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 mb-4">
          {fotos.map((f) => {
            const sel = seleccion.has(f.id);
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => toggle(f.id)}
                className={`relative aspect-square rounded-lg overflow-hidden border-2 transition ${
                  sel ? "border-emerald-500 ring-2 ring-emerald-300" : "border-slate-200 opacity-70"
                }`}
              >
                <img src={f.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                <span className={`absolute top-1 left-1 text-[10px] px-1.5 py-0.5 rounded ${ETAPAS_COLOR[f.etapa]}`}>
                  {f.etapa}
                </span>
                <div className={`absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  sel ? "bg-emerald-500 text-white" : "bg-white/80 text-slate-400"
                }`}>
                  {sel ? "✓" : ""}
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-2 justify-end">
          <button onClick={agregarAlReporte} disabled={seleccion.size === 0 || busy} className="btn-primary">
            {busy ? "..." : `+ Agregar al reporte (${seleccion.size})`}
          </button>
          <button onClick={borrar} disabled={seleccion.size === 0 || busy} className="btn-danger">
            {busy ? "..." : `🗑 Borrar (${seleccion.size})`}
          </button>
        </div>
      </div>
    </div>
  );
}

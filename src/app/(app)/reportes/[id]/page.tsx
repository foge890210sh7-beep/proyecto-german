import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fmtFecha, fmtMXN } from "@/lib/format";
import DeleteReporteButton from "./DeleteReporteButton";
import FotosManager from "./FotosManager";
import type { Etapa, Foto } from "@/lib/types";

const ETAPAS: { value: Etapa; label: string; color: string }[] = [
  { value: "antes", label: "Antes", color: "bg-slate-100 text-slate-700" },
  { value: "durante", label: "Durante", color: "bg-amber-100 text-amber-800" },
  { value: "despues", label: "Después", color: "bg-emerald-100 text-emerald-800" },
];

export default async function ReporteDetalle({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [r, items, gastos, fotosReporte] = await Promise.all([
    supabase
      .from("reportes")
      .select("*, clientes(nombre, contacto, rfc), tramos(nombre, km_inicio, km_fin)")
      .eq("id", id)
      .single(),
    supabase.from("reporte_items").select("*").eq("reporte_id", id),
    supabase.from("gastos").select("*").eq("reporte_id", id).order("fecha"),
    supabase.from("fotos").select("*").eq("reporte_id", id).order("etapa").order("created_at"),
  ]);

  if (r.error || !r.data) notFound();
  const rep: any = r.data;

  // Fotos sueltas del mismo día/tramo (candidatas para agregar)
  let fotosSueltasQ = supabase
    .from("fotos")
    .select("*")
    .eq("fecha", rep.fecha)
    .is("reporte_id", null)
    .order("etapa")
    .order("created_at");
  if (rep.tramo_id) fotosSueltasQ = fotosSueltasQ.eq("tramo_id", rep.tramo_id);
  const { data: fotosSueltas } = await fotosSueltasQ;

  const conUrl = (arr: Foto[] | null) =>
    (arr ?? []).map((f) => ({
      ...f,
      url: supabase.storage.from("fotos").getPublicUrl(f.storage_path).data.publicUrl,
    }));

  const fotosEnReporte = conUrl(fotosReporte.data as Foto[]);
  const fotosCandidatas = conUrl(fotosSueltas as Foto[]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/reportes" className="text-sm text-slate-500 hover:underline">← Reportes</Link>
          <h1 className="text-2xl font-bold mt-2">Reporte del {fmtFecha(rep.fecha)}</h1>
          <p className="text-sm text-slate-500">
            {rep.clientes?.nombre ?? "Sin cliente"} · {rep.tramos?.nombre ?? "Sin tramo"}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <a href={`/api/reportes/${id}/pdf`} target="_blank" rel="noreferrer" className="btn-secondary">📄 PDF</a>
          <a href={`/api/reportes/${id}/excel`} className="btn-secondary">📊 Excel</a>
          <DeleteReporteButton id={id} />
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <h2 className="font-semibold mb-3">Trabajos realizados</h2>
          {(items.data?.length ?? 0) === 0 ? (
            <p className="text-sm text-slate-500">Sin partidas.</p>
          ) : (
            <table className="table">
              <thead>
                <tr><th>Concepto</th><th>Unidad</th><th className="text-right">Cantidad</th><th className="text-right">P. unitario</th><th className="text-right">Importe</th></tr>
              </thead>
              <tbody>
                {items.data!.map((it: any) => (
                  <tr key={it.id}>
                    <td>{it.descripcion}</td>
                    <td className="text-slate-500">{it.unidad}</td>
                    <td className="text-right">{Number(it.cantidad)}</td>
                    <td className="text-right">{fmtMXN(it.precio_unitario)}</td>
                    <td className="text-right font-medium">{fmtMXN(it.importe)}</td>
                  </tr>
                ))}
                <tr className="bg-amber-50">
                  <td colSpan={4} className="text-right font-semibold">Total a cobrar</td>
                  <td className="text-right font-bold text-lg text-emerald-700">{fmtMXN(rep.total)}</td>
                </tr>
              </tbody>
            </table>
          )}
          {rep.notas && (
            <div className="mt-4 text-sm text-slate-600">
              <span className="font-medium">Notas: </span>{rep.notas}
            </div>
          )}
        </div>
      </div>

      {/* Galería de fotos del reporte, organizada por etapa */}
      <div className="card">
        <div className="card-body">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Evidencia fotográfica ({fotosEnReporte.length})</h2>
          </div>
          {fotosEnReporte.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">Este reporte no tiene fotos asociadas.</p>
          ) : (
            <div className="space-y-6">
              {ETAPAS.map((etapa) => {
                const fs = fotosEnReporte.filter((f) => f.etapa === etapa.value);
                if (fs.length === 0) return null;
                return (
                  <div key={etapa.value}>
                    <h3 className="text-sm font-semibold mb-2">
                      <span className={`text-xs px-2 py-0.5 rounded mr-2 ${etapa.color}`}>{etapa.label}</span>
                      <span className="text-slate-500">{fs.length} foto(s)</span>
                    </h3>
                    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                      {fs.map((f) => (
                        <a key={f.id} href={f.url} target="_blank" rel="noreferrer" className="block aspect-square rounded-lg overflow-hidden bg-slate-100">
                          <img src={f.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                        </a>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Fotos candidatas: del mismo día/tramo, sin reporte */}
      {fotosCandidatas.length > 0 && (
        <FotosManager reporteId={id} fotos={fotosCandidatas} />
      )}

      {(gastos.data?.length ?? 0) > 0 && (
        <div className="card">
          <div className="card-body">
            <h2 className="font-semibold mb-3">Gastos asociados</h2>
            <table className="table">
              <thead>
                <tr><th>Categoría</th><th>Descripción</th><th>Proveedor</th><th className="text-right">Monto</th></tr>
              </thead>
              <tbody>
                {gastos.data!.map((g: any) => (
                  <tr key={g.id}>
                    <td>{g.categoria}</td>
                    <td>{g.descripcion}</td>
                    <td className="text-slate-500">{g.proveedor ?? ""}</td>
                    <td className="text-right">{fmtMXN(g.monto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { fmtMXN, fmtFecha, hoyISO } from "@/lib/format";

type Row = {
  id: string;
  fecha: string;
  total: number;
  notas: string | null;
  clientes: { nombre: string } | null;
  tramos: { nombre: string } | null;
};

export default function ReportesPage() {
  const supabase = createClient();
  const [rows, setRows] = useState<Row[]>([]);
  const [desde, setDesde] = useState(() => hoyISO().slice(0, 8) + "01");
  const [hasta, setHasta] = useState(hoyISO());
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("reportes")
      .select("id, fecha, total, notas, clientes(nombre), tramos(nombre)")
      .gte("fecha", desde)
      .lte("fecha", hasta)
      .order("fecha", { ascending: false });
    setRows((data as any) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, [desde, hasta]);

  const total = rows.reduce((a, r) => a + Number(r.total), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Reportes diarios</h1>
          <p className="text-sm text-slate-500">Lo que has cobrado en cada jornada.</p>
        </div>
        <Link href="/reportes/nuevo" className="btn-primary">+ Nuevo reporte</Link>
      </div>

      <div className="card">
        <div className="card-body flex flex-wrap gap-3 items-end">
          <div>
            <label className="label">Desde</label>
            <input type="date" className="input" value={desde} onChange={(e) => setDesde(e.target.value)} />
          </div>
          <div>
            <label className="label">Hasta</label>
            <input type="date" className="input" value={hasta} onChange={(e) => setHasta(e.target.value)} />
          </div>
          <div className="ml-auto text-right">
            <p className="text-xs text-slate-500">Total del periodo</p>
            <p className="text-xl font-bold text-emerald-600">{fmtMXN(total)}</p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          {loading ? (
            <p className="text-sm text-slate-500">Cargando…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-10">Sin reportes en este rango.</p>
          ) : (
            <table className="table">
              <thead>
                <tr><th>Fecha</th><th>Cliente</th><th>Tramo</th><th>Notas</th><th className="text-right">Total</th></tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td><Link href={`/reportes/${r.id}`} className="text-brand-dark hover:underline">{fmtFecha(r.fecha)}</Link></td>
                    <td>{r.clientes?.nombre ?? "—"}</td>
                    <td>{r.tramos?.nombre ?? "—"}</td>
                    <td className="text-slate-500 truncate max-w-xs">{r.notas ?? ""}</td>
                    <td className="text-right font-medium">{fmtMXN(r.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

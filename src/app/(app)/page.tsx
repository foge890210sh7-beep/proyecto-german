import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { fmtMXN, fmtFecha, hoyISO } from "@/lib/format";

export default async function Dashboard() {
  const supabase = await createClient();
  const hoy = hoyISO();
  const inicioMes = hoy.slice(0, 8) + "01";

  const [reportesHoy, gastosHoy, totalMes, gastosMes, ultimos] = await Promise.all([
    supabase.from("reportes").select("total").eq("fecha", hoy),
    supabase.from("gastos").select("monto").eq("fecha", hoy),
    supabase.from("reportes").select("total").gte("fecha", inicioMes),
    supabase.from("gastos").select("monto").gte("fecha", inicioMes),
    supabase
      .from("reportes")
      .select("id, fecha, total, clientes(nombre), tramos(nombre)")
      .order("fecha", { ascending: false })
      .limit(5),
  ]);

  const sum = (rows: { total?: number; monto?: number }[] | null, k: "total" | "monto") =>
    (rows ?? []).reduce((a, r) => a + Number(r[k] ?? 0), 0);

  const cards = [
    { label: "Cobro de hoy", value: fmtMXN(sum(reportesHoy.data, "total")), color: "text-emerald-600" },
    { label: "Gasto de hoy", value: fmtMXN(sum(gastosHoy.data, "monto")), color: "text-red-600" },
    { label: "Cobro del mes", value: fmtMXN(sum(totalMes.data, "total")), color: "text-emerald-700" },
    { label: "Gasto del mes", value: fmtMXN(sum(gastosMes.data, "monto")), color: "text-red-700" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Buenas tardes, Germán</h1>
          <p className="text-sm text-slate-500">Resumen del día — {fmtFecha(hoy)}</p>
        </div>
        <Link href="/reportes/nuevo" className="btn-primary">+ Nuevo reporte</Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="card">
            <div className="card-body">
              <p className="text-xs text-slate-500">{c.label}</p>
              <p className={`text-2xl font-bold mt-1 ${c.color}`}>{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-body">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Últimos reportes</h2>
            <Link href="/reportes" className="text-sm text-brand-dark hover:underline">Ver todos →</Link>
          </div>
          {(ultimos.data?.length ?? 0) === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">
              Aún no has registrado reportes. <Link href="/reportes/nuevo" className="text-brand-dark underline">Crea el primero</Link>.
            </p>
          ) : (
            <table className="table">
              <thead>
                <tr><th>Fecha</th><th>Cliente</th><th>Tramo</th><th className="text-right">Total</th></tr>
              </thead>
              <tbody>
                {ultimos.data!.map((r: any) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td><Link href={`/reportes/${r.id}`} className="text-brand-dark hover:underline">{fmtFecha(r.fecha)}</Link></td>
                    <td>{r.clientes?.nombre ?? "—"}</td>
                    <td>{r.tramos?.nombre ?? "—"}</td>
                    <td className="text-right font-medium">{fmtMXN(r.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Link href="/reportes/nuevo" className="card hover:shadow-md transition">
          <div className="card-body">
            <p className="text-2xl">📋</p>
            <p className="font-semibold mt-2">Nuevo reporte de trabajo</p>
            <p className="text-sm text-slate-500">Captura lo que hiciste hoy y obtén el cobro automático.</p>
          </div>
        </Link>
        <Link href="/gastos" className="card hover:shadow-md transition">
          <div className="card-body">
            <p className="text-2xl">💸</p>
            <p className="font-semibold mt-2">Registrar gastos</p>
            <p className="text-sm text-slate-500">Lleva el control de lo que gastas en el día.</p>
          </div>
        </Link>
        <Link href="/fotos" className="card hover:shadow-md transition">
          <div className="card-body">
            <p className="text-2xl">📸</p>
            <p className="font-semibold mt-2">Subir fotos</p>
            <p className="text-sm text-slate-500">Antes, durante y después del trabajo.</p>
          </div>
        </Link>
      </div>
    </div>
  );
}

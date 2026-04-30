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
    { label: "Cobro de hoy", value: fmtMXN(sum(reportesHoy.data, "total")), accent: "from-yellow-300 to-amber-500", glow: "shadow-glow-yellow" },
    { label: "Gasto de hoy", value: fmtMXN(sum(gastosHoy.data, "monto")), accent: "from-red-400 to-red-700", glow: "shadow-glow-red" },
    { label: "Cobro del mes", value: fmtMXN(sum(totalMes.data, "total")), accent: "from-yellow-200 to-yellow-500", glow: "shadow-glow-yellow" },
    { label: "Gasto del mes", value: fmtMXN(sum(gastosMes.data, "monto")), accent: "from-blue-400 to-blue-700", glow: "shadow-glow-blue" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="animate-fade-up">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight headline">
            Buenas tardes, Germán
          </h1>
          <p className="text-sm text-slate-300 mt-1">Resumen del día — {fmtFecha(hoy)}</p>
        </div>
        <Link href="/reportes/nuevo" className="btn-primary">+ Nuevo reporte</Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 stagger">
        {cards.map((c) => (
          <div key={c.label} className={`card overflow-hidden`}>
            <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${c.accent} ${c.glow}`} />
            <div className="card-body">
              <p className="text-[11px] uppercase tracking-widest text-slate-300 font-semibold">{c.label}</p>
              <p className={`text-2xl md:text-3xl font-black mt-2 bg-gradient-to-br ${c.accent} bg-clip-text text-transparent`}>
                {c.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="card animate-fade-up">
        <div className="card-body">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-lg text-white">Últimos reportes</h2>
            <Link href="/reportes" className="text-sm font-semibold text-brand hover:text-yellow-300 transition">
              Ver todos →
            </Link>
          </div>
          {(ultimos.data?.length ?? 0) === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">
              Aún no has registrado reportes.{" "}
              <Link href="/reportes/nuevo" className="text-brand underline">Crea el primero</Link>.
            </p>
          ) : (
            <table className="table">
              <thead>
                <tr><th>Fecha</th><th>Cliente</th><th>Tramo</th><th className="text-right">Total</th></tr>
              </thead>
              <tbody>
                {ultimos.data!.map((r: any) => (
                  <tr key={r.id}>
                    <td><Link href={`/reportes/${r.id}`} className="text-brand hover:text-yellow-300 transition">{fmtFecha(r.fecha)}</Link></td>
                    <td className="text-slate-200">{r.clientes?.nombre ?? "—"}</td>
                    <td className="text-slate-200">{r.tramos?.nombre ?? "—"}</td>
                    <td className="text-right font-bold text-yellow-300">{fmtMXN(r.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4 stagger">
        <Link href="/reportes/nuevo" className="card group">
          <div className="card-body">
            <p className="text-3xl group-hover:scale-110 transition-transform inline-block">📋</p>
            <p className="font-bold mt-2 text-white">Nuevo reporte de trabajo</p>
            <p className="text-sm text-slate-300">Captura lo que hiciste hoy y obtén el cobro automático.</p>
          </div>
        </Link>
        <Link href="/gastos" className="card group">
          <div className="card-body">
            <p className="text-3xl group-hover:scale-110 transition-transform inline-block">💸</p>
            <p className="font-bold mt-2 text-white">Registrar gastos</p>
            <p className="text-sm text-slate-300">Lleva el control de lo que gastas en el día.</p>
          </div>
        </Link>
        <Link href="/fotos" className="card group">
          <div className="card-body">
            <p className="text-3xl group-hover:scale-110 transition-transform inline-block">📸</p>
            <p className="font-bold mt-2 text-white">Subir fotos</p>
            <p className="text-sm text-slate-300">Antes, durante y después del trabajo.</p>
          </div>
        </Link>
      </div>
    </div>
  );
}

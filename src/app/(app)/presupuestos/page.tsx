"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Modal from "@/components/Modal";
import Calculator from "@/components/Calculator";
import { fmtMXN, fmtFecha } from "@/lib/format";
import type { Presupuesto } from "@/lib/types";

type Resumen = Presupuesto & {
  semana_fin: string;
  gastado: number;
  restante: number;
  porcentaje: number;
};

function lunesDe(d: Date): string {
  const dia = d.getDay();
  const diff = (dia + 6) % 7; // lunes = 0
  const r = new Date(d);
  r.setDate(d.getDate() - diff);
  return r.toISOString().slice(0, 10);
}
function domingoDe(lunes: string): string {
  const d = new Date(lunes + "T00:00:00");
  d.setDate(d.getDate() + 6);
  return d.toISOString().slice(0, 10);
}

export default function PresupuestosPage() {
  const supabase = createClient();
  const [items, setItems] = useState<Resumen[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Presupuesto> | null>(null);

  async function load() {
    setLoading(true);
    const { data: ps } = await supabase
      .from("presupuestos")
      .select("*")
      .order("semana_inicio", { ascending: false });

    const list: Resumen[] = [];
    for (const p of (ps as Presupuesto[]) ?? []) {
      const fin = domingoDe(p.semana_inicio);
      const { data: gs } = await supabase
        .from("gastos")
        .select("monto")
        .gte("fecha", p.semana_inicio)
        .lte("fecha", fin);
      const gastado = (gs ?? []).reduce((a: number, r: any) => a + Number(r.monto), 0);
      const restante = Number(p.monto) - gastado;
      const pct = Math.min(100, (gastado / Number(p.monto)) * 100);
      list.push({ ...p, semana_fin: fin, gastado, restante, porcentaje: pct });
    }
    setItems(list);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    if (!editing?.semana_inicio || !editing.monto) return;
    const lunes = lunesDe(new Date(editing.semana_inicio + "T00:00:00"));
    const payload = {
      semana_inicio: lunes,
      monto: Number(editing.monto),
      notas: editing.notas || null,
    };
    if (editing.id) await supabase.from("presupuestos").update(payload).eq("id", editing.id);
    else await supabase.from("presupuestos").upsert(payload, { onConflict: "semana_inicio" });
    setEditing(null);
    load();
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar este presupuesto?")) return;
    await supabase.from("presupuestos").delete().eq("id", id);
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Presupuestos semanales</h1>
          <p className="text-sm text-slate-500">Lo que se autoriza por semana vs. los gastos capturados.</p>
        </div>
        <button
          onClick={() => setEditing({ semana_inicio: lunesDe(new Date()), monto: 30000 })}
          className="btn-primary"
        >
          + Nuevo presupuesto
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Cargando…</p>
      ) : items.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-10 text-sm text-slate-500">
            Aún no has registrado presupuestos. Crea uno semanal (ej. $30,000 para 10 personas).
          </div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {items.map((p) => {
            const sobrepasado = p.restante < 0;
            return (
              <div key={p.id} className="card">
                <div className="card-body">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold">
                        Semana del {fmtFecha(p.semana_inicio)}
                      </h3>
                      <p className="text-xs text-slate-500">
                        al {fmtFecha(p.semana_fin)}
                      </p>
                      {p.notas && <p className="text-sm text-slate-600 mt-1">{p.notas}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">Presupuesto</p>
                      <p className="text-xl font-bold">{fmtMXN(p.monto)}</p>
                    </div>
                  </div>

                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        sobrepasado ? "bg-red-600" : p.porcentaje > 80 ? "bg-amber-500" : "bg-emerald-500"
                      }`}
                      style={{ width: `${Math.min(100, p.porcentaje)}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3 mt-3 text-center text-sm">
                    <div>
                      <p className="text-xs text-slate-500">Gastado</p>
                      <p className="font-semibold text-red-600">{fmtMXN(p.gastado)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Restante</p>
                      <p className={`font-semibold ${sobrepasado ? "text-red-700" : "text-emerald-600"}`}>
                        {fmtMXN(p.restante)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Usado</p>
                      <p className="font-semibold">{p.porcentaje.toFixed(0)}%</p>
                    </div>
                  </div>

                  {sobrepasado && (
                    <p className="text-xs text-red-600 mt-2 text-center font-medium">
                      ⚠️ Presupuesto sobrepasado por {fmtMXN(Math.abs(p.restante))}
                    </p>
                  )}

                  <div className="flex gap-3 mt-4 text-sm justify-end">
                    <button onClick={() => setEditing(p)} className="text-brand-dark hover:underline">Editar</button>
                    <button onClick={() => remove(p.id)} className="text-red-600 hover:underline">Borrar</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <Modal title={editing.id ? "Editar presupuesto" : "Nuevo presupuesto semanal"} onClose={() => setEditing(null)}>
          <div className="space-y-3">
            <div>
              <label className="label">Inicio de semana (se ajusta al lunes)</label>
              <input
                type="date"
                className="input"
                value={editing.semana_inicio ?? ""}
                onChange={(e) => setEditing({ ...editing, semana_inicio: e.target.value })}
              />
              <p className="text-xs text-slate-500 mt-1">
                {editing.semana_inicio
                  ? `Lunes: ${lunesDe(new Date(editing.semana_inicio + "T00:00:00"))} al domingo: ${domingoDe(lunesDe(new Date(editing.semana_inicio + "T00:00:00")))}`
                  : ""}
              </p>
            </div>
            <div>
              <label className="label">Monto autorizado (MXN) *</label>
              <input
                type="number"
                step="0.01"
                className="input"
                value={editing.monto ?? ""}
                onChange={(e) => setEditing({ ...editing, monto: Number(e.target.value) })}
                placeholder="30000"
              />
            </div>
            <div>
              <label className="label">Notas</label>
              <textarea
                className="input"
                rows={2}
                value={editing.notas ?? ""}
                onChange={(e) => setEditing({ ...editing, notas: e.target.value })}
                placeholder="Ej. 10 personas, San Luis"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <button onClick={() => setEditing(null)} className="btn-secondary">Cancelar</button>
            <button onClick={save} className="btn-primary">Guardar</button>
          </div>
        </Modal>
      )}

      <Calculator />
    </div>
  );
}

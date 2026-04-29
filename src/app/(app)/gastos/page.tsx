"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Modal from "@/components/Modal";
import Calculator from "@/components/Calculator";
import { fmtMXN, fmtFecha, hoyISO } from "@/lib/format";
import type { Gasto } from "@/lib/types";

const CATEGORIAS = [
  "combustible",
  "agua",
  "comida",
  "materiales",
  "cemento",
  "arena",
  "herramientas",
  "casetas",
  "mano de obra",
  "otros",
];

export default function GastosPage() {
  const supabase = createClient();
  const [items, setItems] = useState<Gasto[]>([]);
  const [editing, setEditing] = useState<Partial<Gasto> | null>(null);
  const [desde, setDesde] = useState(() => hoyISO().slice(0, 8) + "01");
  const [hasta, setHasta] = useState(hoyISO());

  async function load() {
    const { data } = await supabase
      .from("gastos")
      .select("*")
      .gte("fecha", desde)
      .lte("fecha", hasta)
      .order("fecha", { ascending: false });
    setItems((data as Gasto[]) ?? []);
  }
  useEffect(() => { load(); }, [desde, hasta]);

  async function save() {
    if (!editing?.descripcion || !editing.monto) return;
    const payload = {
      fecha: editing.fecha || hoyISO(),
      categoria: editing.categoria || "general",
      descripcion: editing.descripcion,
      monto: Number(editing.monto),
      proveedor: editing.proveedor || null,
    };
    if (editing.id) await supabase.from("gastos").update(payload).eq("id", editing.id);
    else await supabase.from("gastos").insert(payload);
    setEditing(null);
    load();
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar este gasto?")) return;
    await supabase.from("gastos").delete().eq("id", id);
    load();
  }

  const total = items.reduce((a, g) => a + Number(g.monto), 0);
  const porCategoria = items.reduce<Record<string, number>>((acc, g) => {
    acc[g.categoria] = (acc[g.categoria] ?? 0) + Number(g.monto);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Gastos diarios</h1>
          <p className="text-sm text-slate-500">Lo que has gastado en cada jornada.</p>
        </div>
        <button onClick={() => setEditing({ fecha: hoyISO(), categoria: "combustible" })} className="btn-primary">
          + Nuevo gasto
        </button>
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
            <p className="text-xl font-bold text-red-600">{fmtMXN(total)}</p>
          </div>
        </div>
      </div>

      {Object.keys(porCategoria).length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(porCategoria).map(([cat, monto]) => (
            <div key={cat} className="card">
              <div className="card-body">
                <p className="text-xs text-slate-500 capitalize">{cat}</p>
                <p className="text-lg font-semibold mt-1">{fmtMXN(monto)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <div className="card-body">
          {items.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-10">Sin gastos en este periodo.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Categoría</th>
                  <th>Descripción</th>
                  <th>Proveedor</th>
                  <th className="text-right">Monto</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((g) => (
                  <tr key={g.id} className="hover:bg-slate-50">
                    <td>{fmtFecha(g.fecha)}</td>
                    <td className="capitalize">{g.categoria}</td>
                    <td className="font-medium">{g.descripcion}</td>
                    <td className="text-slate-500">{g.proveedor ?? "—"}</td>
                    <td className="text-right">{fmtMXN(g.monto)}</td>
                    <td className="text-right whitespace-nowrap space-x-3">
                      <button onClick={() => setEditing(g)} className="text-sm text-brand-dark hover:underline">Editar</button>
                      <button onClick={() => remove(g.id)} className="text-sm text-red-600 hover:underline">Borrar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {editing && (
        <Modal title={editing.id ? "Editar gasto" : "Nuevo gasto"} onClose={() => setEditing(null)}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Fecha</label>
              <input
                type="date"
                className="input"
                value={editing.fecha ?? hoyISO()}
                onChange={(e) => setEditing({ ...editing, fecha: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Categoría</label>
              <select
                className="input"
                value={editing.categoria ?? "combustible"}
                onChange={(e) => setEditing({ ...editing, categoria: e.target.value })}
              >
                {CATEGORIAS.map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">Descripción</label>
              <input
                className="input"
                value={editing.descripcion ?? ""}
                onChange={(e) => setEditing({ ...editing, descripcion: e.target.value })}
                placeholder="Ej. Diesel para camioneta"
              />
            </div>
            <div>
              <label className="label">Proveedor</label>
              <input
                className="input"
                value={editing.proveedor ?? ""}
                onChange={(e) => setEditing({ ...editing, proveedor: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Monto (MXN) *</label>
              <input
                type="number"
                step="0.01"
                className="input"
                value={editing.monto ?? ""}
                onChange={(e) => setEditing({ ...editing, monto: Number(e.target.value) })}
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

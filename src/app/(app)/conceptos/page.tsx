"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fmtMXN } from "@/lib/format";
import type { Concepto } from "@/lib/types";

export default function ConceptosPage() {
  const supabase = createClient();
  const [items, setItems] = useState<Concepto[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Concepto> | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("conceptos")
      .select("*")
      .order("descripcion", { ascending: true });
    setItems((data as Concepto[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function save() {
    if (!editing) return;
    const payload = {
      codigo: editing.codigo || null,
      descripcion: editing.descripcion ?? "",
      unidad: editing.unidad || "pza",
      precio_base: Number(editing.precio_base ?? 0),
      activo: editing.activo ?? true,
    };
    if (!payload.descripcion) return;
    if (editing.id) {
      await supabase.from("conceptos").update(payload).eq("id", editing.id);
    } else {
      await supabase.from("conceptos").insert(payload);
    }
    setEditing(null);
    load();
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar este concepto?")) return;
    await supabase.from("conceptos").delete().eq("id", id);
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Catálogo de conceptos</h1>
          <p className="text-sm text-slate-500">Lo que reparas y su precio base.</p>
        </div>
        <button onClick={() => setEditing({ unidad: "pza", activo: true, precio_base: 0 })} className="btn-primary">
          + Nuevo concepto
        </button>
      </div>

      <div className="card">
        <div className="card-body">
          {loading ? (
            <p className="text-sm text-slate-500">Cargando…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-10">
              Aún no hay conceptos. Crea el primero (postes, señales, defensa, etc.).
            </p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Descripción</th>
                  <th>Unidad</th>
                  <th className="text-right">Precio base</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="font-mono text-xs">{c.codigo ?? "—"}</td>
                    <td className="font-medium">{c.descripcion}</td>
                    <td>{c.unidad}</td>
                    <td className="text-right">{fmtMXN(c.precio_base)}</td>
                    <td>
                      {c.activo ? (
                        <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">Activo</span>
                      ) : (
                        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">Inactivo</span>
                      )}
                    </td>
                    <td className="text-right space-x-2 whitespace-nowrap">
                      <button onClick={() => setEditing(c)} className="text-sm text-brand-dark hover:underline">Editar</button>
                      <button onClick={() => remove(c.id)} className="text-sm text-red-600 hover:underline">Borrar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {editing && (
        <Modal title={editing.id ? "Editar concepto" : "Nuevo concepto"} onClose={() => setEditing(null)}>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Descripción</label>
              <input
                className="input"
                value={editing.descripcion ?? ""}
                onChange={(e) => setEditing({ ...editing, descripcion: e.target.value })}
                placeholder="Ej. Poste de señalización"
              />
            </div>
            <div>
              <label className="label">Código (opcional)</label>
              <input
                className="input"
                value={editing.codigo ?? ""}
                onChange={(e) => setEditing({ ...editing, codigo: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Unidad</label>
              <input
                className="input"
                value={editing.unidad ?? "pza"}
                onChange={(e) => setEditing({ ...editing, unidad: e.target.value })}
                placeholder="pza, m, m2, lote"
              />
            </div>
            <div>
              <label className="label">Precio base (MXN)</label>
              <input
                type="number"
                step="0.01"
                className="input"
                value={editing.precio_base ?? 0}
                onChange={(e) => setEditing({ ...editing, precio_base: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="label">Estado</label>
              <select
                className="input"
                value={editing.activo ? "1" : "0"}
                onChange={(e) => setEditing({ ...editing, activo: e.target.value === "1" })}
              >
                <option value="1">Activo</option>
                <option value="0">Inactivo</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <button onClick={() => setEditing(null)} className="btn-secondary">Cancelar</button>
            <button onClick={save} className="btn-primary">Guardar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="card-body">
          <h2 className="text-lg font-semibold mb-4">{title}</h2>
          {children}
        </div>
      </div>
    </div>
  );
}

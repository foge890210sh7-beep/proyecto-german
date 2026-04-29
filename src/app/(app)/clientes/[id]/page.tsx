"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Modal from "@/components/Modal";
import { fmtMXN } from "@/lib/format";
import type { Cliente, Concepto, PrecioCliente, Tramo } from "@/lib/types";

export default function ClienteDetalle({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const supabase = createClient();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [tramos, setTramos] = useState<Tramo[]>([]);
  const [conceptos, setConceptos] = useState<Concepto[]>([]);
  const [precios, setPrecios] = useState<Record<string, number>>({});
  const [editingTramo, setEditingTramo] = useState<Partial<Tramo> | null>(null);

  async function load() {
    const [c, t, cs, p] = await Promise.all([
      supabase.from("clientes").select("*").eq("id", id).single(),
      supabase.from("tramos").select("*").eq("cliente_id", id).order("nombre"),
      supabase.from("conceptos").select("*").eq("activo", true).order("descripcion"),
      supabase.from("precios_cliente").select("*").eq("cliente_id", id),
    ]);
    setCliente(c.data as any);
    setTramos((t.data as Tramo[]) ?? []);
    setConceptos((cs.data as Concepto[]) ?? []);
    const map: Record<string, number> = {};
    ((p.data as PrecioCliente[]) ?? []).forEach((r) => (map[r.concepto_id] = Number(r.precio)));
    setPrecios(map);
  }
  useEffect(() => { load(); }, [id]);

  async function saveTramo() {
    if (!editingTramo?.nombre) return;
    const payload = {
      cliente_id: id,
      nombre: editingTramo.nombre,
      km_inicio: editingTramo.km_inicio ?? null,
      km_fin: editingTramo.km_fin ?? null,
      notas: editingTramo.notas ?? null,
    };
    if (editingTramo.id) await supabase.from("tramos").update(payload).eq("id", editingTramo.id);
    else await supabase.from("tramos").insert(payload);
    setEditingTramo(null);
    load();
  }

  async function removeTramo(tid: string) {
    if (!confirm("¿Eliminar este tramo?")) return;
    await supabase.from("tramos").delete().eq("id", tid);
    load();
  }

  async function setPrecio(concepto_id: string, valor: string) {
    const n = Number(valor);
    setPrecios({ ...precios, [concepto_id]: n });
    if (!Number.isFinite(n) || valor === "") {
      await supabase.from("precios_cliente").delete().eq("cliente_id", id).eq("concepto_id", concepto_id);
      return;
    }
    await supabase.from("precios_cliente").upsert(
      { cliente_id: id, concepto_id, precio: n },
      { onConflict: "cliente_id,concepto_id" },
    );
  }

  if (!cliente) return <p className="text-sm text-slate-500">Cargando…</p>;

  return (
    <div className="space-y-8">
      <div>
        <Link href="/clientes" className="text-sm text-slate-500 hover:underline">← Clientes</Link>
        <h1 className="text-2xl font-bold mt-2">{cliente.nombre}</h1>
        {cliente.contacto && <p className="text-sm text-slate-600">{cliente.contacto}</p>}
      </div>

      <section className="card">
        <div className="card-body">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Tramos carreteros</h2>
            <button onClick={() => setEditingTramo({})} className="btn-secondary text-sm">+ Nuevo tramo</button>
          </div>
          {tramos.length === 0 ? (
            <p className="text-sm text-slate-500 py-4 text-center">Sin tramos registrados.</p>
          ) : (
            <table className="table">
              <thead>
                <tr><th>Nombre</th><th>Km inicio</th><th>Km fin</th><th>Notas</th><th></th></tr>
              </thead>
              <tbody>
                {tramos.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="font-medium">{t.nombre}</td>
                    <td>{t.km_inicio ?? "—"}</td>
                    <td>{t.km_fin ?? "—"}</td>
                    <td className="text-slate-500">{t.notas ?? ""}</td>
                    <td className="text-right whitespace-nowrap space-x-3">
                      <button onClick={() => setEditingTramo(t)} className="text-sm text-brand-dark hover:underline">Editar</button>
                      <button onClick={() => removeTramo(t.id)} className="text-sm text-red-600 hover:underline">Borrar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className="card">
        <div className="card-body">
          <h2 className="font-semibold mb-1">Lista de precios para este cliente</h2>
          <p className="text-sm text-slate-500 mb-4">
            Si dejas un precio en blanco, se usa el precio base del catálogo.
          </p>
          {conceptos.length === 0 ? (
            <p className="text-sm text-slate-500 py-4 text-center">
              No hay conceptos activos. <Link href="/conceptos" className="text-brand-dark underline">Crea conceptos</Link> primero.
            </p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Concepto</th>
                  <th>Unidad</th>
                  <th className="text-right">Precio base</th>
                  <th className="text-right">Precio cliente</th>
                </tr>
              </thead>
              <tbody>
                {conceptos.map((c) => (
                  <tr key={c.id}>
                    <td>{c.descripcion}</td>
                    <td className="text-slate-500">{c.unidad}</td>
                    <td className="text-right text-slate-500">{fmtMXN(c.precio_base)}</td>
                    <td className="text-right">
                      <input
                        type="number"
                        step="0.01"
                        className="input max-w-[160px] text-right ml-auto"
                        value={precios[c.id] ?? ""}
                        placeholder="—"
                        onChange={(e) => setPrecio(c.id, e.target.value)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {editingTramo && (
        <Modal title={editingTramo.id ? "Editar tramo" : "Nuevo tramo"} onClose={() => setEditingTramo(null)}>
          <div className="space-y-3">
            <div>
              <label className="label">Nombre *</label>
              <input
                className="input"
                value={editingTramo.nombre ?? ""}
                onChange={(e) => setEditingTramo({ ...editingTramo, nombre: e.target.value })}
                placeholder="Ej. México–Querétaro"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Km inicio</label>
                <input
                  type="number"
                  className="input"
                  value={editingTramo.km_inicio ?? ""}
                  onChange={(e) => setEditingTramo({ ...editingTramo, km_inicio: e.target.value === "" ? null : Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="label">Km fin</label>
                <input
                  type="number"
                  className="input"
                  value={editingTramo.km_fin ?? ""}
                  onChange={(e) => setEditingTramo({ ...editingTramo, km_fin: e.target.value === "" ? null : Number(e.target.value) })}
                />
              </div>
            </div>
            <div>
              <label className="label">Notas</label>
              <textarea
                className="input"
                rows={2}
                value={editingTramo.notas ?? ""}
                onChange={(e) => setEditingTramo({ ...editingTramo, notas: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <button onClick={() => setEditingTramo(null)} className="btn-secondary">Cancelar</button>
            <button onClick={saveTramo} className="btn-primary">Guardar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

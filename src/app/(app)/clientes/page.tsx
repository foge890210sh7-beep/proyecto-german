"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Modal from "@/components/Modal";
import type { Cliente } from "@/lib/types";

export default function ClientesPage() {
  const supabase = createClient();
  const [items, setItems] = useState<(Cliente & { tramos: { count: number }[] })[]>([]);
  const [editing, setEditing] = useState<Partial<Cliente> | null>(null);

  async function load() {
    const { data } = await supabase
      .from("clientes")
      .select("*, tramos(count)")
      .order("nombre");
    setItems((data as any) ?? []);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    if (!editing?.nombre) return;
    const payload = {
      nombre: editing.nombre,
      rfc: editing.rfc || null,
      contacto: editing.contacto || null,
      notas: editing.notas || null,
    };
    if (editing.id) await supabase.from("clientes").update(payload).eq("id", editing.id);
    else await supabase.from("clientes").insert(payload);
    setEditing(null);
    load();
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar este cliente y todos sus tramos?")) return;
    await supabase.from("clientes").delete().eq("id", id);
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-sm text-slate-500">Concesionarias / dependencias a quienes les facturas.</p>
        </div>
        <button onClick={() => setEditing({})} className="btn-primary">+ Nuevo cliente</button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {items.length === 0 ? (
          <div className="card md:col-span-2">
            <div className="card-body text-center py-10 text-sm text-slate-500">
              Aún no hay clientes. Crea el primero para empezar.
            </div>
          </div>
        ) : (
          items.map((c) => (
            <div key={c.id} className="card">
              <div className="card-body">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-lg">{c.nombre}</h3>
                    {c.rfc && <p className="text-xs font-mono text-slate-500">{c.rfc}</p>}
                    {c.contacto && <p className="text-sm text-slate-600 mt-1">{c.contacto}</p>}
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    {c.tramos?.[0]?.count ?? 0} tramo(s)
                  </div>
                </div>
                {c.notas && <p className="text-sm text-slate-500 mt-2">{c.notas}</p>}
                <div className="flex gap-3 mt-4 text-sm">
                  <Link href={`/clientes/${c.id}`} className="text-brand-dark hover:underline">
                    Tramos y precios →
                  </Link>
                  <button onClick={() => setEditing(c)} className="text-slate-600 hover:underline">Editar</button>
                  <button onClick={() => remove(c.id)} className="text-red-600 hover:underline ml-auto">Borrar</button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {editing && (
        <Modal title={editing.id ? "Editar cliente" : "Nuevo cliente"} onClose={() => setEditing(null)}>
          <div className="space-y-3">
            <div>
              <label className="label">Nombre *</label>
              <input
                className="input"
                value={editing.nombre ?? ""}
                onChange={(e) => setEditing({ ...editing, nombre: e.target.value })}
                placeholder="Ej. CAPUFE / Concesionaria XYZ"
              />
            </div>
            <div>
              <label className="label">RFC</label>
              <input
                className="input"
                value={editing.rfc ?? ""}
                onChange={(e) => setEditing({ ...editing, rfc: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Contacto</label>
              <input
                className="input"
                value={editing.contacto ?? ""}
                onChange={(e) => setEditing({ ...editing, contacto: e.target.value })}
                placeholder="Nombre, teléfono o correo"
              />
            </div>
            <div>
              <label className="label">Notas</label>
              <textarea
                className="input"
                rows={3}
                value={editing.notas ?? ""}
                onChange={(e) => setEditing({ ...editing, notas: e.target.value })}
              />
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

"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fmtMXN } from "@/lib/format";
import type { Concepto } from "@/lib/types";

export default function ConceptosPage() {
  const supabase = createClient();
  const [items, setItems] = useState<Concepto[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Concepto> | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenuId(null);
    }
    if (openMenuId) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [openMenuId]);

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
                    <td className="text-right whitespace-nowrap relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === c.id ? null : c.id);
                        }}
                        aria-label="Acciones"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:text-slate-100 hover:bg-white/10 transition"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                          <circle cx="12" cy="5" r="1.8" />
                          <circle cx="12" cy="12" r="1.8" />
                          <circle cx="12" cy="19" r="1.8" />
                        </svg>
                      </button>
                      {openMenuId === c.id && (
                        <div
                          ref={menuRef}
                          className="absolute right-2 top-9 z-20 w-36 rounded-lg border border-slate-700 bg-slate-900/95 shadow-xl backdrop-blur py-1 text-left"
                        >
                          <button
                            onClick={() => {
                              setOpenMenuId(null);
                              setEditing(c);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-200 hover:bg-white/5 transition"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
                            </svg>
                            Editar
                          </button>
                          <button
                            onClick={() => {
                              setOpenMenuId(null);
                              remove(c.id);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                              <path d="M10 11v6M14 11v6" />
                              <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                            </svg>
                            Borrar
                          </button>
                        </div>
                      )}
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

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { fmtMXN } from "@/lib/format";
import type { Cliente, Concepto, PrecioCliente } from "@/lib/types";

type Row = Concepto & { override?: number | null };

export default function PreciosPorTramoPage() {
  const supabase = createClient();
  const params = useParams<{ id: string }>();
  const clienteId = params.id;

  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Row | null>(null);
  const [precioInput, setPrecioInput] = useState<string>("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenuId(null);
    }
    if (openMenuId) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [openMenuId]);

  async function load() {
    setLoading(true);
    const [cl, cs, ps] = await Promise.all([
      supabase.from("clientes").select("*").eq("id", clienteId).maybeSingle(),
      supabase.from("conceptos").select("*").eq("activo", true).order("descripcion"),
      supabase.from("precios_cliente").select("*").eq("cliente_id", clienteId),
    ]);
    setCliente((cl.data as Cliente) ?? null);
    const overrides: Record<string, number> = {};
    ((ps.data as PrecioCliente[]) ?? []).forEach((p) => (overrides[p.concepto_id] = Number(p.precio)));
    const merged: Row[] = ((cs.data as Concepto[]) ?? []).map((c) => ({
      ...c,
      override: overrides[c.id] ?? null,
    }));
    setRows(merged);
    setLoading(false);
  }

  useEffect(() => { if (clienteId) load(); }, [clienteId]);

  async function guardarPrecio() {
    if (!editing) return;
    const valor = Number(precioInput);
    if (!Number.isFinite(valor) || valor < 0) {
      alert("Precio inválido.");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("precios_cliente")
      .upsert(
        { cliente_id: clienteId, concepto_id: editing.id, precio: valor },
        { onConflict: "cliente_id,concepto_id" },
      );
    setSaving(false);
    if (error) {
      alert("Error: " + error.message);
      return;
    }
    setEditing(null);
    load();
  }

  async function volverAlBase(c: Row) {
    if (!confirm(`¿Quitar el precio especial y usar el base (${fmtMXN(c.precio_base)})?`)) return;
    const { error } = await supabase
      .from("precios_cliente")
      .delete()
      .eq("cliente_id", clienteId)
      .eq("concepto_id", c.id);
    if (error) {
      alert("Error: " + error.message);
      return;
    }
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/conceptos" className="text-sm text-slate-400 hover:text-slate-200">← Volver a conceptos</Link>
      </div>
      <div>
        <h1 className="text-2xl font-bold">
          Precios · <span className="headline">{cliente?.nombre ?? "Cargando…"}</span>
        </h1>
        <p className="text-sm text-slate-400">
          Aquí editas los precios que se cobran en este tramo. Si dejas un concepto sin precio especial, se cobra el del catálogo general.
        </p>
      </div>

      <div className="card">
        <div className="card-body">
          {loading ? (
            <p className="text-sm text-slate-500">Cargando…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-10">
              Aún no hay conceptos activos en el catálogo.
            </p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Descripción</th>
                  <th>Unidad</th>
                  <th className="text-right">Precio base</th>
                  <th className="text-right">Precio en este tramo</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => {
                  const tieneOverride = c.override != null;
                  const precioActual = tieneOverride ? (c.override as number) : Number(c.precio_base);
                  return (
                    <tr key={c.id}>
                      <td className="font-mono text-xs">{c.codigo ?? "—"}</td>
                      <td className="font-medium">{c.descripcion}</td>
                      <td>{c.unidad}</td>
                      <td className="text-right text-slate-400">{fmtMXN(c.precio_base)}</td>
                      <td className="text-right">
                        <span className={tieneOverride ? "font-semibold text-yellow-300" : "text-slate-400"}>
                          {fmtMXN(precioActual)}
                        </span>
                        {tieneOverride && (
                          <span className="ml-2 text-[10px] uppercase tracking-wider text-yellow-300/80 bg-yellow-300/10 px-1.5 py-0.5 rounded">
                            personalizado
                          </span>
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
                            className="absolute right-2 top-9 z-20 w-56 rounded-lg border border-slate-700 bg-slate-900/95 shadow-xl backdrop-blur py-1 text-left"
                          >
                            <button
                              onClick={() => {
                                setOpenMenuId(null);
                                setEditing(c);
                                setPrecioInput(String(precioActual));
                              }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-200 hover:bg-white/5 transition"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 20h9" />
                                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
                              </svg>
                              Editar precio
                            </button>
                            {tieneOverride && (
                              <button
                                onClick={() => {
                                  setOpenMenuId(null);
                                  volverAlBase(c);
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-white/5 transition"
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
                                  <path d="M3 3v5h5" />
                                </svg>
                                Volver al precio base
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {editing && (
        <Modal
          title={`Editar precio · ${editing.descripcion}`}
          onClose={() => setEditing(null)}
        >
          <div className="space-y-4">
            <div className="text-xs text-slate-400 space-y-1">
              <p>Precio base del catálogo: <span className="font-semibold text-slate-200">{fmtMXN(editing.precio_base)}</span> / {editing.unidad}</p>
              <p>Tramo: <span className="font-semibold text-slate-200">{cliente?.nombre}</span></p>
            </div>
            <div>
              <label className="label">Precio para este tramo (MXN)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input"
                value={precioInput}
                onChange={(e) => setPrecioInput(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <button onClick={() => setEditing(null)} className="btn-secondary">Cancelar</button>
            <button onClick={guardarPrecio} disabled={saving} className="btn-primary">
              {saving ? "Guardando…" : "Guardar"}
            </button>
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

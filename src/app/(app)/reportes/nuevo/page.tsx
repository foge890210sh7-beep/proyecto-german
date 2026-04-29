"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { fmtMXN, hoyISO } from "@/lib/format";
import type { Cliente, Concepto, PrecioCliente, Tramo } from "@/lib/types";

type Linea = {
  concepto_id: string;
  descripcion: string;
  unidad: string;
  cantidad: number;
  precio_unitario: number;
};

export default function NuevoReporte() {
  const supabase = createClient();
  const router = useRouter();

  const [fecha, setFecha] = useState(hoyISO());
  const [clienteId, setClienteId] = useState<string>("");
  const [tramoId, setTramoId] = useState<string>("");
  const [notas, setNotas] = useState("");
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [tramos, setTramos] = useState<Tramo[]>([]);
  const [conceptos, setConceptos] = useState<Concepto[]>([]);
  const [preciosCliente, setPreciosCliente] = useState<Record<string, number>>({});
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const [c, cs] = await Promise.all([
        supabase.from("clientes").select("*").order("nombre"),
        supabase.from("conceptos").select("*").eq("activo", true).order("descripcion"),
      ]);
      setClientes((c.data as Cliente[]) ?? []);
      setConceptos((cs.data as Concepto[]) ?? []);
    })();
  }, []);

  useEffect(() => {
    if (!clienteId) {
      setTramos([]);
      setPreciosCliente({});
      setTramoId("");
      return;
    }
    (async () => {
      const [t, p] = await Promise.all([
        supabase.from("tramos").select("*").eq("cliente_id", clienteId).order("nombre"),
        supabase.from("precios_cliente").select("*").eq("cliente_id", clienteId),
      ]);
      setTramos((t.data as Tramo[]) ?? []);
      const map: Record<string, number> = {};
      ((p.data as PrecioCliente[]) ?? []).forEach((r) => (map[r.concepto_id] = Number(r.precio)));
      setPreciosCliente(map);
      setLineas((prev) =>
        prev.map((l) => ({
          ...l,
          precio_unitario: map[l.concepto_id] ?? conceptos.find((c) => c.id === l.concepto_id)?.precio_base ?? l.precio_unitario,
        })),
      );
    })();
  }, [clienteId]);

  function precioPara(c: Concepto): number {
    return preciosCliente[c.id] ?? Number(c.precio_base);
  }

  function agregar(c: Concepto) {
    if (lineas.find((l) => l.concepto_id === c.id)) return;
    setLineas([
      ...lineas,
      {
        concepto_id: c.id,
        descripcion: c.descripcion,
        unidad: c.unidad,
        cantidad: 1,
        precio_unitario: precioPara(c),
      },
    ]);
  }

  function actualizar(i: number, patch: Partial<Linea>) {
    setLineas(lineas.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  function quitar(i: number) {
    setLineas(lineas.filter((_, idx) => idx !== i));
  }

  const total = useMemo(
    () => lineas.reduce((a, l) => a + Number(l.cantidad) * Number(l.precio_unitario), 0),
    [lineas],
  );

  async function guardar() {
    if (lineas.length === 0) {
      alert("Agrega al menos un concepto.");
      return;
    }
    setSaving(true);
    const { data: r, error } = await supabase
      .from("reportes")
      .insert({
        fecha,
        cliente_id: clienteId || null,
        tramo_id: tramoId || null,
        notas: notas || null,
      })
      .select()
      .single();
    if (error || !r) {
      setSaving(false);
      alert("Error: " + error?.message);
      return;
    }
    const items = lineas.map((l) => ({
      reporte_id: r.id,
      concepto_id: l.concepto_id,
      descripcion: l.descripcion,
      unidad: l.unidad,
      cantidad: Number(l.cantidad),
      precio_unitario: Number(l.precio_unitario),
    }));
    const { error: e2 } = await supabase.from("reporte_items").insert(items);
    setSaving(false);
    if (e2) {
      alert("Error guardando partidas: " + e2.message);
      return;
    }
    router.push(`/reportes/${r.id}`);
  }

  const conceptosDisponibles = conceptos.filter(
    (c) => !lineas.find((l) => l.concepto_id === c.id),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Nuevo reporte de trabajo</h1>
        <p className="text-sm text-slate-500">Selecciona los conceptos y captura cantidades. El total se calcula solo.</p>
      </div>

      <div className="card">
        <div className="card-body grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label">Fecha</label>
            <input type="date" className="input" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
          <div>
            <label className="label">Cliente</label>
            <select className="input" value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
              <option value="">— Selecciona —</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Tramo</label>
            <select className="input" value={tramoId} onChange={(e) => setTramoId(e.target.value)} disabled={!clienteId}>
              <option value="">— Selecciona —</option>
              {tramos.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
            </select>
          </div>
          <div className="md:col-span-3">
            <label className="label">Notas / observaciones</label>
            <textarea className="input" rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <h2 className="font-semibold mb-3">Trabajos realizados</h2>
          {lineas.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">
              Aún no hay partidas. Agrega conceptos desde la lista de abajo.
            </p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Concepto</th>
                  <th>Unidad</th>
                  <th className="text-right">Cantidad</th>
                  <th className="text-right">P. unitario</th>
                  <th className="text-right">Importe</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {lineas.map((l, i) => (
                  <tr key={l.concepto_id}>
                    <td>{l.descripcion}</td>
                    <td className="text-slate-500">{l.unidad}</td>
                    <td className="text-right">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="input max-w-[120px] text-right ml-auto"
                        value={l.cantidad}
                        onChange={(e) => actualizar(i, { cantidad: Number(e.target.value) })}
                      />
                    </td>
                    <td className="text-right">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="input max-w-[140px] text-right ml-auto"
                        value={l.precio_unitario}
                        onChange={(e) => actualizar(i, { precio_unitario: Number(e.target.value) })}
                      />
                    </td>
                    <td className="text-right font-medium">{fmtMXN(l.cantidad * l.precio_unitario)}</td>
                    <td className="text-right">
                      <button onClick={() => quitar(i)} className="text-red-600 text-sm hover:underline">Quitar</button>
                    </td>
                  </tr>
                ))}
                <tr className="bg-amber-50">
                  <td colSpan={4} className="text-right font-semibold">Total a cobrar</td>
                  <td className="text-right font-bold text-lg text-emerald-700">{fmtMXN(total)}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <h3 className="font-semibold mb-3">Agregar concepto</h3>
          {conceptos.length === 0 ? (
            <p className="text-sm text-slate-500">No hay conceptos en el catálogo.</p>
          ) : conceptosDisponibles.length === 0 ? (
            <p className="text-sm text-slate-500">Ya agregaste todos los conceptos disponibles.</p>
          ) : (
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
              {conceptosDisponibles.map((c) => (
                <button
                  key={c.id}
                  onClick={() => agregar(c)}
                  className="text-left border border-slate-200 hover:border-brand hover:bg-amber-50 rounded-lg p-3 transition"
                >
                  <p className="font-medium text-sm">{c.descripcion}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {fmtMXN(precioPara(c))} / {c.unidad}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button onClick={() => router.back()} className="btn-secondary">Cancelar</button>
        <button onClick={guardar} disabled={saving} className="btn-primary">
          {saving ? "Guardando…" : "Guardar reporte"}
        </button>
      </div>
    </div>
  );
}

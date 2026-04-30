"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { fmtMXN, fmtFecha, hoyISO } from "@/lib/format";
import Calculator from "@/components/Calculator";
import type { Cliente, Concepto, Etapa, Foto, PrecioCliente, Tramo } from "@/lib/types";

type Linea = {
  concepto_id: string;
  descripcion: string;
  unidad: string;
  cantidad: number;
  precio_unitario: number;
};

type FotoConUrl = Foto & { url: string };

const ETAPAS: { value: Etapa; label: string; color: string }[] = [
  { value: "antes", label: "Antes", color: "bg-slate-100 text-slate-700" },
  { value: "durante", label: "Durante", color: "bg-amber-100 text-amber-800" },
  { value: "despues", label: "Después", color: "bg-emerald-100 text-emerald-800" },
];

export default function NuevoReporte() {
  const supabase = createClient();
  const router = useRouter();

  const [paso, setPaso] = useState<1 | 2>(1);
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

  // Paso 2: fotos disponibles + selección
  const [fotosDisponibles, setFotosDisponibles] = useState<FotoConUrl[]>([]);
  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set());
  const [borrarNoSelecc, setBorrarNoSelecc] = useState(false);
  const [loadingFotos, setLoadingFotos] = useState(false);

  useEffect(() => {
    (async () => {
      const [c, cs] = await Promise.all([
        supabase.from("clientes").select("*").order("nombre"),
        supabase.from("conceptos").select("*").eq("activo", true).order("descripcion"),
      ]);
      setClientes((c.data as Cliente[]) ?? []);
      const conceptosArr = (cs.data as Concepto[]) ?? [];
      setConceptos(conceptosArr);
      // Inicializar la hoja con TODOS los conceptos en cantidad 0
      // (Germán solo escribe la cantidad de los que hizo; los demás no se cobran)
      setLineas(
        conceptosArr.map((c) => ({
          concepto_id: c.id,
          descripcion: c.descripcion,
          unidad: c.unidad,
          cantidad: 0,
          precio_unitario: Number(c.precio_base),
        })),
      );
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

  function actualizar(i: number, patch: Partial<Linea>) {
    setLineas(lineas.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  const total = useMemo(
    () => lineas.reduce((a, l) => a + Number(l.cantidad) * Number(l.precio_unitario), 0),
    [lineas],
  );

  async function cargarFotos() {
    setLoadingFotos(true);
    let q = supabase
      .from("fotos")
      .select("*")
      .eq("fecha", fecha)
      .is("reporte_id", null)
      .order("etapa")
      .order("created_at");
    if (tramoId) q = q.eq("tramo_id", tramoId);
    const { data } = await q;
    const items: FotoConUrl[] = ((data as Foto[]) ?? []).map((f) => ({
      ...f,
      url: supabase.storage.from("fotos").getPublicUrl(f.storage_path).data.publicUrl,
    }));
    setFotosDisponibles(items);
    setSeleccionadas(new Set(items.map((f) => f.id))); // por default todas marcadas
    setLoadingFotos(false);
  }

  async function avanzarPaso() {
    if (!clienteId) return alert("Selecciona un cliente.");
    const conCantidad = lineas.filter((l) => Number(l.cantidad) > 0);
    if (conCantidad.length === 0) return alert("Pon la cantidad de al menos un daño antes de continuar.");
    setPaso(2);
    cargarFotos();
  }

  function toggleFoto(id: string) {
    const next = new Set(seleccionadas);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSeleccionadas(next);
  }
  function todasEtapa(etapa: Etapa, marcar: boolean) {
    const next = new Set(seleccionadas);
    fotosDisponibles.filter((f) => f.etapa === etapa).forEach((f) => {
      if (marcar) next.add(f.id);
      else next.delete(f.id);
    });
    setSeleccionadas(next);
  }

  async function guardar() {
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
    // Solo guardamos los daños donde Germán puso una cantidad > 0
    const items = lineas
      .filter((l) => Number(l.cantidad) > 0)
      .map((l) => ({
        reporte_id: r.id,
        concepto_id: l.concepto_id,
        descripcion: l.descripcion,
        unidad: l.unidad,
        cantidad: Number(l.cantidad),
        precio_unitario: Number(l.precio_unitario),
      }));
    const { error: e2 } = await supabase.from("reporte_items").insert(items);
    if (e2) {
      setSaving(false);
      alert("Error guardando partidas: " + e2.message);
      return;
    }

    // Asociar fotos seleccionadas
    const idsSeleccionadas = Array.from(seleccionadas);
    if (idsSeleccionadas.length > 0) {
      await supabase.from("fotos").update({ reporte_id: r.id }).in("id", idsSeleccionadas);
    }
    // Borrar las no seleccionadas si así lo pidió
    const noSeleccionadas = fotosDisponibles.filter((f) => !seleccionadas.has(f.id));
    if (borrarNoSelecc && noSeleccionadas.length > 0) {
      await supabase.storage.from("fotos").remove(noSeleccionadas.map((f) => f.storage_path));
      await supabase.from("fotos").delete().in("id", noSeleccionadas.map((f) => f.id));
    }

    setSaving(false);
    router.push(`/reportes/${r.id}`);
  }

  if (paso === 2) {
    return (
      <div className="space-y-6">
        <div>
          <button onClick={() => setPaso(1)} className="text-sm text-slate-500 hover:underline">← Paso anterior</button>
          <h1 className="text-2xl font-bold mt-2">Selecciona las fotos para el reporte</h1>
          <p className="text-sm text-slate-500">
            Mostrando fotos del <span className="font-medium">{fmtFecha(fecha)}</span>
            {tramoId ? <> del tramo seleccionado</> : <> (todos los tramos)</>}.
            Marca las que quieres incluir como evidencia. Las no marcadas se quedan sueltas (las puedes borrar abajo).
          </p>
        </div>

        {loadingFotos ? (
          <div className="card"><div className="card-body text-center py-8 text-sm text-slate-500">Cargando fotos…</div></div>
        ) : fotosDisponibles.length === 0 ? (
          <div className="card">
            <div className="card-body text-center py-10">
              <p className="text-sm text-slate-500 mb-3">
                No hay fotos sueltas para esta fecha y tramo.
              </p>
              <Link href="/fotos" className="btn-secondary">
                📷 Ir a tomar fotos
              </Link>
            </div>
          </div>
        ) : (
          ETAPAS.map((etapa) => {
            const fotosEtapa = fotosDisponibles.filter((f) => f.etapa === etapa.value);
            if (fotosEtapa.length === 0) return null;
            const seleccionadasEtapa = fotosEtapa.filter((f) => seleccionadas.has(f.id)).length;
            return (
              <div key={etapa.value} className="card">
                <div className="card-body">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-semibold">
                      <span className={`text-xs px-2 py-0.5 rounded mr-2 ${etapa.color}`}>{etapa.label}</span>
                      {seleccionadasEtapa} / {fotosEtapa.length} seleccionadas
                    </h2>
                    <div className="flex gap-2 text-sm">
                      <button onClick={() => todasEtapa(etapa.value, true)} className="text-brand-dark hover:underline">Marcar todas</button>
                      <span className="text-slate-300">|</span>
                      <button onClick={() => todasEtapa(etapa.value, false)} className="text-slate-500 hover:underline">Desmarcar todas</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                    {fotosEtapa.map((f) => {
                      const sel = seleccionadas.has(f.id);
                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => toggleFoto(f.id)}
                          className={`relative aspect-square rounded-lg overflow-hidden border-2 transition ${
                            sel ? "border-emerald-500 ring-2 ring-emerald-300" : "border-slate-200 opacity-60"
                          }`}
                        >
                          <img src={f.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                          <div className={`absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            sel ? "bg-emerald-500 text-white" : "bg-white/80 text-slate-400"
                          }`}>
                            {sel ? "✓" : ""}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {fotosDisponibles.length > 0 && (
          <div className="card border-amber-200 bg-amber-50/50">
            <div className="card-body">
              <label className="flex items-start gap-2 text-sm text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={borrarNoSelecc}
                  onChange={(e) => setBorrarNoSelecc(e.target.checked)}
                />
                <span>
                  <strong>Borrar las {fotosDisponibles.length - seleccionadas.size} fotos no seleccionadas</strong> al guardar el reporte.
                  <br />
                  <span className="text-xs text-slate-500">
                    Si dejas esta casilla sin marcar, las fotos no seleccionadas se quedan en la galería para usarlas después.
                  </span>
                </span>
              </label>
            </div>
          </div>
        )}

        <div className="sticky bottom-0 bg-white border-t border-slate-200 -mx-4 px-4 py-3 flex justify-between items-center">
          <p className="text-sm text-slate-600">
            <strong>{seleccionadas.size}</strong> foto(s) en el reporte · Total a cobrar: <strong className="text-emerald-700">{fmtMXN(total)}</strong>
          </p>
          <div className="flex gap-2">
            <button onClick={() => setPaso(1)} className="btn-secondary">← Atrás</button>
            <button onClick={guardar} disabled={saving} className="btn-primary">
              {saving ? "Guardando…" : "✓ Guardar reporte"}
            </button>
          </div>
        </div>
        <Calculator />
      </div>
    );
  }

  // Paso 1
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Nuevo reporte de trabajo</h1>
        <p className="text-sm text-slate-500">Paso 1 de 2 — Datos y conceptos. En el paso 2 seleccionas las fotos de evidencia.</p>
      </div>

      <div className="card">
        <div className="card-body grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label">Fecha</label>
            <input type="date" className="input" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
          <div>
            <label className="label">Cliente *</label>
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

      {/* === HOJA BLANCA estilo factura/Excel === */}
      <div className="rounded-xl bg-white text-slate-900 shadow-2xl ring-1 ring-slate-300 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-300 bg-slate-100 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Hoja del día</p>
            <p className="text-sm font-semibold capitalize">{fmtFecha(fecha)}</p>
          </div>
          <p className="text-xs text-slate-500">Pon la cantidad de cada daño que se reparó.</p>
        </div>

        {conceptos.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">No hay conceptos en el catálogo.</p>
        ) : (
          <>
            {/* === DESKTOP: tabla blanca === */}
            <table className="hidden md:table w-full text-sm">
              <thead>
                <tr className="bg-slate-200 text-slate-700">
                  <th className="text-left px-4 py-2.5 font-bold uppercase tracking-wider text-[11px]">Daño</th>
                  <th className="text-center px-3 py-2.5 font-bold uppercase tracking-wider text-[11px]">Cantidad</th>
                  <th className="text-right px-4 py-2.5 font-bold uppercase tracking-wider text-[11px]">Importe</th>
                </tr>
              </thead>
              <tbody>
                {lineas.map((l, i) => {
                  const importe = Number(l.cantidad) * Number(l.precio_unitario);
                  const activa = Number(l.cantidad) > 0;
                  return (
                    <tr key={l.concepto_id} className={`border-t border-slate-200 ${activa ? "bg-yellow-50" : ""}`}>
                      <td className="px-4 py-2.5 align-middle">
                        <p className={`font-medium ${activa ? "text-slate-900" : "text-slate-700"}`}>{l.descripcion}</p>
                        <p className="text-xs text-slate-500">
                          {fmtMXN(l.precio_unitario)} / {l.unidad}
                        </p>
                      </td>
                      <td className="px-3 py-2.5 align-middle text-center">
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          min="0"
                          placeholder="0"
                          className="w-24 mx-auto rounded-md border border-slate-300 bg-white px-2 py-1.5 text-center text-base font-semibold text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-300"
                          value={l.cantidad === 0 ? "" : l.cantidad}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => actualizar(i, { cantidad: e.target.value === "" ? 0 : Number(e.target.value) })}
                        />
                      </td>
                      <td className={`px-4 py-2.5 align-middle text-right font-semibold ${activa ? "text-emerald-700" : "text-slate-300"}`}>
                        {activa ? fmtMXN(importe) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-900 text-white">
                  <td colSpan={2} className="px-4 py-3 text-right font-bold uppercase tracking-wider text-xs">Total a cobrar</td>
                  <td className="px-4 py-3 text-right font-black text-xl text-yellow-300">{fmtMXN(total)}</td>
                </tr>
              </tfoot>
            </table>

            {/* === MOBILE: cards estilo hoja blanca === */}
            <ul className="md:hidden divide-y divide-slate-200">
              {lineas.map((l, i) => {
                const importe = Number(l.cantidad) * Number(l.precio_unitario);
                const activa = Number(l.cantidad) > 0;
                return (
                  <li key={l.concepto_id} className={`px-4 py-3 ${activa ? "bg-yellow-50" : ""}`}>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <p className={`text-[10px] uppercase tracking-widest font-bold ${activa ? "text-amber-700" : "text-slate-400"}`}>Daño</p>
                        <p className={`font-semibold leading-tight ${activa ? "text-slate-900" : "text-slate-700"}`}>{l.descripcion}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {fmtMXN(l.precio_unitario)} / {l.unidad}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 items-end">
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">Cantidad</p>
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          min="0"
                          placeholder="0"
                          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-lg font-semibold text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-300"
                          value={l.cantidad === 0 ? "" : l.cantidad}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => actualizar(i, { cantidad: e.target.value === "" ? 0 : Number(e.target.value) })}
                        />
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">Importe</p>
                        <p className={`text-lg font-bold ${activa ? "text-emerald-700" : "text-slate-300"}`}>
                          {activa ? fmtMXN(importe) : "—"}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Total mobile */}
            <div className="md:hidden bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
              <span className="text-xs uppercase tracking-widest font-bold">Total a cobrar</span>
              <span className="text-xl font-black text-yellow-300">{fmtMXN(total)}</span>
            </div>
          </>
        )}
      </div>

      <div className="flex justify-between items-center">
        <button onClick={() => router.back()} className="btn-secondary">Cancelar</button>
        <button onClick={avanzarPaso} className="btn-primary">
          Continuar a fotos →
        </button>
      </div>

      <Calculator />
    </div>
  );
}

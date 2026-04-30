"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Calculator from "@/components/Calculator";
import { fmtMXN, fmtFecha, hoyISO } from "@/lib/format";
import type { Gasto, Presupuesto } from "@/lib/types";

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

// Devuelve el lunes (ISO yyyy-mm-dd) de la semana de la fecha dada
function lunesDeLaSemana(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dia = dt.getUTCDay() || 7; // 0=domingo → 7
  dt.setUTCDate(dt.getUTCDate() - (dia - 1));
  return dt.toISOString().slice(0, 10);
}

function domingoDeLaSemana(lunesIso: string): string {
  const [y, m, d] = lunesIso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + 6);
  return dt.toISOString().slice(0, 10);
}

function sumarDias(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

export default function GastosPage() {
  const supabase = createClient();
  const hoy = hoyISO();
  const [semanaInicio, setSemanaInicio] = useState<string>(lunesDeLaSemana(hoy));
  const semanaFin = domingoDeLaSemana(semanaInicio);

  const [presupuesto, setPresupuesto] = useState<Presupuesto | null>(null);
  const [montoInput, setMontoInput] = useState<string>("");
  const [savingPres, setSavingPres] = useState(false);

  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(true);

  // Quick form de hoy
  const [qDesc, setQDesc] = useState("");
  const [qMonto, setQMonto] = useState("");
  const [qCat, setQCat] = useState("combustible");
  const [savingGasto, setSavingGasto] = useState(false);

  // Editar/Borrar
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [editing, setEditing] = useState<Partial<Gasto> | null>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenuId(null);
    }
    if (openMenuId) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [openMenuId]);

  async function load() {
    setLoading(true);
    const [p, g] = await Promise.all([
      supabase.from("presupuestos").select("*").eq("semana_inicio", semanaInicio).maybeSingle(),
      supabase
        .from("gastos")
        .select("*")
        .gte("fecha", semanaInicio)
        .lte("fecha", semanaFin)
        .order("fecha", { ascending: false })
        .order("created_at", { ascending: false }),
    ]);
    const pres = (p.data as Presupuesto) ?? null;
    setPresupuesto(pres);
    setMontoInput(pres ? String(pres.monto) : "");
    setGastos((g.data as Gasto[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [semanaInicio]);

  async function guardarPresupuesto() {
    const monto = Number(montoInput);
    if (!Number.isFinite(monto) || monto < 0) return alert("Monto inválido.");
    setSavingPres(true);
    const { error } = await supabase
      .from("presupuestos")
      .upsert({ semana_inicio: semanaInicio, monto }, { onConflict: "semana_inicio" });
    setSavingPres(false);
    if (error) return alert("Error: " + error.message);
    load();
  }

  async function agregarGasto() {
    const monto = Number(qMonto);
    if (!qDesc.trim() || !Number.isFinite(monto) || monto <= 0) {
      return alert("Necesitas descripción y monto.");
    }
    setSavingGasto(true);
    const { error } = await supabase.from("gastos").insert({
      fecha: hoy,
      categoria: qCat,
      descripcion: qDesc.trim(),
      monto,
    });
    setSavingGasto(false);
    if (error) return alert("Error: " + error.message);
    setQDesc("");
    setQMonto("");
    load();
  }

  async function saveEdit() {
    if (!editing?.descripcion || !editing.monto || !editing.id) return;
    await supabase
      .from("gastos")
      .update({
        fecha: editing.fecha || hoy,
        categoria: editing.categoria || "otros",
        descripcion: editing.descripcion,
        monto: Number(editing.monto),
        proveedor: editing.proveedor || null,
      })
      .eq("id", editing.id);
    setEditing(null);
    load();
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar este gasto?")) return;
    await supabase.from("gastos").delete().eq("id", id);
    load();
  }

  const totalSemana = useMemo(
    () => gastos.reduce((a, g) => a + Number(g.monto), 0),
    [gastos],
  );
  const restante = (Number(presupuesto?.monto ?? 0)) - totalSemana;
  const pctGastado = presupuesto?.monto && presupuesto.monto > 0
    ? Math.min(100, (totalSemana / Number(presupuesto.monto)) * 100)
    : 0;

  // Agrupar por día
  const gastosPorDia = useMemo(() => {
    const map = new Map<string, Gasto[]>();
    gastos.forEach((g) => {
      const arr = map.get(g.fecha) ?? [];
      arr.push(g);
      map.set(g.fecha, arr);
    });
    return map;
  }, [gastos]);

  const gastosHoy = gastosPorDia.get(hoy) ?? [];
  const totalHoy = gastosHoy.reduce((a, g) => a + Number(g.monto), 0);

  // Días de la semana (de hoy hacia atrás dentro del rango), sin duplicar hoy
  const diasAnteriores: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = sumarDias(semanaInicio, i);
    if (d !== hoy && d <= hoy && (gastosPorDia.get(d)?.length ?? 0) > 0) diasAnteriores.push(d);
  }
  diasAnteriores.sort((a, b) => (a < b ? 1 : -1)); // más reciente primero

  function semanaAnterior() {
    setSemanaInicio(sumarDias(semanaInicio, -7));
  }
  function semanaSiguiente() {
    setSemanaInicio(sumarDias(semanaInicio, 7));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Gastos diarios</h1>
        <p className="text-sm text-slate-400">Lleva el control de los viáticos y de lo que gastas cada día.</p>
      </div>

      {/* === VIÁTICOS DE LA SEMANA === */}
      <div className="card">
        <div className="card-body space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-400">Semana</p>
              <p className="font-semibold">
                {fmtFecha(semanaInicio)} – {fmtFecha(semanaFin)}
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={semanaAnterior} className="btn-secondary !py-1.5 !px-3 text-sm">← Anterior</button>
              <button onClick={() => setSemanaInicio(lunesDeLaSemana(hoy))} className="btn-secondary !py-1.5 !px-3 text-sm">Hoy</button>
              <button onClick={semanaSiguiente} className="btn-secondary !py-1.5 !px-3 text-sm">Siguiente →</button>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 items-end">
            <div>
              <label className="label">Viáticos de esta semana (MXN)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="input flex-1"
                  placeholder="0.00"
                  value={montoInput}
                  onChange={(e) => setMontoInput(e.target.value)}
                />
                <button onClick={guardarPresupuesto} disabled={savingPres} className="btn-primary">
                  {savingPres ? "…" : presupuesto ? "Actualizar" : "Guardar"}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-yellow-300/10 border border-yellow-300/20 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wider text-yellow-200">Asignado</p>
                <p className="font-bold text-yellow-300">{fmtMXN(Number(presupuesto?.monto ?? 0))}</p>
              </div>
              <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wider text-red-300">Gastado</p>
                <p className="font-bold text-red-400">{fmtMXN(totalSemana)}</p>
              </div>
              <div className={`rounded-xl border px-3 py-2 ${restante < 0 ? "bg-red-500/10 border-red-500/30" : "bg-emerald-500/10 border-emerald-500/20"}`}>
                <p className={`text-[10px] uppercase tracking-wider ${restante < 0 ? "text-red-300" : "text-emerald-300"}`}>Restante</p>
                <p className={`font-bold ${restante < 0 ? "text-red-400" : "text-emerald-300"}`}>{fmtMXN(restante)}</p>
              </div>
            </div>
          </div>

          {presupuesto && Number(presupuesto.monto) > 0 && (
            <div>
              <div className="h-2.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/10">
                <div
                  className={`h-full transition-all duration-500 ${pctGastado >= 100 ? "bg-red-500" : pctGastado >= 80 ? "bg-amber-400" : "bg-emerald-400"}`}
                  style={{ width: `${pctGastado}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">
                {pctGastado.toFixed(1)}% de los viáticos consumidos.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* === HOY === */}
      <div className="card border-yellow-300/30 ring-1 ring-yellow-300/10">
        <div className="card-body space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-yellow-200 font-semibold">Hoy</p>
              <h2 className="text-lg font-bold capitalize">{fmtFecha(hoy)}</h2>
            </div>
            <p className="text-sm text-slate-300">
              Total: <span className="font-bold text-red-400">{fmtMXN(totalHoy)}</span>
            </p>
          </div>

          {/* Quick form */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
            <input
              className="input sm:col-span-5"
              placeholder="¿En qué gastaste? (ej. diesel)"
              value={qDesc}
              onChange={(e) => setQDesc(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") agregarGasto(); }}
            />
            <input
              type="number"
              step="0.01"
              min="0"
              className="input sm:col-span-3"
              placeholder="$ Monto"
              value={qMonto}
              onChange={(e) => setQMonto(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") agregarGasto(); }}
            />
            <select
              className="input sm:col-span-2"
              value={qCat}
              onChange={(e) => setQCat(e.target.value)}
            >
              {CATEGORIAS.map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
            </select>
            <button onClick={agregarGasto} disabled={savingGasto} className="btn-primary sm:col-span-2">
              {savingGasto ? "…" : "+ Agregar"}
            </button>
          </div>

          {/* Lista de hoy */}
          {gastosHoy.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">
              Aún no has registrado nada hoy.
            </p>
          ) : (
            <ul className="divide-y divide-white/5">
              {gastosHoy.map((g) => (
                <ItemGasto
                  key={g.id}
                  gasto={g}
                  isMenuOpen={openMenuId === g.id}
                  onToggleMenu={() => setOpenMenuId(openMenuId === g.id ? null : g.id)}
                  onEdit={() => { setOpenMenuId(null); setEditing(g); }}
                  onDelete={() => { setOpenMenuId(null); remove(g.id); }}
                  menuRef={menuRef}
                />
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* === DÍAS ANTERIORES === */}
      {diasAnteriores.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold tracking-widest text-slate-300 uppercase">
            Días anteriores de esta semana
          </h2>
          {diasAnteriores.map((d) => {
            const lista = gastosPorDia.get(d) ?? [];
            const total = lista.reduce((a, g) => a + Number(g.monto), 0);
            return (
              <div key={d} className="card">
                <div className="card-body">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-semibold capitalize">{fmtFecha(d)}</p>
                    <p className="text-sm">
                      Total: <span className="font-bold text-red-400">{fmtMXN(total)}</span>
                    </p>
                  </div>
                  <ul className="divide-y divide-white/5">
                    {lista.map((g) => (
                      <ItemGasto
                        key={g.id}
                        gasto={g}
                        isMenuOpen={openMenuId === g.id}
                        onToggleMenu={() => setOpenMenuId(openMenuId === g.id ? null : g.id)}
                        onEdit={() => { setOpenMenuId(null); setEditing(g); }}
                        onDelete={() => { setOpenMenuId(null); remove(g.id); }}
                        menuRef={menuRef}
                      />
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && gastos.length === 0 && (
        <div className="card">
          <div className="card-body text-center py-8 text-sm text-slate-400">
            Sin gastos en esta semana. Empieza registrando uno arriba.
          </div>
        </div>
      )}

      {/* Modal de editar */}
      {editing && editing.id && (
        <div className="fixed inset-0 z-40 bg-black/60 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="card w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="card-body space-y-3">
              <h2 className="text-lg font-semibold">Editar gasto</h2>
              <div>
                <label className="label">Fecha</label>
                <input
                  type="date"
                  className="input"
                  value={editing.fecha ?? hoy}
                  onChange={(e) => setEditing({ ...editing, fecha: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Categoría</label>
                <select
                  className="input"
                  value={editing.categoria ?? "otros"}
                  onChange={(e) => setEditing({ ...editing, categoria: e.target.value })}
                >
                  {CATEGORIAS.map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Descripción</label>
                <input
                  className="input"
                  value={editing.descripcion ?? ""}
                  onChange={(e) => setEditing({ ...editing, descripcion: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Proveedor (opcional)</label>
                <input
                  className="input"
                  value={editing.proveedor ?? ""}
                  onChange={(e) => setEditing({ ...editing, proveedor: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Monto (MXN)</label>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  value={editing.monto ?? ""}
                  onChange={(e) => setEditing({ ...editing, monto: Number(e.target.value) })}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setEditing(null)} className="btn-secondary">Cancelar</button>
                <button onClick={saveEdit} className="btn-primary">Guardar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Calculator />
    </div>
  );
}

function ItemGasto({
  gasto,
  isMenuOpen,
  onToggleMenu,
  onEdit,
  onDelete,
  menuRef,
}: {
  gasto: Gasto;
  isMenuOpen: boolean;
  onToggleMenu: () => void;
  onEdit: () => void;
  onDelete: () => void;
  menuRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <li className="py-2.5 flex items-center justify-between gap-2 relative">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-slate-100 truncate">{gasto.descripcion}</p>
        <p className="text-xs text-slate-400 capitalize">
          {gasto.categoria}
          {gasto.proveedor ? <> · {gasto.proveedor}</> : null}
        </p>
      </div>
      <p className="font-bold text-red-400 whitespace-nowrap">{fmtMXN(gasto.monto)}</p>
      <div className="relative">
        <button
          onClick={(e) => { e.stopPropagation(); onToggleMenu(); }}
          aria-label="Acciones"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:text-slate-100 hover:bg-white/10 transition"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="1.6" />
            <circle cx="12" cy="12" r="1.6" />
            <circle cx="12" cy="19" r="1.6" />
          </svg>
        </button>
        {isMenuOpen && (
          <div
            ref={menuRef}
            className="absolute right-0 top-9 z-20 w-32 rounded-lg border border-slate-700 bg-slate-900/95 shadow-xl backdrop-blur py-1"
          >
            <button onClick={onEdit} className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-white/5 transition">
              Editar
            </button>
            <button onClick={onDelete} className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition">
              Borrar
            </button>
          </div>
        )}
      </div>
    </li>
  );
}

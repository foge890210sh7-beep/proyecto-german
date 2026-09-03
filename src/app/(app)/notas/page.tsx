"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fmtFecha, hoyISO } from "@/lib/format";
import type { Nota, Tramo } from "@/lib/types";

type TramoConCliente = Tramo & { clientes: { nombre: string } | null };

export default function NotasPage() {
  const supabase = createClient();

  const [notas, setNotas] = useState<Nota[]>([]);
  const [tramos, setTramos] = useState<TramoConCliente[]>([]);
  const [loading, setLoading] = useState(true);

  // Nota activa: si `editandoId` es null estamos creando; si tiene valor,
  // estamos editando esa nota existente.
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [titulo, setTitulo] = useState("");
  const [contenido, setContenido] = useState("");
  const [fecha, setFecha] = useState(hoyISO());
  const [tramoId, setTramoId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const [nR, tR] = await Promise.all([
      supabase.from("notas").select("*").order("fecha", { ascending: false }).order("created_at", { ascending: false }),
      supabase.from("tramos").select("*, clientes(nombre)").order("nombre"),
    ]);
    setNotas((nR.data as Nota[]) ?? []);
    setTramos((tR.data as any[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function nuevaHoja() {
    setEditandoId(null);
    setTitulo("");
    setContenido("");
    setFecha(hoyISO());
    setTramoId("");
  }

  function abrirNota(n: Nota) {
    setEditandoId(n.id);
    setTitulo(n.titulo ?? "");
    setContenido(n.contenido ?? "");
    setFecha(n.fecha);
    setTramoId(n.tramo_id ?? "");
  }

  async function guardar() {
    if (!contenido.trim() && !titulo.trim()) {
      alert("Escribe algo en la hoja antes de guardar.");
      return;
    }
    setSaving(true);
    const payload = {
      titulo: titulo.trim() || null,
      contenido: contenido,
      fecha,
      tramo_id: tramoId || null,
    };
    let error;
    if (editandoId) {
      ({ error } = await supabase.from("notas").update(payload).eq("id", editandoId));
    } else {
      const res = await supabase.from("notas").insert(payload).select().single();
      error = res.error;
      if (res.data) setEditandoId((res.data as Nota).id);
    }
    setSaving(false);
    if (error) {
      alert("No pude guardar: " + error.message);
      return;
    }
    load();
  }

  async function eliminar() {
    if (!editandoId) return;
    if (!confirm("¿Borrar esta hoja para siempre?")) return;
    setSaving(true);
    const { error } = await supabase.from("notas").delete().eq("id", editandoId);
    setSaving(false);
    if (error) {
      alert("No pude borrar: " + error.message);
      return;
    }
    nuevaHoja();
    load();
  }

  const nombreTramo = useMemo(() => {
    if (!tramoId) return "";
    const t = tramos.find((x) => x.id === tramoId);
    if (!t) return "";
    return t.clientes?.nombre ? `${t.clientes.nombre} · ${t.nombre}` : t.nombre;
  }, [tramoId, tramos]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">📓 Mi cuaderno</h1>
          <p className="text-sm text-slate-500">
            Hojas de libreta para escribir a mano tus notas, estimaciones sueltas y apuntes de campo.
          </p>
        </div>
        <button onClick={nuevaHoja} className="btn-secondary" disabled={saving}>
          + Hoja nueva
        </button>
      </div>

      {/* HOJA DE CUADERNO — estilo libreta rayada */}
      <div className="relative rounded-lg overflow-hidden shadow-2xl">
        {/* Fondo de hoja + rayas azules horizontales + margen rojo */}
        <div
          className="hoja-cuaderno relative"
          style={{
            backgroundColor: "#fffef5",
            // 32px por renglon, línea azul debajo
            backgroundImage:
              "repeating-linear-gradient(to bottom, transparent 0 31px, #b8d4e8 31px 32px)",
            paddingTop: "56px",
            paddingBottom: "32px",
            paddingLeft: "72px",
            paddingRight: "24px",
            minHeight: "560px",
          }}
        >
          {/* Margen rojo vertical */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: "56px",
              width: "1px",
              backgroundColor: "#ef4444",
            }}
          />
          {/* Perforaciones al estilo hoja arrancada */}
          <div
            aria-hidden
            className="hidden md:block"
            style={{
              position: "absolute",
              top: "80px",
              bottom: "80px",
              left: "16px",
              width: "12px",
              backgroundImage:
                "radial-gradient(circle at 6px 6px, #e5e7eb 5px, transparent 6px)",
              backgroundSize: "12px 88px",
              backgroundRepeat: "repeat-y",
            }}
          />

          {/* Metadatos arriba: fecha, tramo, título */}
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 -mt-8 mb-6 font-hand text-slate-700 relative z-10">
            <label className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-widest text-slate-500 font-sans">Fecha:</span>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="font-hand text-base bg-transparent border-b border-slate-300 outline-none px-1"
              />
            </label>
            <label className="flex items-center gap-2 min-w-[180px]">
              <span className="text-xs uppercase tracking-widest text-slate-500 font-sans">Tramo:</span>
              <select
                value={tramoId}
                onChange={(e) => setTramoId(e.target.value)}
                className="font-hand text-base bg-transparent border-b border-slate-300 outline-none px-1 flex-1"
              >
                <option value="">— (opcional) —</option>
                {tramos.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.clientes?.nombre ? `${t.clientes.nombre} · ` : ""}{t.nombre}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* Título grande estilo cuaderno */}
          <input
            type="text"
            placeholder="Título (opcional)…"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            className="font-hand text-3xl text-slate-900 w-full bg-transparent outline-none placeholder-slate-400 mb-4 relative z-10"
            style={{ lineHeight: "32px" }}
          />

          {/* Textarea donde Germán escribe libre */}
          <textarea
            placeholder={"Escribe aquí tus notas, sumas, totales…\nEjemplo:\nTotal de órdenes realizadas en el tramo Querétaro-Chichimequillas\nTotal = 20,612 $"}
            value={contenido}
            onChange={(e) => setContenido(e.target.value)}
            spellCheck={false}
            className="font-hand text-2xl text-slate-900 w-full bg-transparent outline-none resize-none placeholder-slate-400 relative z-10"
            style={{
              lineHeight: "32px",
              minHeight: "384px", // ~12 renglones
            }}
            rows={16}
          />

          {nombreTramo && (
            <p className="mt-4 text-xs text-slate-500 relative z-10 font-sans">
              Asociada al tramo: <strong>{nombreTramo}</strong>
            </p>
          )}
        </div>
      </div>

      {/* Barra de acciones */}
      <div className="flex flex-wrap gap-2 justify-between items-center">
        <div className="text-sm text-slate-400">
          {editandoId ? "Editando una hoja existente" : "Hoja nueva sin guardar"}
        </div>
        <div className="flex gap-2">
          {editandoId && (
            <button
              onClick={eliminar}
              disabled={saving}
              className="btn-secondary text-red-400 border-red-500/40 hover:border-red-500"
            >
              🗑️ Borrar
            </button>
          )}
          <button onClick={guardar} disabled={saving} className="btn-primary">
            {saving ? "Guardando…" : editandoId ? "💾 Guardar cambios" : "💾 Guardar hoja"}
          </button>
        </div>
      </div>

      {/* Notas guardadas */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-white mb-3">Hojas guardadas</h2>
        {loading ? (
          <p className="text-sm text-slate-400">Cargando…</p>
        ) : notas.length === 0 ? (
          <p className="text-sm text-slate-400">Aún no tienes hojas guardadas. Escribe una arriba y dale <strong>Guardar hoja</strong>.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {notas.map((n) => {
              const activa = editandoId === n.id;
              const preview = (n.contenido || "").split("\n").slice(0, 4).join("\n");
              return (
                <button
                  key={n.id}
                  onClick={() => abrirNota(n)}
                  className={`text-left rounded-lg overflow-hidden shadow transition ${
                    activa ? "ring-2 ring-amber-400" : "hover:shadow-lg"
                  }`}
                  style={{
                    backgroundColor: "#fffef5",
                    backgroundImage:
                      "repeating-linear-gradient(to bottom, transparent 0 23px, #d6e6f2 23px 24px)",
                    padding: "14px 14px 14px 22px",
                    borderLeft: "3px solid #ef4444",
                    minHeight: "140px",
                  }}
                >
                  <p className="font-hand text-lg text-slate-900 leading-tight truncate">
                    {n.titulo || "(sin título)"}
                  </p>
                  <p className="font-hand text-sm text-slate-700 mt-1 line-clamp-3 whitespace-pre-line">
                    {preview || "(vacía)"}
                  </p>
                  <p className="text-[10px] uppercase tracking-widest text-slate-500 mt-2 font-sans">
                    {fmtFecha(n.fecha)}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

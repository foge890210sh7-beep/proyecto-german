"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Cliente } from "@/lib/types";

export default function ConceptosLandingPage() {
  const supabase = createClient();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("clientes").select("*").order("nombre");
      setClientes((data as Cliente[]) ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Conceptos y precios</h1>
        <p className="text-sm text-slate-400">
          Cada tramo carretero tiene su propia lista de precios. Elige uno para ver y editar sus costos.
        </p>
      </div>

      <div>
        <h2 className="text-xs font-semibold tracking-widest text-slate-300 uppercase mb-3">Tramos</h2>
        {loading ? (
          <p className="text-sm text-slate-500">Cargando…</p>
        ) : clientes.length === 0 ? (
          <p className="text-sm text-slate-500">Aún no hay tramos cargados.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {clientes.map((c) => (
              <Link
                key={c.id}
                href={`/conceptos/cliente/${c.id}`}
                className="card hover:border-brand/50 transition group"
              >
                <div className="card-body">
                  <div className="flex items-center justify-between mb-2">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-300 via-red-500 to-blue-600 text-slate-900 font-black text-lg shadow-glow-yellow">
                      🛣️
                    </span>
                    <span className="text-slate-400 group-hover:text-yellow-300 transition">→</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-100">{c.nombre}</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    {c.contacto ?? "Tramo carretero"}
                  </p>
                  <p className="text-xs text-slate-500 mt-3">
                    Ver y editar precios de este tramo
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-xs font-semibold tracking-widest text-slate-300 uppercase mb-3">Catálogo base</h2>
        <Link
          href="/conceptos/general"
          className="card hover:border-brand/50 transition group block"
        >
          <div className="card-body flex items-center gap-4">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-2xl">
              📋
            </span>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-slate-100">Catálogo general</h3>
              <p className="text-sm text-slate-400">
                Precios base que se cobran cuando un tramo no tiene precio especial. Aquí también agregas o eliminas conceptos del catálogo.
              </p>
            </div>
            <span className="text-slate-400 group-hover:text-yellow-300 transition">→</span>
          </div>
        </Link>
      </div>
    </div>
  );
}

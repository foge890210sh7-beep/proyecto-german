import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Cron job que evita que Supabase pause el proyecto.
// Supabase pausa proyectos free tras 7 dias sin actividad de DB
// (pings al /health NO cuentan, tiene que ser query real a una tabla).
//
// Este endpoint hace un SELECT count() a la tabla `conceptos`, que es
// actividad real de DB y resetea el contador de inactividad.
//
// Vercel Cron llama esto diario (max frecuencia en Hobby plan).
// Vercel firma la request con header `x-vercel-cron`, asi que rechazamos
// requests que no vienen de Vercel Cron.

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Solo aceptar del cron de Vercel (o si esta CRON_SECRET configurado).
  const esCron = request.headers.get("x-vercel-cron") === "1";
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const secretOk = cronSecret && authHeader === `Bearer ${cronSecret}`;

  if (!esCron && !secretOk) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return NextResponse.json(
      { ok: false, motivo: "env_missing" },
      { status: 503 },
    );
  }

  const supabase = createServerClient(url, key, {
    cookies: { getAll: () => [], setAll: () => {} },
  });

  const inicio = Date.now();
  const { count, error } = await supabase
    .from("conceptos")
    .select("*", { count: "exact", head: true });
  const ms = Date.now() - inicio;

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        motivo: "query_failed",
        error: error.message,
        ms,
      },
      { status: 503 },
    );
  }

  return NextResponse.json({
    ok: true,
    motivo: "keep_alive_ok",
    conceptos_count: count,
    ms,
    timestamp: new Date().toISOString(),
  });
}

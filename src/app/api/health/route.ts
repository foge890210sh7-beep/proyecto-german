import { NextResponse } from "next/server";

// Endpoint de salud. Devuelve JSON con el estado de:
// - Env vars
// - Supabase (ping al /auth/v1/health con timeout corto)
//
// Se puede pegar en cualquier momento a /api/health para saber por qué
// no está funcionando la app sin tener que ir a los logs de Vercel.
//
// Debe correrse en edge o node runtime, pero SIN validar sesión — este
// endpoint es público a propósito (no expone datos sensibles).

export const runtime = "edge";
export const dynamic = "force-dynamic";

const TIMEOUT_MS = 4000;

async function pingSupabase(url: string, key: string) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const inicio = Date.now();
  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/auth/v1/health`, {
      headers: { apikey: key },
      signal: controller.signal,
      cache: "no-store",
    });
    return {
      ok: res.ok,
      status: res.status,
      ms: Date.now() - inicio,
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      ms: Date.now() - inicio,
      error: (err as Error).message,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const env = {
    NEXT_PUBLIC_SUPABASE_URL: Boolean(supabaseUrl),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: Boolean(supabaseKey),
  };

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      {
        ok: false,
        motivo: "env_missing",
        env,
        supabase: null,
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }

  const supabase = await pingSupabase(supabaseUrl, supabaseKey);
  const ok = supabase.ok;

  return NextResponse.json(
    {
      ok,
      motivo: ok ? "operativo" : "supabase_down",
      env,
      supabase: {
        url: supabaseUrl,
        ...supabase,
      },
      timestamp: new Date().toISOString(),
    },
    { status: ok ? 200 : 503 },
  );
}

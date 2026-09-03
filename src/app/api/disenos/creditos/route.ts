import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Devuelve cuántas imágenes le quedan al usuario (para mostrar en la UI).
export async function GET() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data, error } = await supabase.rpc("ver_credito_ia").single();
  if (error) {
    return NextResponse.json({ restantes: null });
  }
  const c: any = data;
  return NextResponse.json({
    usados: c?.usados ?? 0,
    limite: c?.limite ?? 30,
    restantes: c?.restantes ?? 0,
  });
}

"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function DeleteReporteButton({ id }: { id: string }) {
  const router = useRouter();
  async function handleDelete() {
    if (!confirm("¿Eliminar este reporte y todas sus partidas?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("reportes").delete().eq("id", id);
    if (error) {
      alert("Error: " + error.message);
      return;
    }
    router.replace("/reportes");
  }
  return (
    <button onClick={handleDelete} className="btn-danger">Eliminar</button>
  );
}

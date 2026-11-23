"use client";

import { useState } from "react";

// Descarga el PDF del reporte o lo manda como archivo por WhatsApp (menú
// compartir del celular). Se manda el archivo y no un link porque el PDF
// solo se puede abrir con sesión iniciada.
export default function CompartirPdf({ id, nombreArchivo }: { id: string; nombreArchivo: string }) {
  const [estado, setEstado] = useState<"" | "cargando" | "error">("");

  async function obtenerPdf(): Promise<File> {
    const res = await fetch(`/api/reportes/${id}/pdf`);
    if (!res.ok) throw new Error("No se pudo generar el PDF");
    const blob = await res.blob();
    return new File([blob], nombreArchivo, { type: "application/pdf" });
  }

  function descargarArchivo(file: File) {
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  async function descargar() {
    setEstado("cargando");
    try {
      descargarArchivo(await obtenerPdf());
      setEstado("");
    } catch {
      setEstado("error");
    }
  }

  async function mandarWhatsApp() {
    setEstado("cargando");
    try {
      const file = await obtenerPdf();
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: file.name });
        } catch (e) {
          // El usuario cerró el menú de compartir: no es error.
          if ((e as DOMException)?.name !== "AbortError") throw e;
        }
      } else {
        // Sin menú de compartir (computadora): se descarga y se abre WhatsApp
        // para que adjunte el archivo descargado.
        descargarArchivo(file);
        window.open(`https://wa.me/?text=${encodeURIComponent(`Le mando el reporte ${file.name}`)}`, "_blank", "noopener");
      }
      setEstado("");
    } catch {
      setEstado("error");
    }
  }

  const ocupado = estado === "cargando";

  return (
    <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-2">
      <button
        type="button"
        onClick={descargar}
        disabled={ocupado}
        className="rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-base font-bold text-white transition hover:bg-white/20 disabled:opacity-60"
      >
        ⬇️ Descargar PDF
      </button>
      <button
        type="button"
        onClick={mandarWhatsApp}
        disabled={ocupado}
        className="rounded-xl bg-[#25D366] px-5 py-3 text-base font-black text-[#0b1220] shadow-[0_0_24px_rgba(37,211,102,.45)] transition hover:brightness-110 disabled:opacity-60"
      >
        {ocupado ? "Preparando PDF…" : "📲 Mandar por WhatsApp"}
      </button>
      {estado === "error" && (
        <p role="alert" className="text-sm text-red-300 sm:col-span-2">
          No se pudo preparar el PDF. Intenta otra vez.
        </p>
      )}
    </div>
  );
}

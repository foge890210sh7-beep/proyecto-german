"use client";

import { useEffect, useState } from "react";

// Evento no estándar de Chrome/Android para instalar la PWA.
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type Plataforma = "android" | "ios" | "otro";

const SALTAR_KEY = "saladino-saltar-instalacion";

function detectar() {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const android = /Android/i.test(ua);
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  // Navegadores dentro de apps (Facebook, Instagram, etc.) no permiten instalar.
  const enApp = /FBAN|FBAV|Instagram|Line\/|; wv\)/i.test(ua);
  const plataforma: Plataforma = ios ? "ios" : android ? "android" : "otro";
  return { plataforma, standalone, enApp };
}

export default function InstallGate() {
  const [visible, setVisible] = useState(false);
  const [plataforma, setPlataforma] = useState<Plataforma>("otro");
  const [enApp, setEnApp] = useState(false);
  const [promptEvt, setPromptEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [instalada, setInstalada] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const d = detectar();
    setPlataforma(d.plataforma);
    setEnApp(d.enApp);

    let saltar = false;
    try {
      saltar = sessionStorage.getItem(SALTAR_KEY) === "1";
    } catch {}

    // Solo en celular y solo si no se abrió ya como app instalada.
    if (d.plataforma !== "otro" && !d.standalone && !saltar) setVisible(true);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPromptEvt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstalada(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = visible ? "hidden" : "";
  }, [visible]);

  async function instalar() {
    if (!promptEvt) return;
    await promptEvt.prompt();
    const { outcome } = await promptEvt.userChoice;
    if (outcome === "accepted") setInstalada(true);
    setPromptEvt(null);
  }

  function saltar() {
    try {
      sessionStorage.setItem(SALTAR_KEY, "1");
    } catch {}
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="install-titulo"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-y-auto bg-slate-950 px-4 py-8 text-center"
    >
      <img src="/logo.webp" alt="Logo de Administración Saladino" width={176} height={176} className="h-44 w-44 rounded-3xl" />

      <h2 id="install-titulo" className="mt-4 text-2xl font-black text-white">
        Instala la app en tu celular
      </h2>

      {instalada ? (
        <div className="mt-6 max-w-sm rounded-2xl border border-emerald-400/40 bg-emerald-500/10 p-5">
          <p className="text-4xl">✅</p>
          <p className="mt-2 text-lg font-bold text-emerald-200">¡Listo, ya quedó instalada!</p>
          <p className="mt-1 text-base text-slate-200">
            Ciérrala aquí y ábrela desde el ícono <strong>Saladino</strong> en tu pantalla de inicio.
          </p>
        </div>
      ) : enApp ? (
        <div className="mt-6 max-w-sm rounded-2xl border border-amber-300/40 bg-amber-400/10 p-5 text-left">
          <p className="text-lg font-bold text-amber-200">Primero ábrela en el navegador</p>
          <p className="mt-2 text-base text-slate-200">
            Toca los <strong>3 puntitos</strong> de arriba y elige <strong>“Abrir en Chrome”</strong> (o Safari en iPhone).
          </p>
        </div>
      ) : plataforma === "android" ? (
        <div className="mt-6 w-full max-w-sm space-y-4">
          {promptEvt ? (
            <button
              type="button"
              onClick={instalar}
              className="w-full rounded-2xl bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-500 px-6 py-5 text-xl font-black text-slate-950 shadow-glow-yellow"
            >
              📲 Instalar app
            </button>
          ) : (
            <ol className="space-y-3 rounded-2xl border border-white/15 bg-white/5 p-5 text-left text-base text-slate-100">
              <li>1. Toca los <strong>3 puntitos ⋮</strong> arriba a la derecha.</li>
              <li>2. Elige <strong>“Instalar aplicación”</strong> o <strong>“Agregar a pantalla principal”</strong>.</li>
              <li>3. Toca <strong>Instalar</strong>.</li>
            </ol>
          )}
        </div>
      ) : (
        <ol className="mt-6 w-full max-w-sm space-y-3 rounded-2xl border border-white/15 bg-white/5 p-5 text-left text-base text-slate-100">
          <li>1. Toca el botón <strong>Compartir</strong> (cuadrito con flecha ⬆️) abajo.</li>
          <li>2. Baja y toca <strong>“Agregar a inicio”</strong>.</li>
          <li>3. Toca <strong>Agregar</strong> arriba a la derecha.</li>
        </ol>
      )}

      <button
        type="button"
        onClick={saltar}
        className="mt-10 text-xs text-slate-500 underline underline-offset-4"
      >
        Seguir en el navegador por ahora
      </button>
    </div>
  );
}

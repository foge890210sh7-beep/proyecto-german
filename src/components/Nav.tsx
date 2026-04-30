"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const links = [
  { href: "/", label: "Inicio" },
  { href: "/reportes", label: "Reportes" },
  { href: "/gastos", label: "Gastos" },
  { href: "/presupuestos", label: "Presupuesto" },
  { href: "/fotos", label: "Fotos" },
  { href: "/conceptos", label: "Conceptos" },
  { href: "/clientes", label: "Clientes" },
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // Cierra el drawer al cambiar de ruta
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Bloquea scroll de fondo cuando el drawer está abierto
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  function isActive(href: string) {
    return href === "/" ? pathname === "/" : pathname.startsWith(href);
  }

  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl bg-slate-950/60 border-b border-white/10 shadow-[0_8px_24px_-12px_rgba(37,99,235,.45)]">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
        <Link href="/" className="group flex items-center gap-2 font-extrabold text-lg tracking-tight">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand via-brand-red to-brand-blue text-brand-ink font-black shadow-glow-yellow group-hover:animate-pulse-ring transition">
            S
          </span>
          <span className="logo-shine hidden sm:inline">Administración Saladino</span>
          <span className="logo-shine sm:hidden">A. Saladino</span>
        </Link>

        {/* Desktop nav */}
        <nav className="flex-1 hidden md:flex items-center gap-1 overflow-x-auto">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`relative px-3 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
                isActive(l.href)
                  ? "text-brand-ink shadow-glow-yellow bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-500"
                  : "text-slate-300 hover:text-white hover:bg-white/10"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Desktop logout */}
        <button
          onClick={logout}
          className="hidden md:inline-flex text-sm font-semibold text-slate-300 hover:text-red-400 transition"
        >
          Salir
        </button>

        {/* Mobile: spacer + hamburger */}
        <div className="flex-1 md:hidden" />
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={open}
          className="md:hidden inline-flex items-center justify-center h-10 w-10 rounded-lg bg-white/10 border border-white/15 text-slate-100 hover:bg-white/20 transition"
        >
          {open ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <>
          <div
            className="md:hidden fixed inset-0 z-20 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <nav className="md:hidden absolute top-full left-0 right-0 z-30 border-b border-white/10 bg-slate-950/95 backdrop-blur-xl shadow-2xl animate-pop-in">
            <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col gap-1">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl text-base font-semibold transition ${
                    isActive(l.href)
                      ? "text-brand-ink bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-500 shadow-glow-yellow"
                      : "text-slate-200 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <span>{l.label}</span>
                  <span className="text-xs opacity-60">→</span>
                </Link>
              ))}
              <button
                onClick={() => {
                  setOpen(false);
                  logout();
                }}
                className="mt-2 px-4 py-3 rounded-xl text-base font-semibold text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition text-left flex items-center gap-2"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Salir
              </button>
            </div>
          </nav>
        </>
      )}
    </header>
  );
}

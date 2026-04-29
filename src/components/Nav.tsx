"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl bg-slate-950/60 border-b border-white/10 shadow-[0_8px_24px_-12px_rgba(37,99,235,.45)]">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
        <Link href="/" className="group flex items-center gap-2 font-extrabold text-lg tracking-tight">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand via-brand-red to-brand-blue text-brand-ink font-black shadow-glow-yellow group-hover:animate-pulse-ring transition">
            S
          </span>
          <span className="logo-shine">Administración Saladino</span>
        </Link>
        <nav className="flex-1 flex items-center gap-1 overflow-x-auto">
          {links.map((l) => {
            const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`relative px-3 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
                  active
                    ? "text-brand-ink shadow-glow-yellow bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-500"
                    : "text-slate-300 hover:text-white hover:bg-white/10"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={logout}
          className="text-sm font-semibold text-slate-300 hover:text-red-400 transition"
        >
          Salir
        </button>
      </div>
    </header>
  );
}

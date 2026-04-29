"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setErr("Usuario o contraseña incorrectos.");
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute -top-32 -left-32 h-80 w-80 rounded-full bg-brand/30 blur-3xl animate-float" />
      <div className="absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-brand-blue/30 blur-3xl animate-float" style={{ animationDelay: "1.2s" }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-brand-red/15 blur-3xl" />

      <div className="w-full max-w-sm card animate-pop-in">
        <div className="card-body">
          <div className="flex items-center gap-3 mb-1">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-300 via-red-500 to-blue-600 text-brand-ink font-black text-lg shadow-glow-yellow animate-pulse-ring">
              S
            </span>
            <h1 className="text-xl font-black tracking-tight logo-shine">
              Administración Saladino
            </h1>
          </div>
          <p className="text-sm text-slate-300 mb-6">Acceso privado · Reparación de autopistas</p>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label">Correo</label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label className="label">Contraseña</label>
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            {err && <p className="text-sm text-red-400">{err}</p>}
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? "..." : "Entrar"}
            </button>
          </form>
          <p className="text-xs text-slate-400 text-center mt-6">
            Sistema privado. El acceso lo crea el administrador.
          </p>
        </div>
      </div>
    </div>
  );
}

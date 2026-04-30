import Nav from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6 animate-fade-up">
        {children}
      </main>
      <footer className="text-center py-6 text-xs text-slate-400">
        <span className="logo-shine font-semibold">Administración Saladino</span>
        <span className="mx-2 text-slate-600">·</span>
        Plataforma de control
      </footer>
    </div>
  );
}

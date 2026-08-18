import Link from "next/link";

// Página que se muestra cuando Supabase no está disponible.
// Nunca depende de Supabase, así que no puede caer con él.
export const dynamic = "force-static";

const MOTIVOS: Record<string, { titulo: string; detalle: string }> = {
  supabase_down: {
    titulo: "El servicio está en pausa",
    detalle:
      "La base de datos no está respondiendo. Ya estamos avisados y lo dejamos listo en unos minutos.",
  },
  env_missing: {
    titulo: "Configuración pendiente",
    detalle:
      "Faltan credenciales en el servidor. El administrador tiene que terminar la instalación.",
  },
  desconocido: {
    titulo: "Sistema temporalmente fuera",
    detalle: "Estamos revisando qué pasó. Vuelve a intentar en unos minutos.",
  },
};

export default async function MantenimientoPage({
  searchParams,
}: {
  searchParams: Promise<{ motivo?: string }>;
}) {
  const { motivo } = await searchParams;
  const info = MOTIVOS[motivo ?? ""] ?? MOTIVOS.desconocido;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-neutral-50">
      <div className="w-full max-w-sm text-center">
        <div className="flex flex-col items-center mb-8">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-950 text-white text-xl font-bold">
            S
          </span>
          <h1 className="mt-4 text-xl font-semibold tracking-tight text-neutral-900">
            Administración Saladino
          </h1>
          <p className="text-sm text-neutral-500 mt-1">Plataforma de control</p>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-card">
          {/* Ícono aviso */}
          <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>

          <h2 className="text-base font-semibold text-neutral-900 mb-1">{info.titulo}</h2>
          <p className="text-sm text-neutral-500 mb-5">{info.detalle}</p>

          <Link href="/" className="btn-primary w-full inline-block">
            Reintentar
          </Link>

          <p className="text-xs text-neutral-400 mt-4">
            Si el problema sigue, avísale al administrador.
          </p>
        </div>

        <p className="text-xs text-neutral-500 text-center mt-6">
          Código: {motivo ?? "desconocido"}
        </p>
      </div>
    </div>
  );
}

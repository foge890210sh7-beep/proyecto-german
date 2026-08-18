import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieSet = { name: string; value: string; options?: CookieOptions };

// Cuánto esperamos a Supabase antes de rendirnos. Vercel mata el middleware
// a los 25s: si Supabase se cae (proyecto pausado, DNS muerto, red saturada),
// NO podemos permitir que la request cuelgue tanto. Preferimos degradar a la
// página de mantenimiento en 3s.
const SUPABASE_TIMEOUT_MS = 3000;

function withTimeout<T>(promise: Promise<T>, ms: number, tag: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error(`timeout:${tag}:${ms}ms`)), ms);
    promise.then(
      (v) => {
        clearTimeout(id);
        resolve(v);
      },
      (e) => {
        clearTimeout(id);
        reject(e);
      },
    );
  });
}

export async function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const isLogin = url.pathname.startsWith("/login");
  const isAuth = url.pathname.startsWith("/auth");
  const isMantenimiento = url.pathname.startsWith("/mantenimiento");
  const isApiHealth = url.pathname.startsWith("/api/health");
  // Los PDF/Excel de reportes se comparten por link (con token firmado),
  // así que NO deben redirigir a login: se acceden sin sesión desde WhatsApp.
  const esArchivoReporte = /^\/api\/reportes\/[^/]+\/(pdf|excel)/.test(url.pathname);

  // /mantenimiento y /api/health se sirven siempre, sin tocar Supabase.
  if (isMantenimiento || isApiHealth) {
    return NextResponse.next({ request });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Env vars faltantes → mantenimiento inmediato (no intentar red).
  if (!supabaseUrl || !supabaseKey) {
    if (esArchivoReporte) return NextResponse.next({ request });
    return redirigirAMantenimiento(url, "env_missing");
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieSet[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  let user: { id: string } | null = null;
  try {
    const result = await withTimeout(
      supabase.auth.getUser(),
      SUPABASE_TIMEOUT_MS,
      "auth.getUser",
    );
    user = result.data.user;
  } catch (err) {
    // Supabase no responde: DNS muerto, proyecto pausado, red saturada, etc.
    // No colgamos la request: degradamos a mantenimiento.
    console.error("[middleware] Supabase no responde:", (err as Error).message);
    if (esArchivoReporte) return NextResponse.next({ request });
    if (isLogin) {
      // El login también depende de Supabase. Vamos a mantenimiento.
      return redirigirAMantenimiento(url, "supabase_down");
    }
    return redirigirAMantenimiento(url, "supabase_down");
  }

  if (!user && !isLogin && !isAuth && !esArchivoReporte) {
    const redirectUrl = url.clone();
    redirectUrl.pathname = "/login";
    return NextResponse.redirect(redirectUrl);
  }
  if (user && isLogin) {
    const redirectUrl = url.clone();
    redirectUrl.pathname = "/";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

function redirigirAMantenimiento(url: URL, motivo: string) {
  const redirectUrl = new URL(url.toString());
  redirectUrl.pathname = "/mantenimiento";
  redirectUrl.search = `?motivo=${motivo}`;
  return NextResponse.redirect(redirectUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};

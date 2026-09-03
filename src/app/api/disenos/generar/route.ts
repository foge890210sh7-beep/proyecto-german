import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

// Modelo de edición de imagen de Google ("nano banana"). Recibe una imagen de
// entrada + instrucciones y devuelve la imagen editada conservando la escena.
const MODEL = "gemini-2.5-flash-image";

// Regla base por categoría: qué se conserva de la foto y qué se cambia.
// La clave de un buen resultado es decirle qué NO tocar.
const PROMPTS: Record<string, string> = {
  carretera:
    "Eres un editor experto de fotos de obra civil y carreteras. Te doy una FOTO REAL de un tramo carretero. Conserva EXACTAMENTE la misma escena: el mismo encuadre, perspectiva, cielo, cerros, montañas del fondo, la misma carretera y la misma iluminación. NO inventes otro lugar ni cambies el horizonte. Aplica únicamente este trabajo de reparación/mantenimiento, de forma fotorrealista:",
  interiores:
    "Eres un experto en diseño de interiores. Te doy una FOTO REAL de un espacio o habitación. Conserva la estructura del lugar: las paredes, ventanas, puertas, el tamaño del cuarto, la perspectiva y la iluminación general. NO cambies la arquitectura del espacio. Agrega, cambia o decora únicamente lo indicado, de forma fotorrealista y bien integrada:",
  arquitectura:
    "Eres un arquitecto y render-ista profesional. Te doy una FOTO REAL de un terreno, fachada o espacio exterior. Conserva el entorno, el terreno, la perspectiva, la orientación y el fondo (vecinos, calle, cielo). Construye o agrega únicamente lo indicado, de forma realista y a escala correcta:",
  moda:
    "Eres un estilista de moda. Te doy una FOTO REAL de una persona o una prenda. Conserva a la persona (su cara, cuerpo, pose) y/o la prenda, el fondo y la iluminación. Aplica únicamente los cambios de color, combinación o estilo indicados, manteniendo todo realista:",
  autos:
    "Eres un experto en personalización de autos. Te doy una FOTO REAL de un vehículo. Conserva el modelo del carro, su forma, el ángulo de la toma y el fondo. Cambia únicamente lo indicado (rines, llantas, color, vinil, accesorios), de forma fotorrealista:",
};

export async function POST(req: Request) {
  // Seguridad: solo usuarios con sesión pueden generar (cuesta créditos).
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Falta configurar la llave de IA (GOOGLE_GEMINI_API_KEY) en el archivo .env.local.",
      },
      { status: 503 },
    );
  }

  let body: {
    imagenBase64?: string;
    mimeType?: string;
    instruccion?: string;
    categoria?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Petición inválida" }, { status: 400 });
  }

  const { imagenBase64, mimeType, instruccion, categoria } = body;
  if (!imagenBase64 || !mimeType || !instruccion) {
    return NextResponse.json(
      { error: "Faltan datos: imagen e instrucción son obligatorios." },
      { status: 400 },
    );
  }

  // Verificar créditos ANTES de gastar la llamada a la IA (30 gratis por usuario).
  // Si la verificación falla por un error técnico (no por falta de créditos),
  // dejamos pasar para no bloquear al usuario por un problema de infraestructura.
  const { data: credito, error: errCredito } = await supabase
    .rpc("ver_credito_ia")
    .single();
  if (!errCredito) {
    const restantesAntes = (credito as any)?.restantes ?? 0;
    if (restantesAntes <= 0) {
      return NextResponse.json(
        {
          error:
            "Se acabaron tus imágenes disponibles. Contacta al administrador para recargar.",
          sinCreditos: true,
        },
        { status: 402 },
      );
    }
  } else {
    console.error("[disenos/generar] no se pudo verificar créditos:", errCredito.message);
  }

  const base = PROMPTS[categoria ?? "carretera"] ?? PROMPTS.carretera;
  const prompt = [
    base,
    "",
    instruccion,
    "",
    "El resultado debe verse fotorrealista y creíble, como una foto del mismo lugar/persona/objeto una vez aplicado el cambio. Mantén proporciones y realismo. Devuelve solo la imagen editada.",
  ].join("\n");

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            { inlineData: { mimeType, data: imagenBase64 } },
          ],
        },
      ],
    });

    const parts = response.candidates?.[0]?.content?.parts ?? [];
    const imgPart = parts.find((p: any) => p.inlineData?.data);
    if (!imgPart?.inlineData?.data) {
      const texto = parts.find((p: any) => p.text)?.text;
      return NextResponse.json(
        {
          error:
            "La IA no devolvió una imagen. " +
            (texto ? "Respuesta: " + texto : "Intenta de nuevo o con otra foto."),
        },
        { status: 502 },
      );
    }

    // La imagen salió bien → cobrar 1 crédito y devolver cuántos quedan.
    const { data: cobro } = await supabase.rpc("consumir_credito_ia").single();
    const restantes = (cobro as any)?.restantes ?? null;

    return NextResponse.json({
      imagenBase64: imgPart.inlineData.data,
      mimeType: imgPart.inlineData.mimeType ?? "image/png",
      restantes,
    });
  } catch (err: any) {
    console.error("[disenos/generar] error:", err);
    const msg = err?.message ?? "Error desconocido";
    const esKey = /api key|permission|invalid|unauthenticated/i.test(msg);
    return NextResponse.json(
      {
        error: esKey
          ? "La llave de IA no es válida o no tiene permisos. Revisa GOOGLE_GEMINI_API_KEY."
          : "Error generando la imagen: " + msg,
      },
      { status: 500 },
    );
  }
}

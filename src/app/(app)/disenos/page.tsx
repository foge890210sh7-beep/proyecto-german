"use client";

import { useEffect, useRef, useState } from "react";
import Calculator from "@/components/Calculator";

// Muestra cuántas imágenes le quedan al usuario. Se refresca solo.
function Creditos({ refresco }: { refresco: number }) {
  const [restantes, setRestantes] = useState<number | null>(null);
  const [limite, setLimite] = useState<number>(30);
  useEffect(() => {
    fetch("/api/disenos/creditos")
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.restantes === "number") setRestantes(d.restantes);
        if (typeof d.limite === "number") setLimite(d.limite);
      })
      .catch(() => {});
  }, [refresco]);
  if (restantes === null) return null;
  const bajo = restantes <= 5;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
        bajo ? "bg-red-50 text-red-700 border border-red-200" : "bg-neutral-100 text-neutral-700"
      }`}
      title={`Has usado ${limite - restantes} de ${limite} imágenes`}
    >
      ✨ {restantes} imágenes disponibles
    </span>
  );
}

// ====== CATÁLOGO DE CATEGORÍAS ======
// Cada opción trae su imagen (ayuda visual, como pidió Germán).
type Opcion = { id: string; label: string; texto: string; img: string };
type Categoria = {
  id: string;
  label: string;
  emoji: string;
  portada: string;
  desc: string;
  ejemploLibre: string;
  opciones: Opcion[];
};

// Categorías "simples" (grilla visual + campo libre). Interiores tiene su propio flujo abajo.
const CATEGORIAS: Categoria[] = [
  {
    id: "carretera",
    label: "Carretera",
    emoji: "🛣️",
    portada: "/portadas/carretera.jpg",
    desc: "Mira cómo quedaría un tramo ya reparado.",
    ejemploLibre: "Ej. reconstruir el bordillo y reparar la alcantarilla",
    opciones: [
      { id: "barrera", label: "Barrera 3 crestas", img: "/opciones/carretera-barrera.jpg", texto: "Instala una barrera de contención metálica de tres crestas nueva y galvanizada con sus postes alineados." },
      { id: "cuneta", label: "Cuneta de concreto", img: "/opciones/carretera-cuneta.jpg", texto: "Construye una cuneta de concreto nueva, limpia y bien delineada al borde." },
      { id: "pasto", label: "Limpieza / pasto", img: "/opciones/carretera-pasto.jpg", texto: "Corta y empareja toda la maleza y el pasto; deja el acotamiento y los taludes limpios." },
      { id: "postes", label: "Postes / delineadores", img: "/opciones/carretera-postes.jpg", texto: "Coloca postes y delineadores reflejantes nuevos." },
      { id: "señalamiento", label: "Señalamiento / pintura", img: "/opciones/carretera-senalamiento.jpg", texto: "Repinta las líneas de la carpeta asfáltica y coloca señalamiento vertical nuevo." },
      { id: "muro", label: "Muro de contención", img: "/opciones/carretera-muro.jpg", texto: "Construye un muro de contención de mampostería nuevo en el talud." },
    ],
  },
  {
    id: "arquitectura",
    label: "Arquitectura",
    emoji: "🏗️",
    portada: "/portadas/arquitectura.jpg",
    desc: "Diseña sobre un terreno, fachada o espacio.",
    ejemploLibre: "Ej. una casa de 2 pisos estilo minimalista con cochera",
    opciones: [
      { id: "casa", label: "Construir casa", img: "/opciones/arquitectura-casa.jpg", texto: "Construye una casa habitación realista y a escala en el terreno." },
      { id: "edificio", label: "Edificio", img: "/opciones/arquitectura-edificio.jpg", texto: "Construye un edificio de varios niveles a escala." },
      { id: "barda", label: "Barda / cerca", img: "/opciones/arquitectura-barda.jpg", texto: "Construye una barda perimetral con acabado." },
      { id: "cochera", label: "Cochera", img: "/opciones/arquitectura-cochera.jpg", texto: "Agrega una cochera techada." },
      { id: "jardin", label: "Jardín / áreas verdes", img: "/opciones/arquitectura-jardin.jpg", texto: "Diseña un jardín con áreas verdes y caminos." },
      { id: "fachada", label: "Remodelar fachada", img: "/opciones/arquitectura-fachada.jpg", texto: "Remodela la fachada con un acabado moderno." },
    ],
  },
  {
    id: "moda",
    label: "Moda",
    emoji: "👔",
    portada: "/portadas/moda.jpg",
    desc: "Combina colores y estilos de ropa.",
    ejemploLibre: "Ej. ¿qué combina con esta playera roja?",
    opciones: [
      { id: "combinar", label: "Sugerir combinación", img: "/opciones/moda-combinar.jpg", texto: "Sugiere una combinación de ropa que quede bien con esta prenda y muéstrala puesta." },
      { id: "color", label: "Cambiar color", img: "/opciones/moda-color.jpg", texto: "Cambia el color de la prenda manteniéndola realista." },
      { id: "formal", label: "Estilo formal", img: "/opciones/moda-formal.jpg", texto: "Convierte el outfit en un look formal y elegante." },
      { id: "casual", label: "Estilo casual", img: "/opciones/moda-casual.jpg", texto: "Convierte el outfit en un look casual moderno." },
      { id: "accesorios", label: "Agregar accesorios", img: "/opciones/moda-accesorios.jpg", texto: "Agrega accesorios que combinen (gorra, lentes, reloj, etc.)." },
    ],
  },
  {
    id: "autos",
    label: "Autos",
    emoji: "🚗",
    portada: "/portadas/autos.jpg",
    desc: "Personaliza un vehículo desde su foto.",
    ejemploLibre: "Ej. rines deportivos negros de 20 pulgadas",
    opciones: [
      { id: "rines", label: "Cambiar rines", img: "/opciones/autos-rines.jpg", texto: "Cambia los rines por unos deportivos modernos." },
      { id: "color", label: "Cambiar color", img: "/opciones/autos-color.jpg", texto: "Cambia el color de la carrocería manteniéndolo realista." },
      { id: "llantas", label: "Llantas", img: "/opciones/autos-llantas.jpg", texto: "Coloca llantas nuevas de perfil bajo." },
      { id: "vinil", label: "Vinil / calcas", img: "/opciones/autos-vinil.jpg", texto: "Aplica un diseño de vinil deportivo en la carrocería." },
      { id: "bajar", label: "Bajar suspensión", img: "/opciones/autos-bajar.jpg", texto: "Baja la suspensión para un look más deportivo." },
      { id: "polarizado", label: "Polarizado", img: "/opciones/autos-polarizado.jpg", texto: "Polariza los vidrios." },
    ],
  },
];

// ====== INTERIORES: estilos con miniatura (experiencia tipo "AI Remodel") ======
type Estilo = { id: string; label: string; img: string; desc: string };
const ESTILOS: Estilo[] = [
  { id: "moderno", label: "Moderno", img: "/estilos/moderno.jpg", desc: "líneas limpias, muebles elegantes, tonos neutros con un acento de color" },
  { id: "minimalista", label: "Minimalista", img: "/estilos/minimalista.jpg", desc: "espacio despejado, pocos muebles, mucha luz, orden total" },
  { id: "industrial", label: "Industrial", img: "/estilos/industrial.jpg", desc: "ladrillo visto, metal negro, madera recuperada, lámparas colgantes" },
  { id: "japandi", label: "Japandi", img: "/estilos/japandi.jpg", desc: "fusión japonesa-escandinava, madera clara, tonos beige, muebles bajos, serenidad" },
  { id: "rustico", label: "Rústico", img: "/estilos/rustico.jpg", desc: "madera maciza, piedra, textiles cálidos, tonos tierra, acogedor" },
  { id: "bohemio", label: "Bohemio", img: "/estilos/bohemio.jpg", desc: "textiles coloridos, muchas plantas, tapetes tejidos, mimbre, ecléctico" },
  { id: "costero", label: "Costero", img: "/estilos/costero.jpg", desc: "blancos y azul claro, ratán, plantas tropicales, ambiente playero fresco" },
  { id: "clasico", label: "Clásico", img: "/estilos/clasico.jpg", desc: "molduras, muebles finos, tonos crema y dorado, elegancia tradicional" },
];

const HABITACIONES = [
  { id: "sala", label: "Sala" },
  { id: "cocina", label: "Cocina" },
  { id: "recamara", label: "Recámara" },
  { id: "bano", label: "Baño" },
  { id: "comedor", label: "Comedor" },
  { id: "oficina", label: "Oficina" },
  { id: "exterior", label: "Exterior / Patio" },
];

type Resultado = { estiloId: string; estiloLabel: string; url: string };

export default function DisenosPage() {
  const [categoria, setCategoriaState] = useState<Categoria | "interiores" | null>(null);

  // Resuelve una categoría desde su id (para leerla de la URL).
  function categoriaDesdeId(id: string | null): Categoria | "interiores" | null {
    if (!id) return null;
    if (id === "interiores") return "interiores";
    return CATEGORIAS.find((c) => c.id === id) ?? null;
  }

  // Entrar a una categoría también actualiza la URL (?cat=...) para que
  // la flecha de regresar del navegador funcione como espera el usuario.
  function setCategoria(c: Categoria | "interiores" | null) {
    setCategoriaState(c);
    if (typeof window === "undefined") return;
    if (c) {
      const id = c === "interiores" ? "interiores" : c.id;
      window.history.pushState({ cat: id }, "", `/disenos?cat=${id}`);
    } else {
      window.history.pushState({}, "", "/disenos");
    }
  }

  // Al cargar: restaurar categoría desde la URL. Y escuchar la flecha del
  // navegador (popstate) para regresar/avanzar entre selector y categoría.
  useEffect(() => {
    const leer = () => {
      const id = new URLSearchParams(window.location.search).get("cat");
      setCategoriaState(categoriaDesdeId(id));
    };
    leer();
    window.addEventListener("popstate", leer);
    return () => window.removeEventListener("popstate", leer);
  }, []);

  // ====== VISTA 1: SELECTOR DE CATEGORÍA ======
  if (!categoria) {
    return (
      <div className="space-y-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">
              Diseños con IA
            </h1>
            <p className="text-sm text-neutral-500 mt-1.5">
              Sube una foto y mira cómo quedaría con el diseño que quieras. Elige una categoría.
            </p>
          </div>
          <Creditos refresco={0} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 stagger">
          {/* Interiores primero (el estrella) */}
          <button
            type="button"
            onClick={() => setCategoria("interiores")}
            className="card group text-left relative overflow-hidden"
          >
            <div className="aspect-[16/10] bg-neutral-100 overflow-hidden">
              <img
                src="/estilos/moderno.jpg"
                alt="Interiores"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
            </div>
            <div className="p-4">
              <p className="font-semibold text-neutral-900">Interiores</p>
              <p className="text-sm text-neutral-500 mt-0.5">Remodela un cuarto con estilos listos.</p>
            </div>
            <span className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wider bg-neutral-900 text-white px-2 py-0.5 rounded-full">
              Nuevo
            </span>
          </button>
          {CATEGORIAS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategoria(c)}
              className="card group text-left overflow-hidden"
            >
              <div className="aspect-[16/10] bg-neutral-100 overflow-hidden">
                <img
                  src={c.portada}
                  alt={c.label}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              </div>
              <div className="p-4">
                <p className="font-semibold text-neutral-900">{c.label}</p>
                <p className="text-sm text-neutral-500 mt-0.5">{c.desc}</p>
              </div>
            </button>
          ))}
        </div>
        <Calculator />
      </div>
    );
  }

  if (categoria === "interiores") {
    return <Interiores onVolver={() => setCategoria(null)} />;
  }

  return <CategoriaSimple categoria={categoria} onVolver={() => setCategoria(null)} />;
}

// ============================================================
//  INTERIORES — grilla de estilos + comparador (tipo AI Remodel)
// ============================================================
function Interiores({ onVolver }: { onVolver: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);

  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [fotoBase64, setFotoBase64] = useState<string | null>(null);
  const [fotoMime, setFotoMime] = useState<string | null>(null);

  const [habitacion, setHabitacion] = useState("sala");
  const [intensidad, setIntensidad] = useState<"ligero" | "total">("total");
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());

  const [generando, setGenerando] = useState(false);
  const [progreso, setProgreso] = useState("");
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [comparar, setComparar] = useState<Resultado | null>(null);
  const [refrescoCreditos, setRefrescoCreditos] = useState(0);

  // Video / postal antes→después
  const [videoModal, setVideoModal] = useState<Resultado | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoExt, setVideoExt] = useState<"webm" | "mp4">("webm");
  const [postalUrl, setPostalUrl] = useState<string | null>(null);
  const [videoProg, setVideoProg] = useState(0);
  const [videoError, setVideoError] = useState<string | null>(null);

  function cerrarVideo() {
    // Liberar el object URL para no acumular memoria entre videos
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoModal(null);
    setVideoUrl(null);
    setPostalUrl(null);
    setVideoError(null);
  }

  async function abrirVideo(r: Resultado) {
    if (!fotoPreview) return;
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoModal(r);
    setVideoUrl(null);
    setPostalUrl(null);
    setVideoError(null);
    setVideoProg(0);
    try {
      if (soportaVideo()) {
        const blob = await crearVideoTransicion(fotoPreview, r.url, (p) => setVideoProg(p));
        setVideoExt(blob.type.includes("mp4") ? "mp4" : "webm");
        setVideoUrl(URL.createObjectURL(blob));
      } else {
        // Respaldo: postal (imagen) para celulares que no graban video
        const postal = await crearPostal(fotoPreview, r.url);
        setPostalUrl(postal);
      }
    } catch (e: any) {
      // Si algo falla en el video, intentamos la postal
      try {
        const postal = await crearPostal(fotoPreview, r.url);
        setPostalUrl(postal);
      } catch {
        setVideoError("No se pudo crear el video en este dispositivo.");
      }
    }
  }

  function elegirFoto(file: File | null) {
    if (!file) return;
    setError(null);
    setResultados([]);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setFotoPreview(dataUrl);
      const [head, b64] = dataUrl.split(",");
      const mime = head.match(/data:(.*?);/)?.[1] ?? file.type ?? "image/jpeg";
      setFotoBase64(b64);
      setFotoMime(mime);
    };
    reader.readAsDataURL(file);
  }

  function toggleEstilo(id: string) {
    const next = new Set(seleccion);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSeleccion(next);
  }

  function instruccionDe(estilo: Estilo): string {
    const hab = HABITACIONES.find((h) => h.id === habitacion)?.label ?? "espacio";
    const intens =
      intensidad === "ligero"
        ? "Haz un cambio moderado: conserva la mayoría de los muebles pero mejora acabados, colores y decoración."
        : "Haz una remodelación completa: cambia muebles, acabados, pisos, colores y decoración por completo.";
    return [
      `Remodela este/a ${hab} en estilo ${estilo.label} (${estilo.desc}).`,
      intens,
      "IMPORTANTE: conserva EXACTAMENTE la estructura del espacio — las paredes, ventanas, puertas, el tamaño del cuarto y la perspectiva de la foto. Solo cambia la decoración y los acabados. El resultado debe verse fotorrealista, como una foto de revista de diseño de interiores.",
    ].join(" ");
  }

  async function generarUno(estilo: Estilo): Promise<Resultado | null> {
    const resp = await fetch("/api/disenos/generar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imagenBase64: fotoBase64,
        mimeType: fotoMime,
        instruccion: instruccionDe(estilo),
        categoria: "interiores",
      }),
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error ?? "Error generando");
    return {
      estiloId: estilo.id,
      estiloLabel: estilo.label,
      url: `data:${data.mimeType};base64,${data.imagenBase64}`,
    };
  }

  async function creditosDisponibles(): Promise<number> {
    try {
      const r = await fetch("/api/disenos/creditos").then((x) => x.json());
      return typeof r.restantes === "number" ? r.restantes : 0;
    } catch {
      return 0;
    }
  }

  async function generar() {
    if (!fotoBase64) {
      setError("Primero sube la foto del cuarto.");
      return;
    }
    if (seleccion.size === 0) {
      setError("Elige al menos un estilo.");
      return;
    }
    const estilos = ESTILOS.filter((e) => seleccion.has(e.id));
    // Aviso si pide más estilos que créditos disponibles.
    const disp = await creditosDisponibles();
    if (disp <= 0) {
      setError("Se acabaron tus imágenes disponibles. Contacta al administrador para recargar.");
      return;
    }
    if (estilos.length > disp) {
      setError(`Solo te quedan ${disp} imagen(es) y elegiste ${estilos.length} estilos. Genera menos o pide recarga.`);
      return;
    }
    setGenerando(true);
    setError(null);
    setResultados([]);
    const acumulado: Resultado[] = [];
    try {
      // Generamos uno por uno para ir mostrando avance (y no saturar la API).
      for (let i = 0; i < estilos.length; i++) {
        setProgreso(`Generando estilo ${i + 1} de ${estilos.length}: ${estilos[i].label}…`);
        const r = await generarUno(estilos[i]);
        if (r) {
          acumulado.push(r);
          setResultados([...acumulado]);
        }
      }
    } catch (e: any) {
      setError(e?.message ?? "No se pudo generar.");
    } finally {
      setGenerando(false);
      setProgreso("");
      setRefrescoCreditos((n) => n + 1);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <button onClick={onVolver} className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors">
            ← Categorías
          </button>
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-900 mt-3">
            🛋️ Remodelar interiores
          </h1>
          <p className="text-sm text-neutral-500 mt-1.5">
            Sube la foto de un cuarto, elige uno o varios estilos, y mira cómo quedaría remodelado.
          </p>
        </div>
        <Creditos refresco={refrescoCreditos} />
      </div>

      {/* PASO 1: FOTO */}
      <section className="card">
        <div className="card-body">
          <h2 className="text-base font-semibold text-neutral-900 mb-1">1. Sube la foto del cuarto</h2>
          <p className="text-sm text-neutral-500 mb-4">La foto del espacio como está ahorita.</p>
          {!fotoPreview ? (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="w-full rounded-xl border-2 border-dashed border-neutral-300 py-12 flex flex-col items-center gap-2 hover:border-neutral-900 hover:bg-neutral-50 transition-colors"
            >
              <span className="text-3xl">📷</span>
              <span className="text-sm font-medium text-neutral-700">Tomar foto o subir de galería</span>
            </button>
          ) : (
            <div className="space-y-3">
              <div className="rounded-xl overflow-hidden border border-neutral-200 bg-neutral-100">
                <img src={fotoPreview} alt="Cuarto" className="w-full max-h-80 object-contain" />
              </div>
              <button onClick={() => inputRef.current?.click()} className="btn-secondary text-sm">
                Cambiar foto
              </button>
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              elegirFoto(e.target.files?.[0] ?? null);
              e.target.value = "";
            }}
          />
        </div>
      </section>

      {/* PASO 2: TIPO + INTENSIDAD */}
      <section className="card">
        <div className="card-body space-y-5">
          <div>
            <h2 className="text-base font-semibold text-neutral-900 mb-3">2. ¿Qué espacio es?</h2>
            <div className="flex flex-wrap gap-2">
              {HABITACIONES.map((h) => (
                <button
                  key={h.id}
                  onClick={() => setHabitacion(h.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    habitacion === h.id
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-neutral-200 text-neutral-700 hover:border-neutral-400"
                  }`}
                >
                  {h.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-700 mb-2">Nivel de cambio</p>
            <div className="flex gap-2">
              <button
                onClick={() => setIntensidad("ligero")}
                className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-medium border text-left transition-colors ${
                  intensidad === "ligero" ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 text-neutral-700"
                }`}
              >
                🪄 Retoque ligero
                <span className={`block text-xs mt-0.5 ${intensidad === "ligero" ? "text-neutral-300" : "text-neutral-500"}`}>
                  Mejora sin cambiar todo
                </span>
              </button>
              <button
                onClick={() => setIntensidad("total")}
                className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-medium border text-left transition-colors ${
                  intensidad === "total" ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 text-neutral-700"
                }`}
              >
                ✨ Remodelación total
                <span className={`block text-xs mt-0.5 ${intensidad === "total" ? "text-neutral-300" : "text-neutral-500"}`}>
                  Cambia todo el look
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* PASO 3: ESTILOS (grilla con miniaturas) */}
      <section className="card">
        <div className="card-body">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-base font-semibold text-neutral-900">3. Elige el estilo</h2>
            {seleccion.size > 0 && (
              <span className="text-xs font-medium text-neutral-500">{seleccion.size} seleccionado(s)</span>
            )}
          </div>
          <p className="text-sm text-neutral-500 mb-4">
            Puedes elegir varios y te genera una versión de cada uno.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {ESTILOS.map((e) => {
              const activo = seleccion.has(e.id);
              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => toggleEstilo(e.id)}
                  className={`relative rounded-xl overflow-hidden border-2 transition-all text-left ${
                    activo ? "border-neutral-900 ring-2 ring-neutral-900/10" : "border-transparent hover:border-neutral-300"
                  }`}
                >
                  <div className="aspect-square bg-neutral-100">
                    <img src={e.img} alt={e.label} className="w-full h-full object-cover" loading="lazy" />
                  </div>
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2.5 py-1.5">
                    <span className="text-white text-sm font-semibold">{e.label}</span>
                  </div>
                  {activo && (
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-neutral-900 text-white flex items-center justify-center text-xs font-bold">
                      ✓
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* GENERAR */}
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={generar} disabled={generando} className="btn-primary">
          {generando ? "Generando…" : `✨ Remodelar${seleccion.size > 1 ? ` (${seleccion.size} estilos)` : ""}`}
        </button>
        {(fotoPreview || resultados.length > 0) && !generando && (
          <button
            onClick={() => {
              setFotoPreview(null); setFotoBase64(null); setFotoMime(null);
              setSeleccion(new Set()); setResultados([]); setError(null);
            }}
            className="btn-secondary"
          >
            Empezar de nuevo
          </button>
        )}
      </div>

      {generando && (
        <div className="rounded-lg bg-neutral-50 border border-neutral-200 px-4 py-4 text-sm text-neutral-700 flex items-center gap-3">
          <span className="inline-block w-4 h-4 border-2 border-neutral-300 border-t-neutral-900 rounded-full animate-spin" />
          {progreso || "Generando…"}
        </div>
      )}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* RESULTADOS */}
      {resultados.length > 0 && (
        <section className="card">
          <div className="card-body">
            <h2 className="text-base font-semibold text-neutral-900 mb-4">Resultados</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {resultados.map((r) => (
                <div key={r.estiloId} className="rounded-xl overflow-hidden border border-neutral-200">
                  <div className="aspect-video bg-neutral-100">
                    <img src={r.url} alt={r.estiloLabel} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex items-center justify-between px-3 py-2 flex-wrap gap-2">
                    <span className="text-sm font-semibold text-neutral-900">{r.estiloLabel}</span>
                    <div className="flex gap-2.5">
                      <button onClick={() => abrirVideo(r)} className="text-xs font-medium text-neutral-900 hover:underline">
                        🎬 Video
                      </button>
                      <button onClick={() => setComparar(r)} className="text-xs font-medium text-neutral-700 hover:text-neutral-900">
                        ⇄ Comparar
                      </button>
                      <a href={r.url} download={`interior-${r.estiloId}.png`} className="text-xs font-medium text-neutral-700 hover:text-neutral-900">
                        ⬇️ Descargar
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-neutral-400 mt-3">
              Imágenes generadas con inteligencia artificial. Son una representación, no una foto real.
            </p>
          </div>
        </section>
      )}

      {/* COMPARADOR ANTES/DESPUÉS con slider */}
      {comparar && fotoPreview && (
        <Comparador
          antes={fotoPreview}
          despues={comparar.url}
          titulo={comparar.estiloLabel}
          onClose={() => setComparar(null)}
        />
      )}

      {/* VIDEO / POSTAL antes→después */}
      {videoModal && (
        <div
          className="fixed inset-0 z-50 bg-neutral-900/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-up"
          onClick={cerrarVideo}
        >
          <div className="bg-white rounded-2xl shadow-pop w-full max-w-lg overflow-hidden animate-pop-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-200">
              <h3 className="text-base font-semibold text-neutral-900">🎬 Video · {videoModal.estiloLabel}</h3>
              <button onClick={cerrarVideo} className="text-neutral-400 hover:text-neutral-900 text-lg">✕</button>
            </div>
            <div className="p-5">
              {videoError ? (
                <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{videoError}</p>
              ) : videoUrl ? (
                <div className="space-y-3">
                  <video src={videoUrl} controls autoPlay loop playsInline className="w-full rounded-xl border border-neutral-200 bg-black" />
                  <a href={videoUrl} download={`transformacion-${videoModal.estiloId}.${videoExt}`} className="btn-primary w-full">
                    ⬇️ Descargar video
                  </a>
                  <p className="text-xs text-neutral-400 text-center">
                    Se descarga como video. Puedes mandarlo por WhatsApp para enseñarle al cliente.
                  </p>
                </div>
              ) : postalUrl ? (
                <div className="space-y-3">
                  <img src={postalUrl} alt="Antes y después" className="w-full rounded-xl border border-neutral-200" />
                  <a href={postalUrl} download={`transformacion-${videoModal.estiloId}.jpg`} className="btn-primary w-full">
                    ⬇️ Descargar imagen
                  </a>
                  <p className="text-xs text-neutral-400 text-center">
                    Tu dispositivo no graba video, así que hicimos una imagen antes/después lista para compartir.
                  </p>
                </div>
              ) : (
                <div className="py-10 flex flex-col items-center gap-3">
                  <span className="inline-block w-6 h-6 border-2 border-neutral-300 border-t-neutral-900 rounded-full animate-spin" />
                  <p className="text-sm text-neutral-600">Creando el video… {Math.round(videoProg * 100)}%</p>
                  <p className="text-xs text-neutral-400">No cambies de pestaña mientras se crea (son ~6 segundos).</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <Calculator />
    </div>
  );
}

// Comparador antes/después con slider deslizante (modal)
function Comparador({
  antes,
  despues,
  titulo,
  onClose,
}: {
  antes: string;
  despues: string;
  titulo: string;
  onClose: () => void;
}) {
  const [pos, setPos] = useState(50);
  const ref = useRef<HTMLDivElement>(null);

  function mover(clientX: number) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.max(0, Math.min(100, pct)));
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-neutral-900/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-up"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-pop w-full max-w-2xl overflow-hidden animate-pop-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-200">
          <h3 className="text-base font-semibold text-neutral-900">Antes / Después · {titulo}</h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-900 text-lg">✕</button>
        </div>
        <div
          ref={ref}
          className="relative select-none cursor-ew-resize aspect-video bg-neutral-100"
          onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); mover(e.clientX); }}
          onPointerMove={(e) => { if (e.buttons === 1) mover(e.clientX); }}
        >
          {/* Después (fondo completo) */}
          <img src={despues} alt="Después" className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
          {/* Antes (a tamaño completo, recortado con clip-path — sin deformarse) */}
          <img
            src={antes}
            alt="Antes"
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
          />
          <span className="absolute top-2 left-2 text-[10px] uppercase tracking-wider font-bold bg-white/90 text-neutral-900 px-2 py-0.5 rounded pointer-events-none">Antes</span>
          <span className="absolute top-2 right-2 text-[10px] uppercase tracking-wider font-bold bg-neutral-900/90 text-white px-2 py-0.5 rounded pointer-events-none">Después</span>
          {/* Línea del slider */}
          <div className="absolute inset-y-0 w-0.5 bg-white shadow pointer-events-none" style={{ left: `${pos}%` }}>
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white shadow-pop flex items-center justify-center text-neutral-900 text-xs font-bold">
              ⇄
            </div>
          </div>
        </div>
        <div className="px-5 py-3 flex justify-end gap-2">
          <a href={despues} download={`interior-${titulo}.png`} className="btn-primary text-sm">⬇️ Descargar</a>
          <button onClick={onClose} className="btn-secondary text-sm">Cerrar</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
//  UTILIDADES DE VIDEO / POSTAL "ANTES → DESPUÉS"
// ============================================================
function cargarImg(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => res(i);
    i.onerror = () => rej(new Error("No se pudo cargar la imagen"));
    i.src = src;
  });
}

// Formatos en orden de preferencia. Chrome/Android usan webm; Safari/iPad usan mp4.
const MIMES_VIDEO = ["video/webm;codecs=vp9", "video/webm", "video/mp4"];

function mimeVideoSoportado(): string | null {
  if (typeof window.MediaRecorder !== "function") return null;
  const c = document.createElement("canvas");
  if (typeof (c as any).captureStream !== "function") return null;
  for (const m of MIMES_VIDEO) {
    if (MediaRecorder.isTypeSupported(m)) return m;
  }
  return null;
}

function soportaVideo(): boolean {
  return mimeVideoSoportado() !== null;
}

// Dibuja una imagen cubriendo todo el canvas (object-cover), centrada.
function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number) {
  const s = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const dw = img.naturalWidth * s;
  const dh = img.naturalHeight * s;
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

function etiqueta(ctx: CanvasRenderingContext2D, txt: string, lado: "left" | "right", w: number, h: number) {
  const fs = Math.round(h * 0.05);
  ctx.font = `bold ${fs}px sans-serif`;
  const tw = ctx.measureText(txt).width;
  const padX = h * 0.035;
  const bx = lado === "left" ? padX : w - tw - padX - h * 0.03;
  const by = h * 0.035;
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(bx - h * 0.018, by - h * 0.008, tw + h * 0.036, fs + h * 0.022);
  ctx.fillStyle = "#fff";
  ctx.textBaseline = "top";
  ctx.fillText(txt, bx, by + h * 0.006);
}

// Genera un video webm de transición antes→después (wipe). Devuelve Blob.
async function crearVideoTransicion(
  antesSrc: string,
  despuesSrc: string,
  onProgress?: (p: number) => void,
): Promise<Blob> {
  const [a, b] = await Promise.all([cargarImg(antesSrc), cargarImg(despuesSrc)]);
  let w = b.naturalWidth || 1280;
  let h = b.naturalHeight || 720;
  const max = 1280;
  if (w > max) { h = Math.round((h * max) / w); w = max; }
  w -= w % 2; h -= h % 2; // dimensiones pares para el codec

  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const stream = (canvas as any).captureStream(30);
  const mime = mimeVideoSoportado();
  if (!mime) throw new Error("Este dispositivo no soporta grabar video.");
  const tipoBase = mime.split(";")[0]; // "video/webm" o "video/mp4"
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 4_000_000 });
  const chunks: BlobPart[] = [];
  rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  const done = new Promise<Blob>((res) => { rec.onstop = () => res(new Blob(chunks, { type: tipoBase })); });
  rec.start();

  const T_A = 1.1, T_W = 2.0, T_D = 2.2, total = T_A + T_W + T_D;
  const start = performance.now();
  await new Promise<void>((resolve, reject) => {
    // Si la pestaña se oculta, requestAnimationFrame se congela: tope de 30s
    // para que el flujo caiga al respaldo (postal) en vez de girar por siempre.
    const tope = setTimeout(() => reject(new Error("Tiempo agotado creando el video.")), 30_000);
    const resolverOk = () => { clearTimeout(tope); resolve(); };
    function frame(now: number) {
      const t = (now - start) / 1000;
      ctx.clearRect(0, 0, w, h);
      if (t < T_A) {
        drawCover(ctx, a, w, h);
        etiqueta(ctx, "ANTES", "left", w, h);
      } else if (t < T_A + T_W) {
        const p = (t - T_A) / T_W;
        const x = p * w;
        drawCover(ctx, a, w, h); // antes de fondo
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, x, h);
        ctx.clip();
        drawCover(ctx, b, w, h); // después revelándose de izq. a der.
        ctx.restore();
        ctx.fillStyle = "#fff";
        ctx.fillRect(x - 3, 0, 6, h);
      } else {
        drawCover(ctx, b, w, h);
        etiqueta(ctx, "DESPUÉS", "right", w, h);
      }
      onProgress?.(Math.min(1, t / total));
      if (t >= total) { resolverOk(); return; }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });
  rec.stop();
  return done;
}

// Respaldo universal (funciona en cualquier celular): una imagen JPG con el
// antes y el después lado a lado. Devuelve dataURL.
async function crearPostal(antesSrc: string, despuesSrc: string): Promise<string> {
  const [a, b] = await Promise.all([cargarImg(antesSrc), cargarImg(despuesSrc)]);
  const cellH = 720;
  const cellW = Math.round((b.naturalWidth / b.naturalHeight) * cellH) || 960;
  const w = cellW * 2 + 12;
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = cellH;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, cellH);
  drawCover2(ctx, a, 0, 0, cellW, cellH);
  drawCover2(ctx, b, cellW + 12, 0, cellW, cellH);
  etiqueta(ctx, "ANTES", "left", cellW, cellH);
  ctx.save();
  ctx.translate(cellW + 12, 0);
  etiqueta(ctx, "DESPUÉS", "right", cellW, cellH);
  ctx.restore();
  return canvas.toDataURL("image/jpeg", 0.9);
}
function drawCover2(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const s = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const dw = img.naturalWidth * s, dh = img.naturalHeight * s;
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  ctx.restore();
}

// ============================================================
//  CATEGORÍA SIMPLE — chips + campo libre (carretera, arquitectura, moda, autos)
// ============================================================
function CategoriaSimple({ categoria, onVolver }: { categoria: Categoria; onVolver: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [fotoBase64, setFotoBase64] = useState<string | null>(null);
  const [fotoMime, setFotoMime] = useState<string | null>(null);
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [extra, setExtra] = useState("");
  const [generando, setGenerando] = useState(false);
  const [resultado, setResultado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refrescoCreditos, setRefrescoCreditos] = useState(0);

  function elegirFoto(file: File | null) {
    if (!file) return;
    setError(null);
    setResultado(null);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setFotoPreview(dataUrl);
      const [head, b64] = dataUrl.split(",");
      const mime = head.match(/data:(.*?);/)?.[1] ?? file.type ?? "image/jpeg";
      setFotoBase64(b64);
      setFotoMime(mime);
    };
    reader.readAsDataURL(file);
  }
  function toggleOpcion(id: string) {
    const next = new Set(seleccion);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSeleccion(next);
  }
  function construirInstruccion(): string {
    const partes = categoria.opciones.filter((o) => seleccion.has(o.id)).map((o) => "- " + o.texto);
    if (extra.trim()) partes.push("- " + extra.trim());
    return partes.join("\n");
  }
  async function generar() {
    if (!fotoBase64 || !fotoMime) { setError("Primero sube una foto."); return; }
    const instruccion = construirInstruccion();
    if (!instruccion) { setError("Elige al menos una opción (o escríbela abajo)."); return; }
    setGenerando(true); setError(null); setResultado(null);
    try {
      const resp = await fetch("/api/disenos/generar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imagenBase64: fotoBase64, mimeType: fotoMime, instruccion, categoria: categoria.id }),
      });
      const data = await resp.json();
      if (!resp.ok) { setError(data.error ?? "No se pudo generar."); return; }
      setResultado(`data:${data.mimeType};base64,${data.imagenBase64}`);
    } catch (e: any) {
      setError("Error de conexión: " + (e?.message ?? ""));
    } finally {
      setGenerando(false);
      setRefrescoCreditos((n) => n + 1);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <button onClick={onVolver} className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors">
            ← Categorías
          </button>
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-900 mt-3">
            {categoria.emoji} {categoria.label}
          </h1>
          <p className="text-sm text-neutral-500 mt-1.5">{categoria.desc}</p>
        </div>
        <Creditos refresco={refrescoCreditos} />
      </div>

      <section className="card">
        <div className="card-body">
          <h2 className="text-base font-semibold text-neutral-900 mb-1">1. Sube la foto</h2>
          <p className="text-sm text-neutral-500 mb-4">La foto real de cómo está ahorita.</p>
          {!fotoPreview ? (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="w-full rounded-xl border-2 border-dashed border-neutral-300 py-12 flex flex-col items-center gap-2 hover:border-neutral-900 hover:bg-neutral-50 transition-colors"
            >
              <span className="text-3xl">📷</span>
              <span className="text-sm font-medium text-neutral-700">Tomar foto o subir de galería</span>
            </button>
          ) : (
            <div className="space-y-3">
              <div className="rounded-xl overflow-hidden border border-neutral-200 bg-neutral-100">
                <img src={fotoPreview} alt="Foto" className="w-full max-h-80 object-contain" />
              </div>
              <button onClick={() => inputRef.current?.click()} className="btn-secondary text-sm">Cambiar foto</button>
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { elegirFoto(e.target.files?.[0] ?? null); e.target.value = ""; }}
          />
        </div>
      </section>

      <section className="card">
        <div className="card-body">
          <h2 className="text-base font-semibold text-neutral-900 mb-1">2. ¿Qué le aplicamos?</h2>
          <p className="text-sm text-neutral-500 mb-4">Marca lo que quieras. La IA conserva el resto de la foto igual.</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {categoria.opciones.map((o) => {
              const activo = seleccion.has(o.id);
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => toggleOpcion(o.id)}
                  className={`relative rounded-xl overflow-hidden border-2 transition-all text-left ${
                    activo ? "border-neutral-900 ring-2 ring-neutral-900/10" : "border-transparent hover:border-neutral-300"
                  }`}
                >
                  <div className="aspect-square bg-neutral-100">
                    <img src={o.img} alt={o.label} className="w-full h-full object-cover" loading="lazy" />
                  </div>
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2.5 py-1.5">
                    <span className="text-white text-sm font-semibold">{o.label}</span>
                  </div>
                  {activo && (
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-neutral-900 text-white flex items-center justify-center text-xs font-bold">
                      ✓
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          <div className="mt-4">
            <label className="label">Descríbelo con tus palabras (opcional)</label>
            <input className="input" value={extra} onChange={(e) => setExtra(e.target.value)} placeholder={categoria.ejemploLibre} />
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button onClick={generar} disabled={generando} className="btn-primary">
          {generando ? "Generando… (10-20 seg)" : "✨ Generar diseño"}
        </button>
        {(fotoPreview || resultado) && (
          <button
            onClick={() => { setFotoPreview(null); setFotoBase64(null); setFotoMime(null); setSeleccion(new Set()); setExtra(""); setResultado(null); setError(null); }}
            className="btn-secondary"
          >
            Limpiar
          </button>
        )}
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}

      {resultado && (
        <section className="card">
          <div className="card-body">
            <h2 className="text-base font-semibold text-neutral-900 mb-4">Resultado</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs uppercase tracking-wider font-semibold text-neutral-500 mb-2">Antes</p>
                <div className="rounded-xl overflow-hidden border border-neutral-200 bg-neutral-100">
                  <img src={fotoPreview!} alt="Antes" className="w-full object-contain" />
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider font-semibold text-neutral-900 mb-2">Después (IA)</p>
                <div className="rounded-xl overflow-hidden border-2 border-neutral-900 bg-neutral-100">
                  <img src={resultado} alt="Después" className="w-full object-contain" />
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              <a href={resultado} download="diseno.png" className="btn-primary">⬇️ Descargar</a>
              <button onClick={generar} disabled={generando} className="btn-secondary">🔄 Generar otra versión</button>
            </div>
          </div>
        </section>
      )}

      <Calculator />
    </div>
  );
}

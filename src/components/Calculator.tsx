"use client";

import { useEffect, useRef, useState } from "react";

type Op = "+" | "-" | "*" | "/" | null;
type Pos = { x: number; y: number };

const STORAGE_KEY = "saladino_calc_pos_v1";

export default function Calculator() {
  const [open, setOpen] = useState(false);
  const [display, setDisplay] = useState("0");
  const [prev, setPrev] = useState<number | null>(null);
  const [op, setOp] = useState<Op>(null);
  const [waiting, setWaiting] = useState(false);

  // Posición arrastrable. Por default va abajo a la derecha (offset 0,0 desde su sitio inicial).
  const [pos, setPos] = useState<Pos>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragOrigin = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);

  // Carga la última posición guardada
  useEffect(() => {
    try {
      const saved = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
      if (saved) {
        const p = JSON.parse(saved);
        if (typeof p?.x === "number" && typeof p?.y === "number") setPos(p);
      }
    } catch {}
  }, []);

  // Guarda la posición cuando cambia
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
      }
    } catch {}
  }, [pos]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!open) return;
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      // Si el foco está en un input/textarea de la app, no captures las teclas
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if (/[0-9]/.test(e.key)) inputDigit(e.key);
      else if (e.key === ".") inputDot();
      else if (["+", "-", "*", "/"].includes(e.key)) inputOp(e.key as Op);
      else if (e.key === "Enter" || e.key === "=") equals();
      else if (e.key === "Backspace") backspace();
      else if (e.key === "Escape") clear();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function inputDigit(d: string) {
    if (waiting) {
      setDisplay(d);
      setWaiting(false);
    } else {
      setDisplay(display === "0" ? d : display + d);
    }
  }
  function inputDot() {
    if (waiting) {
      setDisplay("0.");
      setWaiting(false);
      return;
    }
    if (!display.includes(".")) setDisplay(display + ".");
  }
  function backspace() {
    if (waiting) return;
    setDisplay(display.length <= 1 ? "0" : display.slice(0, -1));
  }
  function clear() {
    setDisplay("0");
    setPrev(null);
    setOp(null);
    setWaiting(false);
  }
  function applyOp(a: number, b: number, o: Op): number {
    switch (o) {
      case "+": return a + b;
      case "-": return a - b;
      case "*": return a * b;
      case "/": return b === 0 ? NaN : a / b;
      default: return b;
    }
  }
  function inputOp(next: Op) {
    const cur = parseFloat(display);
    if (prev !== null && op && !waiting) {
      const r = applyOp(prev, cur, op);
      setPrev(r);
      setDisplay(formatNum(r));
    } else {
      setPrev(cur);
    }
    setOp(next);
    setWaiting(true);
  }
  function equals() {
    if (prev === null || op === null) return;
    const cur = parseFloat(display);
    const r = applyOp(prev, cur, op);
    setDisplay(formatNum(r));
    setPrev(null);
    setOp(null);
    setWaiting(true);
  }
  function copyResult() {
    navigator.clipboard?.writeText(display);
  }

  // === Drag handlers ===
  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    dragOrigin.current = {
      startX: e.clientX,
      startY: e.clientY,
      baseX: pos.x,
      baseY: pos.y,
    };
    setDragging(true);
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const o = dragOrigin.current;
    if (!o) return;
    const dx = e.clientX - o.startX;
    const dy = e.clientY - o.startY;
    setPos({ x: o.baseX + dx, y: o.baseY + dy });
  }
  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    dragOrigin.current = null;
    setDragging(false);
    try {
      (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
    } catch {}
    // Snap dentro del viewport por si quedó fuera
    if (typeof window !== "undefined") {
      const margin = 8;
      const w = window.innerWidth;
      const h = window.innerHeight;
      // La caja se posiciona con bottom: 96, right: 20, width 288 (w-72)
      // Con transform translate(x, y): x positivo la mueve a la derecha, y positivo abajo
      // Para que no salga: el rect actual debe quedar dentro [0, w] x [0, h]
      requestAnimationFrame(() => {
        const el = e.currentTarget?.parentElement; // el contenedor con position fixed
        if (!el) return;
        const r = el.getBoundingClientRect();
        let nx = pos.x;
        let ny = pos.y;
        if (r.left < margin) nx += margin - r.left;
        if (r.top < margin) ny += margin - r.top;
        if (r.right > w - margin) nx -= r.right - (w - margin);
        if (r.bottom > h - margin) ny -= r.bottom - (h - margin);
        if (nx !== pos.x || ny !== pos.y) setPos({ x: nx, y: ny });
      });
    }
  }
  function resetPos() {
    setPos({ x: 0, y: 0 });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="fixed bottom-5 right-5 z-30 w-14 h-14 rounded-full text-2xl shadow-glow-yellow flex items-center justify-center text-brand-ink animate-pulse-ring transition hover:scale-110"
        style={{ backgroundImage: "linear-gradient(135deg, #fde047 0%, #facc15 50%, #ef4444 100%)" }}
        title="Calculadora"
      >
        🧮
      </button>

      {open && (
        <div
          className={`fixed bottom-24 right-5 z-30 w-72 rounded-2xl border border-white/15 bg-slate-950 shadow-2xl ring-1 ring-yellow-300/20 ${dragging ? "" : "animate-pop-in transition-transform"}`}
          style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
        >
          {/* Drag handle (header) */}
          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onDoubleClick={resetPos}
            className={`flex justify-between items-center px-3 pt-3 pb-2 select-none ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
            style={{ touchAction: "none" }}
            title="Arrástrame · doble click para resetear"
          >
            <div className="flex items-center gap-2 pointer-events-none">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
                <circle cx="9" cy="6" r="1" />
                <circle cx="15" cy="6" r="1" />
                <circle cx="9" cy="12" r="1" />
                <circle cx="15" cy="12" r="1" />
                <circle cx="9" cy="18" r="1" />
                <circle cx="15" cy="18" r="1" />
              </svg>
              <span className="text-xs uppercase tracking-widest text-slate-200 font-semibold">Calculadora</span>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setOpen(false); }}
              onPointerDown={(e) => e.stopPropagation()}
              className="text-slate-300 hover:text-red-400 text-sm px-2"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>

          <div className="px-3 pb-3">
            <div
              className="bg-black border border-yellow-300/30 text-yellow-300 text-right text-3xl font-mono font-bold px-3 py-4 rounded-lg mb-3 truncate cursor-pointer select-all shadow-inner"
              onClick={copyResult}
              title="Click para copiar"
            >
              {display}
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              <Btn onClick={clear} kind="warn" span={2}>AC</Btn>
              <Btn onClick={backspace} kind="warn">⌫</Btn>
              <Btn onClick={() => inputOp("/")} kind="op">÷</Btn>
              <Btn onClick={() => inputDigit("7")}>7</Btn>
              <Btn onClick={() => inputDigit("8")}>8</Btn>
              <Btn onClick={() => inputDigit("9")}>9</Btn>
              <Btn onClick={() => inputOp("*")} kind="op">×</Btn>
              <Btn onClick={() => inputDigit("4")}>4</Btn>
              <Btn onClick={() => inputDigit("5")}>5</Btn>
              <Btn onClick={() => inputDigit("6")}>6</Btn>
              <Btn onClick={() => inputOp("-")} kind="op">−</Btn>
              <Btn onClick={() => inputDigit("1")}>1</Btn>
              <Btn onClick={() => inputDigit("2")}>2</Btn>
              <Btn onClick={() => inputDigit("3")}>3</Btn>
              <Btn onClick={() => inputOp("+")} kind="op">+</Btn>
              <Btn onClick={() => inputDigit("0")} span={2}>0</Btn>
              <Btn onClick={inputDot}>.</Btn>
              <Btn onClick={equals} kind="eq">=</Btn>
            </div>
            <p className="text-[10px] text-slate-300 mt-2 text-center">
              Arrastra desde la barra de arriba · doble tap = resetear
            </p>
          </div>
        </div>
      )}
    </>
  );
}

function Btn({
  children,
  onClick,
  kind = "num",
  span = 1,
}: {
  children: React.ReactNode;
  onClick: () => void;
  kind?: "num" | "op" | "warn" | "eq";
  span?: 1 | 2;
}) {
  const cls = {
    num: "bg-slate-700 hover:bg-slate-600 active:bg-slate-500 text-white border border-slate-600",
    op: "bg-gradient-to-br from-yellow-300 to-amber-500 hover:brightness-110 text-slate-900 shadow-glow-yellow font-bold",
    warn: "bg-gradient-to-br from-red-400 to-red-600 hover:brightness-110 text-white shadow-glow-red font-bold",
    eq: "bg-gradient-to-br from-blue-400 to-blue-700 hover:brightness-110 text-white shadow-glow-blue font-bold",
  }[kind];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${cls} ${span === 2 ? "col-span-2" : ""} h-12 rounded-lg text-lg transition`}
    >
      {children}
    </button>
  );
}

function formatNum(n: number): string {
  if (!Number.isFinite(n)) return "Error";
  // Quitar decimales innecesarios; máx 8 decimales
  return parseFloat(n.toFixed(8)).toString();
}

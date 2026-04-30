"use client";

import { useEffect, useRef, useState } from "react";

type Op = "+" | "-" | "*" | "/" | null;

export default function Calculator() {
  const [open, setOpen] = useState(false);
  const [display, setDisplay] = useState("0");
  const [prev, setPrev] = useState<number | null>(null);
  const [op, setOp] = useState<Op>(null);
  const [waiting, setWaiting] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!open) return;
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
          ref={ref}
          className="fixed bottom-24 right-5 z-30 w-72 rounded-2xl border border-white/15 bg-slate-950 shadow-2xl ring-1 ring-yellow-300/20 animate-pop-in"
        >
          <div className="p-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs uppercase tracking-widest text-slate-200 font-semibold">Calculadora</span>
              <button onClick={() => setOpen(false)} className="text-slate-300 hover:text-red-400 text-sm">✕</button>
            </div>
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
              Tip: usa el teclado · Enter para = · Esc para AC
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

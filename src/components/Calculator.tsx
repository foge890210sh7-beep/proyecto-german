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
        className="fixed bottom-5 right-5 z-30 w-14 h-14 rounded-full bg-brand text-white text-2xl shadow-lg hover:bg-brand-dark transition flex items-center justify-center"
        title="Calculadora"
      >
        🧮
      </button>

      {open && (
        <div
          ref={ref}
          className="fixed bottom-24 right-5 z-30 w-72 card shadow-xl"
        >
          <div className="card-body p-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-slate-500">Calculadora</span>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
            </div>
            <div
              className="bg-slate-900 text-white text-right text-2xl font-mono px-3 py-3 rounded-lg mb-2 truncate cursor-pointer select-all"
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
            <p className="text-[10px] text-slate-400 mt-2 text-center">
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
    num: "bg-slate-100 hover:bg-slate-200 text-slate-800",
    op: "bg-amber-500 hover:bg-amber-600 text-white",
    warn: "bg-slate-300 hover:bg-slate-400 text-slate-800",
    eq: "bg-emerald-600 hover:bg-emerald-700 text-white",
  }[kind];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${cls} ${span === 2 ? "col-span-2" : ""} h-10 rounded-lg text-sm font-semibold transition`}
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

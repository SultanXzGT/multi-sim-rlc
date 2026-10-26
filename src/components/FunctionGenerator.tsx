import { useEffect, useRef, useState } from "react";

interface Props {
  Vpp: number; f: number; power: boolean;
  setVpp: (v: number) => void; setF: (v: number) => void; setPower: (b: boolean) => void;
  fr: number;
}

export default function FunctionGenerator({ Vpp, f, power, setVpp, setF, setPower, fr }: Props) {
  const [mode, setMode] = useState<"freq" | "ampl">("freq");
  const [fStep, setFStep] = useState(1); // exponent
  const [aStep, setAStep] = useState(-1);
  const [angle, setAngle] = useState(0);
  const [entry, setEntry] = useState("");
  const drag = useRef<{ a: number; acc: number } | null>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const state = useRef({ f, Vpp, mode, fStep, aStep });
  state.current = { f, Vpp, mode, fStep, aStep };

  const bump = (dir: number) => {
    const s = state.current;
    if (s.mode === "freq") setF(Math.min(15e6, Math.max(0.001, +(s.f + dir * 10 ** s.fStep).toFixed(4))));
    else setVpp(Math.min(20, Math.max(0.05, +(s.Vpp + dir * 10 ** s.aStep).toFixed(3))));
    setAngle((a) => a + dir * 15);
  };

  const ang = (e: PointerEvent | React.PointerEvent) => {
    const r = knobRef.current!.getBoundingClientRect();
    return (Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180) / Math.PI;
  };

  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (!drag.current) return;
      const a = ang(e);
      let d = a - drag.current.a;
      if (d > 180) d -= 360;
      if (d < -180) d += 360;
      drag.current.a = a;
      drag.current.acc += d;
      while (drag.current.acc >= 15) { bump(1); drag.current.acc -= 15; }
      while (drag.current.acc <= -15) { bump(-1); drag.current.acc += 15; }
    };
    const up = () => (drag.current = null);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
  }, []);

  const display = !power ? "" : mode === "freq"
    ? f >= 1e6 ? `${(f / 1e6).toFixed(7)} MHz~` : f >= 1000 ? `${(f / 1000).toFixed(7)} kHz~` : `${f.toFixed(4)} Hz~`
    : `${Vpp.toFixed(3)} Vpp~`;

  const stepLabel = mode === "freq"
    ? (() => { const v = 10 ** fStep; return v >= 1000 ? `${v / 1000} kHz` : v >= 1 ? `${v} Hz` : `${v * 1000} mHz`; })()
    : (() => { const v = 10 ** aStep; return v >= 1 ? `${v} V` : `${v * 1000} mV`; })();

  const shiftStep = (d: number) => {
    if (mode === "freq") setFStep((s) => Math.min(6, Math.max(-3, s + d)));
    else setAStep((s) => Math.min(1, Math.max(-3, s + d)));
  };

  const applyEntry = () => {
    const v = parseFloat(entry.replace(",", "."));
    if (!isFinite(v) || v <= 0) return;
    if (mode === "freq") setF(Math.min(15e6, v)); else setVpp(Math.min(20, v));
    setEntry("");
  };

  const Key = ({ top, label, onClick, active, blue }: { top?: string; label: string; onClick?: () => void; active?: boolean; blue?: boolean }) => (
    <div className="flex flex-col items-center">
      <span className="h-3 text-[8px] text-blue-800">{top}</span>
      <button onClick={onClick} className={`h-6 w-11 rounded border text-[10px] font-semibold shadow ${active ? "border-green-600 bg-green-200" : blue ? "border-gray-500 bg-[#c7cfd8]" : "border-gray-500 bg-gradient-to-b from-white to-gray-300"} active:translate-y-px`}>{label}</button>
    </div>
  );

  return (
    <div className="w-full max-w-[560px] select-none rounded border border-gray-400 bg-white shadow-lg">
      <div className="flex items-center justify-between border-b px-2 py-0.5 text-xs text-gray-700">
        <span>Agilent function generator-XFG1</span><span>✕</span>
      </div>
      <div className="rounded-b bg-gradient-to-b from-[#2b2b2b] to-[#1a1a1a] p-3">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <div className="mb-1 flex items-center gap-2 text-[10px] text-gray-300">
              <span className="text-base text-white">✳</span><b className="text-white">Agilent</b>
              <span>33120A 15MHz Function / Arbitrary Waveform Generator</span>
            </div>
            <div className="flex h-16 items-center justify-center rounded border border-gray-700 bg-black">
              <span className="vfd text-2xl sm:text-4xl">{display}</span>
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-gray-400">
              <span>Mode: {mode === "freq" ? "FREQ" : "AMPL"} • Step: {stepLabel}</span>
              <span>Sine ∿</span>
            </div>
          </div>
          <div
            ref={knobRef}
            onPointerDown={(e) => { if (!power) return; drag.current = { a: ang(e), acc: 0 }; }}
            onWheel={(e) => { if (power) bump(e.deltaY < 0 ? 1 : -1); }}
            title="Putar (drag) atau scroll untuk mengubah nilai"
            className="relative h-20 w-20 shrink-0 cursor-grab rounded-full border-4 border-gray-500 bg-[radial-gradient(circle_at_35%_30%,#fff,#bbb_55%,#777)] shadow-inner active:cursor-grabbing"
            style={{ transform: `rotate(${angle}deg)`, touchAction: "none" }}
          >
            <div className="absolute left-1/2 top-1 h-4 w-1.5 -translate-x-1/2 rounded bg-gray-700" />
          </div>
        </div>

        <div className="mt-3 rounded bg-[#d9d4c7] p-2">
          <div className="flex items-end gap-2">
            <button onClick={() => setPower(!power)} className="flex flex-col items-center text-[9px]">
              <span className={`mb-0.5 h-2 w-2 rounded-full ${power ? "bg-green-500 shadow-[0_0_6px_#22c55e]" : "bg-gray-500"}`} />
              <span className="h-8 w-10 rounded border border-gray-600 bg-gradient-to-b from-white to-gray-300 pt-2 font-semibold shadow">Power</span>
            </button>
            <div className="grid flex-1 grid-cols-6 gap-1">
              <Key top="AM" label="∿" />
              <Key top="FM" label="⊓" />
              <Key top="FSK" label="◿" />
              <Key top="Burst" label="⟋" />
              <Key top="Sweep" label="Noise" />
              <Key top="Arb List" label="Arb" />
              <Key top="Freq" label="Freq" onClick={() => setMode("freq")} active={mode === "freq"} />
              <Key top="Ampl" label="Ampl" onClick={() => setMode("ampl")} active={mode === "ampl"} />
              <Key top="Offset" label="Offset" />
              <Key top="Recall" label="f = fr" onClick={() => { setMode("freq"); setF(+fr.toFixed(4)); }} blue />
              <Key top="Store" label="8 Vpp" onClick={() => { setMode("ampl"); setVpp(8); }} blue />
              <Key top="Enter" label="Shift" />
            </div>
            <div className="flex flex-col items-center gap-1">
              <button onClick={() => bump(1)} className="h-5 w-7 rounded border border-gray-500 bg-gray-100 text-[10px]">▲</button>
              <div className="flex gap-1">
                <button onClick={() => shiftStep(1)} title="Digit lebih besar" className="h-5 w-7 rounded border border-gray-500 bg-gray-100 text-[10px]">◀</button>
                <button onClick={() => shiftStep(-1)} title="Digit lebih kecil" className="h-5 w-7 rounded border border-gray-500 bg-gray-100 text-[10px]">▶</button>
              </div>
              <button onClick={() => bump(-1)} className="h-5 w-7 rounded border border-gray-500 bg-gray-100 text-[10px]">▼</button>
            </div>
            <div className="hidden flex-col items-center text-[8px] text-gray-700 sm:flex">
              <span>SYNC</span><span className="h-7 w-7 rounded-full border-4 border-gray-500 bg-gray-300" />
              <span className="mt-1">OUTPUT</span><span className="h-7 w-7 rounded-full border-4 border-gray-500 bg-gray-300" />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2 text-[11px]">
            <span className="font-semibold text-gray-700">Enter Number:</span>
            <input
              value={entry} onChange={(e) => setEntry(e.target.value)} onKeyDown={(e) => e.key === "Enter" && applyEntry()}
              placeholder={mode === "freq" ? "frekuensi (Hz)" : "amplitudo (Vpp)"}
              className="w-32 rounded border border-gray-500 bg-white px-1 py-0.5"
            />
            <button onClick={applyEntry} className="rounded border border-gray-600 bg-gray-100 px-2 py-0.5 font-semibold">Enter</button>
          </div>
        </div>
      </div>
    </div>
  );
}

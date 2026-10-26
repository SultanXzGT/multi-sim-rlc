import { useState } from "react";
import { fmt } from "../lib/circuit";

interface Props { name: string; value: number; kind: "V" | "A"; label?: string; highlight?: boolean; }

export default function Multimeter({ name, value, kind, label, highlight }: Props) {
  const [fn, setFn] = useState<"A" | "V" | "Ω" | "dB">(kind);
  const [ac, setAc] = useState(true);

  let text: string;
  if (fn === kind) text = ac ? fmt(value, kind) : fmt(0, kind);
  else if (fn === "dB" && kind === "V") text = ac ? (20 * Math.log10(value / 0.774597)).toFixed(3) + " dB" : "-∞ dB";
  else text = "- - - -";

  const Btn = ({ k }: { k: "A" | "V" | "Ω" | "dB" }) => (
    <button
      onClick={() => setFn(k)}
      className={`h-6 w-9 rounded-sm border text-xs font-semibold shadow-sm ${fn === k ? "border-blue-500 bg-blue-100 text-blue-800" : "border-gray-400 bg-gradient-to-b from-white to-gray-200 text-gray-700"}`}
    >{k}</button>
  );

  return (
    <div className={`w-full select-none rounded border bg-[#f0f0f0] shadow-md ${highlight ? "border-red-500 ring-2 ring-red-300" : "border-gray-400"}`}>
      <div className="flex items-center justify-between border-b border-gray-300 bg-white px-2 py-0.5 text-[11px] text-gray-600">
        <span>Multimeter-{name}</span><span className="text-gray-400">✕</span>
      </div>
      <div className="p-2">
        <div className="lcd mb-2 rounded-sm bg-black px-2 py-1 text-center text-lg tracking-wide text-white">{text}</div>
        <div className="mb-1.5 flex justify-center gap-1"><Btn k="A" /><Btn k="V" /><Btn k="Ω" /><Btn k="dB" /></div>
        <div className="mb-1.5 flex justify-center gap-1">
          <button onClick={() => setAc(true)} className={`h-6 w-16 rounded-sm border text-sm ${ac ? "border-blue-500 bg-blue-100" : "border-gray-400 bg-gray-100"}`}>∿</button>
          <button onClick={() => setAc(false)} className={`h-6 w-16 rounded-sm border text-sm ${!ac ? "border-blue-500 bg-blue-100" : "border-gray-400 bg-gray-100"}`}>━</button>
        </div>
        <div className="flex items-center justify-between text-[10px] text-gray-500">
          <span>+ ○</span><span className="truncate px-1 text-[10px] font-medium text-gray-700">{label}</span><span>○ −</span>
        </div>
      </div>
    </div>
  );
}

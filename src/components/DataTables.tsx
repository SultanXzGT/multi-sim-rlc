import type { ReactNode } from "react";
import { idn, parallelCalc, pl, seriesCalc, type Mode } from "../lib/circuit";

/** Urutan frekuensi sesuai labsheet. Baris "fr" = frekuensi resonansi (baris "#" di lembar). */
export const FREQS: (number | "fr")[] = [500, 750, 1000, 2000, 2500, "fr", 3500, 4000, 4500, 5000, 5500, 6000];
export const freqAt = (i: number, fr: number) => {
  const x = FREQS[i];
  return x === "fr" ? fr : x;
};

export interface Base { R: number; L: number; C: number; Vpp: number; }
export type Cell = [number, string];
/** Hasil satu baris tabel (disimpan saat diukur) */
export interface Snap { f: number; m: Cell[]; c: Cell[]; }

type Head = [ReactNode, string];
const sub = (a: string, b: string) => <>{a}<sub>{b}</sub></>;

const HEADS: Record<Mode, { m: Head[]; c: Head[]; csv: string[] }> = {
  seri: {
    m: [[sub("V", "S"), "(rms)"], ["I", "(A)"], [sub("V", "R"), "(rms)"], [sub("V", "L"), "(rms)"], [sub("V", "C"), "(rms)"], [sub("V", "CL"), "(rms)"]],
    c: [[sub("X", "L"), "(Ω)"], [sub("X", "C"), "(Ω)"], ["Z", "(Ω)"], ["I", "(A)"], [sub("V", "R"), "(rms)"], [sub("V", "L"), "(rms)"], [sub("V", "C"), "(rms)"], [sub("V", "CL"), "(rms)"]],
    csv: ["VS(V)", "I(A)", "VR(V)", "VL(V)", "VC(V)", "VCL(V)", "XL(ohm)", "XC(ohm)", "Z(ohm)", "I_hit(A)", "VR_hit(V)", "VL_hit(V)", "VC_hit(V)", "VCL_hit(V)"],
  },
  paralel: {
    m: [[sub("V", "S"), "(rms)"], [sub("I", "tot"), "(A)"], [sub("I", "R"), "(A)"], [sub("I", "L"), "(A)"], [sub("I", "C"), "(A)"], [sub("I", "CL"), "(A)"]],
    c: [[sub("X", "L"), "(Ω)"], [sub("X", "C"), "(Ω)"], ["Z", "(Ω)"], [sub("I", "tot"), "(A)"], [sub("I", "R"), "(A)"], [sub("I", "L"), "(A)"], [sub("I", "C"), "(A)"], [sub("I", "CL"), "(A)"]],
    csv: ["VS(V)", "Itot(A)", "IR(A)", "IL(A)", "IC(A)", "ICL(A)", "XL(ohm)", "XC(ohm)", "Z(ohm)", "Itot_hit(A)", "IR_hit(A)", "IL_hit(A)", "IC_hit(A)", "ICL_hit(A)"],
  },
};

/** Ambil pembacaan (multimeter) dan hasil perhitungan untuk satu frekuensi */
export function buildSnap(mode: Mode, p: Base, ff: number): Snap {
  if (mode === "seri") {
    const c = seriesCalc({ ...p, f: ff });
    return {
      f: ff,
      m: [[c.Vs, "V"], [c.I, "A"], [c.VR, "V"], [c.VL, "V"], [c.VC, "V"], [c.VLC, "V"]],
      c: [[c.XL, "Ω"], [c.XC, "Ω"], [c.Z, "Ω"], [c.I, "A"], [c.VR, "V"], [c.VL, "V"], [c.VC, "V"], [c.VLC, "V"]],
    };
  }
  const c = parallelCalc({ ...p, f: ff });
  return {
    f: ff,
    m: [[c.Vs, "V"], [c.Itot, "A"], [c.IR, "A"], [c.IL, "A"], [c.IC, "A"], [c.ILC, "A"]],
    c: [[c.XL, "Ω"], [c.XC, "Ω"], [c.Z, "Ω"], [c.Itot, "A"], [c.IR, "A"], [c.IL, "A"], [c.IC, "A"], [c.ILC, "A"]],
  };
}

export function snapsCsv(mode: Mode, snaps: (Snap | null)[]) {
  const head = ["f(Hz)", ...HEADS[mode].csv].join(";");
  const lines = snaps
    .filter((s): s is Snap => s !== null)
    .map((s) => [s.f, ...s.m.map((x) => x[0]), ...s.c.map((x) => x[0])].map((v) => v.toPrecision(6)).join(";"));
  return [head, ...lines].join("\n");
}

const TH = "border border-slate-700 bg-slate-200 px-1 py-1 text-center text-[11px] font-bold leading-tight";
const TH2 = "border border-slate-700 bg-slate-100 px-1 py-0.5 text-center text-[11px] leading-tight";
const TD = "border border-slate-700 px-1.5 py-1 text-right font-mono text-[11px] whitespace-nowrap";

export function DataTable({ mode, rows, fr, f, activeIdx, onRow }: {
  mode: Mode; rows: (Snap | null)[]; fr: number; f: number; activeIdx: number;
  onRow: (i: number, ff: number) => void;
}) {
  const H = HEADS[mode];
  const nCols = H.m.length + H.c.length;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1000px] border-collapse bg-white">
        <thead>
          <tr>
            <th rowSpan={2} className={TH}>Frekuensi<br />(Hz)</th>
            <th colSpan={H.m.length} className={TH}>Hasil Pengukuran</th>
            <th colSpan={H.c.length} className={TH}>Hasil perhitungan</th>
          </tr>
          <tr>
            {H.m.map(([n, u], i) => <th key={"m" + i} className={TH2}><div className="font-bold">{n}</div><div>{u}</div></th>)}
            {H.c.map(([n, u], i) => <th key={"c" + i} className={TH2}><div className="font-bold">{n}</div><div>{u}</div></th>)}
          </tr>
        </thead>
        <tbody>
          {FREQS.map((x, i) => {
            const ff = freqAt(i, fr);
            const s = rows[i];
            const isFr = x === "fr";
            const cls =
              i === activeIdx ? "bg-amber-200"
                : Math.abs(ff - f) < 0.5 ? "bg-amber-100"
                  : isFr ? "bg-green-50"
                    : i % 2 ? "bg-white" : "bg-slate-50";
            return (
              <tr key={i} onClick={() => onRow(i, ff)} className={`cursor-pointer transition hover:bg-blue-50 ${cls}`}>
                <td className="border border-slate-700 px-2 py-1 text-center font-mono text-[12px] font-bold whitespace-nowrap">
                  {isFr ? <><span className="text-green-700">fr</span> = {pl(ff, 2)}</> : x}
                </td>
                {s
                  ? <>
                    {s.m.map(([v, u], j) => <td key={"mv" + j} className={TD}>{idn(v, u)}</td>)}
                    {s.c.map(([v, u], j) => <td key={"cv" + j} className={TD + " bg-slate-50"}>{idn(v, u)}</td>)}
                  </>
                  : Array.from({ length: nCols }, (_, j) => <td key={"e" + j} className={TD + " text-center text-slate-300"}>—</td>)}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

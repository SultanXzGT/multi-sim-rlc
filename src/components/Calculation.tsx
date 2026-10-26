import { useState, type ReactNode } from "react";
import { FREQS } from "./DataTables";
import { idn, parallelCalc, pl, resonantFreq, seriesCalc, type Mode } from "../lib/circuit";

interface Props {
  mode: Mode; R: number; L: number; C: number; Vpp: number;
  afgF: number; defaultSel: string;
}

interface P { R: number; L: number; C: number; Vpp: number; f: number; }

function Step({ no, title, expr, res }: { no: number; title: string; expr: ReactNode; res?: ReactNode }) {
  return (
    <div className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-2 border-b border-slate-200 py-2.5 last:border-0">
      <span className="pt-0.5 text-right font-mono text-xs text-slate-400">{no}.</span>
      <div className="min-w-0">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{title}</div>
        <div className="break-words font-mono text-[14px] leading-7 text-slate-800">{expr}</div>
        {res !== undefined && <div className="font-mono text-[15px] font-bold text-blue-800">= {res}</div>}
      </div>
    </div>
  );
}

function Concl({ children }: { children: ReactNode }) {
  return (
    <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm leading-relaxed text-slate-700">
      <b className="text-emerald-800">Kesimpulan: </b>{children}
    </div>
  );
}

function SeriesSteps({ R, L, C, Vpp, f }: P) {
  const c = seriesCalc({ R, L, C, Vpp, f });
  const fr = resonantFreq(L, C);
  const Q = Math.sqrt(L / C) / R;
  const BW = fr / Q;
  const pos = f < fr ? "di bawah fr" : f > fr ? "di atas fr" : "tepat di fr";
  const sifat = f < fr
    ? "kapasitif (XC > XL), arus mendahului tegangan"
    : f > fr ? "induktif (XL > XC), arus tertinggal dari tegangan"
      : "resistif (XL = XC), arus sefasa dengan tegangan";
  return (
    <>
      <Step no={1} title="Diketahui"
        expr={<>f = {idn(f, "Hz")}; V<sub>S</sub> = {pl(Vpp, 2)} Vpp; R = {pl(R)} Ω; L = {idn(L, "H")}; C = {idn(C, "F")}</>} />
      <Step no={2} title="Tegangan efektif sumber"
        expr={<>V<sub>rms</sub> = V<sub>pp</sub> / 2√2 = {pl(Vpp, 2)} / 2√2</>} res={idn(c.Vs, "V")} />
      <Step no={3} title="Reaktansi induktif"
        expr={<>X<sub>L</sub> = 2π · f · L = 2π · {pl(f)} · {pl(L)}</>} res={idn(c.XL, "Ω")} />
      <Step no={4} title="Reaktansi kapasitif"
        expr={<>X<sub>C</sub> = 1 / (2π · f · C) = 1 / (2π · {pl(f)} · {pl(C, 10)})</>} res={idn(c.XC, "Ω")} />
      <Step no={5} title="Impedansi"
        expr={<>Z = √(R² + (X<sub>L</sub> − X<sub>C</sub>)²) = √({pl(R)}² + ({pl(c.XL, 2)} − {pl(c.XC, 2)})²)</>} res={idn(c.Z, "Ω")} />
      <Step no={6} title="Arus rangkaian"
        expr={<>I = V<sub>rms</sub> / Z = {pl(c.Vs, 4)} / {pl(c.Z, 2)}</>} res={idn(c.I, "A")} />
      <Step no={7} title="Tegangan resistor"
        expr={<>V<sub>R</sub> = I · R = {idn(c.I, "A")} × {pl(R)}</>} res={idn(c.VR, "V")} />
      <Step no={8} title="Tegangan induktor"
        expr={<>V<sub>L</sub> = I · X<sub>L</sub> = {idn(c.I, "A")} × {pl(c.XL, 4)}</>} res={idn(c.VL, "V")} />
      <Step no={9} title="Tegangan kapasitor"
        expr={<>V<sub>C</sub> = I · X<sub>C</sub> = {idn(c.I, "A")} × {pl(c.XC, 2)}</>} res={idn(c.VC, "V")} />
      <Step no={10} title="Selisih tegangan L dan C"
        expr={<>V<sub>L</sub> − V<sub>C</sub> = {idn(c.VL, "V")} − {idn(c.VC, "V")}</>} res={idn(c.VL - c.VC, "V")} />
      <Step no={11} title="Frekuensi resonansi"
        expr={<>f<sub>r</sub> = 1 / (2π√(L·C)) = 1 / (2π√({pl(L)} × {pl(C, 10)}))</>} res={idn(fr, "Hz")} />
      <Step no={12} title="Faktor kualitas & bandwidth"
        expr={<>Q<sub>s</sub> = (1/R)·√(L/C) ; BW = f<sub>r</sub> / Q</>}
        res={`Q = ${pl(Q, 4)};  BW = ${idn(BW, "Hz")}`} />
      <Concl>
        Pada f = {idn(f, "Hz")} ({pos}), rangkaian bersifat {sifat}. Sudut fasa φ = {c.phi.toFixed(2)}°, faktor daya cos φ = {pl(c.pf, 4)}.
        {Math.abs(f - fr) / fr < 0.002 && <> Pada fr: V<sub>R</sub> = V<sub>S</sub>, V<sub>L</sub> = V<sub>C</sub>, dan φ = 0°.</>}
      </Concl>
    </>
  );
}

function ParallelSteps({ R, L, C, Vpp, f }: P) {
  const c = parallelCalc({ R, L, C, Vpp, f });
  const fr = resonantFreq(L, C);
  const Qp = R * Math.sqrt(C / L);
  const pos = f < fr ? "di bawah fr" : f > fr ? "di atas fr" : "tepat di fr";
  const sifat = f < fr
    ? "induktif (IL > IC), arus tertinggal dari tegangan"
    : f > fr ? "kapasitif (IC > IL), arus mendahului tegangan"
      : "resistif (IL = IC), arus sefasa dengan tegangan";
  return (
    <>
      <Step no={1} title="Diketahui"
        expr={<>f = {idn(f, "Hz")}; V<sub>S</sub> = {pl(Vpp, 2)} Vpp; R = {pl(R)} Ω; L = {idn(L, "H")}; C = {idn(C, "F")}</>} />
      <Step no={2} title="Tegangan efektif sumber"
        expr={<>V<sub>rms</sub> = V<sub>pp</sub> / 2√2 = {pl(Vpp, 2)} / 2√2</>} res={idn(c.Vs, "V")} />
      <Step no={3} title="Reaktansi induktif"
        expr={<>X<sub>L</sub> = 2π · f · L = 2π · {pl(f)} · {pl(L)}</>} res={idn(c.XL, "Ω")} />
      <Step no={4} title="Reaktansi kapasitif"
        expr={<>X<sub>C</sub> = 1 / (2π · f · C) = 1 / (2π · {pl(f)} · {pl(C, 10)})</>} res={idn(c.XC, "Ω")} />
      <Step no={5} title="Arus cabang resistor"
        expr={<>I<sub>R</sub> = V<sub>rms</sub> / R = {pl(c.Vs, 4)} / {pl(R)}</>} res={idn(c.IR, "A")} />
      <Step no={6} title="Arus cabang induktor"
        expr={<>I<sub>L</sub> = V<sub>rms</sub> / X<sub>L</sub> = {pl(c.Vs, 4)} / {pl(c.XL, 2)}</>} res={idn(c.IL, "A")} />
      <Step no={7} title="Arus cabang kapasitor"
        expr={<>I<sub>C</sub> = V<sub>rms</sub> / X<sub>C</sub> = {pl(c.Vs, 4)} / {pl(c.XC, 2)}</>} res={idn(c.IC, "A")} />
      <Step no={8} title="Arus total"
        expr={<>I<sub>tot</sub> = √(I<sub>R</sub>² + (I<sub>C</sub> − I<sub>L</sub>)²) = √(({idn(c.IR, "A")})² + ({idn(c.IC, "A")} − {idn(c.IL, "A")})²)</>}
        res={idn(c.Itot, "A")} />
      <Step no={9} title="Impedansi"
        expr={<>Z = V<sub>rms</sub> / I<sub>tot</sub> = {pl(c.Vs, 4)} / {idn(c.Itot, "A")}</>} res={idn(c.Z, "Ω")} />
      <Step no={10} title="Sudut fasa"
        expr={<>φ = arctan((I<sub>L</sub> − I<sub>C</sub>) / I<sub>R</sub>) = arctan({idn(c.IL - c.IC, "A")} / {idn(c.IR, "A")})</>}
        res={`${c.phi.toFixed(2)}°   (cos φ = ${pl(c.pf, 4)})`} />
      <Step no={11} title="Frekuensi resonansi"
        expr={<>f<sub>r</sub> = 1 / (2π√(L·C)) = 1 / (2π√({pl(L)} × {pl(C, 10)}))</>} res={idn(fr, "Hz")} />
      <Step no={12} title="Faktor kualitas"
        expr={<>Q<sub>p</sub> = R · √(C/L) = {pl(R)} · √({pl(C, 10)} / {pl(L)})</>} res={pl(Qp, 4)} />
      <Concl>
        Pada f = {idn(f, "Hz")} ({pos}), rangkaian bersifat {sifat}. Sudut fasa φ = {c.phi.toFixed(2)}°, faktor daya cos φ = {pl(c.pf, 4)}.
        {Math.abs(f - fr) / fr < 0.002 && <> Pada fr: I<sub>tot</sub> = I<sub>R</sub>, I<sub>L</sub> = I<sub>C</sub>, dan φ = 0°.</>}
      </Concl>
    </>
  );
}

export default function Calculation({ mode, R, L, C, Vpp, afgF, defaultSel }: Props) {
  const [sel, setSel] = useState(defaultSel);
  const fr = resonantFreq(L, C);
  const f = sel === "afg" ? afgF : sel === "fr" ? fr : Number(sel);
  const p = { R, L, C, Vpp, f };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h3 className="mr-auto font-bold text-slate-800">
          {mode === "seri" ? "1. Rangkaian R-L-C Seri" : "2. Rangkaian R-L-C Paralel"}
        </h3>
        <label className="text-xs text-slate-600">
          Hitung pada frekuensi:
          <select value={sel} onChange={(e) => setSel(e.target.value)} className="ml-2 rounded border border-slate-300 px-2 py-1 text-sm">
            <option value="afg">Ikuti AFG ({idn(afgF, "Hz")})</option>
            {FREQS.map((x) => x === "fr"
              ? <option key="fr" value="fr">fr (resonansi) = {pl(fr, 2)} Hz</option>
              : <option key={x} value={String(x)}>{x} Hz</option>)}
          </select>
        </label>
      </div>
      <div className="rounded-lg border-l-4 border-rose-300 bg-[#fffdf7] px-4 py-2">
        {mode === "seri" ? <SeriesSteps {...p} /> : <ParallelSteps {...p} />}
      </div>
    </div>
  );
}

import React, { useEffect, useMemo, useState } from "react";
import Multimeter from "./components/Multimeter";
import FunctionGenerator from "./components/FunctionGenerator";
import Schematic from "./components/Schematic";
import { LineChart, Scope } from "./components/Charts";
import Calculation from "./components/Calculation";
import { DataTable, FREQS, buildSnap, freqAt, snapsCsv, type Base, type Snap } from "./components/DataTables";
import { idn, parallelCalc, resonantFreq, seriesCalc, type Mode } from "./lib/circuit";

const N = FREQS.length;
type Rows = Record<Mode, (Snap | null)[]>;
const emptyRows = (): (Snap | null)[] => Array.from({ length: N }, () => null);

const pick = (a: Record<string, number>[], k: string) => a.map((o) => o[k]);

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob(["\uFEFF" + text], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function LogSlider({
  label,
  sym,
  value,
  min,
  max,
  unit,
  onChange,
  hint,
}: {
  label: string;
  sym: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange: (v: number) => void;
  hint: string;
}) {
  const pos = ((Math.log10(value) - Math.log10(min)) / (Math.log10(max) - Math.log10(min))) * 1000;
  const [txt, setTxt] = useState("");
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-700">
          {label} <span className="text-slate-400">({sym})</span>
        </span>
        <span className="lcd rounded bg-slate-900 px-2 py-0.5 text-sm text-green-300">{idn(value, unit)}</span>
      </div>
      <input
        type="range"
        min={0}
        max={1000}
        value={pos}
        className="w-full accent-blue-600"
        onChange={(e) => {
          const v = 10 ** (Math.log10(min) + (+e.target.value / 1000) * (Math.log10(max) - Math.log10(min)));
          onChange(+v.toPrecision(3));
        }}
      />
      <input
        value={txt}
        onChange={(e) => setTxt(e.target.value)}
        placeholder={hint}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            const v = parseFloat(txt.replace(",", "."));
            if (v > 0) {
              onChange(v);
              setTxt("");
            }
          }
        }}
        className="mt-1 w-full rounded border border-slate-300 px-2 py-0.5 text-xs focus:border-blue-500 focus:outline-none"
      />
    </div>
  );
}

const Check = ({ ok, children }: { ok: boolean; children: React.ReactNode }) => (
  <li className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${ok ? "bg-green-50 text-green-800" : "bg-slate-50 text-slate-600"}`}>
    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${ok ? "bg-green-500" : "bg-slate-400"}`}>
      {ok ? "✓" : "✗"}
    </span>
    <span>{children}</span>
  </li>
);

const XS = Array.from({ length: 691 }, (_, i) => 100 + i * 10);
const PHASE_FIXED = { lo: -90, hi: 90, ticks: [-90, -60, -30, 0, 30, 60, 90], fmt: (v: number) => `${v.toFixed(1)}°` };
const BTN = "rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition disabled:opacity-40";

type Tab = "praktikum" | "perhitungan" | "tugas" | "kesimpulan" | "excel" | "laporan";
type SubTab = "simulasi" | "tabel" | "grafik";

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("praktikum");
  const [subTab, setSubTab] = useState<SubTab>("simulasi");

  const [mode, setMode] = useState<Mode>("seri");
  const [R, setR] = useState(2000);
  const [L, setL] = useState(0.3);
  const [C, setC] = useState(1e-8);
  const [Vpp, setVpp] = useState(8);
  const [f, setF] = useState(500);
  const [power, setPower] = useState(true);

  // Simulasi otomatis
  const [rows, setRows] = useState<Rows>({ seri: emptyRows(), paralel: emptyRows() });
  const [playing, setPlaying] = useState(false);
  const [step, setStep] = useState(0);
  const [run, setRun] = useState(0);
  const [delay, setDelay] = useState(1400);

  const fr = resonantFreq(L, C);
  const base: Base = { R, L, C, Vpp };
  const pg = { ...base, Vpp: power ? Vpp : 0, f };
  const s = seriesCalc(pg);
  const pa = parallelCalc(pg);
  const cur = mode === "seri" ? s : pa;
  const I = mode === "seri" ? s.I : pa.Itot;
  const atRes = Math.abs(f - fr) / fr < 0.002;

  const readings: Record<string, number> =
    mode === "seri"
      ? { XMM1: s.Vs, XMM2: s.VR, XMM3: s.VL, XMM4: s.VC, XMM5: s.VLC, XMM6: s.I }
      : { XMM1: pa.Itot, XMM2: pa.IR, XMM3: pa.IL, XMM4: pa.IC, XMM5: pa.ILC, XMM6: pa.Vs };

  const iRef = Vpp / (2 * Math.SQRT2) / R;
  const flow: Record<string, number> =
    mode === "seri"
      ? { main: s.I / iRef }
      : { tot: pa.Itot / iRef, R: pa.IR / iRef, L: pa.IL / iRef, C: pa.IC / iRef, LC: pa.ILC / iRef };

  const sc = useMemo(() => XS.map((ff) => seriesCalc({ R, L, C, Vpp, f: ff })), [R, L, C, Vpp]);
  const pc = useMemo(() => XS.map((ff) => parallelCalc({ R, L, C, Vpp, f: ff })), [R, L, C, Vpp]);
  const bwS: [number, number] = [
    fr * (Math.sqrt(1 + 1 / (4 * s.Q * s.Q)) - 1 / (2 * s.Q)),
    fr * (Math.sqrt(1 + 1 / (4 * s.Q * s.Q)) + 1 / (2 * s.Q)),
  ];

  useEffect(() => {
    if (!playing) return;
    if (step >= N) {
      setPlaying(false);
      return;
    }
    const ff = freqAt(step, fr);
    setF(ff);
    setRows((o) => {
      const arr = [...o[mode]];
      arr[step] = buildSnap(mode, base, ff);
      return { ...o, [mode]: arr };
    });
    const t = window.setTimeout(() => setStep((x) => x + 1), delay);
    return () => window.clearTimeout(t);
  }, [playing, step, run]);

  const restart = () => {
    setRows((o) => ({ ...o, [mode]: emptyRows() }));
    setStep(0);
    setRun((r) => r + 1);
    setPlaying(true);
  };
  const play = () => (step >= N ? restart() : setPlaying(true));
  const pause = () => setPlaying(false);
  const changeMode = (m: Mode) => {
    setPlaying(false);
    setStep(0);
    setMode(m);
  };

  const onRow = (m: Mode, i: number, ff: number) => {
    setRows((o) => {
      const arr = [...o[m]];
      arr[i] = buildSnap(m, base, ff);
      return { ...o, [m]: arr };
    });
    if (m !== mode) setMode(m);
    setPlaying(false);
    setStep(i);
    setF(ff);
  };

  const fillMode = (m: Mode) => {
    setRows((o) => ({ ...o, [m]: FREQS.map((_, i) => buildSnap(m, base, freqAt(i, fr))) }));
    if (m === mode) {
      setPlaying(false);
      setStep(N);
    }
  };
  const clearMode = (m: Mode) => {
    setRows((o) => ({ ...o, [m]: emptyRows() }));
    if (m === mode) {
      setPlaying(false);
      setStep(0);
    }
  };

  const filled = rows[mode].filter(Boolean).length;
  const activeF = freqAt(Math.min(step, N - 1), fr);

  const meterLabels =
    mode === "seri"
      ? { XMM1: "VS (sumber)", XMM2: "VR", XMM3: "VL", XMM4: "VC", XMM5: "VL−VC", XMM6: "I (arus)" }
      : { XMM1: "Itotal", XMM2: "IR", XMM3: "IL", XMM4: "IC", XMM5: "IL−IC", XMM6: "VS (sumber)" };
  const kinds: Record<string, "V" | "A"> =
    mode === "seri"
      ? { XMM1: "V", XMM2: "V", XMM3: "V", XMM4: "V", XMM5: "V", XMM6: "A" }
      : { XMM1: "A", XMM2: "A", XMM3: "A", XMM4: "A", XMM5: "A", XMM6: "V" };
  const hiMeters = mode === "seri" ? ["XMM2", "XMM6"] : ["XMM1", "XMM2"];

  const tol = 0.01;
  const seriChecks = [
    {
      ok: power && Math.abs(s.VR - s.Vs) / s.Vs < tol,
      t: (
        <>
          V<sub>R</sub> = V<sub>S</sub>{" "}
          <span className="font-mono text-xs">
            ({idn(s.VR, "V")} ≈ {idn(s.Vs, "V")})
          </span>
        </>
      ),
    },
    {
      ok: power && Math.abs(s.VL - s.VC) / s.VC < tol,
      t: (
        <>
          V<sub>L</sub> = V<sub>C</sub>{" "}
          <span className="font-mono text-xs">
            ({idn(s.VL, "V")} ≈ {idn(s.VC, "V")})
          </span>
        </>
      ),
    },
    {
      ok: power && s.VLC < 0.01 * s.Vs,
      t: (
        <>
          V<sub>L</sub> − V<sub>C</sub> ≈ 0 V <span className="font-mono text-xs">({idn(s.VLC, "V")})</span>
        </>
      ),
    },
    {
      ok: Math.abs(s.phi) < 0.6,
      t: (
        <>
          φ ≈ 0°, cos φ = 1 <span className="font-mono text-xs">(φ = {s.phi.toFixed(2)}°)</span>
        </>
      ),
    },
  ];
  const parChecks = [
    {
      ok: power && Math.abs(pa.Itot - pa.IR) / pa.IR < tol,
      t: (
        <>
          I<sub>tot</sub> = I<sub>R</sub>{" "}
          <span className="font-mono text-xs">
            ({idn(pa.Itot, "A")} ≈ {idn(pa.IR, "A")})
          </span>
        </>
      ),
    },
    {
      ok: power && Math.abs(pa.IL - pa.IC) / pa.IC < tol,
      t: (
        <>
          I<sub>L</sub> = I<sub>C</sub>{" "}
          <span className="font-mono text-xs">
            ({idn(pa.IL, "A")} ≈ {idn(pa.IC, "A")})
          </span>
        </>
      ),
    },
    {
      ok: power && pa.ILC < 0.01 * pa.IR,
      t: (
        <>
          I<sub>L</sub> − I<sub>C</sub> ≈ 0 A <span className="font-mono text-xs">({idn(pa.ILC, "A")})</span>
        </>
      ),
    },
    {
      ok: Math.abs(pa.phi) < 0.6,
      t: (
        <>
          φ ≈ 0°, cos φ = 1 <span className="font-mono text-xs">(φ = {pa.phi.toFixed(2)}°)</span>
        </>
      ),
    },
  ];
  const checks = mode === "seri" ? seriChecks : parChecks;

  const statusText = !power
    ? "AFG OFF"
    : atRes
      ? "RESONANSI TERCAPAI (XL = XC)"
      : f < fr
        ? `Di bawah fr → ${mode === "seri" ? "kapasitif" : "induktif"}`
        : `Di atas fr → ${mode === "seri" ? "induktif" : "kapasitif"}`;

  const tableNote =
    "Hasil pengukuran = pembacaan multimeter simulasi pada frekuensi tersebut. Komponen dibuat ideal (tanpa resistansi kawat induktor), sehingga nilai pengukuran sama dengan perhitungan.";

  const scrollTo = (id: string, sub: SubTab) => {
    setActiveTab("praktikum");
    setSubTab(sub);
    setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Top Banner (Navy Dark) */}
      <div className="bg-[#102438] px-4 py-2 text-center text-xs text-blue-100 shadow-inner sm:text-left">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <span className="font-medium tracking-wide">
            Simulasi Multisim AFG Agilent 33120A • Multimeter XMM1–XMM6 • Analisis Perhitungan • Tugas & Pertanyaan • Kesimpulan Full Text
          </span>
          <span className="hidden rounded bg-blue-900/60 px-2 py-0.5 text-[11px] font-mono text-blue-300 md:inline-block">
            Job Sheet 10
          </span>
        </div>
      </div>

      {/* Main Tab Navigation Bar */}
      <nav className="sticky top-0 z-40 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex items-center gap-1.5 overflow-x-auto py-2.5">
            {/* Tab 1: Praktikum & Multisim */}
            <button
              onClick={() => setActiveTab("praktikum")}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition ${
                activeTab === "praktikum"
                  ? "bg-[#20496f] text-white shadow"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
              Praktikum & Multisim
            </button>

            {/* Tab 2: C. Analisis Perhitungan */}
            <button
              onClick={() => setActiveTab("perhitungan")}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition ${
                activeTab === "perhitungan"
                  ? "bg-[#20496f] text-white shadow"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span className="text-amber-500 font-bold">▦</span>
              C. Analisis Perhitungan
            </button>

            {/* Tab 3: D. Tugas & Pertanyaan */}
            <button
              onClick={() => setActiveTab("tugas")}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition ${
                activeTab === "tugas"
                  ? "bg-[#20496f] text-white shadow"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span className="text-yellow-600">📝</span>
              D. Tugas & Pertanyaan
            </button>

            {/* Tab 4: E. Kesimpulan (Full Text) */}
            <button
              onClick={() => setActiveTab("kesimpulan")}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition ${
                activeTab === "kesimpulan"
                  ? "bg-[#20496f] text-white shadow"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span className="text-emerald-600">📋</span>
              E. Kesimpulan (Full Text)
            </button>

            {/* Tab 5: Tabel & Excel (.xlsx) */}
            <button
              onClick={() => setActiveTab("excel")}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition ${
                activeTab === "excel"
                  ? "bg-[#20496f] text-white shadow"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span className="text-emerald-500 font-bold">📊</span>
              Tabel & Excel (.xlsx)
            </button>

            {/* Tab 6: Laporan Lengkap (Cetak) */}
            <button
              onClick={() => setActiveTab("laporan")}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition ${
                activeTab === "laporan"
                  ? "bg-[#20496f] text-white shadow"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span className="text-slate-500">📄</span>
              Laporan Lengkap (Cetak)
            </button>
          </div>

          {/* Sub-tabs under Praktikum */}
          {activeTab === "praktikum" && (
            <div className="flex items-center gap-5 border-t border-slate-100 py-1.5 text-xs">
              <button
                onClick={() => scrollTo("sec-simulasi", "simulasi")}
                className={`font-semibold transition ${
                  subTab === "simulasi"
                    ? "text-[#20496f] border-b-2 border-[#20496f] pb-0.5"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Simulasi
              </button>
              <button
                onClick={() => scrollTo("sec-tabel", "tabel")}
                className={`font-semibold transition ${
                  subTab === "tabel"
                    ? "text-[#20496f] border-b-2 border-[#20496f] pb-0.5"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Tabel
              </button>
              <button
                onClick={() => scrollTo("sec-grafik", "grafik")}
                className={`font-semibold transition ${
                  subTab === "grafik"
                    ? "text-[#20496f] border-b-2 border-[#20496f] pb-0.5"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Grafik
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content Areas */}
      <main className="mx-auto max-w-7xl px-4 py-6">
        {/* TAB 1: PRAKTIKUM & MULTISIM */}
        {activeTab === "praktikum" && (
          <div className="space-y-6">
            {/* A. Resonansi pada Beban RLC */}
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-bold text-slate-800">A. Resonansi pada Beban RLC</h2>
              <h3 className="mt-2 font-semibold text-slate-700">Tujuan Praktik</h3>
              <ol className="ml-6 mt-1 list-decimal space-y-1 text-sm text-slate-700">
                <li>
                  Menggambarkan grafik:
                  <ul className="ml-6 list-disc space-y-0.5">
                    <li>Z = f (frekuensi)</li>
                    <li>I = f (frekuensi)</li>
                  </ul>
                </li>
                <li>Menyebutkan besarnya faktor kualitas pada rangkaian seri dan paralel</li>
                <li>Menyebutkan besarnya frekuensi resonansi seri dan paralel</li>
              </ol>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Pada praktikum kali ini kita akan membuktikan rangkaian RLC kondisi saat terjadi resonansi, yaitu saat di mana besarnya{" "}
                <span className="font-semibold text-slate-800">X<sub>L</sub> = X<sub>C</sub></span>.
              </p>
            </section>

            {/* Mode & status */}
            <div id="sec-simulasi" className="flex flex-wrap items-center gap-2">
              {(["seri", "paralel"] as Mode[]).map((m, i) => (
                <button
                  key={m}
                  onClick={() => changeMode(m)}
                  className={`rounded-lg px-5 py-2.5 text-sm font-semibold shadow-sm transition ${
                    mode === m ? "bg-[#20496f] text-white" : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  {i + 1}. Resonansi RLC {m === "seri" ? "Seri" : "Paralel"}
                </button>
              ))}
              <div
                className={`ml-auto flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ${
                  atRes && power ? "bg-green-600 text-white" : "bg-amber-100 text-amber-800"
                }`}
              >
                <span className={`h-2.5 w-2.5 rounded-full ${atRes && power ? "animate-pulse bg-white" : "bg-amber-500"}`} />
                {statusText}
              </div>
            </div>

            {/* Komponen Sliders */}
            <section className="grid gap-3 md:grid-cols-4">
              <LogSlider label="Resistor R1" sym="R" value={R} min={10} max={100000} unit="Ω" onChange={setR} hint="ketik Ω, mis. 2000" />
              <LogSlider label="Induktor L1" sym="L" value={L} min={1e-4} max={10} unit="H" onChange={setL} hint="ketik H, mis. 0.3" />
              <LogSlider label="Kapasitor C1" sym="C" value={C} min={1e-10} max={1e-4} unit="F" onChange={setC} hint="ketik F, mis. 0.00000001" />
              <div className="flex flex-col justify-between gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="text-sm font-semibold text-slate-700">Frekuensi resonansi</div>
                <div className="lcd rounded bg-slate-900 px-2 py-1.5 text-center text-lg text-green-300">fr = {idn(fr, "Hz")}</div>
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      setPlaying(false);
                      setF(+fr.toFixed(4));
                    }}
                    className="flex-1 rounded bg-green-600 px-2 py-1.5 text-xs font-semibold text-white hover:bg-green-700"
                  >
                    Set f = fr
                  </button>
                  <button
                    onClick={() => {
                      setPlaying(false);
                      setR(2000);
                      setL(0.3);
                      setC(1e-8);
                      setVpp(8);
                      setF(500);
                    }}
                    className="flex-1 rounded bg-slate-200 px-2 py-1.5 text-xs font-semibold hover:bg-slate-300 text-slate-700"
                  >
                    Reset Labsheet
                  </button>
                </div>
              </div>
            </section>

            {/* Kontrol simulasi otomatis */}
            <section className="rounded-xl border border-blue-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-3">
                <div className="mr-auto min-w-[240px]">
                  <div className="font-bold text-slate-800">Simulasi Otomatis – RLC {mode === "seri" ? "Seri" : "Paralel"}</div>
                  <div className="text-xs text-slate-500">
                    AFG menyapu frekuensi sesuai labsheet, multimeter membaca nilai, dan tabel terisi otomatis.
                  </div>
                </div>
                {playing ? (
                  <button onClick={pause} className={`${BTN} bg-amber-500 text-white hover:bg-amber-600`}>
                    ⏸ Pause
                  </button>
                ) : (
                  <button onClick={play} className={`${BTN} bg-green-600 text-white hover:bg-green-700`}>
                    ▶ {step > 0 && step < N ? "Lanjutkan" : "Play"}
                  </button>
                )}
                <button onClick={restart} className={`${BTN} bg-slate-200 text-slate-800 hover:bg-slate-300`}>
                  ⟲ Ulang dari awal
                </button>
                <label className="text-xs text-slate-600">
                  Kecepatan
                  <select
                    value={delay}
                    onChange={(e) => setDelay(+e.target.value)}
                    className="ml-2 rounded border border-slate-300 px-2 py-1.5 text-sm"
                  >
                    <option value={600}>Cepat</option>
                    <option value={1400}>Normal</option>
                    <option value={3000}>Lambat</option>
                  </select>
                </label>
              </div>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-500"
                  style={{ width: `${(filled / N) * 100}%` }}
                />
              </div>
              <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-slate-600">
                <span>
                  Baris terisi: <b>{filled}</b> / {N}
                </span>
                <span>
                  {playing
                    ? `Mengukur f = ${idn(activeF, "Hz")} …`
                    : filled === N
                      ? "Selesai – seluruh tabel terisi ✓"
                      : "Siap. Tekan Play untuk mengisi tabel otomatis."}
                </span>
              </div>
            </section>

            {/* Multimeter & Skema */}
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-xl font-bold text-slate-800">
                {mode === "seri" ? "1. Resonansi RLC Seri" : "2. Resonansi RLC Paralel"}
              </h2>
              <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                {(["XMM1", "XMM2", "XMM3", "XMM4", "XMM5", "XMM6"] as const).map((k) => (
                  <Multimeter
                    key={mode + k}
                    name={k}
                    kind={kinds[k]}
                    value={readings[k]}
                    label={meterLabels[k]}
                    highlight={atRes && power && hiMeters.includes(k)}
                  />
                ))}
              </div>
              <Schematic mode={mode} power={power} R={R} L={L} C={C} readings={readings} flow={flow} />
              <p className="mt-2 text-xs text-slate-500">
                Garis kuning bergerak = aliran arus (makin cepat makin besar). Multimeter bisa diklik A / V / Ω / dB dan AC / DC.
              </p>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <FunctionGenerator Vpp={Vpp} f={f} power={power} setVpp={setVpp} setF={setF} setPower={setPower} fr={fr} />
                <div className="space-y-3">
                  <div className="rounded-xl border border-slate-200 p-4">
                    <h3 className="mb-2 font-semibold">
                      Kondisi saat terjadi resonansi RLC {mode === "seri" ? "Seri" : "Paralel"}:
                    </h3>
                    <ul className="space-y-1.5">
                      {checks.map((c, i) => (
                        <Check key={i} ok={c.ok}>
                          {c.t}
                        </Check>
                      ))}
                    </ul>
                  </div>
                  <Scope
                    phi={cur.phi}
                    vLabel={`v(t) sumber ${idn(cur.Vs, "V")} rms`}
                    iLabel={`i(t) ${mode === "seri" ? "rangkaian" : "total"} ${idn(I, "A")} rms`}
                  />
                </div>
              </div>
            </section>

            {/* TABEL DATA HASIL */}
            <section id="sec-tabel" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="no-print mb-4 flex flex-wrap items-center gap-2">
                <h2 className="mr-auto text-xl font-bold text-slate-800">Tabel Data Hasil Praktikum</h2>
                <button
                  onClick={() => window.print()}
                  className={`${BTN} bg-slate-700 text-white hover:bg-slate-800 !py-1.5 !text-xs`}
                >
                  Cetak / PDF
                </button>
              </div>
              <div className="space-y-8">
                {(["seri", "paralel"] as Mode[]).map((m) => (
                  <div key={m}>
                    <div className="no-print mb-2 flex flex-wrap items-center gap-2">
                      <h3 className="mr-auto text-base font-bold">
                        {m === "seri" ? "TABEL 1. Data Hasil Pengukuran Resonansi R-L-C Seri" : "Tabel 2. Data Hasil Pengukuran Resonansi R-L-C Paralel"}
                      </h3>
                      <button
                        onClick={() => fillMode(m)}
                        className={`${BTN} bg-green-600 text-white hover:bg-green-700 !py-1.5 !text-xs`}
                      >
                        Isi otomatis
                      </button>
                      <button
                        onClick={() => clearMode(m)}
                        className={`${BTN} bg-slate-200 text-slate-800 hover:bg-slate-300 !py-1.5 !text-xs`}
                      >
                        Kosongkan
                      </button>
                      <button
                        onClick={() => download(`tabel_resonansi_${m}.csv`, snapsCsv(m, rows[m]))}
                        disabled={!rows[m].some(Boolean)}
                        className={`${BTN} bg-[#20496f] text-white hover:bg-[#183856] !py-1.5 !text-xs`}
                      >
                        CSV
                      </button>
                    </div>
                    <p className="mb-2 font-mono text-sm text-slate-600">
                      R = {idn(R, "Ω")}; L = {idn(L, "H")}; C = {idn(C, "F")}
                    </p>
                    <DataTable
                      mode={m}
                      rows={rows[m]}
                      fr={fr}
                      f={f}
                      activeIdx={playing && mode === m ? step : -1}
                      onRow={(i, ff) => onRow(m, i, ff)}
                    />
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-slate-500">Klik satu baris untuk mengatur AFG ke frekuensi itu dan mencatatnya. {tableNote}</p>
            </section>

            {/* GRAFIK */}
            <div id="sec-grafik" className="space-y-6">
              {/* Grafik seri */}
              <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
                <h2 className="text-xl font-bold text-slate-800">Grafik Resonansi RLC Seri</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  <LineChart title="Z = f(frekuensi)" unit="Ω" xs={XS} f={f} fr={fr} band={bwS} onPick={setF} series={[{ name: "Z", color: "#7c3aed", ys: pick(sc, "Z") }]} />
                  <LineChart title="I = f(frekuensi)" unit="A" xs={XS} f={f} fr={fr} band={bwS} onPick={setF} series={[{ name: "I", color: "#dc2626", ys: pick(sc, "I") }]} />
                  <LineChart title="VR, VL, VC = f(frekuensi)" unit="V" xs={XS} f={f} fr={fr} onPick={setF} series={[
                    { name: "VR", color: "#2563eb", ys: pick(sc, "VR") },
                    { name: "VL", color: "#ea580c", ys: pick(sc, "VL") },
                    { name: "VC", color: "#16a34a", ys: pick(sc, "VC") },
                  ]} />
                  <LineChart title="XL, XC = f(frekuensi)" unit="Ω" xs={XS} f={f} fr={fr} onPick={setF} series={[
                    { name: "XL", color: "#ea580c", ys: pick(sc, "XL") },
                    { name: "XC", color: "#16a34a", ys: pick(sc, "XC") },
                  ]} />
                  <div className="md:col-span-2">
                    <LineChart title="Sudut fasa φ = f(frekuensi)" unit="°" xs={XS} f={f} fr={fr} onPick={setF} fixedY={PHASE_FIXED} series={[{ name: "φ", color: "#0891b2", ys: pick(sc, "phi") }]} />
                  </div>
                </div>
              </section>

              {/* Grafik paralel */}
              <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
                <h2 className="text-xl font-bold text-slate-800">Grafik Resonansi RLC Paralel</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  <LineChart title="Z = f(frekuensi)" unit="Ω" xs={XS} f={f} fr={fr} onPick={setF} series={[{ name: "Z", color: "#7c3aed", ys: pick(pc, "Z") }]} />
                  <LineChart title="Itot = f(frekuensi)" unit="A" xs={XS} f={f} fr={fr} onPick={setF} series={[
                    { name: "Itot", color: "#dc2626", ys: pick(pc, "Itot") },
                    { name: "IR", color: "#2563eb", ys: pick(pc, "IR"), dash: true },
                  ]} />
                  <LineChart title="IR, IL, IC = f(frekuensi)" unit="A" xs={XS} f={f} fr={fr} onPick={setF} series={[
                    { name: "IR", color: "#2563eb", ys: pick(pc, "IR") },
                    { name: "IL", color: "#ea580c", ys: pick(pc, "IL") },
                    { name: "IC", color: "#16a34a", ys: pick(pc, "IC") },
                  ]} />
                  <LineChart title="XL, XC = f(frekuensi)" unit="Ω" xs={XS} f={f} fr={fr} onPick={setF} series={[
                    { name: "XL", color: "#ea580c", ys: pick(pc, "XL") },
                    { name: "XC", color: "#16a34a", ys: pick(pc, "XC") },
                  ]} />
                  <div className="md:col-span-2">
                    <LineChart title="Sudut fasa φ = f(frekuensi)" unit="°" xs={XS} f={f} fr={fr} onPick={setF} fixedY={PHASE_FIXED} series={[{ name: "φ", color: "#0891b2", ys: pick(pc, "phi") }]} />
                  </div>
                </div>
              </section>
            </div>
          </div>
        )}

        {/* TAB 2: C. ANALISIS PERHITUNGAN */}
        {activeTab === "perhitungan" && (
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-2xl font-bold text-slate-800">C. Analisis Perhitungan Teoritis</h2>
              <p className="mt-1 text-sm text-slate-600">
                Perhitungan langkah-demi-langkah impedansi (Z), reaktansi (XL, XC), tegangan, arus, sudut fasa, faktor kualitas (Q), dan bandwidth (BW) pada berbagai frekuensi.
              </p>
            </div>
            <Calculation mode="seri" R={R} L={L} C={C} Vpp={Vpp} afgF={f} defaultSel="500" />
            <Calculation mode="paralel" R={R} L={L} C={C} Vpp={Vpp} afgF={f} defaultSel="6000" />
          </div>
        )}

        {/* TAB 3: D. TUGAS & PERTANYAAN */}
        {activeTab === "tugas" && (
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-2xl font-bold text-slate-800">D. Tugas & Pertanyaan</h2>
              <p className="mt-1 text-sm text-slate-600">
                Pertanyaan evaluasi dan pembahasan materi Job Sheet 10 mengenai Resonansi RLC Seri dan Paralel.
              </p>
            </div>

            <div className="space-y-4">
              {/* Soal 1 */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="font-bold text-base text-blue-900">
                  1. Apakah yang dimaksud dengan resonansi pada rangkaian RLC?
                </h3>
                <div className="mt-2 text-sm leading-relaxed text-slate-700 bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                  <p><b>Jawaban:</b></p>
                  <p className="mt-1">
                    Resonansi adalah suatu kondisi khusus pada rangkaian bolak-balik (AC) yang mengandung induktor (L) dan kapasitor (C) di mana <b>reaktansi induktif (X<sub>L</sub>) sama besar dengan reaktansi kapasitif (X<sub>C</sub>)</b>, yaitu:
                  </p>
                  <div className="my-2 text-center font-mono font-bold text-blue-800 bg-white py-1.5 rounded border border-blue-200 inline-block px-4">
                    X<sub>L</sub> = X<sub>C</sub> &nbsp;atau&nbsp; 2π·f·L = 1 / (2π·f·C)
                  </div>
                  <p>
                    Karena efek reaktif induktif dan kapasitif saling meniadakan secara total, rangkaian berperilaku seolah-olah sebagai <b>beban resistif murni</b> dengan beda sudut fasa <b>φ = 0°</b> dan faktor daya <b>cos φ = 1</b>.
                  </p>
                </div>
              </div>

              {/* Soal 2 */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="font-bold text-base text-blue-900">
                  2. Bagaimana perbedaan kondisi impedansi dan arus pada resonansi seri dibandingkan paralel?
                </h3>
                <div className="mt-2 text-sm leading-relaxed text-slate-700 bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                  <p><b>Jawaban:</b></p>
                  <div className="grid md:grid-cols-2 gap-4 mt-2">
                    <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
                      <h4 className="font-bold text-emerald-800 border-b pb-1">Resonansi RLC Seri:</h4>
                      <ul className="mt-2 space-y-1 list-disc ml-5 text-xs">
                        <li><b>Impedansi Minimum:</b> Z = R (hanya hambatan resistor murni).</li>
                        <li><b>Arus Maksimum:</b> I = V<sub>S</sub> / R.</li>
                        <li><b>Tegangan:</b> V<sub>R</sub> = V<sub>S</sub>, sedangkan V<sub>L</sub> dan V<sub>C</sub> saling meniadakan (V<sub>L</sub> − V<sub>C</sub> = 0 V).</li>
                        <li>Disebut juga <i>Resonansi Tegangan (Acceptor Circuit)</i>.</li>
                      </ul>
                    </div>
                    <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
                      <h4 className="font-bold text-blue-800 border-b pb-1">Resonansi RLC Paralel:</h4>
                      <ul className="mt-2 space-y-1 list-disc ml-5 text-xs">
                        <li><b>Impedansi Maksimum:</b> Z = R (nilai tertinggi).</li>
                        <li><b>Arus Total Minimum:</b> I<sub>tot</sub> = I<sub>R</sub> = V<sub>S</sub> / R.</li>
                        <li><b>Arus Cabang:</b> I<sub>L</sub> = I<sub>C</sub>, saling meniadakan (I<sub>L</sub> − I<sub>C</sub> = 0 A).</li>
                        <li>Disebut juga <i>Resonansi Arus (Rejector / Tank Circuit)</i>.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Soal 3 */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="font-bold text-base text-blue-900">
                  3. Tuliskan rumus frekuensi resonansi (fr) dan hitung berdasarkan data praktikum (L = 300 mH, C = 0,01 µF)!
                </h3>
                <div className="mt-2 text-sm leading-relaxed text-slate-700 bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                  <p><b>Jawaban & Perhitungan:</b></p>
                  <p className="mt-1 font-mono text-xs text-slate-800">
                    f<sub>r</sub> = 1 / ( 2π · √(L · C) )
                  </p>
                  <p className="mt-1 font-mono text-xs text-slate-800">
                    f<sub>r</sub> = 1 / ( 2 · 3,14159 · √(0,3 H · 10<sup>-8</sup> F) )
                  </p>
                  <p className="mt-1 font-mono text-xs text-slate-800">
                    f<sub>r</sub> = 1 / ( 2 · 3,14159 · √(3 · 10<sup>-9</sup>) ) = 1 / ( 6,28318 · 5,4772 · 10<sup>-5</sup> )
                  </p>
                  <div className="mt-2 font-mono font-bold text-emerald-700 text-sm">
                    ➔ f<sub>r</sub> ≈ 2.905,76 Hz &nbsp; (atau ~2,906 kHz)
                  </div>
                </div>
              </div>

              {/* Soal 4 */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="font-bold text-base text-blue-900">
                  4. Apa sifat rangkaian jika frekuensi kerja sumber berada di bawah atau di atas frekuensi resonansi?
                </h3>
                <div className="mt-2 text-sm leading-relaxed text-slate-700 bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                  <table className="w-full text-xs text-left border-collapse bg-white rounded border border-slate-300">
                    <thead>
                      <tr className="bg-slate-100 border-b">
                        <th className="p-2 border-r">Kondisi Frekuensi</th>
                        <th className="p-2 border-r">Rangkaian RLC Seri</th>
                        <th className="p-2">Rangkaian RLC Paralel</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="p-2 font-mono font-semibold border-r">f &lt; fr (Di bawah fr)</td>
                        <td className="p-2 border-r text-rose-700"><b>Kapasitif:</b> X<sub>C</sub> &gt; X<sub>L</sub> (Arus mendahului tegangan, φ &lt; 0)</td>
                        <td className="p-2 text-blue-700"><b>Induktif:</b> I<sub>L</sub> &gt; I<sub>C</sub> (Arus tertinggal dari tegangan, φ &gt; 0)</td>
                      </tr>
                      <tr className="border-b bg-green-50/40">
                        <td className="p-2 font-mono font-semibold border-r">f = fr (Resonansi)</td>
                        <td className="p-2 border-r font-bold text-emerald-800">Resistif Murni (Z = R, I maks, φ = 0°)</td>
                        <td className="p-2 font-bold text-emerald-800">Resistif Murni (Z = R, I min, φ = 0°)</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-mono font-semibold border-r">f &gt; fr (Di atas fr)</td>
                        <td className="p-2 border-r text-blue-700"><b>Induktif:</b> X<sub>L</sub> &gt; X<sub>C</sub> (Arus tertinggal dari tegangan, φ &gt; 0)</td>
                        <td className="p-2 text-rose-700"><b>Kapasitif:</b> I<sub>C</sub> &gt; I<sub>L</sub> (Arus mendahului tegangan, φ &lt; 0)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: E. KESIMPULAN (FULL TEXT) */}
        {activeTab === "kesimpulan" && (
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-2xl font-bold text-slate-800">E. Kesimpulan Praktikum (Full Text)</h2>
              <p className="mt-1 text-sm text-slate-600">
                Laporan komprehensif kesimpulan praktikum Job Sheet 10 - Resonansi Seri dan Paralel dan Mencari Harga Reaktansi.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm leading-relaxed text-sm space-y-4 text-slate-700">
              <div className="border-l-4 border-blue-600 pl-4 py-1">
                <h3 className="font-bold text-base text-slate-900">1. Terjadinya Resonansi dan Frekuensi Resonansi (fr)</h3>
                <p className="mt-1">
                  Resonansi pada rangkaian RLC tercapai saat reaktansi induktif sama dengan reaktansi kapasitif (<b>X<sub>L</sub> = X<sub>C</sub></b>). Berdasarkan nilai komponen praktikum (R = 2.000 Ω, L = 300 mH, C = 0,01 µF), frekuensi resonansi teoritis dan hasil simulasi Multisim berada pada frekuensi <b>f<sub>r</sub> ≈ 2.905,76 Hz</b> (atau ~2,906 kHz).
                </p>
              </div>

              <div className="border-l-4 border-emerald-600 pl-4 py-1">
                <h3 className="font-bold text-base text-slate-900">2. Karakteristik Resonansi RLC Seri</h3>
                <ul className="mt-1 space-y-1.5 list-disc ml-5">
                  <li><b>Impedansi Minimum:</b> Pada saat f = f<sub>r</sub>, reaktansi total (X<sub>L</sub> − X<sub>C</sub>) bernilai 0 Ω sehingga impedansi rangkaian mencapai titik terendah yaitu sama dengan nilai resistor murni <b>Z = R = 2.000 Ω</b>.</li>
                  <li><b>Arus Maksimum:</b> Karena impedansi minimum, arus rangkaian I mencapai nilai puncak maksimum (<b>I<sub>max</sub> ≈ 1,414 mA</b> pada V<sub>S</sub> = 2,828 V rms).</li>
                  <li><b>Beda Potensial:</b> Tegangan resistor sama dengan tegangan sumber (<b>V<sub>R</sub> = V<sub>S</sub></b>). Tegangan induktor dan kapasitor bernilai sama besar (<b>V<sub>L</sub> = V<sub>C</sub></b>) tetapi berlawanan fasa 180°, sehingga selisihnya <b>V<sub>L</sub> − V<sub>C</sub> ≈ 0 V</b>.</li>
                  <li><b>Pergeseran Fasa:</b> Sudut fasa antara arus dan tegangan bernilai <b>φ = 0°</b> dengan faktor daya unity (<b>cos φ = 1,000</b>). Di bawah f<sub>r</sub> bersifat kapasitif, dan di atas f<sub>r</sub> bersifat induktif.</li>
                </ul>
              </div>

              <div className="border-l-4 border-purple-600 pl-4 py-1">
                <h3 className="font-bold text-base text-slate-900">3. Karakteristik Resonansi RLC Paralel</h3>
                <ul className="mt-1 space-y-1.5 list-disc ml-5">
                  <li><b>Impedansi Maksimum:</b> Pada saat f = f<sub>r</sub>, reaktansi total cabang paralel saling meniadakan sehingga impedansi mencapai nilai puncak tertinggi yaitu <b>Z = R = 2.000 Ω</b>.</li>
                  <li><b>Arus Sumber Minimum:</b> Arus total yang ditarik dari sumber mencapai titik terendah (<b>I<sub>tot</sub> = I<sub>R</sub> ≈ 1,414 mA</b>), sedangkan arus cabang reaktif I<sub>L</sub> dan I<sub>C</sub> berosilasi secara internal di dalam rangkaian penampung (<i>tank circuit</i>) dengan nilai sama besar (<b>I<sub>L</sub> = I<sub>C</sub></b>) dan selisih <b>I<sub>L</sub> − I<sub>C</sub> ≈ 0 A</b>.</li>
                  <li><b>Pergeseran Fasa:</b> Sudut fasa bernilai <b>φ = 0°</b> dengan faktor daya <b>cos φ = 1,000</b>. Di bawah f<sub>r</sub> bersifat induktif, dan di atas f<sub>r</sub> bersifat kapasitif.</li>
                </ul>
              </div>

              <div className="border-l-4 border-amber-500 pl-4 py-1">
                <h3 className="font-bold text-base text-slate-900">4. Faktor Kualitas (Q) dan Selektivitas Bandwidth</h3>
                <p className="mt-1">
                  Faktor kualitas rangkaian seri terhitung sebesar <b>Q<sub>s</sub> ≈ 2,739</b> dengan Bandwidth <b>BW ≈ 1.061 Hz</b>. Hal ini menunjukkan bahwa rangkaian memiliki kurva respon yang tajam dan selektif terhadap frekuensi di sekitar 2,9 kHz, sangat ideal diaplikasikan sebagai rangkaian penapis (<i>band-pass filter</i>) maupun rangkaian penala radio (<i>tuner</i>).
                </p>
              </div>

              <div className="mt-6 rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-emerald-950 font-medium">
                💡 <b>Kesimpulan Akhir:</b> Hasil pengujian simulasi instrumen virtual Multisim (Function Generator Agilent 33120A dan Multimeter XMM1–XMM6) membuktikan 100% kebenaran teori resonansi RLC. Nilai tabel pengukuran sesuai presisi dengan perhitungan analitis.
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: TABEL & EXCEL (.XLSX) */}
        {activeTab === "excel" && (
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-2xl font-bold text-slate-800">Tabel & Ekspor Data Excel (.xlsx / .csv)</h2>
              <p className="mt-1 text-sm text-slate-600">
                Unduh seluruh data hasil pengukuran dan perhitungan simulasi ke dalam format spreadsheet Excel/CSV untuk pelaporan praktikum.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  onClick={() => download("tabel_resonansi_seri.csv", snapsCsv("seri", rows.seri))}
                  className="rounded-lg bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white shadow hover:bg-emerald-800 flex items-center gap-2"
                >
                  📥 Unduh Tabel 1 (Seri) .CSV / Excel
                </button>
                <button
                  onClick={() => download("tabel_resonansi_paralel.csv", snapsCsv("paralel", rows.paralel))}
                  className="rounded-lg bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white shadow hover:bg-emerald-800 flex items-center gap-2"
                >
                  📥 Unduh Tabel 2 (Paralel) .CSV / Excel
                </button>
                <button
                  onClick={() => {
                    fillMode("seri");
                    fillMode("paralel");
                  }}
                  className="rounded-lg bg-blue-700 px-4 py-2.5 text-xs font-bold text-white shadow hover:bg-blue-800"
                >
                  ⚡ Isi Penuh Semua Tabel Otomatis
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-6">
              <h3 className="text-lg font-bold text-slate-800">Pratinjau Tabel 1. Resonansi RLC Seri</h3>
              <DataTable mode="seri" rows={rows.seri} fr={fr} f={f} activeIdx={-1} onRow={(i, ff) => onRow("seri", i, ff)} />

              <h3 className="pt-4 text-lg font-bold text-slate-800">Pratinjau Tabel 2. Resonansi RLC Paralel</h3>
              <DataTable mode="paralel" rows={rows.paralel} fr={fr} f={f} activeIdx={-1} onRow={(i, ff) => onRow("paralel", i, ff)} />
            </div>
          </div>
        )}

        {/* TAB 6: LAPORAN LENGKAP (CETAK) */}
        {activeTab === "laporan" && (
          <div className="space-y-6">
            <div className="no-print rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Laporan Lengkap Praktikum (Cetak / PDF)</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Format dokumen lengkap siap cetak mencakup identitas, tujuan, data tabel, analisis perhitungan, serta kesimpulan.
                </p>
              </div>
              <button
                onClick={() => window.print()}
                className="rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-bold text-white shadow hover:bg-blue-800 flex items-center gap-2"
              >
                🖨️ Cetak Dokumen / Simpan PDF
              </button>
            </div>

            {/* Print paper container */}
            <div className="rounded-xl border border-slate-300 bg-white p-8 shadow-md text-slate-800 font-serif leading-relaxed">
              <div className="text-center border-b-2 border-slate-800 pb-4 mb-6">
                <h1 className="text-xl font-bold uppercase tracking-wider">Laporan Praktikum Rangkaian Listrik</h1>
                <h2 className="text-lg font-bold text-slate-700 mt-1">JOB SHEET 10: RESONANSI SERI DAN PARALEL BEBAN RLC</h2>
                <p className="text-xs text-slate-500 mt-1 font-sans">
                  Simulasi Komputer Menggunakan Multisim • AFG Agilent 33120A & Multimeter XMM1–XMM6
                </p>
              </div>

              {/* Data Identitas */}
              <div className="font-sans text-xs grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded border border-slate-200 mb-6">
                <div><b>Parameter R:</b> {idn(R, "Ω")}</div>
                <div><b>Tegangan Generator:</b> {idn(Vpp, "Vpp")} ({idn(Vpp / (2 * Math.SQRT2), "V rms")})</div>
                <div><b>Parameter L:</b> {idn(L, "H")} (300 mH)</div>
                <div><b>Frekuensi Resonansi (fr):</b> {idn(fr, "Hz")}</div>
                <div><b>Parameter C:</b> {idn(C, "F")} (0,01 µF)</div>
                <div><b>Faktor Kualitas (Q):</b> {s.Q.toFixed(4)}</div>
              </div>

              {/* Bagian A */}
              <h3 className="font-sans font-bold text-base text-slate-900 border-b pb-1 mb-2">A. Tujuan Praktik</h3>
              <ol className="list-decimal ml-6 text-sm mb-6 space-y-1">
                <li>Menggambarkan grafik Z = f(frekuensi) dan I = f(frekuensi).</li>
                <li>Menyebutkan besarnya faktor kualitas pada rangkaian seri dan paralel.</li>
                <li>Menyebutkan besarnya frekuensi resonansi seri dan paralel.</li>
              </ol>

              {/* Bagian B: Tabel Data */}
              <h3 className="font-sans font-bold text-base text-slate-900 border-b pb-1 mb-2">B. Tabel Data Hasil Praktikum</h3>
              <div className="font-sans text-xs space-y-4 mb-6">
                <div>
                  <h4 className="font-bold mb-1">Tabel 1. Resonansi RLC Seri</h4>
                  <DataTable mode="seri" rows={rows.seri} fr={fr} f={f} activeIdx={-1} onRow={() => {}} />
                </div>
                <div>
                  <h4 className="font-bold mb-1">Tabel 2. Resonansi RLC Paralel</h4>
                  <DataTable mode="paralel" rows={rows.paralel} fr={fr} f={f} activeIdx={-1} onRow={() => {}} />
                </div>
              </div>

              {/* Bagian C: Analisis Perhitungan */}
              <h3 className="font-sans font-bold text-base text-slate-900 border-b pb-1 mb-2">C. Analisis Perhitungan</h3>
              <div className="font-sans text-xs space-y-4 mb-6">
                <Calculation mode="seri" R={R} L={L} C={C} Vpp={Vpp} afgF={f} defaultSel="500" />
              </div>

              {/* Bagian D: Kesimpulan */}
              <h3 className="font-sans font-bold text-base text-slate-900 border-b pb-1 mb-2">D. Kesimpulan</h3>
              <p className="text-sm mb-4">
                Pada rangkaian RLC, resonansi terjadi saat reaktansi induktif sama dengan reaktansi kapasitif (X<sub>L</sub> = X<sub>C</sub>) pada frekuensi f<sub>r</sub> ≈ 2.905,76 Hz. Pada RLC seri, impedansi minimum Z = R dan arus maksimum I<sub>max</sub> = V<sub>S</sub> / R dengan sudut fasa φ = 0°. Pada RLC paralel, impedansi maksimum Z = R dan arus sumber minimum I<sub>min</sub> = V<sub>S</sub> / R. Simulasi instrumen virtual Multisim membuktikan teori rangkaian AC secara presisi.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

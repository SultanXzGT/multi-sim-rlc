import React, { useEffect, useMemo, useState } from "react";
import Multimeter from "./components/Multimeter";
import FunctionGenerator from "./components/FunctionGenerator";
import Schematic from "./components/Schematic";
import { LineChart, Scope } from "./components/Charts";
import Calculation from "./components/Calculation";
import { DataTable, FREQS, buildSnap, freqAt, snapsCsv, type Base, type Snap } from "./components/DataTables";
import { idn, parallelCalc, resonantFreq, seriesCalc, type Mode } from "./lib/circuit";
import MemeModal from "./components/MemeModal";

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

type Tab = "praktikum" | "perhitungan";
type SubTab = "simulasi" | "tabel" | "grafik";

const getRandomMemeIndex = (exclude?: number) => {
  const choices = [0, 1, 2, 3, 4].filter((i) => i !== exclude);
  return choices[Math.floor(Math.random() * choices.length)];
};

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("praktikum");
  const [subTab, setSubTab] = useState<SubTab>("simulasi");
  // Langsung muncul saat buka web dengan gambar meme acak (random)!
  const [isMemeOpen, setIsMemeOpen] = useState(true);
  const [currentMemeIndex, setCurrentMemeIndex] = useState(() => Math.floor(Math.random() * 5));

  const handleCloseMeme = () => {
    setIsMemeOpen(false);
    // Siapkan gambar acak berikutnya
    setCurrentMemeIndex((prev) => getRandomMemeIndex(prev));
  };

  // Kalau sudah ditutup, tunggu 1 menit (60 detik) lalu otomatis muncul lagi dengan gambar acak baru!
  useEffect(() => {
    if (!isMemeOpen) {
      const timer = setTimeout(() => {
        setCurrentMemeIndex((prev) => getRandomMemeIndex(prev));
        setIsMemeOpen(true);
      }, 60000); // 60 detik (1 menit)
      return () => clearTimeout(timer);
    }
  }, [isMemeOpen]);

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
      <div className="bg-[#102438] px-4 py-2.5 text-center text-xs text-blue-100 shadow-inner sm:text-left">
        <div className="mx-auto flex max-w-7xl items-center justify-between flex-wrap gap-2">
          <span className="font-medium tracking-wide">
            Simulasi Multisim AFG Agilent 33120A • Multimeter XMM1–XMM6 • Analisis Perhitungan
          </span>
          <div className="flex items-center gap-2">
            <span className="rounded bg-rose-600 px-2.5 py-0.5 text-xs font-black tracking-wider text-white shadow animate-pulse">
              BETA VERSION !
            </span>
            <span className="hidden rounded bg-blue-900/60 px-2 py-0.5 text-[11px] font-mono text-blue-300 md:inline-block">
              Job Sheet 10
            </span>
          </div>
        </div>
      </div>

      {/* Funny notice banner */}
      <div
        className="bg-gradient-to-r from-amber-500 via-rose-600 to-amber-500 py-2.5 px-4 text-center text-xs sm:text-sm font-extrabold text-white shadow-sm tracking-wide flex items-center justify-center gap-2"
      >
        <span>📢 SISANYA KALIAN CARI SENDIRI YA SELAMAT MENGERJAKAN KALAU MAU FULL VERSION YTTA GUYS :V</span>
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

            {/* Funny disclaimer box */}
            <div className="rounded-xl border-2 border-dashed border-rose-400 bg-rose-50 p-6 text-center shadow-sm">
              <div className="text-3xl mb-2">🤫 :v</div>
              <p className="text-base sm:text-lg font-black text-rose-800 tracking-wide">
                SISANYA KALIAN CARI SENDIRI YA SELAMAT MENGERJAKAN KALAU MAU FULL VERSION YTTA GUYS :V
              </p>
              <p className="text-xs text-rose-600 mt-2 font-mono">
                [FITUR TUGAS, KESIMPULAN, EXCEL & LAPORAN TELAH DIHAPUS - KHUSUS BETA VERSION]
              </p>
              <button
                onClick={() => {
                  setCurrentMemeIndex((prev) => getRandomMemeIndex(prev));
                  setIsMemeOpen(true);
                }}
                className="mt-3.5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 px-5 py-2.5 text-xs font-black text-white shadow-lg hover:scale-105 active:scale-95 transition"
              >
                <span>🎭 Buka Meme Spesial (5 Meme) :v</span>
              </button>
            </div>

            <Calculation mode="seri" R={R} L={L} C={C} Vpp={Vpp} afgF={f} defaultSel="500" />
            <Calculation mode="paralel" R={R} L={L} C={C} Vpp={Vpp} afgF={f} defaultSel="6000" />
          </div>
        )}
      </main>


      {/* Meme Popup Modal */}
      <MemeModal
        isOpen={isMemeOpen}
        onClose={handleCloseMeme}
        currentIndex={currentMemeIndex}
        onSelectIndex={setCurrentMemeIndex}
      />
    </div>
  );
}

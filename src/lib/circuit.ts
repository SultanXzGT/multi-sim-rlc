export type Mode = "seri" | "paralel";

export interface Params { R: number; L: number; C: number; Vpp: number; f: number; }

export const resonantFreq = (L: number, C: number) => 1 / (2 * Math.PI * Math.sqrt(L * C));

/** Rangkaian RLC seri */
export function seriesCalc(p: Params) {
  const Vs = p.Vpp / (2 * Math.SQRT2);
  const w = 2 * Math.PI * p.f;
  const XL = w * p.L;
  const XC = 1 / (w * p.C);
  const X = XL - XC;
  const Z = Math.sqrt(p.R * p.R + X * X);
  const I = Vs / Z;
  const phi = (Math.atan2(X, p.R) * 180) / Math.PI; // + = induktif, - = kapasitif
  return {
    Vs, XL, XC, X, Z, I, phi,
    VR: I * p.R, VL: I * XL, VC: I * XC, VLC: I * Math.abs(X),
    pf: Math.cos((phi * Math.PI) / 180),
    Q: Math.sqrt(p.L / p.C) / p.R, // Q seri pada fr
  };
}

/** Rangkaian RLC paralel */
export function parallelCalc(p: Params) {
  const Vs = p.Vpp / (2 * Math.SQRT2);
  const w = 2 * Math.PI * p.f;
  const XL = w * p.L;
  const XC = 1 / (w * p.C);
  const IR = Vs / p.R, IL = Vs / XL, IC = Vs / XC;
  const ILC = Math.abs(IL - IC);
  const Itot = Math.sqrt(IR * IR + (IC - IL) * (IC - IL));
  const Z = Itot > 0 ? Vs / Itot : Infinity;
  const phi = (Math.atan2(IL - IC, IR) * 180) / Math.PI; // + = induktif, - = kapasitif
  return {
    Vs, XL, XC, IR, IL, IC, ILC, Itot, Z, phi,
    pf: Math.cos((phi * Math.PI) / 180),
    Q: p.R * Math.sqrt(p.C / p.L), // Q paralel pada fr = R / XL(fr)
  };
}

/* ---------- Format angka ---------- */

const PF: [number, string][] = [[1e9, "G"], [1e6, "M"], [1e3, "k"], [1, ""], [1e-3, "m"], [1e-6, "u"], [1e-9, "n"]];

/** Format Inggris untuk komponen UI (meter, slider) */
export function fmt(v: number, unit: string, digits = 4): string {
  if (!isFinite(v)) return "∞ " + unit;
  const a = Math.abs(v);
  if (a < 1e-9) return "0 " + unit;
  for (const [m, p] of PF) {
    if (a >= m * 0.9999) {
      const n = v / m;
      const intDigits = Math.floor(Math.log10(Math.abs(n))) + 1;
      return n.toFixed(Math.max(0, digits - intDigits)) + " " + p + unit;
    }
  }
  return v.toExponential(2) + " " + unit;
}

const cache = new Map<string, Intl.NumberFormat>();
const nf = (o: Intl.NumberFormatOptions) => {
  const k = JSON.stringify(o);
  let x = cache.get(k);
  if (!x) { x = new Intl.NumberFormat("id-ID", o); cache.set(k, x); }
  return x;
};

/** Angka gaya Indonesia (koma desimal, titik ribuan), tanpa satuan */
export const pl = (v: number, dec = 4) => nf({ maximumFractionDigits: dec }).format(v);
const sig = (v: number) => nf({ maximumSignificantDigits: 5 }).format(v);

const IPFX: [number, string][] = [[1e6, "M"], [1e3, "k"], [1, ""], [1e-3, "m"], [1e-6, "µ"], [1e-9, "n"]];

/** Format gaya labsheet: 91,378 µA · 2,8284 V · 942,48 Ω · 2.905,76 Hz · 0,01 µF */
export function idn(v: number, unit: string): string {
  if (!isFinite(v)) return "∞ " + unit;
  const a = Math.abs(v);
  if (a === 0) return "0 " + unit;
  if (unit === "Hz") return nf({ maximumFractionDigits: 2 }).format(v) + " Hz";
  if (unit === "Ω") {
    return a >= 1e6
      ? nf({ maximumFractionDigits: 3 }).format(v / 1e6) + " MΩ"
      : nf({ maximumFractionDigits: 2 }).format(v) + " Ω";
  }
  if (unit === "F") return sig(v / 1e-6) + " µF";
  for (const [m, p] of IPFX) if (a >= m * 0.99995) return sig(v / m) + " " + p + unit;
  return sig(v / 1e-9) + " n" + unit;
}
